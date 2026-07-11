from flask import Blueprint, jsonify
from backend.services.health_evaluation_service import HealthEvaluationService

cameras_bp = Blueprint("cameras", __name__)

@cameras_bp.route("/api/cameras", methods=["GET"])
@cameras_bp.route("/cameras", methods=["GET"])
def list_cameras():
    """List all registered cameras with dynamic status and latest metrics."""
    result = HealthEvaluationService.list_cameras()
    return jsonify(result), 200

@cameras_bp.route("/api/cameras/<camera_id>", methods=["GET"])
@cameras_bp.route("/cameras/<camera_id>", methods=["GET"])
def get_camera(camera_id):
    """Retrieve details for a single camera node."""
    result = HealthEvaluationService.get_camera(camera_id)
    if not result:
        return jsonify({"error": "Camera not found"}), 404
    return jsonify(result), 200

@cameras_bp.route("/api/dashboard/summary", methods=["GET"])
@cameras_bp.route("/dashboard/summary", methods=["GET"])
def get_dashboard_summary():
    """Retrieve aggregate fleet statistics for dashboard summary cards."""
    result = HealthEvaluationService.get_dashboard_summary()
    return jsonify(result), 200
