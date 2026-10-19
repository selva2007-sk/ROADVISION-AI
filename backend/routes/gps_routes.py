from datetime import datetime
from flask import Blueprint, jsonify, request

try:
    from database import SessionLocal
    from models import GPSPoint, Vehicle, InspectionSession, DetectionEvent
    from gps_service import (
        validate_coordinates,
        determine_gps_state,
        parse_nmea_sentence,
        group_points_into_segments,
        haversine_distance_km,
    )
    from services.auth_service import require_role
except ImportError:
    from backend.database import SessionLocal
    from backend.models import GPSPoint, Vehicle, InspectionSession, DetectionEvent
    from backend.gps_service import (
        validate_coordinates,
        determine_gps_state,
        parse_nmea_sentence,
        group_points_into_segments,
        haversine_distance_km,
    )
    from backend.services.auth_service import require_role

gps_bp = Blueprint('gps', __name__)


@gps_bp.route('/gps', methods=['GET', 'POST'])
def handle_gps():
    """Retrieve GPS points or record a live GPS sample."""
    session = SessionLocal()
    try:
        if request.method == 'GET':
            session_id = request.args.get('session_id')
            vehicle_id = request.args.get('vehicle_id')
            limit = int(request.args.get('limit', 300))

            query = session.query(GPSPoint)
            if session_id:
                query = query.filter(GPSPoint.session_id == session_id)
            if vehicle_id:
                query = query.filter(GPSPoint.vehicle_id == vehicle_id)

            rows = query.order_by(GPSPoint.id.asc()).limit(limit).all()
            return jsonify([{
                'id': row.id,
                'session_id': row.session_id,
                'vehicle_id': row.vehicle_id,
                'latitude': row.latitude,
                'longitude': row.longitude,
                'accuracy': row.accuracy,
                'speed': row.speed,
                'is_valid': row.is_valid,
                'source': row.source,
                'timestamp': row.timestamp.isoformat() if row.timestamp else None,
            } for row in rows])

        body = request.get_json(silent=True) or {}
        raw_lat = body.get('latitude')
        raw_lng = body.get('longitude')
        raw_accuracy = body.get('accuracy')
        raw_speed = body.get('speed')
        sess_id = body.get('session_id', 'live-session')
        veh_id = body.get('vehicle_id', 'RV-1001')
        source = body.get('source', 'browser')
        status_override = body.get('status')

        # Coordinate Validation
        is_valid_coords, lat, lng, coord_err = validate_coordinates(raw_lat, raw_lng)
        if not is_valid_coords:
            return jsonify({'error': coord_err or 'Invalid coordinates', 'is_valid': False}), 400

        accuracy = float(raw_accuracy) if raw_accuracy is not None else 4.0
        speed = float(raw_speed) if raw_speed is not None else 0.0

        is_point_valid = True
        warning = None
        if accuracy > 25.0:
            is_point_valid = False
            warning = f"Horizontal accuracy ±{accuracy:.1f}m exceeds 25m threshold"
        if speed > 160.0:
            is_point_valid = False
            warning = f"Speed spike {speed:.1f} km/h rejected"

        prev_point = session.query(GPSPoint).filter(
            GPSPoint.session_id == sess_id,
            GPSPoint.is_valid == True
        ).order_by(GPSPoint.id.desc()).first()

        distance_delta_km = 0.0
        now_dt = datetime.utcnow()
        if body.get('timestamp'):
            try:
                now_dt = datetime.fromisoformat(body['timestamp'].replace('Z', '+00:00'))
            except Exception:
                now_dt = datetime.utcnow()

        if prev_point and is_point_valid:
            prev_ts = prev_point.timestamp
            time_gap_seconds = abs((now_dt - prev_ts).total_seconds()) if prev_ts else 0.0
            dist_km = haversine_distance_km(prev_point.latitude, prev_point.longitude, lat, lng)

            # Avoid connecting across signal gap (>30s) or distance jump (>0.5 km)
            if time_gap_seconds <= 30.0 and dist_km < 0.5:
                distance_delta_km = dist_km

        row = GPSPoint(
            session_id=sess_id,
            vehicle_id=veh_id,
            latitude=lat,
            longitude=lng,
            speed=speed,
            accuracy=accuracy,
            is_valid=is_point_valid,
            source=source,
            timestamp=now_dt,
        )
        session.add(row)

        veh_row = session.query(Vehicle).filter(Vehicle.vehicle_id == veh_id).first()
        if not veh_row:
            veh_row = Vehicle(
                vehicle_id=veh_id,
                vehicle_type='Inspection SUV',
                registration_id='KA-01-EXP-9921',
                assigned_camera='Front HDR 4K',
            )
            session.add(veh_row)

        veh_row.current_latitude = lat
        veh_row.current_longitude = lng
        veh_row.current_speed = speed
        veh_row.gps_accuracy = accuracy
        veh_row.gps_source = source
        veh_row.last_location_update = now_dt
        veh_row.gps_status = status_override or ('GPS Signal Unreliable' if not is_point_valid else 'GPS Connected')

        if distance_delta_km > 0:
            sess_row = session.query(InspectionSession).filter(InspectionSession.session_id == sess_id).first()
            if sess_row:
                sess_row.distance_km = round((sess_row.distance_km or 0.0) + distance_delta_km, 3)

        session.commit()
        return jsonify({
            'message': 'GPS telemetry fix saved',
            'latitude': lat,
            'longitude': lng,
            'accuracy': accuracy,
            'speed': speed,
            'is_valid': is_point_valid,
            'warning': warning,
            'distance_delta_km': round(distance_delta_km, 4),
            'gps_status': veh_row.gps_status,
        }), 201
    finally:
        session.close()


@gps_bp.route('/gps/status', methods=['GET', 'POST'])
def handle_gps_status():
    """Retrieve GPS connection status, accuracy, and supported hardware modes."""
    session = SessionLocal()
    try:
        if request.method == 'POST':
            body = request.get_json(silent=True) or {}
            veh_id = body.get('vehicle_id', 'RV-1001')
            new_status = body.get('status', 'GPS Unavailable')
            veh = session.query(Vehicle).filter(Vehicle.vehicle_id == veh_id).first()
            if veh:
                veh.gps_status = new_status
                session.commit()
            return jsonify({'message': 'GPS status updated', 'status': new_status})

        vehicle_id = request.args.get('vehicle_id')
        veh_query = session.query(Vehicle)
        if vehicle_id:
            veh = veh_query.filter(Vehicle.vehicle_id == vehicle_id).first()
        else:
            veh = veh_query.first()

        latest_point = session.query(GPSPoint)
        if vehicle_id:
            latest_point = latest_point.filter(GPSPoint.vehicle_id == vehicle_id)
        latest_point = latest_point.order_by(GPSPoint.id.desc()).first()

        last_update = veh.last_location_update if (veh and veh.last_location_update) else (latest_point.timestamp if latest_point else None)
        accuracy = veh.gps_accuracy if (veh and veh.gps_accuracy is not None) else (latest_point.accuracy if latest_point else None)

        state, is_rel, warn = determine_gps_state(
            last_update=last_update,
            accuracy=accuracy,
            current_status=veh.gps_status if veh else None
        )

        return jsonify({
            'vehicle_id': veh.vehicle_id if veh else (vehicle_id or 'RV-1001'),
            'status': state,
            'is_reliable': is_rel,
            'warning': warn,
            'latitude': veh.current_latitude if (veh and veh.current_latitude) else (latest_point.latitude if latest_point else None),
            'longitude': veh.current_longitude if (veh and veh.current_longitude) else (latest_point.longitude if latest_point else None),
            'accuracy': accuracy,
            'speed': veh.current_speed if (veh and veh.current_speed is not None) else (latest_point.speed if latest_point else None),
            'source': veh.gps_source if veh else 'browser',
            'last_update': last_update.isoformat() if last_update else None,
            'supported_sources': [
                {'id': 'browser', 'name': 'Browser Geolocation API', 'desc': 'Permitted prototype using device HTML5 Geolocation'},
                {'id': 'usb_serial', 'name': 'External USB GPS Receiver', 'desc': 'Hardware NMEA-0183 serial stream (COM / USB)'},
                {'id': 'edge_device', 'name': 'Vehicle Edge Device Gateway', 'desc': 'Vehicle CAN/GNSS onboard telematics service'},
                {'id': 'mobile_sync', 'name': 'Paired Mobile Device Companion', 'desc': 'Mobile companion telemetry sync over REST/Socket'},
            ],
        })
    finally:
        session.close()


@gps_bp.route('/gps/tracks', methods=['GET'])
def get_gps_tracks():
    """Retrieve GPS points segmented by signal gaps (>30s) or jumps (>500m)."""
    session = SessionLocal()
    try:
        session_id = request.args.get('session_id')
        vehicle_id = request.args.get('vehicle_id')

        query = session.query(GPSPoint)
        if session_id:
            query = query.filter(GPSPoint.session_id == session_id)
        if vehicle_id:
            query = query.filter(GPSPoint.vehicle_id == vehicle_id)

        rows = query.order_by(GPSPoint.id.asc()).all()
        raw_points = [{
            'id': r.id,
            'latitude': r.latitude,
            'longitude': r.longitude,
            'accuracy': r.accuracy,
            'speed': r.speed,
            'is_valid': r.is_valid,
            'timestamp': r.timestamp.isoformat() if r.timestamp else None,
            'session_id': r.session_id,
            'vehicle_id': r.vehicle_id,
        } for r in rows]

        segments, total_dist = group_points_into_segments(raw_points)

        return jsonify({
            'segments': segments,
            'total_distance_km': total_dist,
            'points_count': len(raw_points),
            'session_id': session_id,
            'vehicle_id': vehicle_id,
        })
    finally:
        session.close()


@gps_bp.route('/gps/nmea', methods=['POST'])
def handle_nmea():
    """Parse NMEA-0183 sentences ($GPRMC, $GPGGA) and record telemetry."""
    body = request.get_json(silent=True) or {}
    sentence = body.get('sentence', '')
    veh_id = body.get('vehicle_id', 'RV-1001')
    sess_id = body.get('session_id', 'live-session')

    parsed = parse_nmea_sentence(sentence)
    if not parsed:
        return jsonify({'error': 'Invalid or unsupported NMEA sentence'}), 400

    if not parsed.get('is_valid'):
        return jsonify({'message': 'NMEA parsed but no valid fix', 'details': parsed}), 200

    session = SessionLocal()
    try:
        lat = parsed['latitude']
        lng = parsed['longitude']
        acc = parsed.get('accuracy', 3.5)
        spd = parsed.get('speed', 0.0)

        point = GPSPoint(
            session_id=sess_id,
            vehicle_id=veh_id,
            latitude=lat,
            longitude=lng,
            accuracy=acc,
            speed=spd,
            is_valid=True,
            source='usb_serial',
            timestamp=datetime.utcnow(),
        )
        session.add(point)

        veh = session.query(Vehicle).filter(Vehicle.vehicle_id == veh_id).first()
        if veh:
            veh.current_latitude = lat
            veh.current_longitude = lng
            veh.current_speed = spd
            veh.gps_accuracy = acc
            veh.gps_source = 'usb_serial'
            veh.last_location_update = datetime.utcnow()
            veh.gps_status = 'GPS Connected'

        session.commit()
        return jsonify({'message': 'NMEA telemetry stored', 'parsed': parsed}), 201
    finally:
        session.close()


@gps_bp.route('/map/markers', methods=['GET'])
def get_map_markers():
    """Interactive Digital Road Map markers with full filtering."""
    # Delegate to detections route with all query params
    from routes.detection_routes import list_detections
    return list_detections()


@gps_bp.route('/map/segments', methods=['GET'])
def get_map_segments():
    """Inspected Road Segments layer polyline data."""
    session = SessionLocal()
    try:
        session_id = request.args.get('session_id')
        sessions_query = session.query(InspectionSession)
        if session_id:
            sessions_query = sessions_query.filter(InspectionSession.session_id == session_id)

        all_sessions = sessions_query.order_by(InspectionSession.id.desc()).all()
        results = []

        for sess_row in all_sessions:
            pts = session.query(GPSPoint).filter(
                GPSPoint.session_id == sess_row.session_id
            ).order_by(GPSPoint.id.asc()).all()

            raw_pts = [{
                'latitude': p.latitude,
                'longitude': p.longitude,
                'accuracy': p.accuracy,
                'is_valid': p.is_valid,
                'timestamp': p.timestamp.isoformat() if p.timestamp else None,
            } for p in pts]

            segs, calc_dist = group_points_into_segments(raw_pts)
            if segs:
                results.append({
                    'session_id': sess_row.session_id,
                    'vehicle_id': sess_row.vehicle_id,
                    'status': sess_row.status,
                    'distance_km': sess_row.distance_km or calc_dist,
                    'detections_count': sess_row.detections_count or 0,
                    'notes': sess_row.notes,
                    'start_time': sess_row.start_time.isoformat() if sess_row.start_time else None,
                    'end_time': sess_row.end_time.isoformat() if sess_row.end_time else None,
                    'segments': segs,
                })

        return jsonify(results)
    finally:
        session.close()
