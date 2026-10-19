import json
from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request, g

try:
    from database import SessionLocal
    from models import DetectionEvent, Report, InspectionSession, GPSPoint, RepairHistory
    from ai.demo_model import road_ai
    from gps_service import validate_coordinates, associate_ai_detection_with_gps, haversine_distance_km
    from services.auth_service import require_role
except ImportError:
    from backend.database import SessionLocal
    from backend.models import DetectionEvent, Report, InspectionSession, GPSPoint, RepairHistory
    from backend.ai.demo_model import road_ai
    from backend.gps_service import validate_coordinates, associate_ai_detection_with_gps, haversine_distance_km
    from backend.services.auth_service import require_role

detection_bp = Blueprint('detections', __name__)


@detection_bp.route('/ai/detect', methods=['POST'])
def ai_detect():
    """Analyze incoming video/camera frame with trained model or high-fidelity edge heuristic."""
    body = request.get_json(silent=True) or {}
    image_b64 = body.get('image')
    lat = body.get('latitude')
    lng = body.get('longitude')
    filter_duplicates = body.get('filter_duplicates', True)

    if not image_b64:
        return jsonify({'error': 'Image data (base64) is required'}), 400

    results = road_ai.predict(image_b64)

    # Optional duplicate check against recently registered detections
    if filter_duplicates and lat and lng and results:
        session = SessionLocal()
        try:
            recent_time = datetime.utcnow() - timedelta(seconds=60)
            recent_dets = session.query(DetectionEvent).filter(
                DetectionEvent.timestamp >= recent_time
            ).all()

            filtered_results = []
            for det in results:
                is_dup = False
                for existing in recent_dets:
                    if existing.category == det['category']:
                        dist_km = haversine_distance_km(lat, lng, existing.latitude, existing.longitude)
                        if dist_km * 1000.0 < 15.0:  # 15 meter spatial proximity threshold
                            is_dup = True
                            break
                if not is_dup:
                    filtered_results.append(det)
            results = filtered_results
        finally:
            session.close()

    return jsonify({
        'model': road_ai.mode,
        'detections': results,
        'count': len(results),
        'timestamp': datetime.utcnow().isoformat(),
    })


@detection_bp.route('/detections', methods=['GET'])
def list_detections():
    """Retrieve filtered damage detection events."""
    category_filter = request.args.get('category')
    severity_filter = request.args.get('severity')
    status_filter = request.args.get('status')
    session_id_filter = request.args.get('session_id')
    vehicle_id_filter = request.args.get('vehicle_id')
    repair_status_filter = request.args.get('repair_status')
    date_range_filter = request.args.get('date_range')
    search_query = request.args.get('search')

    session = SessionLocal()
    try:
        query = session.query(DetectionEvent)
        if category_filter and category_filter != 'all':
            query = query.filter(DetectionEvent.category == category_filter)
        if severity_filter and severity_filter != 'all':
            query = query.filter(DetectionEvent.severity == severity_filter)
        if status_filter and status_filter != 'all':
            query = query.filter(DetectionEvent.review_status == status_filter)
        if session_id_filter and session_id_filter != 'all':
            query = query.filter(DetectionEvent.session_id == session_id_filter)
        if vehicle_id_filter and vehicle_id_filter != 'all':
            query = query.filter(DetectionEvent.vehicle_id == vehicle_id_filter)

        if date_range_filter and date_range_filter != 'all':
            now = datetime.utcnow()
            if date_range_filter == 'today':
                start_of_day = datetime(now.year, now.month, now.day)
                query = query.filter(DetectionEvent.timestamp >= start_of_day)
            elif date_range_filter == '7days':
                seven_days_ago = now - timedelta(days=7)
                query = query.filter(DetectionEvent.timestamp >= seven_days_ago)
            elif date_range_filter == '30days':
                thirty_days_ago = now - timedelta(days=30)
                query = query.filter(DetectionEvent.timestamp >= thirty_days_ago)

        if search_query and search_query.strip():
            term = f"%{search_query.strip().lower()}%"
            query = query.filter(
                (DetectionEvent.road_segment.ilike(term)) |
                (DetectionEvent.category.ilike(term)) |
                (DetectionEvent.detection_id.ilike(term))
            )

        rows = query.order_by(DetectionEvent.id.desc()).all()
        rep_map = {r.detection_id: (r.status, getattr(r, 'priority', 'Medium'), r.assigned_team) for r in session.query(Report).all()}

        results = []
        for row in rows:
            rep_info = rep_map.get(row.detection_id, ('Detected', 'Medium', 'Unassigned'))
            rep_status = rep_info[0]
            rep_priority = rep_info[1]
            rep_team = rep_info[2]

            if repair_status_filter and repair_status_filter != 'all' and rep_status != repair_status_filter:
                continue

            results.append({
                'id': row.id,
                'detection_id': row.detection_id,
                'session_id': row.session_id,
                'vehicle_id': row.vehicle_id or 'RV-1001',
                'category': row.category,
                'confidence': row.confidence,
                'severity': row.severity,
                'latitude': row.latitude,
                'longitude': row.longitude,
                'gps_accuracy': row.gps_accuracy,
                'bbox': row.bbox,
                'road_segment': row.road_segment or 'City Sector Corridor',
                'evidence_image': row.evidence_image,
                'timestamp': row.timestamp.isoformat() if row.timestamp else None,
                'review_status': row.review_status,
                'repair_status': rep_status,
                'priority': rep_priority,
                'assigned_team': rep_team,
                'source': row.source,
                'is_demo': 'demo' in (row.source or '').lower(),
                'is_location_reliable': row.is_location_reliable if row.is_location_reliable is not None else True,
                'location_warning': row.location_warning,
            })

        return jsonify(results)
    finally:
        session.close()


@detection_bp.route('/detections', methods=['POST'])
@require_role('Administrator', 'Inspection Operator')
def create_detection():
    """Register confirmed detection event with GPS association and duplicate prevention."""
    session = SessionLocal()
    try:
        body = request.get_json(silent=True) or {}
        raw_lat = body.get('latitude')
        raw_lng = body.get('longitude')
        vehicle_id = body.get('vehicle_id', 'RV-1001')
        session_id = body.get('session_id', 'live-session')
        category = body.get('category', 'pothole')

        # Check for duplicate submission by ID
        custom_det_id = body.get('detection_id')
        if custom_det_id:
            existing_by_id = session.query(DetectionEvent).filter_by(detection_id=custom_det_id).first()
            if existing_by_id:
                return jsonify({'message': 'Detection already recorded', 'id': existing_by_id.id, 'detection_id': existing_by_id.detection_id}), 200

        # Coordinate validation
        coord_valid, lat_f, lng_f, coord_err = validate_coordinates(raw_lat, raw_lng)

        det_time = datetime.utcnow()
        if body.get('timestamp'):
            try:
                det_time = datetime.fromisoformat(body['timestamp'].replace('Z', '+00:00'))
            except Exception:
                det_time = datetime.utcnow()

        latest_gps = session.query(GPSPoint).filter(
            (GPSPoint.session_id == session_id) | (GPSPoint.vehicle_id == vehicle_id)
        ).order_by(GPSPoint.id.desc()).first()

        gps_data = None
        if latest_gps:
            gps_data = {
                'latitude': latest_gps.latitude,
                'longitude': latest_gps.longitude,
                'accuracy': latest_gps.accuracy,
                'timestamp': latest_gps.timestamp,
            }

        if coord_valid:
            accuracy = float(body.get('gps_accuracy', 4.0)) if body.get('gps_accuracy') is not None else 4.0
            is_reliable = accuracy <= 25.0
            warning = None
            if not is_reliable:
                warning = f"Low GPS accuracy (±{accuracy:.1f}m exceeds 25m threshold)"
            else:
                warning = "Verified fresh GPS sample. (Note: Camera forward look-ahead offset of ~5-15m applies)."
        elif gps_data:
            assoc = associate_ai_detection_with_gps(det_time, gps_data)
            lat_f = assoc['latitude']
            lng_f = assoc['longitude']
            accuracy = assoc['gps_accuracy']
            is_reliable = assoc['is_location_reliable']
            warning = assoc['location_warning']
        else:
            lat_f = 12.9716
            lng_f = 77.5946
            accuracy = None
            is_reliable = False
            warning = "No GPS fix available when damage was detected."

        # Duplicate spatial prevention: check for same damage category within 15 meters within 60 seconds
        recent_time = det_time - timedelta(seconds=60)
        recent_candidates = session.query(DetectionEvent).filter(
            DetectionEvent.category == category,
            DetectionEvent.timestamp >= recent_time
        ).all()
        for cand in recent_candidates:
            if cand.latitude and cand.longitude and lat_f and lng_f:
                dist = haversine_distance_km(lat_f, lng_f, cand.latitude, cand.longitude) * 1000.0
                if dist < 15.0:
                    return jsonify({
                        'message': 'Duplicate detection suppressed (same category detected within 15m)',
                        'id': cand.id,
                        'detection_id': cand.detection_id,
                        'is_duplicate': True,
                    }), 200

        detection_id = custom_det_id or f"det-{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')[:17]}"

        row = DetectionEvent(
            detection_id=detection_id,
            session_id=session_id,
            vehicle_id=vehicle_id,
            category=category,
            confidence=float(body.get('confidence', 0.92)),
            severity=body.get('severity', 'High'),
            latitude=lat_f,
            longitude=lng_f,
            gps_accuracy=accuracy,
            bbox=json.dumps(body.get('bbox')) if body.get('bbox') else None,
            road_segment=body.get('road_segment', 'Outer Ring Rd - Sector 4'),
            evidence_image=body.get('evidence_image'),
            review_status=body.get('review_status', 'pending_review'),
            source=body.get('source', 'demo_heuristic'),
            is_location_reliable=is_reliable,
            location_warning=warning,
            timestamp=det_time,
        )
        session.add(row)

        # Create associated repair report entry
        report = Report(
            detection_id=detection_id,
            status='Pending Review' if row.review_status == 'pending_review' else 'Detected',
            assigned_team=body.get('assigned_team', 'Unassigned'),
            priority='High' if row.severity == 'High' else ('Medium' if row.severity == 'Medium' else 'Low'),
            maintenance_notes=body.get('maintenance_notes'),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(report)

        # Increment count in parent session if active
        parent_sess = session.query(InspectionSession).filter(InspectionSession.session_id == session_id).first()
        if parent_sess:
            parent_sess.detections_count = (parent_sess.detections_count or 0) + 1

        session.commit()
        return jsonify({
            'message': 'Detection registered',
            'id': row.id,
            'detection_id': detection_id,
            'is_location_reliable': is_reliable,
            'location_warning': warning,
        }), 201
    finally:
        session.close()


@detection_bp.route('/detections/<int:det_id>', methods=['GET'])
def get_detection_detail(det_id):
    """Retrieve single detection details."""
    session = SessionLocal()
    try:
        row = session.query(DetectionEvent).filter_by(id=det_id).first()
        if not row:
            return jsonify({'error': 'Detection not found'}), 404

        rep = session.query(Report).filter_by(detection_id=row.detection_id).first()
        return jsonify({
            'id': row.id,
            'detection_id': row.detection_id,
            'session_id': row.session_id,
            'vehicle_id': row.vehicle_id,
            'category': row.category,
            'confidence': row.confidence,
            'severity': row.severity,
            'latitude': row.latitude,
            'longitude': row.longitude,
            'gps_accuracy': row.gps_accuracy,
            'bbox': row.bbox,
            'road_segment': row.road_segment,
            'evidence_image': row.evidence_image,
            'timestamp': row.timestamp.isoformat() if row.timestamp else None,
            'review_status': row.review_status,
            'repair_status': rep.status if rep else 'Detected',
            'assigned_team': rep.assigned_team if rep else 'Unassigned',
            'priority': getattr(rep, 'priority', 'Medium') if rep else 'Medium',
            'source': row.source,
            'is_location_reliable': row.is_location_reliable,
            'location_warning': row.location_warning,
        })
    finally:
        session.close()


@detection_bp.route('/detections/<int:det_id>', methods=['PATCH'])
@require_role('Administrator', 'Inspection Operator')
def review_detection(det_id):
    """Review, verify, or reject a damage detection event."""
    session = SessionLocal()
    try:
        row = session.query(DetectionEvent).filter_by(id=det_id).first()
        if not row:
            return jsonify({'error': 'Detection not found'}), 404

        body = request.get_json(silent=True) or {}
        if 'review_status' in body:
            row.review_status = body['review_status']
            # Mirror to report status
            rep = session.query(Report).filter_by(detection_id=row.detection_id).first()
            if rep:
                prev_status = rep.status
                if body['review_status'] == 'verified':
                    rep.status = 'Verified'
                elif body['review_status'] == 'rejected':
                    rep.status = 'Rejected'
                
                # Log repair history transition
                if rep.status != prev_status:
                    updater = getattr(getattr(g, 'current_user', None), 'username', 'alex.morgan')
                    hist = RepairHistory(
                        report_id=rep.id,
                        detection_id=rep.detection_id,
                        previous_status=prev_status,
                        new_status=rep.status,
                        updated_by=updater,
                        maintenance_notes=f"Review status changed to {body['review_status']}",
                        timestamp=datetime.utcnow(),
                    )
                    session.add(hist)

        if 'severity' in body:
            row.severity = body['severity']
        if 'category' in body:
            row.category = body['category']

        session.commit()
        return jsonify({'message': 'Detection updated', 'review_status': row.review_status})
    finally:
        session.close()


@detection_bp.route('/detections/<int:det_id>', methods=['DELETE'])
@require_role('Administrator')
def delete_detection(det_id):
    """Delete a detection and its associated report."""
    session = SessionLocal()
    try:
        row = session.query(DetectionEvent).filter_by(id=det_id).first()
        if not row:
            return jsonify({'error': 'Detection not found'}), 404

        session.delete(row)
        session.query(Report).filter_by(detection_id=row.detection_id).delete()
        session.commit()
        return jsonify({'message': 'Detection removed successfully'})
    finally:
        session.close()
