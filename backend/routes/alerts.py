"""
Alert Routes
------------
Endpoints for querying and managing alerts.

GET  /api/alerts              - List alerts (filterable by ?active=true)
GET  /api/alerts/summary      - Alert counts by severity
PUT  /api/alerts/<id>/resolve - Mark an alert as resolved
GET  /api/config/thresholds   - Get current thresholds
PUT  /api/config/thresholds   - Update thresholds at runtime

Design decisions:
- Alerts are returned newest-first for the dashboard feed
- Threshold config endpoint allows runtime tuning without restarting the server
- Resolve endpoint marks an alert as resolved and records the resolution time
"""

from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from backend.database import db
from backend.models import Alert
from backend.config import Config

alerts_bp = Blueprint("alerts", __name__)


@alerts_bp.route("/api/alerts", methods=["GET"])
def list_alerts():
    """List alerts, optionally filtered by active status."""
    active_only = request.args.get("active", "false").lower() == "true"
    limit = request.args.get("limit", 50, type=int)

    query = Alert.query

    if active_only:
        query = query.filter_by(resolved=False)

    alerts = (
        query
        .order_by(Alert.created_at.desc())
        .limit(limit)
        .all()
    )

    return jsonify([a.to_dict() for a in alerts]), 200


@alerts_bp.route("/api/alerts/summary", methods=["GET"])
def alerts_summary():
    """Get alert counts by severity."""
    total_active = Alert.query.filter_by(resolved=False).count()
    critical = Alert.query.filter_by(resolved=False, severity="critical").count()
    warning = Alert.query.filter_by(resolved=False, severity="warning").count()
    total_resolved = Alert.query.filter_by(resolved=True).count()

    return jsonify({
        "total_active": total_active,
        "critical": critical,
        "warning": warning,
        "total_resolved": total_resolved,
    }), 200


@alerts_bp.route("/api/alerts/<int:alert_id>/resolve", methods=["PUT"])
def resolve_alert(alert_id):
    """Mark an alert as resolved."""
    alert = Alert.query.get(alert_id)
    if not alert:
        return jsonify({"error": "Alert not found"}), 404

    if alert.resolved:
        return jsonify({"message": "Alert already resolved"}), 200

    alert.resolved = True
    alert.resolved_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({"message": "Alert resolved", "alert": alert.to_dict()}), 200


@alerts_bp.route("/api/config/thresholds", methods=["GET"])
def get_thresholds():
    """Get current threshold configuration."""
    return jsonify(Config.THRESHOLDS), 200


@alerts_bp.route("/api/config/thresholds", methods=["PUT"])
def update_thresholds():
    """Update threshold configuration at runtime."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    for key, value in data.items():
        if key in Config.THRESHOLDS:
            Config.THRESHOLDS[key] = float(value)

    return jsonify({
        "message": "Thresholds updated",
        "thresholds": Config.THRESHOLDS,
    }), 200
