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
    """List alerts, optionally filtered by active status and camera_id."""
    active_only = request.args.get("active", "false").lower() == "true"
    limit = request.args.get("limit", 50, type=int)
    camera_id = request.args.get("camera_id")

    query = Alert.query

    if active_only:
        query = query.filter_by(resolved=False)
    if camera_id:
        query = query.filter_by(camera_id=camera_id)

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
    alert = db.session.get(Alert, alert_id)
    if not alert:
        return jsonify({"error": "Alert not found"}), 404

    if alert.resolved:
        return jsonify({"message": "Alert already resolved"}), 200

    alert.resolved = True
    alert.resolved_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({"message": "Alert resolved", "alert": alert.to_dict()}), 200


@alerts_bp.route("/api/settings", methods=["GET"])
def get_settings():
    """Retrieve all global configuration settings from DB."""
    from backend.models import Setting
    settings = Setting.query.all()
    result = {s.key: s.value for s in settings}
    return jsonify(result), 200


@alerts_bp.route("/api/settings", methods=["PUT"])
def update_settings():
    """Update global configuration settings in DB."""
    from backend.models import Setting
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    for key, val in data.items():
        setting = db.session.get(Setting, key)
        if setting:
            setting.value = str(val)
        else:
            setting = Setting(key=key, value=str(val))
            db.session.add(setting)

    db.session.commit()

    # Synchronize thresholds to local Config.THRESHOLDS as backup/fallback
    settings = Setting.query.all()
    s_dict = {s.key: s.value for s in settings}
    if "cpu_threshold" in s_dict:
        Config.THRESHOLDS["cpu_warning"] = float(s_dict["cpu_threshold"])
        Config.THRESHOLDS["cpu_critical"] = float(s_dict["cpu_threshold"]) * 1.2
    if "memory_threshold" in s_dict:
        Config.THRESHOLDS["memory_warning"] = float(s_dict["memory_threshold"])
        Config.THRESHOLDS["memory_critical"] = float(s_dict["memory_threshold"]) * 1.2
    if "storage_threshold" in s_dict:
        Config.THRESHOLDS["storage_warning"] = float(s_dict["storage_threshold"])
        Config.THRESHOLDS["storage_critical"] = float(s_dict["storage_threshold"]) * 1.15
    if "latency_threshold" in s_dict:
        Config.THRESHOLDS["latency_warning"] = float(s_dict["latency_threshold"])
        Config.THRESHOLDS["latency_critical"] = float(s_dict["latency_threshold"]) * 2.5
    if "heartbeat_timeout" in s_dict:
        Config.THRESHOLDS["heartbeat_timeout"] = int(s_dict["heartbeat_timeout"])

    return jsonify({"message": "Settings updated successfully", "settings": s_dict}), 200


@alerts_bp.route("/api/config/thresholds", methods=["GET"])
def get_thresholds():
    """Get current threshold configuration from DB."""
    from backend.models import Setting
    settings = Setting.query.all()
    s_dict = {s.key: s.value for s in settings}
    
    thresholds = {
        "cpu_warning": float(s_dict.get("cpu_threshold", 75.0)),
        "cpu_critical": float(s_dict.get("cpu_threshold", 75.0)) * 1.2,
        "memory_warning": float(s_dict.get("memory_threshold", 75.0)),
        "memory_critical": float(s_dict.get("memory_threshold", 75.0)) * 1.2,
        "storage_warning": float(s_dict.get("storage_threshold", 80.0)),
        "storage_critical": float(s_dict.get("storage_threshold", 80.0)) * 1.15,
        "latency_warning": float(s_dict.get("latency_threshold", 200.0)),
        "latency_critical": float(s_dict.get("latency_threshold", 200.0)) * 2.5,
        "heartbeat_timeout": int(s_dict.get("heartbeat_timeout", 90)),
    }
    return jsonify(thresholds), 200


@alerts_bp.route("/api/config/thresholds", methods=["PUT"])
def update_thresholds():
    """Update threshold configuration at runtime."""
    from backend.models import Setting
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    mappings = {
        "cpu_warning": "cpu_threshold",
        "memory_warning": "memory_threshold",
        "storage_warning": "storage_threshold",
        "latency_warning": "latency_threshold",
        "heartbeat_timeout": "heartbeat_timeout",
    }

    for key, value in data.items():
        if key in mappings:
            setting_key = mappings[key]
            setting = db.session.get(Setting, setting_key)
            if setting:
                setting.value = str(value)
            else:
                db.session.add(Setting(key=setting_key, value=str(value)))

    db.session.commit()
    return jsonify({"message": "Thresholds updated"}), 200
