import logging
from datetime import datetime, timezone
from backend.database import db
from backend.models import Setting
from backend.config import Config
from backend.socket_manager import (
    broadcast_settings_updated,
    broadcast_camera_activated,
    broadcast_camera_deactivated,
    broadcast_alert_resolved
)

logger = logging.getLogger(__name__)

class ConfigurationService:
    @staticmethod
    def get_all_settings():
        """Retrieve all configuration settings from the database as typed values."""
        try:
            settings = Setting.query.all()
            s_dict = {s.key: s.value for s in settings}

            # Ensure all standard keys are present with fallbacks
            result = {}
            for key, default in Config.DEFAULT_SETTINGS.items():
                db_val = s_dict.get(key, default)
                # Cast type based on key
                if key in ["camera_count", "reporting_interval", "offline_timeout"]:
                    result[key] = int(db_val)
                else:
                    result[key] = float(db_val)
            return result
        except Exception as e:
            logger.error(f"Failed to fetch system settings from database: {e}")
            # Return static defaults on failure
            return {
                "camera_count": int(Config.DEFAULT_SETTINGS["camera_count"]),
                "reporting_interval": int(Config.DEFAULT_SETTINGS["reporting_interval"]),
                "fault_probability": float(Config.DEFAULT_SETTINGS["fault_probability"]),
                "cpu_threshold": float(Config.DEFAULT_SETTINGS["cpu_threshold"]),
                "memory_threshold": float(Config.DEFAULT_SETTINGS["memory_threshold"]),
                "storage_threshold": float(Config.DEFAULT_SETTINGS["storage_threshold"]),
                "latency_threshold": float(Config.DEFAULT_SETTINGS["latency_threshold"]),
                "offline_timeout": int(Config.DEFAULT_SETTINGS["offline_timeout"]),
            }

    @staticmethod
    def update_settings(data):
        """Update system configurations in the database and transition camera active states dynamically."""
        if not data:
            return False

        try:
            old_settings = ConfigurationService.get_all_settings()
            old_count = int(old_settings.get("camera_count", 10))

            for key, val in data.items():
                # Standardize checking to only save configured keys
                if key in Config.DEFAULT_SETTINGS:
                    setting = db.session.get(Setting, key)
                    if setting:
                        setting.value = str(val)
                    else:
                        db.session.add(Setting(key=key, value=str(val)))
            
            db.session.commit()

            new_settings = ConfigurationService.get_all_settings()
            new_count = int(new_settings.get("camera_count", 10))

            from backend.models import Camera, Alert

            # Perform soft transitions based on camera count changes
            if new_count > old_count:
                for i in range(1, new_count + 1):
                    camera_id = f"CAM-{i:03d}"
                    camera = db.session.get(Camera, camera_id)
                    if camera:
                        if not camera.active:
                            camera.active = True
                            db.session.add(camera)
                            db.session.flush()
                            broadcast_camera_activated(camera.to_dict())
                    else:
                        camera = Camera(
                            id=camera_id,
                            name=f"Camera {i:03d}",
                            status="offline",
                            active=True
                        )
                        db.session.add(camera)
                        db.session.flush()
                        broadcast_camera_activated(camera.to_dict())

                # Also deactivate any cameras beyond new_count that may have been
                # auto-activated by stale simulator threads
                all_cameras = Camera.query.all()
                for cam in all_cameras:
                    try:
                        num = int(cam.id.split("-")[1])
                        if num > new_count and cam.active:
                            cam.active = False
                            db.session.add(cam)
                            db.session.flush()
                            broadcast_camera_deactivated(cam.to_dict())
                            active_alerts = Alert.query.filter_by(camera_id=cam.id, resolved=False).all()
                            for alert in active_alerts:
                                alert.resolved = True
                                alert.resolved_at = datetime.now(timezone.utc)
                                alert.message = f"{alert.message} (Resolved: Camera Deactivated)"
                                db.session.add(alert)
                                db.session.flush()
                                broadcast_alert_resolved(alert.to_dict())
                    except (IndexError, ValueError):
                        pass
                db.session.commit()


            elif new_count < old_count:
                cameras = Camera.query.all()
                for cam in cameras:
                    try:
                        num = int(cam.id.split("-")[1])
                        if num > new_count and cam.active:
                            # Soft-deactivate the camera instead of physical delete
                            cam.active = False
                            db.session.add(cam)
                            db.session.flush()

                            # Broadcast deactivation lifecycle event
                            broadcast_camera_deactivated(cam.to_dict())

                            # Auto-resolve active alerts for this deactivated camera
                            active_alerts = Alert.query.filter_by(camera_id=cam.id, resolved=False).all()
                            for alert in active_alerts:
                                alert.resolved = True
                                alert.resolved_at = datetime.now(timezone.utc)
                                alert.message = f"{alert.message} (Resolved: Camera Deactivated)"
                                db.session.add(alert)
                                db.session.flush()
                                broadcast_alert_resolved(alert.to_dict())
                    except (IndexError, ValueError):
                        pass
                db.session.commit()

            # Broadcast updated settings to all dashboard nodes
            broadcast_settings_updated(new_settings)

            # Broadcast updated dashboard summary aggregation statistics
            from backend.services.health_evaluation_service import HealthEvaluationService
            from backend.socket_manager import broadcast_dashboard_summary
            summary_dict = HealthEvaluationService.get_dashboard_summary()
            broadcast_dashboard_summary(summary_dict)

            return True
        except Exception as e:
            db.session.rollback()
            logger.exception(f"Failed to update global settings in database: {e}")
            return False

    @staticmethod
    def seed_default_settings():
        """Seed initial configuration values if database is empty."""
        try:
            for key, val in Config.DEFAULT_SETTINGS.items():
                existing = db.session.get(Setting, key)
                if not existing:
                    db.session.add(Setting(key=key, value=val))
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            logger.exception(f"Failed to seed default settings in database: {e}")
