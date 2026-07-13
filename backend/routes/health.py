from flask import Blueprint, request, jsonify
from backend.services.alert_service import AlertService
from backend.services.history_service import HistoryService

health_bp = Blueprint("health", __name__)

@health_bp.route("/api/health", methods=["POST"])
@health_bp.route("/health", methods=["POST"])
def ingest_health_data():
    """Ingest telemetry metrics from the camera simulator."""
    data = request.get_json()
    result, error = AlertService.ingest_health_data(data)
    if error:
        return jsonify({"error": error}), 400
    return jsonify(result), 201

@health_bp.route("/api/cameras/<camera_id>/history", methods=["GET"])
@health_bp.route("/api/history/<camera_id>", methods=["GET"])
@health_bp.route("/history/<camera_id>", methods=["GET"])
def get_camera_history(camera_id):
    """Retrieve time-series health logs for a camera."""
    hours = request.args.get("hours", 24, type=int)
    result = HistoryService.get_camera_history(camera_id, hours)
    return jsonify(result), 200

@health_bp.route("/api/dashboard/history", methods=["GET"])
@health_bp.route("/dashboard/history", methods=["GET"])
def get_dashboard_history():
    """Retrieve aggregated fleet-wide performance history."""
    hours = request.args.get("hours", 24, type=int)
    result = HistoryService.get_dashboard_history(hours)
    return jsonify(result), 200
