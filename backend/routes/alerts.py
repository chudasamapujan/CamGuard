from flask import Blueprint, request, jsonify
from backend.services.alert_service import AlertService
from backend.services.configuration_service import ConfigurationService

alerts_bp = Blueprint("alerts", __name__)

@alerts_bp.route("/api/alerts", methods=["GET"])
@alerts_bp.route("/alerts", methods=["GET"])
def list_alerts():
    """Retrieve system alerts."""
    active_only = request.args.get("active", "false").lower() == "true"
    limit = request.args.get("limit", 50, type=int)
    camera_id = request.args.get("camera_id")

    result = AlertService.list_alerts(active_only, limit, camera_id)
    return jsonify(result), 200

@alerts_bp.route("/api/alerts/<int:alert_id>/resolve", methods=["PUT"])
@alerts_bp.route("/alerts/<int:alert_id>/resolve", methods=["PUT"])
def resolve_alert(alert_id):
    """Resolve an active alert."""
    success = AlertService.resolve_alert(alert_id)
    if not success:
        return jsonify({"error": "Alert not found"}), 404
    return jsonify({"message": "Alert resolved successfully"}), 200

@alerts_bp.route("/api/settings", methods=["GET"])
@alerts_bp.route("/settings", methods=["GET"])
def get_settings():
    """Retrieve global configuration settings."""
    result = ConfigurationService.get_all_settings()
    return jsonify(result), 200

@alerts_bp.route("/api/settings", methods=["PUT", "POST"])
@alerts_bp.route("/settings", methods=["PUT", "POST"])
def update_settings():
    """Update global configuration settings."""
    from backend.config import Config
    if Config.API_KEY:
        provided_key = request.headers.get("X-API-Key") or request.headers.get("Authorization", "").replace("Bearer ", "")
        if provided_key != Config.API_KEY:
            return jsonify({"error": "Unauthorized: Invalid or missing API Key"}), 401

    data = request.get_json()
    success = ConfigurationService.update_settings(data)
    if not success:
        return jsonify({"error": "Failed to update settings"}), 400
    
    # Return updated settings
    result = ConfigurationService.get_all_settings()
    return jsonify({"message": "Settings updated successfully", "settings": result}), 200
