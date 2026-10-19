from datetime import datetime
from flask import Blueprint, jsonify, request

try:
    from database import SessionLocal
    from models import Vehicle, InspectionSession, DetectionEvent
    from gps_service import validate_coordinates, determine_gps_state
    from services.auth_service import require_role
except ImportError:
    from backend.database import SessionLocal
    from backend.models import Vehicle, InspectionSession, DetectionEvent
    from backend.gps_service import validate_coordinates, determine_gps_state
    from backend.services.auth_service import require_role

vehicle_bp = Blueprint('vehicles', __name__)


@vehicle_bp.route('/vehicles', methods=['GET'])
def list_vehicles():
    """List all registered inspection vehicles with live GPS status."""
    session = SessionLocal()
    try:
        rows = session.query(Vehicle).order_by(Vehicle.id.asc()).all()
        result = []
        for row in rows:
            state, _, _ = determine_gps_state(
                last_update=row.last_location_update,
                accuracy=row.gps_accuracy,
                current_status=row.gps_status
            )
            result.append({
                'id': row.id,
                'vehicle_id': row.vehicle_id,
                'vehicle_type': row.vehicle_type,
                'registration_id': row.registration_id,
                'assigned_camera': row.assigned_camera,
                'gps_status': state,
                'current_latitude': row.current_latitude,
                'current_longitude': row.current_longitude,
                'current_speed': row.current_speed,
                'gps_accuracy': row.gps_accuracy,
                'gps_source': row.gps_source or 'browser',
                'is_active': getattr(row, 'is_active', True),
                'last_location_update': row.last_location_update.isoformat() if row.last_location_update else None,
                'last_inspection_date': row.last_inspection_date.isoformat() if row.last_inspection_date else None,
            })
        return jsonify(result)
    finally:
        session.close()


@vehicle_bp.route('/vehicles', methods=['POST'])
@require_role('Administrator')
def create_vehicle():
    """Register a new vehicle with GPS and camera equipment."""
    session = SessionLocal()
    try:
        body = request.get_json(silent=True) or {}
        vehicle_id = body.get('vehicle_id')
        if not vehicle_id:
            vehicle_id = f"RV-{datetime.utcnow().strftime('%S%f')[:4]}"

        # Prevent duplicate vehicle ID
        existing = session.query(Vehicle).filter_by(vehicle_id=vehicle_id).first()
        if existing:
            return jsonify({'error': f"Vehicle with ID '{vehicle_id}' already exists"}), 409

        lat = body.get('current_latitude')
        lng = body.get('current_longitude')
        val, lat_f, lng_f, _ = validate_coordinates(lat, lng) if (lat is not None and lng is not None) else (True, None, None, None)

        row = Vehicle(
            vehicle_id=vehicle_id,
            vehicle_type=body.get('vehicle_type', 'Inspection SUV'),
            registration_id=body.get('registration_id', 'KA-01-EXP-9921'),
            assigned_camera=body.get('assigned_camera', 'Front Wide-Angle HD'),
            gps_status=body.get('gps_status', 'GPS Unavailable'),
            current_latitude=lat_f,
            current_longitude=lng_f,
            current_speed=float(body['current_speed']) if body.get('current_speed') is not None else 0.0,
            gps_accuracy=float(body['gps_accuracy']) if body.get('gps_accuracy') is not None else None,
            gps_source=body.get('gps_source', 'browser'),
            is_active=bool(body.get('is_active', True)),
            last_location_update=datetime.utcnow() if lat_f else None,
            last_inspection_date=datetime.utcnow(),
        )
        session.add(row)
        session.commit()
        return jsonify({'message': 'Vehicle added successfully', 'id': row.id, 'vehicle_id': row.vehicle_id}), 201
    finally:
        session.close()


@vehicle_bp.route('/vehicles/<vehicle_id>', methods=['GET'])
def get_vehicle_details(vehicle_id):
    """Retrieve detailed information for a specific vehicle."""
    session = SessionLocal()
    try:
        row = session.query(Vehicle).filter_by(vehicle_id=vehicle_id).first()
        if not row:
            return jsonify({'error': f"Vehicle '{vehicle_id}' not found"}), 404

        state, _, _ = determine_gps_state(
            last_update=row.last_location_update,
            accuracy=row.gps_accuracy,
            current_status=row.gps_status
        )
        return jsonify({
            'id': row.id,
            'vehicle_id': row.vehicle_id,
            'vehicle_type': row.vehicle_type,
            'registration_id': row.registration_id,
            'assigned_camera': row.assigned_camera,
            'gps_status': state,
            'current_latitude': row.current_latitude,
            'current_longitude': row.current_longitude,
            'current_speed': row.current_speed,
            'gps_accuracy': row.gps_accuracy,
            'gps_source': row.gps_source or 'browser',
            'is_active': getattr(row, 'is_active', True),
            'last_location_update': row.last_location_update.isoformat() if row.last_location_update else None,
            'last_inspection_date': row.last_inspection_date.isoformat() if row.last_inspection_date else None,
        })
    finally:
        session.close()


@vehicle_bp.route('/vehicles/<vehicle_id>', methods=['PATCH', 'PUT'])
@require_role('Administrator', 'Inspection Operator')
def update_vehicle(vehicle_id):
    """Update vehicle registration, equipment, or active status."""
    session = SessionLocal()
    try:
        row = session.query(Vehicle).filter_by(vehicle_id=vehicle_id).first()
        if not row:
            return jsonify({'error': f"Vehicle '{vehicle_id}' not found"}), 404

        body = request.get_json(silent=True) or {}
        if 'vehicle_type' in body:
            row.vehicle_type = body['vehicle_type']
        if 'registration_id' in body:
            row.registration_id = body['registration_id']
        if 'assigned_camera' in body:
            row.assigned_camera = body['assigned_camera']
        if 'gps_source' in body:
            row.gps_source = body['gps_source']
        if 'is_active' in body:
            row.is_active = bool(body['is_active'])

        session.commit()
        return jsonify({'message': 'Vehicle updated successfully', 'vehicle_id': row.vehicle_id})
    finally:
        session.close()


@vehicle_bp.route('/vehicles/<vehicle_id>/history', methods=['GET'])
def get_vehicle_history(vehicle_id):
    """View chronological inspection runs and detection counts for a specific vehicle."""
    session = SessionLocal()
    try:
        sessions = session.query(InspectionSession).filter_by(vehicle_id=vehicle_id).order_by(InspectionSession.start_time.desc()).all()
        detections = session.query(DetectionEvent).filter_by(vehicle_id=vehicle_id).order_by(DetectionEvent.timestamp.desc()).all()

        return jsonify({
            'vehicle_id': vehicle_id,
            'total_sessions': len(sessions),
            'total_detections': len(detections),
            'sessions': [{
                'session_id': s.session_id,
                'status': s.status,
                'distance_km': s.distance_km,
                'detections_count': s.detections_count,
                'start_time': s.start_time.isoformat() if s.start_time else None,
                'end_time': s.end_time.isoformat() if s.end_time else None,
                'notes': s.notes,
            } for s in sessions],
            'recent_detections': [{
                'detection_id': d.detection_id,
                'category': d.category,
                'severity': d.severity,
                'confidence': d.confidence,
                'timestamp': d.timestamp.isoformat() if d.timestamp else None,
                'latitude': d.latitude,
                'longitude': d.longitude,
            } for d in detections[:10]],
        })
    finally:
        session.close()
