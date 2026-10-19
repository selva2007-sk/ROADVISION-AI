from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc

try:
    from database import SessionLocal
    from models import Report, RepairHistory, DetectionEvent
except ImportError:
    from backend.database import SessionLocal
    from backend.models import Report, RepairHistory, DetectionEvent


def get_reports_filtered(
    session: Session,
    status: str = None,
    priority: str = None,
    category: str = None,
    vehicle_id: str = None,
    date_from: str = None,
    date_to: str = None,
):
    """Query reports joined with detection event details and optional filtering."""
    query = session.query(Report, DetectionEvent).join(
        DetectionEvent, Report.detection_id == DetectionEvent.detection_id
    )

    if status and status != 'all':
        query = query.filter(Report.status == status)
    
    if priority and priority != 'all':
        query = query.filter(Report.priority == priority)
        
    if category and category != 'all':
        query = query.filter(DetectionEvent.category == category)
        
    if vehicle_id and vehicle_id != 'all':
        query = query.filter(DetectionEvent.vehicle_id == vehicle_id)

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

    records = query.order_by(desc(Report.updated_at)).all()
    results = []
    for rep, det in records:
        results.append({
            'id': rep.id,
            'detection_id': rep.detection_id,
            'category': det.category,
            'severity': det.severity,
            'confidence': det.confidence,
            'road_segment': det.road_segment,
            'latitude': det.latitude,
            'longitude': det.longitude,
            'gps_accuracy': det.gps_accuracy,
            'vehicle_id': det.vehicle_id,
            'status': rep.status,
            'priority': getattr(rep, 'priority', 'Medium') or 'Medium',
            'assigned_team': rep.assigned_team or 'Unassigned',
            'maintenance_notes': rep.maintenance_notes or '',
            'repair_evidence': rep.repair_evidence or '',
            'evidence_image': det.evidence_image or '',
            'created_at': rep.created_at.isoformat() if getattr(rep, 'created_at', None) else None,
            'updated_at': rep.updated_at.isoformat() if rep.updated_at else None,
            'review_status': det.review_status,
            'is_location_reliable': det.is_location_reliable,
            'location_warning': det.location_warning,
        })
    return results


def update_report_status_and_log_history(
    session: Session,
    report: Report,
    new_status: str = None,
    assigned_team: str = None,
    priority: str = None,
    maintenance_notes: str = None,
    repair_evidence: str = None,
    updated_by: str = 'alex.morgan',
) -> tuple[Report, RepairHistory]:
    """
    Updates report fields and appends an immutable audit entry to repair_history.
    """
    previous_status = report.status
    has_status_change = new_status and new_status != previous_status
    has_notes_change = maintenance_notes is not None and maintenance_notes != (report.maintenance_notes or '')
    has_evidence_change = repair_evidence is not None and repair_evidence != (report.repair_evidence or '')
    has_team_change = assigned_team is not None and assigned_team != (report.assigned_team or '')

    if new_status:
        report.status = new_status
    if assigned_team is not None:
        report.assigned_team = assigned_team
    if priority is not None:
        report.priority = priority
    if maintenance_notes is not None:
        report.maintenance_notes = maintenance_notes
    if repair_evidence is not None:
        report.repair_evidence = repair_evidence

    report.updated_at = datetime.utcnow()

    # Always log an audit record if status, notes, team, or evidence changed
    history_entry = None
    if has_status_change or has_notes_change or has_evidence_change or has_team_change:
        history_entry = RepairHistory(
            report_id=report.id,
            detection_id=report.detection_id,
            previous_status=previous_status,
            new_status=report.status,
            updated_by=updated_by or 'alex.morgan',
            maintenance_notes=report.maintenance_notes,
            evidence_image=report.repair_evidence,
            timestamp=datetime.utcnow(),
        )
        session.add(history_entry)

    return report, history_entry


def get_repair_history_for_report(session: Session, report_id_or_detection_id: str | int):
    """Retrieve full chronological repair audit trail for a report or detection."""
    query = session.query(RepairHistory)
    if isinstance(report_id_or_detection_id, int) or (isinstance(report_id_or_detection_id, str) and report_id_or_detection_id.isdigit()):
        query = query.filter((RepairHistory.report_id == int(report_id_or_detection_id)) | (RepairHistory.detection_id == str(report_id_or_detection_id)))
    else:
        query = query.filter(RepairHistory.detection_id == str(report_id_or_detection_id))

    records = query.order_by(desc(RepairHistory.timestamp)).all()
    return [
        {
            'id': h.id,
            'report_id': h.report_id,
            'detection_id': h.detection_id,
            'previous_status': h.previous_status,
            'new_status': h.new_status,
            'updated_by': h.updated_by,
            'maintenance_notes': h.maintenance_notes,
            'evidence_image': h.evidence_image,
            'timestamp': h.timestamp.isoformat() if h.timestamp else None,
        }
        for h in records
    ]
