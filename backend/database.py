from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

from config import settings

Base = declarative_base()
engine = create_engine(f"sqlite:///{settings.database_path}")
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def init_db():
    from models import CameraStatus, DetectionEvent, GPSPoint, InspectionSession, Report, UserProfile, Vehicle
    Base.metadata.create_all(bind=engine)

    # Safe non-destructive migrations for existing SQLite databases
    with engine.connect() as conn:
        def add_column_if_missing(table_name, col_name, col_type):
            try:
                res = conn.execute(text(f"PRAGMA table_info({table_name});")).fetchall()
                existing_cols = [r[1] for r in res]
                if col_name not in existing_cols:
                    conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type};"))
                    conn.commit()
                    print(f"[DB Migration] Added column '{col_name}' ({col_type}) to '{table_name}'")
            except Exception as e:
                print(f"[DB Migration] Column check note for {table_name}.{col_name}: {e}")

        # Vehicles migrations
        add_column_if_missing('vehicles', 'current_latitude', 'FLOAT')
        add_column_if_missing('vehicles', 'current_longitude', 'FLOAT')
        add_column_if_missing('vehicles', 'current_speed', 'FLOAT')
        add_column_if_missing('vehicles', 'gps_accuracy', 'FLOAT')
        add_column_if_missing('vehicles', 'gps_source', 'VARCHAR(50) DEFAULT "browser"')
        add_column_if_missing('vehicles', 'last_location_update', 'DATETIME')

        # GPS points migrations
        add_column_if_missing('gps_points', 'vehicle_id', 'VARCHAR(120)')
        add_column_if_missing('gps_points', 'is_valid', 'BOOLEAN DEFAULT 1')
        add_column_if_missing('gps_points', 'source', 'VARCHAR(50) DEFAULT "browser"')

        # Detection events migrations
        add_column_if_missing('detection_events', 'vehicle_id', 'VARCHAR(120)')
        add_column_if_missing('detection_events', 'is_location_reliable', 'BOOLEAN DEFAULT 1')
        add_column_if_missing('detection_events', 'location_warning', 'VARCHAR(200)')

