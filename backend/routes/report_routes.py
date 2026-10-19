from datetime import datetime
from flask import Blueprint, jsonify, request, g

try:
    from database import SessionLocal
    from models import Report, DetectionEvent, RepairHistory
    from services.report_service import (
        get_reports_filtered,
        update_report_status_and_log_history,
        get_repair_history_for_report,
    )
    from services.auth_service import require_role
except ImportError:
    from backend.database import SessionLocal
    from backend.models import Report, DetectionEvent, RepairHistory
    from backend.services.report_service import (
        get_reports_filtered,
        update_report_status_and_log_history,
        get_repair_history_for_report,
    )
    from backend.services.auth_service import require_role

report_bp = Blueprint('reports', __name__)


@report_bp.route('/reports', methods=['GET'])
def list_reports():
    """Retrieve damage reports with multi-criteria filtering."""
    status = request.args.get('status')
    priority = request.args.get('priority')
    category = request.args.get('category')
    vehicle_id = request.args.get('vehicle_id')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')

    session = SessionLocal()
    try:
        results = get_reports_filtered(
            session=session,
            status=status,
            priority=priority,
            category=category,
            vehicle_id=vehicle_id,
            date_from=date_from,
            date_to=date_to,
        )
        return jsonify(results)
    finally:
        session.close()


@report_bp.route('/reports', methods=['POST'])
@require_role('Administrator', 'Inspection Operator')
def create_report():
    """Create a new damage report associated with a detection."""
    session = SessionLocal()
    try:
        body = request.get_json(silent=True) or {}
        det_id = body.get('detection_id')
        if not det_id:
            return jsonify({'error': 'detection_id is required'}), 400

        existing = session.query(Report).filter_by(detection_id=det_id).first()
        if existing:
            return jsonify({'error': f"Report for detection '{det_id}' already exists", 'id': existing.id}), 409

        rep = Report(
            detection_id=det_id,
            status=body.get('status', 'Detected'),
            assigned_team=body.get('assigned_team', 'Unassigned'),
            priority=body.get('priority', 'Medium'),
            maintenance_notes=body.get('maintenance_notes'),
            repair_evidence=body.get('repair_evidence'),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(rep)
        session.commit()

        # Log initial creation audit in RepairHistory
        updater = getattr(getattr(g, 'current_user', None), 'username', 'alex.morgan')
        history_entry = RepairHistory(
            report_id=rep.id,
            detection_id=rep.detection_id,
            previous_status=None,
            new_status=rep.status,
            updated_by=updater,
            maintenance_notes=rep.maintenance_notes or 'Initial report created',
            evidence_image=rep.repair_evidence,
            timestamp=datetime.utcnow(),
        )
        session.add(history_entry)
        session.commit()

        return jsonify({'message': 'Report created successfully', 'id': rep.id, 'detection_id': rep.detection_id}), 201
    finally:
        session.close()


@report_bp.route('/reports/<int:rep_id>', methods=['GET'])
def get_report_detail(rep_id):
    """Retrieve detailed information and current status of a damage report."""
    session = SessionLocal()
    try:
        rep = session.query(Report).filter_by(id=rep_id).first()
        if not rep:
            return jsonify({'error': 'Report not found'}), 404

        det = session.query(DetectionEvent).filter_by(detection_id=rep.detection_id).first()
        return jsonify({
            'id': rep.id,
            'detection_id': rep.detection_id,
            'status': rep.status,
            'priority': getattr(rep, 'priority', 'Medium'),
            'assigned_team': rep.assigned_team or 'Unassigned',
            'maintenance_notes': rep.maintenance_notes or '',
            'repair_evidence': rep.repair_evidence or '',
            'created_at': rep.created_at.isoformat() if getattr(rep, 'created_at', None) else None,
            'updated_at': rep.updated_at.isoformat() if rep.updated_at else None,
            'detection': {
                'category': det.category if det else None,
                'severity': det.severity if det else None,
                'confidence': det.confidence if det else None,
                'latitude': det.latitude if det else None,
                'longitude': det.longitude if det else None,
                'road_segment': det.road_segment if det else None,
                'evidence_image': det.evidence_image if det else None,
                'review_status': det.review_status if det else None,
            } if det else None,
        })
    finally:
        session.close()


@report_bp.route('/reports/<int:rep_id>', methods=['PATCH'])
@require_role('Administrator', 'Maintenance Staff')
def update_report_status(rep_id):
    """Update report status, maintenance team, notes, and automatically record audit history."""
    session = SessionLocal()
    try:
        rep = session.query(Report).filter_by(id=rep_id).first()
        if not rep:
            return jsonify({'error': 'Report not found'}), 404

        body = request.get_json(silent=True) or {}
        new_status = body.get('status')
        assigned_team = body.get('assigned_team')
        priority = body.get('priority')
        notes = body.get('maintenance_notes')
        evidence = body.get('repair_evidence')
        updater = getattr(getattr(g, 'current_user', None), 'username', 'alex.morgan')

        # Update detection review_status when report status changes to verified/repaired/rejected
        if new_status:
            det = session.query(DetectionEvent).filter_by(detection_id=rep.detection_id).first()
            if det:
                if new_status in ('Verified', 'Repair Scheduled', 'In Progress', 'Repaired'):
                    det.review_status = 'verified'
                elif new_status == 'Rejected':
                    det.review_status = 'rejected'

        rep, hist = update_report_status_and_log_history(
            session=session,
            report=rep,
            new_status=new_status,
            assigned_team=assigned_team,
            priority=priority,
            maintenance_notes=notes,
            repair_evidence=evidence,
            updated_by=updater,
        )
        session.commit()

        return jsonify({
            'message': 'Report updated and repair audit history logged successfully',
            'report': {
                'id': rep.id,
                'detection_id': rep.detection_id,
                'status': rep.status,
                'assigned_team': rep.assigned_team,
                'priority': getattr(rep, 'priority', 'Medium'),
                'maintenance_notes': rep.maintenance_notes,
                'repair_evidence': rep.repair_evidence,
                'updated_at': rep.updated_at.isoformat() if rep.updated_at else None,
            },
            'history_logged': hist is not None,
        })
    finally:
        session.close()


@report_bp.route('/reports/<int:rep_id>', methods=['DELETE'])
@require_role('Administrator')
def delete_report(rep_id):
    """Delete a report record."""
    session = SessionLocal()
    try:
        rep = session.query(Report).filter_by(id=rep_id).first()
        if not rep:
            return jsonify({'error': 'Report not found'}), 404

        session.delete(rep)
        session.commit()
        return jsonify({'message': f"Report '{rep_id}' deleted successfully"})
    finally:
        session.close()


@report_bp.route('/reports/<int:rep_id>/history', methods=['GET'])
def get_report_audit_history(rep_id):
    """Retrieve full chronological repair status history for a specific report."""
    session = SessionLocal()
    try:
        rep = session.query(Report).filter_by(id=rep_id).first()
        if not rep:
            return jsonify({'error': 'Report not found'}), 404

        history = get_repair_history_for_report(session, rep.id)
        return jsonify({
            'report_id': rep.id,
            'detection_id': rep.detection_id,
            'history': history,
        })
    finally:
        session.close()


@report_bp.route('/reports/history/<detection_id>', methods=['GET'])
def get_detection_repair_history(detection_id):
    """Retrieve chronological repair status history by detection ID."""
    session = SessionLocal()
    try:
        history = get_repair_history_for_report(session, detection_id)
        return jsonify({
            'detection_id': detection_id,
            'history': history,
        })
    finally:
        session.close()


@report_bp.route('/reports/<int:rep_id>/evidence', methods=['POST'])
@require_role('Administrator', 'Maintenance Staff')
def upload_report_repair_evidence(rep_id):
    """Upload repair completion evidence photo and link to report."""
    session = SessionLocal()
    try:
        rep = session.query(Report).filter_by(id=rep_id).first()
        if not rep:
            return jsonify({'error': 'Report not found'}), 404

        body = request.get_json(silent=True) or {}
        evidence_url = body.get('evidence_image') or body.get('url')

        if not evidence_url and ('file' in request.files or 'image' in request.files):
            from services.upload_service import validate_and_save_image
            file_obj = request.files.get('file') or request.files.get('image')
            _, evidence_url = validate_and_save_image(file_obj)

        if not evidence_url:
            return jsonify({'error': 'No evidence image or URL provided'}), 400

        notes = body.get('maintenance_notes', rep.maintenance_notes)
        updater = getattr(getattr(g, 'current_user', None), 'username', 'alex.morgan')

        rep, hist = update_report_status_and_log_history(
            session=session,
            report=rep,
            new_status=body.get('status', 'Repaired'),
            repair_evidence=evidence_url,
            maintenance_notes=notes,
            updated_by=updater,
        )
        session.commit()

        return jsonify({
            'message': 'Repair evidence uploaded and linked successfully',
            'report_id': rep.id,
            'repair_evidence': rep.repair_evidence,
            'status': rep.status,
        })
    finally:
        session.close()
