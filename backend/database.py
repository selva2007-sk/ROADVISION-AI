from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

from config import settings

Base = declarative_base()
engine = create_engine(f"sqlite:///{settings.database_path}")
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def init_db():
    from models import CameraStatus, DetectionEvent, GPSPoint, InspectionSession, RepairHistory, Report, UserProfile, Vehicle
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

        # User profiles migrations
        add_column_if_missing('user_profiles', 'password_hash', 'VARCHAR(256)')
        add_column_if_missing('user_profiles', 'status', 'VARCHAR(40) DEFAULT "active"')

        # Vehicles migrations
        add_column_if_missing('vehicles', 'current_latitude', 'FLOAT')
        add_column_if_missing('vehicles', 'current_longitude', 'FLOAT')
        add_column_if_missing('vehicles', 'current_speed', 'FLOAT')
        add_column_if_missing('vehicles', 'gps_accuracy', 'FLOAT')
        add_column_if_missing('vehicles', 'gps_source', 'VARCHAR(50) DEFAULT "browser"')
        add_column_if_missing('vehicles', 'is_active', 'BOOLEAN DEFAULT 1')
        add_column_if_missing('vehicles', 'last_location_update', 'DATETIME')

        # Inspection sessions migrations
        add_column_if_missing('inspection_sessions', 'operator_id', 'VARCHAR(120) DEFAULT "alex.morgan"')

        # GPS points migrations
        add_column_if_missing('gps_points', 'vehicle_id', 'VARCHAR(120)')
        add_column_if_missing('gps_points', 'is_valid', 'BOOLEAN DEFAULT 1')
        add_column_if_missing('gps_points', 'source', 'VARCHAR(50) DEFAULT "browser"')

        # Detection events migrations
        add_column_if_missing('detection_events', 'vehicle_id', 'VARCHAR(120)')
        add_column_if_missing('detection_events', 'is_location_reliable', 'BOOLEAN DEFAULT 1')
        add_column_if_missing('detection_events', 'location_warning', 'VARCHAR(200)')

        # Reports migrations
        add_column_if_missing('reports', 'priority', 'VARCHAR(40) DEFAULT "Medium"')
        add_column_if_missing('reports', 'created_at', 'DATETIME')
        try:
            conn.execute(text("UPDATE reports SET created_at = updated_at WHERE created_at IS NULL;"))
            conn.commit()
        except Exception as e:
            print(f"[DB Migration] created_at backfill note: {e}")

        # Performance indexes (non-destructive)
        try:
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_detection_session ON detection_events(session_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_detection_category ON detection_events(category);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_detection_review ON detection_events(review_status);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_gps_session ON gps_points(session_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_reports_detection ON reports(detection_id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_repair_history_detection ON repair_history(detection_id);"))
            conn.commit()
        except Exception as e:
            print(f"[DB Migration] Index creation note: {e}")

    # Ensure default users have a secure password hash
    from werkzeug.security import generate_password_hash
    session = SessionLocal()
    try:
        users = session.query(UserProfile).all()
        for u in users:
            if not u.password_hash:
                u.password_hash = generate_password_hash('roadvision2026!')
        session.commit()
    except Exception as e:
        print(f"[DB Migration] Password seeding note: {e}")
    finally:
        session.close()


