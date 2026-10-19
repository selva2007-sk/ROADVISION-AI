import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


class Settings:
    def __init__(self):
        base_dir = Path(__file__).resolve().parent
        # On Vercel, /tmp is writable; locally, use base_dir / 'data'
        is_vercel = bool(os.getenv('VERCEL'))
        default_dir = Path('/tmp') if is_vercel else (base_dir / 'data')
        self.database_path = os.getenv('DATABASE_PATH', str(default_dir / 'roadvision.db'))
        self.jwt_secret = os.getenv('JWT_SECRET', 'demo-secret')
        self.model_name = os.getenv('MODEL_NAME', 'demo-road-damage-model')
        self.model_mode = os.getenv('MODEL_MODE', 'demo')
        self.api_host = os.getenv('API_HOST', '0.0.0.0')
        self.api_port = int(os.getenv('API_PORT', '5000'))
        self.data_dir = default_dir

        self.upload_dir = Path(os.getenv('UPLOAD_DIR', str(default_dir / 'uploads')))
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.max_upload_size = int(os.getenv('MAX_UPLOAD_SIZE', 10 * 1024 * 1024))  # 10MB
        self.allowed_extensions = {'png', 'jpg', 'jpeg', 'webp'}

        self.data_dir.mkdir(parents=True, exist_ok=True)

        db_dir = Path(self.database_path).parent
        db_dir.mkdir(parents=True, exist_ok=True)

        # Pre-seed existing database on Vercel ephemeral storage if not already initialized
        if is_vercel and not Path(self.database_path).exists():
            seed_db = base_dir / 'data' / 'roadvision.db'
            if seed_db.exists():
                try:
                    import shutil
                    shutil.copy2(seed_db, self.database_path)
                except Exception as e:
                    print(f"[Settings] Could not copy initial DB: {e}")


settings = Settings()

