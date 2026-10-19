from datetime import datetime
from flask import Blueprint, jsonify, request

try:
    from database import SessionLocal
    from models import InspectionSession, Vehicle
    from services.inspection_service import (
        create_inspection_session,
        transition_session_status,
        get_session_summary,
    )
    from services.auth_service import require_role
except ImportError:
    from backend.database import SessionLocal
    from backend.models import InspectionSession, Vehicle
    from backend.services.inspection_service import (
        create_inspection_session,
        transition_session_status,
        get_session_summary,
    )
    from backend.services.auth_service import require_role

inspection_bp = Blueprint('inspections', __name__)


@inspection_bp.route('/sessions', methods=['GET'])
def list_sessions():
    """List inspection sessions ordered by most recent."""
    session = SessionLocal()
    try:
        rows = session.query(InspectionSession).order_by(InspectionSession.id.desc()).all()
        return jsonify([{
            'id': row.id,
            'session_id': row.session_id,
            'vehicle_id': row.vehicle_id,
            'operator_id': getattr(row, 'operator_id', 'alex.morgan'),
            'status': row.status,
            'distance_km': row.distance_km,
            'detections_count': row.detections_count,
            'notes': row.notes,
            'start_time': row.start_time.isoformat() if row.start_time else None,
            'end_time': row.end_time.isoformat() if row.end_time else None,
        } for row in rows])
    finally:
        session.close()


@inspection_bp.route('/sessions', methods=['POST'])
@require_role('Administrator', 'Inspection Operator')
def create_session():
    """Initialize a new inspection session."""
    session = SessionLocal()
    try:
        body = request.get_json(silent=True) or {}
        vehicle_id = body.get('vehicle_id', 'RV-1001')
        operator_id = body.get('operator_id', 'alex.morgan')
        notes = body.get('notes', 'Routine road surface assessment')

        # Check if custom session_id is provided
        custom_id = body.get('session_id')
        if custom_id:
            existing = session.query(InspectionSession).filter_by(session_id=custom_id).first()
            if existing:
                return jsonify({'error': f"Session with ID '{custom_id}' already exists"}), 409
            
            row = InspectionSession(
                session_id=custom_id,
                vehicle_id=vehicle_id,
                operator_id=operator_id,
                status='recording',
                notes=notes,
                distance_km=0.0,
                detections_count=0,
            )
            session.add(row)
            session.commit()
            return jsonify({
                'message': 'Inspection session initialized',
                'session': {
                    'id': row.id,
                    'session_id': row.session_id,
                    'status': row.status,
                    'vehicle_id': row.vehicle_id,
                }
            }), 201

        sess = create_inspection_session(session, vehicle_id=vehicle_id, operator_id=operator_id, notes=notes)
        return jsonify({
            'message': 'Inspection session initialized',
            'session': {
                'id': sess.id,
                'session_id': sess.session_id,
                'status': sess.status,
                'vehicle_id': sess.vehicle_id,
            }
        }), 201
    finally:
        session.close()


@inspection_bp.route('/sessions/<session_id>', methods=['GET'])
def get_session(session_id):
    """Retrieve details for a specific session."""
    session = SessionLocal()
    try:
        row = session.query(InspectionSession).filter_by(session_id=session_id).first()
        if not row:
            return jsonify({'error': 'Session not found'}), 404

        return jsonify({
            'id': row.id,
            'session_id': row.session_id,
            'vehicle_id': row.vehicle_id,
            'operator_id': getattr(row, 'operator_id', 'alex.morgan'),
            'status': row.status,
            'distance_km': row.distance_km,
            'detections_count': row.detections_count,
            'notes': row.notes,
            'start_time': row.start_time.isoformat() if row.start_time else None,
            'end_time': row.end_time.isoformat() if row.end_time else None,
        })
    finally:
        session.close()


@inspection_bp.route('/sessions/<session_id>', methods=['PATCH'])
@require_role('Administrator', 'Inspection Operator')
def update_session(session_id):
    """Update notes or metrics on an inspection session."""
    session = SessionLocal()
    try:
        row = session.query(InspectionSession).filter_by(session_id=session_id).first()
        if not row:
            return jsonify({'error': 'Session not found'}), 404

        body = request.get_json(silent=True) or {}
        if 'status' in body:
            new_status = body['status']
            transition_session_status(session, session_id, new_status, notes=body.get('notes'))
            return jsonify({'message': f'Session transitioned to {new_status}', 'status': new_status})

        if 'distance_km' in body:
            row.distance_km = float(body['distance_km'])
        if 'detections_count' in body:
            row.detections_count = int(body['detections_count'])
        if 'notes' in body:
            row.notes = body['notes']

        session.commit()
        return jsonify({'message': 'Session updated', 'status': row.status})
    finally:
        session.close()


@inspection_bp.route('/sessions/<session_id>/start', methods=['POST'])
@require_role('Administrator', 'Inspection Operator')
def start_inspection(session_id):
    """Start or restart recording an inspection session."""
    session = SessionLocal()
    try:
        sess = transition_session_status(session, session_id, 'recording')
        return jsonify({'message': 'Inspection session started', 'status': sess.status, 'session_id': sess.session_id})
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    finally:
        session.close()


@inspection_bp.route('/sessions/<session_id>/pause', methods=['POST'])
@require_role('Administrator', 'Inspection Operator')
def pause_inspection(session_id):
    """Pause an active inspection session."""
    session = SessionLocal()
    try:
        sess = transition_session_status(session, session_id, 'paused')
        return jsonify({'message': 'Inspection session paused', 'status': sess.status, 'session_id': sess.session_id})
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    finally:
        session.close()


@inspection_bp.route('/sessions/<session_id>/resume', methods=['POST'])
@require_role('Administrator', 'Inspection Operator')
def resume_inspection(session_id):
    """Resume a paused inspection session."""
    session = SessionLocal()
    try:
        sess = transition_session_status(session, session_id, 'recording')
        return jsonify({'message': 'Inspection session resumed', 'status': sess.status, 'session_id': sess.session_id})
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    finally:
        session.close()


@inspection_bp.route('/sessions/<session_id>/stop', methods=['POST'])
@require_role('Administrator', 'Inspection Operator')
def stop_inspection(session_id):
    """Stop/complete an inspection session and compute totals."""
    session = SessionLocal()
    try:
        sess = transition_session_status(session, session_id, 'completed')
        summary = get_session_summary(session, session_id)
        return jsonify({
            'message': 'Inspection session completed successfully',
            'status': sess.status,
            'summary': summary,
        })
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    finally:
        session.close()


@inspection_bp.route('/sessions/<session_id>/summary', methods=['GET'])
def retrieve_session_summary(session_id):
    """Retrieve comprehensive statistical summary for an inspection session."""
    session = SessionLocal()
    try:
        summary = get_session_summary(session, session_id)
        if not summary:
            return jsonify({'error': f"Session '{session_id}' not found"}), 404
        return jsonify(summary)
    finally:
        session.close()
