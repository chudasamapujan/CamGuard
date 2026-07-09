from flask import Blueprint, jsonify, request
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

@main_bp.route('/api/telemetry', methods=['POST'])
def receive_telemetry():
    """Receive camera telemetry heartbeats (Stub Endpoint)."""
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "No JSON payload received"}), 400
        
    required_fields = [
        "camera_id", "camera_name", "is_online", "cpu_usage", 
        "memory_usage", "storage_usage", "latency", "last_heartbeat", "fault_status"
    ]
    
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        return jsonify({"status": "error", "message": f"Missing fields: {missing_fields}"}), 400
        
    # Console logging log output for verification
    status_indicator = "ONLINE" if data["is_online"] else "OFFLINE"
    print(f"[Ingestion Stub] Received payload from camera '{data['camera_id']}' [{status_indicator}] "
          f"- CPU: {data['cpu_usage']}%, Mem: {data['memory_usage']}%, Storage: {data['storage_usage']}%, "
          f"Latency: {data['latency']}ms, Fault: {data['fault_status']}", flush=True)
    
    return jsonify({"status": "received", "camera_id": data["camera_id"]}), 201

