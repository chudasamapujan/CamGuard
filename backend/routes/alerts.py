from flask import Blueprint, request, jsonify
from backend.services.alert_service import AlertService
from backend.limiter import limiter

alerts_bp = Blueprint("alerts", __name__)

@alerts_bp.route("/api/alerts", methods=["GET"])
@alerts_bp.route("/alerts", methods=["GET"])
@limiter.limit("120 per minute")
def list_alerts():
    """Retrieve system alerts."""
    active_only = request.args.get("active", "false").lower() == "true"
    limit = request.args.get("limit", 50, type=int)
    camera_id = request.args.get("camera_id")

    result = AlertService.list_alerts(active_only, limit, camera_id)
    return jsonify(result), 200

@alerts_bp.route("/api/alerts/<int:alert_id>/resolve", methods=["PUT"])
@alerts_bp.route("/alerts/<int:alert_id>/resolve", methods=["PUT"])
@limiter.limit("30 per minute")
def resolve_alert(alert_id):
    """Resolve an active alert."""
    success = AlertService.resolve_alert(alert_id)
    if not success:
        return jsonify({"error": "Alert not found"}), 404
    return jsonify({"message": "Alert resolved successfully"}), 200

