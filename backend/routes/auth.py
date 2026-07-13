from flask import Blueprint, request, jsonify
from backend.config import Config
from backend.limiter import limiter

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/api/auth/verify", methods=["POST", "GET"])
@auth_bp.route("/auth/verify", methods=["POST", "GET"])
@limiter.limit("10 per minute")
def verify_auth():
    """Verify API Key authentication status."""
    if not Config.API_KEY:
        return jsonify({"authenticated": True, "auth_required": False}), 200

    provided_key = request.headers.get("X-API-Key") or request.headers.get("Authorization", "").replace("Bearer ", "")
    if provided_key != Config.API_KEY:
        return jsonify({"error": "Unauthorized: Invalid or missing API Key", "authenticated": False, "auth_required": True}), 401

    return jsonify({"authenticated": True, "auth_required": True}), 200
