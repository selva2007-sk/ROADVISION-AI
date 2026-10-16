import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


class Settings:
    def __init__(self):
        base_dir = Path(__file__).resolve().parent
        self.database_path = os.getenv('DATABASE_PATH', str(base_dir / 'data' / 'roadvision.db'))
        self.jwt_secret = os.getenv('JWT_SECRET', 'demo-secret')
        self.model_name = os.getenv('MODEL_NAME', 'demo-road-damage-model')
        self.model_mode = os.getenv('MODEL_MODE', 'demo')
        self.api_host = os.getenv('API_HOST', '0.0.0.0')
        self.api_port = int(os.getenv('API_PORT', '5000'))
        self.data_dir = base_dir / 'data'

        self.data_dir.mkdir(parents=True, exist_ok=True)

        db_dir = Path(self.database_path).parent
        db_dir.mkdir(parents=True, exist_ok=True)


settings = Settings()
