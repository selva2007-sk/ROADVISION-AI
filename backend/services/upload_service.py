import os
import uuid
from io import BytesIO
from pathlib import Path
from PIL import Image

try:
    from config import settings
except ImportError:
    from backend.config import settings

ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp'}
ALLOWED_MIMETYPES = {'image/jpeg', 'image/png', 'image/webp'}
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB


class UploadSecurityError(Exception):
    """Raised when an uploaded file fails security checks."""
    pass


def sanitize_filename(filename: str) -> str:
    """Generate a safe, random server-side filename with the validated extension."""
    if not filename:
        raise UploadSecurityError("Filename cannot be empty")
    
    clean_name = os.path.basename(filename).strip()
    ext = clean_name.rsplit('.', 1)[-1].lower() if '.' in clean_name else ''
    
    if ext not in ALLOWED_EXTENSIONS:
        raise UploadSecurityError(f"Unsupported file extension: .{ext}. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}")
    
    safe_name = f"evidence_{uuid.uuid4().hex[:16]}.{ext}"
    return safe_name


def validate_and_save_image(file_storage, target_dir: Path = None) -> tuple[str, str]:
    """
    Validates an uploaded image file:
    1. Checks filename and extension
    2. Limits upload byte size
    3. Decodes and verifies image integrity using PIL
    4. Confirms decoded image format matches allowed types
    5. Saves to safe destination preventing directory traversal
    
    Returns (safe_filename, relative_url_path)
    """
    if target_dir is None:
        target_dir = settings.upload_dir

    target_dir = Path(target_dir).resolve()
    target_dir.mkdir(parents=True, exist_ok=True)

    filename = getattr(file_storage, 'filename', '') or 'upload.jpg'
    safe_name = sanitize_filename(filename)

    # Read bytes with size check
    content = file_storage.read(MAX_UPLOAD_SIZE + 1)
    if len(content) > MAX_UPLOAD_SIZE:
        raise UploadSecurityError(f"File size exceeds maximum allowed limit of {MAX_UPLOAD_SIZE // (1024 * 1024)} MB")
    
    if len(content) == 0:
        raise UploadSecurityError("Uploaded file is empty")

    # Validate image decoding with Pillow
    try:
        img_buffer = BytesIO(content)
        with Image.open(img_buffer) as img:
            img.verify()  # Verifies file integrity without fully loading all pixels
            detected_format = (img.format or '').lower()
            if detected_format not in {'jpeg', 'png', 'webp'}:
                raise UploadSecurityError(f"Invalid image format decoded: {detected_format}. Must be JPEG, PNG, or WEBP")
    except Exception as e:
        if isinstance(e, UploadSecurityError):
            raise
        raise UploadSecurityError(f"Failed to decode image content: Corrupted or invalid image data")

    # Destination path with traversal defense
    dest_path = (target_dir / safe_name).resolve()
    try:
        # Check that dest_path is strictly within target_dir
        dest_path.relative_to(target_dir)
    except ValueError:
        raise UploadSecurityError("Directory traversal detected in destination path")

    with open(dest_path, 'wb') as f:
        f.write(content)

    url_path = f"/api/uploads/{safe_name}"
    return safe_name, url_path


def get_safe_file_path(filename: str, base_dir: Path = None) -> Path:
    """Safely resolve a filename in the upload directory, preventing traversal attacks."""
    if base_dir is None:
        base_dir = settings.upload_dir

    base_dir = Path(base_dir).resolve()
    clean_name = os.path.basename(filename)
    resolved_path = (base_dir / clean_name).resolve()

    try:
        resolved_path.relative_to(base_dir)
    except ValueError:
        raise UploadSecurityError("Access denied: Invalid file path")

    if not resolved_path.is_file():
        raise FileNotFoundError(f"File not found: {clean_name}")

    return resolved_path
