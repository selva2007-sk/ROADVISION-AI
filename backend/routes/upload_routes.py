from flask import Blueprint, jsonify, request, send_file

try:
    from services.upload_service import (
        validate_and_save_image,
        get_safe_file_path,
        UploadSecurityError,
    )
    from services.auth_service import require_role
except ImportError:
    from backend.services.upload_service import (
        validate_and_save_image,
        get_safe_file_path,
        UploadSecurityError,
    )
    from backend.services.auth_service import require_role

upload_bp = Blueprint('upload', __name__)


@upload_bp.route('/upload', methods=['POST'])
@require_role('Administrator', 'Inspection Operator', 'Maintenance Staff')
def upload_file():
    """Secure endpoint for uploading evidence images (repair evidence, camera captures)."""
    if 'file' not in request.files and 'image' not in request.files:
        return jsonify({'error': 'No file part in the request. Use "file" or "image" parameter.'}), 400

    file_obj = request.files.get('file') or request.files.get('image')
    if not file_obj or file_obj.filename == '':
        return jsonify({'error': 'No file selected for uploading'}), 400

    try:
        safe_name, url_path = validate_and_save_image(file_obj)
        return jsonify({
            'message': 'Image uploaded and validated successfully',
            'filename': safe_name,
            'url': url_path,
        }), 201
    except UploadSecurityError as err:
        return jsonify({'error': f"Upload security validation failed: {str(err)}"}), 400
    except Exception as e:
        return jsonify({'error': f"Internal server error processing file upload: {str(e)}"}), 500


@upload_bp.route('/uploads/<path:filename>', methods=['GET'])
def serve_uploaded_file(filename):
    """Safely serve uploaded evidence images with directory traversal protection."""
    try:
        safe_path = get_safe_file_path(filename)
        return send_file(safe_path)
    except FileNotFoundError:
        return jsonify({'error': 'Requested file not found'}), 404
    except UploadSecurityError:
        return jsonify({'error': 'Access denied: Invalid file path'}), 403
    except Exception as e:
        return jsonify({'error': f'Unable to retrieve file: {str(e)}'}), 500
