from datetime import datetime
from pathlib import Path
import sys

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from ai.demo_model import road_ai
from config import settings
from database import SessionLocal, init_db
from models import CameraStatus, DetectionEvent, GPSPoint, InspectionSession, RepairHistory, Report, UserProfile, Vehicle

# Import route blueprints
from routes.auth_routes import auth_bp
from routes.vehicle_routes import vehicle_bp
from routes.inspection_routes import inspection_bp
from routes.detection_routes import detection_bp
from routes.report_routes import report_bp
from routes.gps_routes import gps_bp
from routes.analytics_routes import analytics_bp
from routes.upload_routes import upload_bp

# Initialize database schema automatically on startup / serverless cold start
try:
    init_db()
except Exception as _e:
    print(f"[RoadVision Engine] Database initialization note: {_e}")

app = Flask(__name__)

# Enable CORS for all frontend requests (both local and deployed cross-origin)
CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], "allow_headers": ["Content-Type", "Authorization", "X-User-Role"]}})

limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    default_limits=["2000 per day", "600 per hour"],
)

@app.before_request
def ensure_storage():
    Path(settings.data_dir).mkdir(parents=True, exist_ok=True)
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)


# Register modular Blueprints under /api prefix
app.register_blueprint(auth_bp, url_prefix='/api')
app.register_blueprint(vehicle_bp, url_prefix='/api')
app.register_blueprint(inspection_bp, url_prefix='/api')
app.register_blueprint(detection_bp, url_prefix='/api')
app.register_blueprint(report_bp, url_prefix='/api')
app.register_blueprint(gps_bp, url_prefix='/api')
app.register_blueprint(analytics_bp, url_prefix='/api')
app.register_blueprint(upload_bp, url_prefix='/api')


# -----------------------------------------------------------------------------
# System & Health
# -----------------------------------------------------------------------------
@app.route('/api/health')
def health():
    return jsonify({
        'status': 'online',
        'system': 'RoadVision AI Engine',
        'mode': road_ai.mode,
        'model_name': settings.model_name,
        'is_demo_mode': road_ai.mode == 'demo',
        'classes': road_ai.DAMAGE_CLASSES,
        'timestamp': datetime.utcnow().isoformat(),
    })


# -----------------------------------------------------------------------------
# Camera Status
# -----------------------------------------------------------------------------
@app.route('/api/camera-status', methods=['GET', 'POST'])
def camera_status():
    session = SessionLocal()
    try:
        if request.method == 'GET':
            row = session.query(CameraStatus).order_by(CameraStatus.id.desc()).first()
            if not row:
                return jsonify({'status': 'Connected', 'device_name': 'Webcam (Integrated / USB)', 'connected': True})
            return jsonify({'status': row.status, 'device_name': row.device_name, 'connected': row.connected})

        body = request.get_json(silent=True) or {}
        row = CameraStatus(
            status=body.get('status', 'Connected'),
            device_name=body.get('device_name', 'Webcam'),
            connected=bool(body.get('connected', True)),
        )
        session.add(row)
        session.commit()
        return jsonify({'message': 'Camera status updated'}), 201
    finally:
        session.close()


# -----------------------------------------------------------------------------
# Demonstration Dataset Seeding Endpoint
# -----------------------------------------------------------------------------
@app.route('/api/demo/seed', methods=['GET', 'POST'])
def seed_demo_data():
    from werkzeug.security import generate_password_hash
    session = SessionLocal()
    try:
        session.query(RepairHistory).delete()
        session.query(DetectionEvent).delete()
        session.query(GPSPoint).delete()
        session.query(InspectionSession).delete()
        session.query(Report).delete()
        session.query(Vehicle).delete()
        session.query(CameraStatus).delete()
        session.query(UserProfile).delete()

        # Seed Default User
        session.add(UserProfile(
            username='alex.morgan',
            full_name='Chief Engineer Alex Morgan',
            email='alex.morgan@roadvision.gov',
            phone='+1 (555) 438-9210',
            role='Administrator',
            department='Urban Road Infrastructure & Civil Assets',
            password_hash=generate_password_hash('roadvision2026!'),
            avatar_url='https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
        ))

        # Seed Vehicles with real-time GPS telemetry
        vehicles_seed = [
            Vehicle(
                vehicle_id='RV-1001',
                vehicle_type='Inspection SUV',
                registration_id='KA-01-BM-1234',
                assigned_camera='Front HDR 4K',
                gps_status='GPS Connected',
                current_latitude=12.9790,
                current_longitude=77.6048,
                current_speed=34.0,
                gps_accuracy=3.2,
                gps_source='browser',
                is_active=True,
                last_location_update=datetime.utcnow(),
                last_inspection_date=datetime.utcnow(),
            ),
            Vehicle(
                vehicle_id='RV-1018',
                vehicle_type='Survey Van',
                registration_id='KA-03-TR-5678',
                assigned_camera='Dual USB Cam Rig',
                gps_status='GPS Connected',
                current_latitude=12.9725,
                current_longitude=77.5954,
                current_speed=28.5,
                gps_accuracy=4.1,
                gps_source='edge_device',
                is_active=True,
                last_location_update=datetime.utcnow(),
                last_inspection_date=datetime.utcnow(),
            ),
            Vehicle(
                vehicle_id='RV-1042',
                vehicle_type='Utility Truck',
                registration_id='KA-05-MK-9012',
                assigned_camera='Front Dashcam Ultra',
                gps_status='GPS Connected',
                current_latitude=12.9765,
                current_longitude=77.6001,
                current_speed=0.0,
                gps_accuracy=4.8,
                gps_source='usb_serial',
                is_active=True,
                last_location_update=datetime.utcnow(),
                last_inspection_date=datetime.utcnow(),
            ),
        ]
        for v in vehicles_seed:
            session.add(v)

        # Seed Inspection Sessions
        sess1 = InspectionSession(
            session_id='session-blr-north-01',
            vehicle_id='RV-1001',
            operator_id='alex.morgan',
            status='completed',
            distance_km=24.6,
            detections_count=6,
            notes='North Corridor Ring Road Inspection'
        )
        sess2 = InspectionSession(
            session_id='session-blr-live-02',
            vehicle_id='RV-1018',
            operator_id='alex.morgan',
            status='recording',
            distance_km=8.2,
            detections_count=3,
            notes='Indiranagar Arterial Survey'
        )
        session.add(sess1)
        session.add(sess2)

        # Seed GPS route coordinates
        demo_coords = [
            (12.9716, 77.5946, 32.0, 3.5),
            (12.9725, 77.5954, 34.5, 3.2),
            (12.9734, 77.5962, 31.0, 4.0),
            (12.9742, 77.5971, 29.0, 3.8),
            (12.9750, 77.5980, 27.5, 4.2),
            (12.9758, 77.5992, 33.0, 3.6),
            (12.9767, 77.6005, 35.0, 3.1),
            (12.9774, 77.6018, 30.0, 4.5),
            (12.9782, 77.6030, 28.0, 3.9),
            (12.9787, 77.6040, 32.5, 3.4),
            (12.9792, 77.6051, 34.0, 3.5),
        ]
        for idx, (lat, lng, spd, acc) in enumerate(demo_coords):
            pt = GPSPoint(
                session_id='session-blr-north-01' if idx < 7 else 'session-blr-live-02',
                vehicle_id='RV-1001' if idx < 7 else 'RV-1018',
                latitude=lat,
                longitude=lng,
                speed=spd,
                accuracy=acc,
                is_valid=True,
                source='browser' if idx < 7 else 'edge_device',
                timestamp=datetime.utcnow(),
            )
            session.add(pt)

        # Seed Detections and Reports with Audit History
        demo_detections = [
            {
                'id': 'det-blr-01',
                'sess': 'session-blr-north-01',
                'veh': 'RV-1001',
                'cat': 'pothole',
                'conf': 0.94,
                'sev': 'High',
                'lat': 12.9719,
                'lng': 77.5948,
                'road': 'Kasturba Road - Northbound Lane 1',
                'status': 'verified',
                'rep_status': 'Repair Scheduled',
                'team': 'Rapid Asphalt Unit 3',
                'notes': 'Deep edge breakdown, high vehicle collision risk',
            },
            {
                'id': 'det-blr-02',
                'sess': 'session-blr-north-01',
                'veh': 'RV-1001',
                'cat': 'longitudinal_crack',
                'conf': 0.88,
                'sev': 'Medium',
                'lat': 12.9734,
                'lng': 77.5962,
                'road': 'MG Road Intersection Flyover',
                'status': 'verified',
                'rep_status': 'In Progress',
                'team': 'South Maintenance Crew',
                'notes': 'Crack spreading along lane separator line',
            },
            {
                'id': 'det-blr-03',
                'sess': 'session-blr-north-01',
                'veh': 'RV-1001',
                'cat': 'alligator_crack',
                'conf': 0.85,
                'sev': 'High',
                'lat': 12.9750,
                'lng': 77.5980,
                'road': 'Cubbon Road Service Pavement',
                'status': 'pending_review',
                'rep_status': 'Pending Review',
                'team': 'Unassigned',
                'notes': 'Extensive webbed cracking from water seepage',
            },
            {
                'id': 'det-blr-04',
                'sess': 'session-blr-north-01',
                'veh': 'RV-1001',
                'cat': 'transverse_crack',
                'conf': 0.82,
                'sev': 'Low',
                'lat': 12.9767,
                'lng': 77.6005,
                'road': 'Queens Road Junction',
                'status': 'verified',
                'rep_status': 'Repaired',
                'team': 'District Patch Crew A',
                'notes': 'Surface crack sealed with rubberized bitumen',
            },
            {
                'id': 'det-blr-05',
                'sess': 'session-blr-north-01',
                'veh': 'RV-1001',
                'cat': 'damaged_surface',
                'conf': 0.79,
                'sev': 'Medium',
                'lat': 12.9782,
                'lng': 77.6030,
                'road': 'Dickenson Road Entry',
                'status': 'pending_review',
                'rep_status': 'Detected',
                'team': 'Unassigned',
                'notes': 'Top layer raveling and loose gravel detected',
            },
            {
                'id': 'det-blr-06',
                'sess': 'session-blr-live-02',
                'veh': 'RV-1018',
                'cat': 'pothole',
                'conf': 0.96,
                'sev': 'High',
                'lat': 12.9792,
                'lng': 77.6051,
                'road': 'Old Madras Road - Sector 2',
                'status': 'verified',
                'rep_status': 'Repair Scheduled',
                'team': 'East District Paving Co.',
                'notes': 'Dangerous crater near bus stop lane',
            },
        ]

        for item in demo_detections:
            det = DetectionEvent(
                detection_id=item['id'],
                session_id=item['sess'],
                vehicle_id=item['veh'],
                category=item['cat'],
                confidence=item['conf'],
                severity=item['sev'],
                latitude=item['lat'],
                longitude=item['lng'],
                gps_accuracy=3.5,
                road_segment=item['road'],
                review_status=item['status'],
                source='demo_heuristic',
                is_location_reliable=True,
                location_warning='Verified fresh GPS sample. (Note: Camera forward look-ahead offset of ~5-15m applies).',
                timestamp=datetime.utcnow(),
            )
            session.add(det)

            rep = Report(
                detection_id=item['id'],
                status=item['rep_status'],
                assigned_team=item['team'],
                priority=item['sev'],
                maintenance_notes=item['notes'],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            session.add(rep)
            session.flush()

            # Add initial repair history audit record
            hist = RepairHistory(
                report_id=rep.id,
                detection_id=item['id'],
                previous_status=None,
                new_status=item['rep_status'],
                updated_by='alex.morgan',
                maintenance_notes=item['notes'],
                timestamp=datetime.utcnow(),
            )
            session.add(hist)

        session.add(CameraStatus(status='Connected', device_name='Integrated HD Webcam', connected=True))
        session.commit()
        return jsonify({'message': 'Comprehensive demonstration dataset seeded successfully!'})
    finally:
        session.close()


if __name__ == '__main__':
    init_db()
    app.run(host=settings.api_host, port=settings.api_port, debug=True)
