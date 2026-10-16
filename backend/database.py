from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from config import settings

Base = declarative_base()
engine = create_engine(f"sqlite:///{settings.database_path}")
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def init_db():
    from models import CameraStatus, DetectionEvent, GPSPoint, InspectionSession, Report, UserProfile, Vehicle
    Base.metadata.create_all(bind=engine)
