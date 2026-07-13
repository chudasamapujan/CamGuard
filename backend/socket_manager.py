import os
import logging
from flask_socketio import SocketIO

logger = logging.getLogger(__name__)

# Read production configuration from environment
_cors_origins = os.environ.get("CORS_ALLOWED_ORIGINS", "*")
if _cors_origins != "*":
    _cors_origins = [o.strip() for o in _cors_origins.split(",") if o.strip()]

_async_mode = os.environ.get("SOCKET_ASYNC_MODE", "threading")

socketio = SocketIO(
    cors_allowed_origins=_cors_origins,
    async_mode=_async_mode,
    ping_timeout=20,
    ping_interval=10,
    manage_session=False
)

@socketio.on("connect")

def handle_connect():
    """Triggered when a client establishes a WebSocket connection."""
    logger.info("Client connected to socket network")

@socketio.on("disconnect")
def handle_disconnect():
    """Triggered when a client drops their connection."""
    logger.info("Client disconnected from socket network")

def broadcast_camera_update(camera_data):
    """Emit the individual camera metrics updates to all clients."""
    try:
        socketio.emit("camera_update", camera_data)
    except Exception as e:
        logger.error(f"Failed to emit camera_update: {e}")

def broadcast_dashboard_summary(summary_data):
    """Emit updated aggregation stats summary to all dashboards."""
    try:
        socketio.emit("dashboard_summary", summary_data)
    except Exception as e:
        logger.error(f"Failed to emit dashboard_summary: {e}")

def broadcast_alert_created(alert_data):
    """Emit a newly generated incident alert details."""
    try:
        socketio.emit("alert_created", alert_data)
    except Exception as e:
        logger.error(f"Failed to emit alert_created: {e}")

def broadcast_alert_resolved(alert_data):
    """Emit an alert resolution event."""
    try:
        socketio.emit("alert_resolved", alert_data)
    except Exception as e:
        logger.error(f"Failed to emit alert_resolved: {e}")

def broadcast_settings_updated(settings_data):
    """Emit updated global threshold configurations."""
    try:
        socketio.emit("settings_updated", settings_data)
    except Exception as e:
        logger.error(f"Failed to emit settings_updated: {e}")

def broadcast_camera_activated(camera_data):
    """Emit a camera node activation lifecycle event."""
    try:
        socketio.emit("camera_activated", camera_data)
    except Exception as e:
        logger.error(f"Failed to emit camera_activated: {e}")

def broadcast_camera_deactivated(camera_data):
    """Emit a camera node deactivation lifecycle event."""
    try:
        socketio.emit("camera_deactivated", camera_data)
    except Exception as e:
        logger.error(f"Failed to emit camera_deactivated: {e}")

