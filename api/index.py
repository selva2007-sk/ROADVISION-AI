import os
import sys
from pathlib import Path

# Add project root and backend folder to sys.path
current_dir = Path(__file__).resolve().parent
project_root = current_dir.parent
backend_dir = project_root / 'backend'

if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

# Import the Flask application and initialize DB
from backend.app import app
from backend.database import init_db

try:
    init_db()
except Exception as err:
    print(f"[Vercel Serverless] DB init note: {err}")

# Export app for Vercel WSGI
__all__ = ['app']
