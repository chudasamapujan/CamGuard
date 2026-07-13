from flask import Blueprint, request, jsonify
from backend.services.alert_service import AlertService
from backend.services.history_service import HistoryService
from backend.limiter import limiter

health_bp = Blueprint("health", __name__)

@health_bp.route("/api/health", methods=["POST"])
@health_bp.route("/health", methods=["POST"])
@limiter.limit("300 per minute")
def ingest_health_data():
    """Ingest telemetry metrics from the camera simulator."""
    data = request.get_json(silent=True)
    if not data or not isinstance(data, dict):
        return jsonify({"error": "Invalid or missing JSON payload"}), 400

    if "camera_id" not in data or not data["camera_id"] or not isinstance(data["camera_id"], str):
        return jsonify({"error": "Missing camera_id in payload"}), 400

    for metric in ["cpu_usage", "memory_usage", "storage_usage"]:
        if metric in data and data[metric] is not None:
            val = data[metric]
            if not isinstance(val, (int, float)) or isinstance(val, bool):
                return jsonify({"error": f"Metric {metric} must be numeric (float or int)"}), 400
            if not (0 <= val <= 100):
                return jsonify({"error": f"Metric {metric} must be between 0 and 100"}), 400

    if "network_latency" in data and data["network_latency"] is not None:
        val = data["network_latency"]
        if not isinstance(val, (int, float)) or isinstance(val, bool):
            return jsonify({"error": "Metric network_latency must be numeric (float or int)"}), 400
        if val < 0:
            return jsonify({"error": "Metric network_latency must be non-negative (>= 0)"}), 400

    result, error = AlertService.ingest_health_data(data)
    if error:
        return jsonify({"error": error}), 400
    return jsonify(result), 201

@health_bp.route("/api/cameras/<camera_id>/history", methods=["GET"])
@health_bp.route("/api/history/<camera_id>", methods=["GET"])
@health_bp.route("/history/<camera_id>", methods=["GET"])
@limiter.limit("120 per minute")
def get_camera_history(camera_id):
    """Retrieve time-series health logs for a camera."""
    hours = request.args.get("hours", 24, type=int)
    result = HistoryService.get_camera_history(camera_id, hours)
    return jsonify(result), 200

@health_bp.route("/api/dashboard/history", methods=["GET"])
@health_bp.route("/dashboard/history", methods=["GET"])
@limiter.limit("120 per minute")
def get_dashboard_history():
    """Retrieve aggregated fleet-wide performance history."""
    hours = request.args.get("hours", 24, type=int)
    result = HistoryService.get_dashboard_history(hours)
    return jsonify(result), 200
