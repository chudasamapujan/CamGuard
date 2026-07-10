"""
Health Data Routes
------------------
Handles ingestion of health data from the camera simulator.

POST /api/health
- Receives a JSON payload with camera health metrics
- Upserts the camera record (creates if first time, updates status)
- Stores the health record in the time-series table
- Triggers threshold checking and alert generation
- Returns created alerts in the response

Design decisions:
- Single endpoint for all cameras (camera_id is in the payload)
- Camera auto-registration: if a camera_id is seen for the first time, a new
  Camera record is created automatically (no manual setup needed)
- Status is computed from the most significant violation (critical > warning > online)
"""

from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from backend.database import db
from backend.models import Camera, HealthRecord
from backend.services.alert_service import process_health_data

health_bp = Blueprint("health", __name__)


@health_bp.route("/api/health", methods=["POST"])
def ingest_health_data():
    """Receive health data from camera simulator."""
    data = request.get_json()

    if not data or "camera_id" not in data:
        return jsonify({"error": "Missing camera_id in payload"}), 400

    camera_id = data["camera_id"]

    # Auto-register camera if it doesn't exist
    camera = Camera.query.get(camera_id)
    if not camera:
        camera = Camera(
            id=camera_id,
            name=data.get("name", f"Camera {camera_id}"),
            location=data.get("location", "Unknown"),
        )
        db.session.add(camera)

    # Update camera status based on health data
    is_online = data.get("is_online", True)
    cpu = data.get("cpu_usage", 0)
    memory = data.get("memory_usage", 0)
    storage = data.get("storage_usage", 0)
    latency = data.get("network_latency", 0)
    fault = data.get("fault_type")

    # Determine status: critical > warning > online > offline
    if not is_online or fault:
        camera.status = "critical"
    elif cpu >= 90 or memory >= 90 or storage >= 95 or latency >= 500:
        camera.status = "critical"
    elif cpu >= 75 or memory >= 75 or storage >= 80 or latency >= 200:
        camera.status = "warning"
    else:
        camera.status = "online"

    camera.last_heartbeat = datetime.now(timezone.utc)

    # Store health record
    record = HealthRecord(
        camera_id=camera_id,
        cpu_usage=cpu,
        memory_usage=memory,
        storage_usage=storage,
        network_latency=latency,
        is_online=is_online,
        fault_type=fault,
    )
    db.session.add(record)
    db.session.commit()

    # Process alerts
    new_alerts = process_health_data(data)

    return jsonify({
        "status": "ok",
        "camera_status": camera.status,
        "new_alerts": len(new_alerts),
    }), 201
