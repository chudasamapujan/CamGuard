from flask import Blueprint, request, jsonify
from backend.services.configuration_service import ConfigurationService
from backend.limiter import limiter

settings_bp = Blueprint("settings", __name__)

@settings_bp.route("/api/settings", methods=["GET"])
@settings_bp.route("/settings", methods=["GET"])
@limiter.limit("60 per minute")
def get_settings():
    """Retrieve global configuration settings."""
    result = ConfigurationService.get_all_settings()
    return jsonify(result), 200

@settings_bp.route("/api/settings", methods=["PUT", "POST"])
@settings_bp.route("/settings", methods=["PUT", "POST"])
@limiter.limit("15 per minute")
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
