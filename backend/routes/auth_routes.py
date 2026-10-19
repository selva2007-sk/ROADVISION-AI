from flask import Blueprint, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash

try:
    from database import SessionLocal
    from models import UserProfile, InspectionSession, DetectionEvent, Report
    from services.auth_service import (
        ROLES,
        authenticate_user,
        get_current_user_from_request,
        require_role,
        sanitize_user_dict,
    )
except ImportError:
    from backend.database import SessionLocal
    from backend.models import UserProfile, InspectionSession, DetectionEvent, Report
    from backend.services.auth_service import (
        ROLES,
        authenticate_user,
        get_current_user_from_request,
        require_role,
        sanitize_user_dict,
    )

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/auth/login', methods=['POST'])
def login():
    """Authenticate user with username/email and password."""
    body = request.get_json(silent=True) or {}
    identifier = body.get('username') or body.get('email')
    password = body.get('password')

    if not identifier or not password:
        return jsonify({'error': 'Username/email and password are required'}), 400

    user, token_or_err = authenticate_user(identifier, password)
    if not user:
        return jsonify({'error': token_or_err}), 401

    return jsonify({
        'message': 'Login successful',
        'token': token_or_err,
        'user': sanitize_user_dict(user),
    })


@auth_bp.route('/auth/logout', methods=['POST'])
def logout():
    """Client logout confirmation endpoint."""
    return jsonify({'message': 'Logged out successfully'})


@auth_bp.route('/auth/me', methods=['GET'])
def get_current_user():
    """Retrieve currently authenticated user identity and permissions."""
    user = get_current_user_from_request()
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401
    return jsonify(sanitize_user_dict(user))


@auth_bp.route('/profile', methods=['GET', 'PUT'])
def profile():
    """View or update user profile with real operational stats."""
    session = SessionLocal()
    try:
        user = session.query(UserProfile).first()
        if not user:
            user = UserProfile(
                username='alex.morgan',
                full_name='Chief Engineer Alex Morgan',
                email='alex.morgan@roadvision.gov',
                phone='+1 (555) 438-9210',
                role='Administrator',
                department='Urban Road Infrastructure & Civil Assets',
                password_hash=generate_password_hash('roadvision2026!'),
            )
            session.add(user)
            session.commit()

        if request.method == 'GET':
            sessions_count = session.query(InspectionSession).count()
            detections_count = session.query(DetectionEvent).count()
            reports_reviewed = session.query(DetectionEvent).filter(DetectionEvent.review_status == 'verified').count()
            tasks_completed = session.query(Report).filter(Report.status == 'Repaired').count()

            user_data = sanitize_user_dict(user)
            user_data['activity'] = {
                'inspection_sessions_performed': sessions_count,
                'reports_submitted': detections_count,
                'reports_reviewed': reports_reviewed,
                'tasks_completed': tasks_completed,
            }
            return jsonify(user_data)

        # PUT: Update profile fields
        body = request.get_json(silent=True) or {}
        if 'full_name' in body:
            user.full_name = body['full_name']
        if 'email' in body:
            user.email = body['email']
        if 'phone' in body:
            user.phone = body['phone']
        if 'department' in body:
            user.department = body['department']
        if 'role' in body and body['role'] in ROLES:
            user.role = body['role']
        if 'avatar_url' in body:
            user.avatar_url = body['avatar_url']

        session.commit()
        return jsonify({
            'message': 'Profile updated successfully',
            'user': sanitize_user_dict(user),
        })
    finally:
        session.close()


@auth_bp.route('/profile/change-password', methods=['POST'])
def change_password():
    """Securely change user password with verification."""
    body = request.get_json(silent=True) or {}
    current_password = body.get('current_password', '')
    new_password = body.get('new_password', '')

    if not current_password:
        return jsonify({'error': 'Current password is required'}), 400
    if len(new_password) < 6:
        return jsonify({'error': 'New password must be at least 6 characters'}), 400

    session = SessionLocal()
    try:
        user = session.query(UserProfile).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        if user.password_hash and not check_password_hash(user.password_hash, current_password):
            return jsonify({'error': 'Incorrect current password'}), 400

        user.password_hash = generate_password_hash(new_password)
        session.commit()
        return jsonify({'message': 'Password successfully changed and encrypted.'})
    finally:
        session.close()


@auth_bp.route('/roles')
def get_roles():
    """Retrieve list of defined system roles and their assigned permissions."""
    result = []
    for role_name, data in ROLES.items():
        result.append({
            'name': role_name,
            'badge': role_name.split()[0],
            'description': data['description'],
            'permissions': data['permissions'],
        })
    return jsonify(result)
