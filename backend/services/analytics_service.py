import csv
import io
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func

try:
    from models import DetectionEvent, Report, InspectionSession, Vehicle, GPSPoint
except ImportError:
    from backend.models import DetectionEvent, Report, InspectionSession, Vehicle, GPSPoint


def calculate_database_analytics(
    session: Session,
    date_from: str = None,
    date_to: str = None,
    vehicle_id: str = None,
    category: str = None,
    severity: str = None,
    repair_status: str = None,
) -> dict:
    """Calculate aggregated analytics directly from database records with optional multi-criteria filters."""
    query = session.query(DetectionEvent, Report).outerjoin(
        Report, DetectionEvent.detection_id == Report.detection_id
    )

    if vehicle_id and vehicle_id != 'all':
        query = query.filter(DetectionEvent.vehicle_id == vehicle_id)
    if category and category != 'all':
        query = query.filter(DetectionEvent.category == category)
    if severity and severity != 'all':
        query = query.filter(DetectionEvent.severity == severity)
    if repair_status and repair_status != 'all':
        query = query.filter(Report.status == repair_status)

    if date_from:
        try:
            dt_from = datetime.fromisoformat(date_from)
            query = query.filter(DetectionEvent.timestamp >= dt_from)
        except ValueError:
            pass

    if date_to:
        try:
            dt_to = datetime.fromisoformat(date_to)
            query = query.filter(DetectionEvent.timestamp <= dt_to)
        except ValueError:
            pass

    records = query.all()
    total_detections = len(records)

    # Damage category breakdown
    category_counts = {
        'pothole': 0,
        'longitudinal_crack': 0,
        'transverse_crack': 0,
        'alligator_crack': 0,
        'damaged_surface': 0,
    }
    # Severity breakdown
    severity_counts = {'Low': 0, 'Medium': 0, 'High': 0}
    # Review breakdown
    review_counts = {'verified': 0, 'pending_review': 0, 'rejected': 0}
    # Repair breakdown
    repair_counts = {
        'Detected': 0,
        'Pending Review': 0,
        'Verified': 0,
        'Repair Scheduled': 0,
        'In Progress': 0,
        'Repaired': 0,
        'Rejected': 0,
    }

    for det, rep in records:
        cat = det.category
        if cat in category_counts:
            category_counts[cat] += 1
        else:
            category_counts[cat] = category_counts.get(cat, 0) + 1

        sev = det.severity
        if sev in severity_counts:
            severity_counts[sev] += 1
        else:
            severity_counts[sev] = 1

        rev = det.review_status
        if rev in review_counts:
            review_counts[rev] += 1
        else:
            review_counts[rev] = 1

        if rep and rep.status:
            st = rep.status
            repair_counts[st] = repair_counts.get(st, 0) + 1

    # Repair completion rate
    total_reports = sum(repair_counts.values())
    repaired_count = repair_counts.get('Repaired', 0)
    completion_rate = round((repaired_count / total_reports * 100), 1) if total_reports > 0 else 0.0

    # Operational overview metrics
    total_sessions = session.query(InspectionSession).count()
    total_distance_km = session.query(func.sum(InspectionSession.distance_km)).scalar() or 0.0
    active_vehicles = session.query(Vehicle).filter(Vehicle.is_active == True).count()

    return {
        'total_detections': total_detections,
        'category_breakdown': category_counts,
        'severity_breakdown': severity_counts,
        'review_breakdown': review_counts,
        'repair_breakdown': repair_counts,
        'repair_completion_rate_percent': completion_rate,
        'total_inspections': total_sessions,
        'total_distance_inspected_km': round(float(total_distance_km), 2),
        'active_vehicles_count': active_vehicles,
    }


def generate_detections_csv(
    session: Session,
    date_from: str = None,
    date_to: str = None,
    vehicle_id: str = None,
    category: str = None,
    severity: str = None,
    repair_status: str = None,
) -> str:
    """Generate CSV string with damage detections and repair details directly from database."""
    query = session.query(DetectionEvent, Report).outerjoin(
        Report, DetectionEvent.detection_id == Report.detection_id
    )

    if vehicle_id and vehicle_id != 'all':
        query = query.filter(DetectionEvent.vehicle_id == vehicle_id)
    if category and category != 'all':
        query = query.filter(DetectionEvent.category == category)
    if severity and severity != 'all':
        query = query.filter(DetectionEvent.severity == severity)
    if repair_status and repair_status != 'all':
        query = query.filter(Report.status == repair_status)

    if date_from:
        try:
            dt_from = datetime.fromisoformat(date_from)
            query = query.filter(DetectionEvent.timestamp >= dt_from)
        except ValueError:
            pass

    if date_to:
        try:
            dt_to = datetime.fromisoformat(date_to)
            query = query.filter(DetectionEvent.timestamp <= dt_to)
        except ValueError:
            pass

    records = query.order_by(DetectionEvent.timestamp.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        'Detection ID',
        'Session ID',
        'Vehicle ID',
        'Damage Category',
        'Confidence Score',
        'Estimated Severity',
        'Latitude',
        'Longitude',
        'GPS Accuracy (m)',
        'Road Segment',
        'Review Status',
        'Repair Status',
        'Assigned Team',
        'Priority',
        'Maintenance Notes',
        'Timestamp',
        'Location Reliable',
    ])

    for det, rep in records:
        writer.writerow([
            det.detection_id,
            det.session_id,
            det.vehicle_id or '',
            det.category,
            round(det.confidence, 4),
            det.severity,
            f"{det.latitude:.6f}",
            f"{det.longitude:.6f}",
            det.gps_accuracy if det.gps_accuracy is not None else '',
            det.road_segment or '',
            det.review_status,
            rep.status if rep else 'Detected',
            rep.assigned_team if rep else 'Unassigned',
            getattr(rep, 'priority', 'Medium') if rep else 'Medium',
            (rep.maintenance_notes or '').replace('\n', ' ') if rep else '',
            det.timestamp.isoformat() if det.timestamp else '',
            'Yes' if det.is_location_reliable else 'No',
        ])

    return output.getvalue()
