from sqlalchemy import Boolean, Column, Float, Integer, String, Text, DateTime
from sqlalchemy.sql import func

from database import Base


class UserProfile(Base):
    __tablename__ = 'user_profiles'
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(80), unique=True, nullable=False, default='admin')
    full_name = Column(String(120), nullable=False, default='Chief Engineer Alex Morgan')
    email = Column(String(120), nullable=False, default='alex.morgan@roadvision.gov')
    password_hash = Column(String(256), nullable=True)
    phone = Column(String(40), nullable=True, default='+1 (555) 438-9210')
    role = Column(String(50), nullable=False, default='Administrator')  # Administrator, Inspection Operator, Maintenance Staff, Viewer
    status = Column(String(40), nullable=False, default='active')  # active, suspended
    department = Column(String(120), nullable=True, default='Urban Road Infrastructure & Civil Assets')
    avatar_url = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), server_default=func.now())


class Vehicle(Base):
    __tablename__ = 'vehicles'
    id = Column(Integer, primary_key=True, autoincrement=True)
    vehicle_id = Column(String(120), unique=True, nullable=False)
    vehicle_type = Column(String(80), nullable=False)
    registration_id = Column(String(120), nullable=True)
    assigned_camera = Column(String(120), nullable=True)
    gps_status = Column(String(40), default='GPS Unavailable')
    current_latitude = Column(Float, nullable=True)
    current_longitude = Column(Float, nullable=True)
    current_speed = Column(Float, nullable=True)
    gps_accuracy = Column(Float, nullable=True)
    gps_source = Column(String(50), default='browser')
    is_active = Column(Boolean, default=True)
    last_location_update = Column(DateTime(timezone=True), nullable=True)
    last_inspection_date = Column(DateTime(timezone=True), nullable=True)


class InspectionSession(Base):
    __tablename__ = 'inspection_sessions'
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(120), unique=True, nullable=False)
    vehicle_id = Column(String(120), nullable=True)
    operator_id = Column(String(120), nullable=True, default='alex.morgan')
    status = Column(String(40), default='created')  # created, recording, paused, completed
    start_time = Column(DateTime(timezone=True), server_default=func.now())
    end_time = Column(DateTime(timezone=True), nullable=True)
    distance_km = Column(Float, default=0.0)
    detections_count = Column(Integer, default=0)
    notes = Column(Text, nullable=True)


class GPSPoint(Base):
    __tablename__ = 'gps_points'
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(120), nullable=False)
    vehicle_id = Column(String(120), nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    speed = Column(Float, nullable=True)
    accuracy = Column(Float, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    is_valid = Column(Boolean, default=True)
    source = Column(String(50), default='browser')


class DetectionEvent(Base):
    __tablename__ = 'detection_events'
    id = Column(Integer, primary_key=True, autoincrement=True)
    detection_id = Column(String(120), unique=True, nullable=False)
    session_id = Column(String(120), nullable=False)
    vehicle_id = Column(String(120), nullable=True)
    category = Column(String(80), nullable=False)  # pothole, longitudinal_crack, transverse_crack, alligator_crack, damaged_surface
    confidence = Column(Float, nullable=False)
    severity = Column(String(40), nullable=False)  # Low, Medium, High
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    gps_accuracy = Column(Float, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    evidence_image = Column(Text, nullable=True)
    bbox = Column(String(120), nullable=True)  # JSON or comma-separated bounding box
    road_segment = Column(String(160), nullable=True)
    review_status = Column(String(40), default='pending_review')  # pending_review, verified, rejected
    source = Column(String(40), default='demo')  # real_yolo, demo_synthetic, demo_edge
    is_location_reliable = Column(Boolean, default=True)
    location_warning = Column(String(200), nullable=True)


class Report(Base):
    __tablename__ = 'reports'
    id = Column(Integer, primary_key=True, autoincrement=True)
    detection_id = Column(String(120), unique=True, nullable=False)
    status = Column(String(40), default='Detected')  # Detected, Pending Review, Verified, Repair Scheduled, In Progress, Repaired, Rejected
    assigned_team = Column(String(120), nullable=True)
    priority = Column(String(40), default='Medium')  # Low, Medium, High, Urgent
    maintenance_notes = Column(Text, nullable=True)
    repair_evidence = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class RepairHistory(Base):
    __tablename__ = 'repair_history'
    id = Column(Integer, primary_key=True, autoincrement=True)
    report_id = Column(Integer, nullable=True)
    detection_id = Column(String(120), nullable=False)
    previous_status = Column(String(40), nullable=True)
    new_status = Column(String(40), nullable=False)
    updated_by = Column(String(120), nullable=False, default='alex.morgan')
    maintenance_notes = Column(Text, nullable=True)
    evidence_image = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())


class CameraStatus(Base):
    __tablename__ = 'camera_status'
    id = Column(Integer, primary_key=True, autoincrement=True)
    status = Column(String(40), default='Disconnected')
    device_name = Column(String(120), nullable=True)
    connected = Column(Boolean, default=False)

