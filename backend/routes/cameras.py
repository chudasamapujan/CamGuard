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
        # Override status for disabled cameras
        if not cam.is_enabled:
            cam_dict["status"] = "disabled"

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
    camera = db.session.get(Camera, camera_id)
    if not camera:
        return jsonify({"error": "Camera not found"}), 404

    cam_dict = camera.to_dict()
    if not camera.is_enabled:
        cam_dict["status"] = "disabled"

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


@cameras_bp.route("/api/cameras", methods=["POST"])
def create_camera():
    """Create a new camera dynamically."""
    data = request.get_json()
    if not data or "id" not in data or "name" not in data:
        return jsonify({"error": "Missing required fields (id, name)"}), 400

    camera_id = data["id"].strip()
    if not camera_id:
        return jsonify({"error": "Camera ID cannot be empty"}), 400

    existing = db.session.get(Camera, camera_id)
    if existing:
        return jsonify({"error": f"Camera with ID {camera_id} already exists"}), 400

    camera = Camera(
        id=camera_id,
        name=data["name"],
        location=data.get("location", "Unknown"),
        storage_capacity=float(data.get("storage_capacity", 100.0)),
        reporting_interval=int(data.get("reporting_interval", 30)),
        fault_probability=float(data.get("fault_probability", 0.05)),
        offline_probability=float(data.get("offline_probability", 0.03)),
        is_enabled=bool(data.get("is_enabled", True)),
        notes=data.get("notes", ""),
        status="offline"
    )
    db.session.add(camera)
    db.session.commit()
    return jsonify(camera.to_dict()), 201


@cameras_bp.route("/api/cameras/<camera_id>", methods=["PUT"])
def update_camera(camera_id):
    """Update a camera's configurations."""
    camera = db.session.get(Camera, camera_id)
    if not camera:
        return jsonify({"error": "Camera not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "No update data provided"}), 400

    if "name" in data:
        camera.name = data["name"]
    if "location" in data:
        camera.location = data["location"]
    if "storage_capacity" in data:
        camera.storage_capacity = float(data["storage_capacity"])
    if "reporting_interval" in data:
        camera.reporting_interval = int(data["reporting_interval"])
    if "fault_probability" in data:
        camera.fault_probability = float(data["fault_probability"])
    if "offline_probability" in data:
        camera.offline_probability = float(data["offline_probability"])
    if "is_enabled" in data:
        camera.is_enabled = bool(data["is_enabled"])
        if not camera.is_enabled:
            camera.status = "offline"
            # Auto resolve active alerts for this camera if disabled
            active_alerts = Alert.query.filter_by(camera_id=camera_id, resolved=False).all()
            for a in active_alerts:
                a.resolved = True
                a.resolved_at = datetime.now(timezone.utc)
    if "notes" in data:
        camera.notes = data["notes"]
    if "status" in data:
        if camera.is_enabled:
            camera.status = data["status"]

    db.session.commit()
    return jsonify(camera.to_dict()), 200


@cameras_bp.route("/api/cameras/<camera_id>", methods=["DELETE"])
def delete_camera(camera_id):
    """Delete a camera and its associated historical data."""
    camera = db.session.get(Camera, camera_id)
    if not camera:
        return jsonify({"error": "Camera not found"}), 404

    # Maintain database integrity by purging records and alerts first
    HealthRecord.query.filter_by(camera_id=camera_id).delete()
    Alert.query.filter_by(camera_id=camera_id).delete()

    db.session.delete(camera)
    db.session.commit()
    return jsonify({"message": f"Camera {camera_id} successfully deleted"}), 200


@cameras_bp.route("/api/cameras/<camera_id>/toggle", methods=["PUT"])
def toggle_camera(camera_id):
    """Toggle a camera's is_enabled setting."""
    camera = db.session.get(Camera, camera_id)
    if not camera:
        return jsonify({"error": "Camera not found"}), 404

    data = request.get_json() or {}
    is_enabled = data.get("is_enabled", not camera.is_enabled)
    camera.is_enabled = bool(is_enabled)

    if not camera.is_enabled:
        camera.status = "offline"
        # Auto resolve active alerts for this camera if disabled
        active_alerts = Alert.query.filter_by(camera_id=camera_id, resolved=False).all()
        for a in active_alerts:
            a.resolved = True
            a.resolved_at = datetime.now(timezone.utc)

    db.session.commit()
    return jsonify(camera.to_dict()), 200


@cameras_bp.route("/api/cameras/<camera_id>/history", methods=["GET"])
def get_camera_history(camera_id):
    """Get historical health data for a camera."""
    camera = db.session.get(Camera, camera_id)
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


@cameras_bp.route("/api/dashboard/history", methods=["GET"])
def dashboard_history():
    """Get aggregated fleet-wide historical health metrics."""
    hours = request.args.get("hours", 24, type=int)
    since = datetime.now(timezone.utc) - timedelta(hours=hours)

    records = (
        HealthRecord.query
        .filter(HealthRecord.timestamp >= since)
        .order_by(HealthRecord.timestamp.asc())
        .all()
    )

    # Group records by timestamp rounded to nearest 5 minutes
    grouped = {}
    for r in records:
        dt = r.timestamp
        # Round to nearest 5 minutes
        minute = (dt.minute // 5) * 5
        rounded_time = dt.replace(minute=minute, second=0, microsecond=0)
        time_str = rounded_time.isoformat()

        if time_str not in grouped:
            grouped[time_str] = {
                "timestamp": time_str,
                "cpu_sum": 0.0,
                "mem_sum": 0.0,
                "storage_sum": 0.0,
                "latency_sum": 0.0,
                "count": 0
            }

        grouped[time_str]["cpu_sum"] += r.cpu_usage
        grouped[time_str]["mem_sum"] += r.memory_usage
        grouped[time_str]["storage_sum"] += r.storage_usage
        grouped[time_str]["latency_sum"] += r.network_latency
        grouped[time_str]["count"] += 1

    result = []
    for time_str, data in sorted(grouped.items()):
        count = data["count"]
        result.append({
            "timestamp": time_str,
            "cpu_usage": round(data["cpu_sum"] / count, 1),
            "memory_usage": round(data["mem_sum"] / count, 1),
            "storage_usage": round(data["storage_sum"] / count, 1),
            "network_latency": round(data["latency_sum"] / count, 1),
            # Average Health Score calculation for trend chart
            "health_score": round(
                max(0, 100 - (
                    ((data["cpu_sum"] / count - 50) * 0.4 if (data["cpu_sum"] / count) > 50 else 0) +
                    ((data["mem_sum"] / count - 50) * 0.4 if (data["mem_sum"] / count) > 50 else 0) +
                    ((data["latency_sum"] / count - 150) * 0.1 if (data["latency_sum"] / count) > 150 else 0)
                )), 1)
        })

    return jsonify(result), 200


@cameras_bp.route("/api/dashboard/summary", methods=["GET"])
def dashboard_summary():
    """Get aggregate dashboard stats, average metrics and disabled counts."""
    total = Camera.query.count()
    disabled = Camera.query.filter_by(is_enabled=False).count()
    
    # Restrict status counts to enabled cameras
    online = Camera.query.filter_by(is_enabled=True, status="online").count()
    warning = Camera.query.filter_by(is_enabled=True, status="warning").count()
    critical = Camera.query.filter_by(is_enabled=True, status="critical").count()
    offline = Camera.query.filter_by(is_enabled=True, status="offline").count()

    active_alerts = Alert.query.filter_by(resolved=False).count()
    critical_alerts = Alert.query.filter_by(resolved=False, severity="critical").count()
    warning_alerts = Alert.query.filter_by(resolved=False, severity="warning").count()

    # Calculate average CPU, Memory, Storage across all enabled, non-offline cameras
    enabled_cameras = Camera.query.filter_by(is_enabled=True).all()
    active_count = 0
    total_cpu = 0.0
    total_mem = 0.0
    total_storage = 0.0

    for cam in enabled_cameras:
        if cam.status in ["online", "warning", "critical"]:
            latest = (
                HealthRecord.query
                .filter_by(camera_id=cam.id)
                .order_by(HealthRecord.timestamp.desc())
                .first()
            )
            if latest and latest.is_online:
                active_count += 1
                total_cpu += latest.cpu_usage
                total_mem += latest.memory_usage
                total_storage += latest.storage_usage

    avg_cpu = round(total_cpu / active_count, 1) if active_count > 0 else 0.0
    avg_mem = round(total_mem / active_count, 1) if active_count > 0 else 0.0
    avg_storage = round(total_storage / active_count, 1) if active_count > 0 else 0.0

    return jsonify({
        "total_cameras": total,
        "online": online,
        "warning": warning,
        "critical": critical,
        "offline": offline,
        "disabled": disabled,
        "active_alerts": active_alerts,
        "critical_alerts": critical_alerts,
        "warning_alerts": warning_alerts,
        "avg_cpu": avg_cpu,
        "avg_mem": avg_mem,
        "avg_storage": avg_storage,
    }), 200
