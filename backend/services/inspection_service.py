from datetime import datetime
from sqlalchemy.orm import Session

try:
    from database import SessionLocal
    from models import InspectionSession, DetectionEvent, GPSPoint, Vehicle
    from gps_service import haversine_distance_km
except ImportError:
    from backend.database import SessionLocal
    from backend.models import InspectionSession, DetectionEvent, GPSPoint, Vehicle
    from backend.gps_service import haversine_distance_km


def create_inspection_session(session: Session, vehicle_id: str, operator_id: str = 'alex.morgan', notes: str = None) -> InspectionSession:
    """Initialize a new inspection session record."""
    session_id = f"sess-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    new_sess = InspectionSession(
        session_id=session_id,
        vehicle_id=vehicle_id,
        operator_id=operator_id or 'alex.morgan',
        status='created',
        start_time=datetime.utcnow(),
        distance_km=0.0,
        detections_count=0,
        notes=notes or f"Inspection run for vehicle {vehicle_id}",
    )
    session.add(new_sess)
    session.commit()
    session.refresh(new_sess)
    return new_sess


def transition_session_status(session: Session, session_id: str, new_status: str, notes: str = None) -> InspectionSession:
    """
    Transition session status: 'recording', 'paused', 'completed'.
    Calculates final distance and end time when completed.
    """
    sess = session.query(InspectionSession).filter_by(session_id=session_id).first()
    if not sess:
        raise ValueError(f"Session '{session_id}' not found")

    valid_statuses = {'created', 'recording', 'paused', 'completed'}
    if new_status not in valid_statuses:
        raise ValueError(f"Invalid status '{new_status}'. Must be one of {valid_statuses}")

    sess.status = new_status
    if notes is not None:
        sess.notes = notes

    if new_status == 'completed':
        sess.end_time = datetime.utcnow()
        # Recalculate actual distance traversed from valid GPS points
        pts = session.query(GPSPoint).filter_by(session_id=session_id).filter(GPSPoint.is_valid == True).order_by(GPSPoint.timestamp.asc()).all()
        total_dist = 0.0
        for i in range(1, len(pts)):
            dist = haversine_distance_km(pts[i - 1].latitude, pts[i - 1].longitude, pts[i].latitude, pts[i].longitude)
            # Filter unrealistic jumps (> 150 km/h)
            if dist < 2.0:
                total_dist += dist
        sess.distance_km = round(total_dist, 2)

        # Count actual detections recorded in this session
        det_count = session.query(DetectionEvent).filter_by(session_id=session_id).count()
        sess.detections_count = det_count

        # Update vehicle last inspection date
        if sess.vehicle_id:
            veh = session.query(Vehicle).filter_by(vehicle_id=sess.vehicle_id).first()
            if veh:
                veh.last_inspection_date = sess.end_time

    session.commit()
    session.refresh(sess)
    return sess


def get_session_summary(session: Session, session_id: str) -> dict:
    """Compute detailed summary of an inspection session."""
    sess = session.query(InspectionSession).filter_by(session_id=session_id).first()
    if not sess:
        return None

    detections = session.query(DetectionEvent).filter_by(session_id=session_id).all()
    gps_points_count = session.query(GPSPoint).filter_by(session_id=session_id).count()

    categories = {}
    severities = {'Low': 0, 'Medium': 0, 'High': 0}
    for d in detections:
        categories[d.category] = categories.get(d.category, 0) + 1
        severities[d.severity] = severities.get(d.severity, 0) + 1

    duration_seconds = 0
    if sess.start_time:
        end = sess.end_time or datetime.utcnow()
        duration_seconds = max(0, int((end - sess.start_time).total_seconds()))

    hours = duration_seconds // 3600
    minutes = (duration_seconds % 3600) // 60
    secs = duration_seconds % 60
    duration_str = f"{hours:02d}:{minutes:02d}:{secs:02d}"

    return {
        'session_id': sess.session_id,
        'vehicle_id': sess.vehicle_id,
        'operator_id': getattr(sess, 'operator_id', 'alex.morgan'),
        'status': sess.status,
        'start_time': sess.start_time.isoformat() if sess.start_time else None,
        'end_time': sess.end_time.isoformat() if sess.end_time else None,
        'duration': duration_str,
        'distance_km': sess.distance_km,
        'total_detections': len(detections),
        'gps_points_count': gps_points_count,
        'categories_breakdown': categories,
        'severity_breakdown': severities,
        'notes': sess.notes,
    }
