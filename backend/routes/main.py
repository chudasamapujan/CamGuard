from flask import Blueprint, jsonify
from sqlalchemy import text
from backend.database import db

main_bp = Blueprint('main', __name__)

@main_bp.route('/api/health', methods=['GET'])
def health_check():
    """Verify that the API is online and the database is accessible."""
    health_status = {
        'status': 'healthy',
        'api_version': '1.0.0',
        'database': 'disconnected'
    }
    
    try:
        # Check database connectivity by running a fast query
        db.session.execute(text('SELECT 1'))
        health_status['database'] = 'connected'
        status_code = 200
    except Exception as e:
        # Log the exception for developer visibility
        # In a real app we'd use app.logger.error(e)
        health_status['status'] = 'unhealthy'
        health_status['database'] = 'error'
        health_status['error_details'] = str(e)
        status_code = 500
        
    return jsonify(health_status), status_code
