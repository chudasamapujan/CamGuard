"""
Camera Routes
-------------
CRUD and query endpoints for camera data.

GET  /api/cameras              - List all cameras with latest status
GET  /api/cameras/<id>         - Single camera details with latest health record
GET  /api/cameras/<id>/history - Historical health records (filterable by hours)
GET  /api/dashboard/summary    - Aggregate stats for the dashboard summary cards

Design decisions:
- History endpoint supports ?hours=N parameter (default 24h) to limit data volume
- Summary endpoint aggregates counts for the dashboard in a single call
- Latest health record is included in the camera detail for quick access
"""

from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify
from backend.database import db
from backend.models import Camera, HealthRecord, Alert

cameras_bp = Blueprint("cameras", __name__)


@cameras_bp.route("/api/cameras", methods=["GET"])
def list_cameras():
    """List all cameras with their current status."""
    cameras = Camera.query.order_by(Camera.id).all()
    result = []

    for cam in cameras:
        cam_dict = cam.to_dict()
        # Include latest health record
        latest = (
            HealthRecord.query
            .filter_by(camera_id=cam.id)
            .order_by(HealthRecord.timestamp.desc())
            .first()
        )
        cam_dict["latest_health"] = latest.to_dict() if latest else None

        # Count active alerts
        active_alerts = Alert.query.filter_by(
            camera_id=cam.id, resolved=False
        ).count()
        cam_dict["active_alerts"] = active_alerts

        result.append(cam_dict)

    return jsonify(result), 200


@cameras_bp.route("/api/cameras/<camera_id>", methods=["GET"])
def get_camera(camera_id):
    """Get single camera details."""
    camera = Camera.query.get(camera_id)
    if not camera:
        return jsonify({"error": "Camera not found"}), 404

    cam_dict = camera.to_dict()

    # Include latest health record
    latest = (
        HealthRecord.query
        .filter_by(camera_id=camera_id)
        .order_by(HealthRecord.timestamp.desc())
        .first()
    )
    cam_dict["latest_health"] = latest.to_dict() if latest else None

    # Active alerts
    active_alerts = Alert.query.filter_by(
        camera_id=camera_id, resolved=False
    ).all()
    cam_dict["active_alerts"] = [a.to_dict() for a in active_alerts]

    return jsonify(cam_dict), 200


@cameras_bp.route("/api/cameras/<camera_id>/history", methods=["GET"])
def get_camera_history(camera_id):
    """Get historical health data for a camera."""
    camera = Camera.query.get(camera_id)
    if not camera:
        return jsonify({"error": "Camera not found"}), 404

    # Default to last 24 hours, configurable via ?hours=N
    hours = request.args.get("hours", 24, type=int)
    since = datetime.now(timezone.utc) - timedelta(hours=hours)

    records = (
        HealthRecord.query
        .filter(HealthRecord.camera_id == camera_id)
        .filter(HealthRecord.timestamp >= since)
        .order_by(HealthRecord.timestamp.asc())
        .all()
    )

    return jsonify({
        "camera_id": camera_id,
        "hours": hours,
        "count": len(records),
        "records": [r.to_dict() for r in records],
    }), 200


@cameras_bp.route("/api/dashboard/summary", methods=["GET"])
def dashboard_summary():
    """Get aggregate dashboard stats."""
    total = Camera.query.count()
    online = Camera.query.filter_by(status="online").count()
    warning = Camera.query.filter_by(status="warning").count()
    critical = Camera.query.filter_by(status="critical").count()
    offline = Camera.query.filter_by(status="offline").count()

    active_alerts = Alert.query.filter_by(resolved=False).count()
    critical_alerts = Alert.query.filter_by(resolved=False, severity="critical").count()
    warning_alerts = Alert.query.filter_by(resolved=False, severity="warning").count()

    return jsonify({
        "total_cameras": total,
        "online": online,
        "warning": warning,
        "critical": critical,
        "offline": offline,
        "active_alerts": active_alerts,
        "critical_alerts": critical_alerts,
        "warning_alerts": warning_alerts,
    }), 200
