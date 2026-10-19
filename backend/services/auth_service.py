import base64
import hashlib
import hmac
import json
import time
from functools import wraps
from flask import request, jsonify, g
from werkzeug.security import generate_password_hash, check_password_hash

try:
    from config import settings
    from database import SessionLocal
    from models import UserProfile
except ImportError:
    from backend.config import settings
    from backend.database import SessionLocal
    from backend.models import UserProfile

ROLES = {
    'Administrator': {
        'permissions': ['overview', 'live-camera', 'map', 'detections', 'reports', 'repair-tracking', 'vehicles', 'sessions', 'analytics', 'settings', 'profile', 'admin'],
        'description': 'Full administrative control over road assets, staff, and system configurations',
    },
    'Inspection Operator': {
        'permissions': ['overview', 'live-camera', 'map', 'detections', 'vehicles', 'sessions', 'profile'],
        'description': 'Field operator managing inspection runs, mobile GPS telemetry, and camera captures',
    },
    'Maintenance Staff': {
        'permissions': ['overview', 'map', 'reports', 'repair-tracking', 'profile'],
        'description': 'City civil engineering and paving crews updating work orders and repair evidence',
    },
    'Viewer': {
        'permissions': ['overview', 'map', 'analytics', 'profile'],
        'description': 'Read-only access for municipal stakeholders, auditors, and civil observers',
    },
}

TOKEN_MAX_AGE_SECONDS = 86400  # 24 hours


def create_token(user_id: int, role: str) -> str:
    """Create a tamper-proof HMAC-signed auth token."""
    payload = {
        'uid': user_id,
        'role': role,
        'iat': int(time.time()),
        'exp': int(time.time()) + TOKEN_MAX_AGE_SECONDS,
    }
    payload_bytes = json.dumps(payload, separators=(',', ':')).encode('utf-8')
    b64_payload = base64.urlsafe_b64encode(payload_bytes).decode('utf-8').rstrip('=')
    
    signature = hmac.new(
        settings.jwt_secret.encode('utf-8'),
        b64_payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return f"{b64_payload}.{signature}"


def verify_token(token: str) -> dict | None:
    """Verify HMAC signature and expiration on an auth token."""
    if not token or '.' not in token:
        return None
    
    parts = token.split('.')
    if len(parts) != 2:
        return None
    
    b64_payload, signature = parts
    
    expected_sig = hmac.new(
        settings.jwt_secret.encode('utf-8'),
        b64_payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(signature, expected_sig):
        return None
    
    try:
        # Add padding back if necessary
        padded_b64 = b64_payload + '=' * (-len(b64_payload) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded_b64).decode('utf-8'))
        
        if payload.get('exp', 0) < int(time.time()):
            return None  # Token expired
        
        return payload
    except Exception:
        return None


def authenticate_user(username_or_email: str, password: str):
    """Verify user credentials and return (user, token) or None."""
    session = SessionLocal()
    try:
        user = session.query(UserProfile).filter(
            (UserProfile.username == username_or_email) | (UserProfile.email == username_or_email)
        ).first()
        
        if not user:
            return None, "Invalid username or password"
        
        if getattr(user, 'status', 'active') != 'active':
            return None, "Account is suspended or deactivated"
        
        # Check password hash
        if not user.password_hash or not check_password_hash(user.password_hash, password):
            return None, "Invalid username or password"
        
        token = create_token(user.id, user.role)
        return user, token
    finally:
        session.close()


def get_current_user_from_request():
    """Extract and authenticate user from current request headers."""
    auth_header = request.headers.get('Authorization', '')
    token = None
    if auth_header.startswith('Bearer '):
        token = auth_header[7:].strip()
    
    if token:
        payload = verify_token(token)
        if payload:
            session = SessionLocal()
            try:
                user = session.query(UserProfile).filter_by(id=payload['uid']).first()
                if user and getattr(user, 'status', 'active') == 'active':
                    return user
            finally:
                session.close()
    
    # Optional fallback for existing non-token requests or development
    # If X-User-Role is provided or no auth is passed, retrieve default user
    dev_role = request.headers.get('X-User-Role')
    session = SessionLocal()
    try:
        user = session.query(UserProfile).first()
        if user and dev_role and dev_role in ROLES:
            user.role = dev_role
        return user
    finally:
        session.close()


def require_role(*allowed_roles):
    """
    Decorator for RBAC. Enforces role permissions on protected API endpoints.
    Usage:
        @app.route('/api/admin/...')
        @require_role('Administrator')
        def admin_action():
            ...
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            auth_header = request.headers.get('Authorization', '')
            token = None
            if auth_header.startswith('Bearer '):
                token = auth_header[7:].strip()

            user = None
            if token:
                payload = verify_token(token)
                if not payload:
                    return jsonify({'error': 'Unauthorized: Token is invalid or expired'}), 401
                
                session = SessionLocal()
                try:
                    user = session.query(UserProfile).filter_by(id=payload['uid']).first()
                    if not user or getattr(user, 'status', 'active') != 'active':
                        return jsonify({'error': 'Unauthorized: User not found or inactive'}), 401
                finally:
                    session.close()
            else:
                # If no token passed, fall back to checking profile user
                session = SessionLocal()
                try:
                    user = session.query(UserProfile).first()
                    # Allow role override in test/dev header if provided
                    client_role = request.headers.get('X-User-Role')
                    if client_role and client_role in ROLES:
                        user.role = client_role
                finally:
                    session.close()

            if not user:
                return jsonify({'error': 'Unauthorized: Authentication required'}), 401

            if allowed_roles and user.role not in allowed_roles:
                return jsonify({
                    'error': f'Forbidden: Role "{user.role}" does not have permission. Required: {", ".join(allowed_roles)}'
                }), 403

            g.current_user = user
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def sanitize_user_dict(user: UserProfile) -> dict:
    """Format user entity for API responses without leaking password hashes."""
    return {
        'id': user.id,
        'username': user.username,
        'full_name': user.full_name,
        'email': user.email,
        'phone': user.phone,
        'role': user.role,
        'status': getattr(user, 'status', 'active'),
        'department': user.department,
        'avatar_url': user.avatar_url,
        'created_at': user.created_at.isoformat() if user.created_at else None,
        'last_login': user.last_login.isoformat() if user.last_login else None,
        'permissions': ROLES.get(user.role, {}).get('permissions', []),
    }
