import logging
from datetime import datetime, timezone
from backend.database import db
from backend.models import Camera, HealthRecord, Alert
from backend.services.configuration_service import ConfigurationService

logger = logging.getLogger(__name__)

class HealthEvaluationService:
    @staticmethod
    def get_threshold_bounds(settings):
        """Scale configuration thresholds to get warning and critical levels."""
        return {
            "cpu_warning": settings["cpu_threshold"],
            "cpu_critical": settings["cpu_threshold"] * 1.2,
            "memory_warning": settings["memory_threshold"],
            "memory_critical": settings["memory_threshold"] * 1.2,
            "storage_warning": settings["storage_threshold"],
            "storage_critical": settings["storage_threshold"] * 1.15,
            "latency_warning": settings["latency_threshold"],
            "latency_critical": settings["latency_threshold"] * 2.5,
            "offline_timeout": settings["offline_timeout"],
        }

    @staticmethod
    def calculate_status(camera, latest_record, thresholds):
        """Unified logic to compute camera status (online, warning, critical, offline)."""
        # 1. Offline Check by heartbeat age
        if camera.last_heartbeat:
            now = datetime.now(timezone.utc)
            age = (now - camera.last_heartbeat.replace(tzinfo=timezone.utc)).total_seconds()
            if age > thresholds["offline_timeout"]:
                return "offline"
        else:
            return "offline"

        # 2. Offline check by latest record
        if not latest_record or not latest_record.is_online:
            return "offline"

        # 3. Fault Check
        if latest_record.fault_type:
            return "critical"

        # 4. Metric Violations Check
        cpu = latest_record.cpu_usage
        mem = latest_record.memory_usage
        storage = latest_record.storage_usage
        latency = latest_record.network_latency

        # Critical Thresholds
        if (cpu >= thresholds["cpu_critical"] or
            mem >= thresholds["memory_critical"] or
            storage >= thresholds["storage_critical"] or
            latency >= thresholds["latency_critical"]):
            return "critical"

        # Warning Thresholds
        if (cpu >= thresholds["cpu_warning"] or
            mem >= thresholds["memory_warning"] or
            storage >= thresholds["storage_warning"] or
            latency >= thresholds["latency_warning"]):
            return "warning"

        return "online"

    @classmethod
    def list_cameras(cls):
        """List all active cameras with dynamic status and latest health metrics."""
        try:
            settings = ConfigurationService.get_all_settings()
            bounds = cls.get_threshold_bounds(settings)
            
            # Enforce querying only active devices
            cameras = Camera.query.filter_by(active=True).order_by(Camera.id.asc()).all()

            result = []
            for cam in cameras:
                latest = HealthRecord.query.filter_by(camera_id=cam.id).order_by(HealthRecord.timestamp.desc()).first()
                cam_status = cls.calculate_status(cam, latest, bounds)
                
                # Sync status back to DB for quick querying/filtering
                if cam.status != cam_status:
                    cam.status = cam_status
                    db.session.add(cam)

                cam_dict = cam.to_dict()
                cam_dict["latest_health"] = latest.to_dict() if latest else None
                
                # Count active alerts
                active_alerts = Alert.query.filter_by(camera_id=cam.id, resolved=False).count()
                cam_dict["active_alerts"] = active_alerts
                result.append(cam_dict)

            db.session.commit()
            return result
        except Exception as e:
            db.session.rollback()
            logger.exception(f"Failed to list fleet cameras: {e}")
            return []

    @classmethod
    def get_camera(cls, camera_id):
        """Get details for a single camera (supports both active and inactive units)."""
        try:
            cam = db.session.get(Camera, camera_id)
            if not cam:
                return None

            settings = ConfigurationService.get_all_settings()
            bounds = cls.get_threshold_bounds(settings)
            latest = HealthRecord.query.filter_by(camera_id=camera_id).order_by(HealthRecord.timestamp.desc()).first()
            
            cam_status = cls.calculate_status(cam, latest, bounds)
            if cam.status != cam_status:
                cam.status = cam_status
                db.session.add(cam)
                db.session.commit()

            cam_dict = cam.to_dict()
            cam_dict["latest_health"] = latest.to_dict() if latest else None
            
            # Include active alerts details
            active_alerts = Alert.query.filter_by(camera_id=camera_id, resolved=False).all()
            cam_dict["active_alerts"] = [a.to_dict() for a in active_alerts]
            return cam_dict
        except Exception as e:
            db.session.rollback()
            logger.exception(f"Failed to get single camera details for {camera_id}: {e}")
            return None

    @classmethod
    def get_dashboard_summary(cls):
        """Retrieve aggregated dashboard stats only for active devices."""
        try:
            settings = ConfigurationService.get_all_settings()
            bounds = cls.get_threshold_bounds(settings)
            
            # Query active devices exclusively
            cameras = Camera.query.filter_by(active=True).all()

            total = len(cameras)
            online = 0
            warning = 0
            critical = 0
            offline = 0

            active_count = 0
            total_cpu = 0.0
            total_mem = 0.0
            total_storage = 0.0

            for cam in cameras:
                latest = HealthRecord.query.filter_by(camera_id=cam.id).order_by(HealthRecord.timestamp.desc()).first()
                status = cls.calculate_status(cam, latest, bounds)
                
                if cam.status != status:
                    cam.status = status
                    db.session.add(cam)

                if status == "offline":
                    offline += 1
                elif status == "critical":
                    critical += 1
                elif status == "warning":
                    warning += 1
                else:
                    online += 1

                if status != "offline" and latest:
                    active_count += 1
                    total_cpu += latest.cpu_usage
                    total_mem += latest.memory_usage
                    total_storage += latest.storage_usage

            db.session.commit()

            # Filter active alerts to only those belonging to active cameras
            active_alerts = db.session.query(Alert).join(Camera).filter(
                Alert.resolved == False,
                Camera.active == True
            ).all()

            critical_alerts = sum(1 for a in active_alerts if a.severity == "critical")
            warning_alerts = sum(1 for a in active_alerts if a.severity == "warning")

            return {
                "total_cameras": total,
                "online": online,
                "warning": warning,
                "critical": critical,
                "offline": offline,
                "active_alerts": len(active_alerts),
                "critical_alerts": critical_alerts,
                "warning_alerts": warning_alerts,
                "avg_cpu": round(total_cpu / active_count, 1) if active_count > 0 else 0.0,
                "avg_mem": round(total_mem / active_count, 1) if active_count > 0 else 0.0,
                "avg_storage": round(total_storage / active_count, 1) if active_count > 0 else 0.0,
            }
        except Exception as e:
            db.session.rollback()
            logger.exception(f"Failed to generate dashboard summary: {e}")
            return {
                "total_cameras": 0,
                "online": 0,
                "warning": 0,
                "critical": 0,
                "offline": 0,
                "active_alerts": 0,
                "critical_alerts": 0,
                "warning_alerts": 0,
                "avg_cpu": 0.0,
                "avg_mem": 0.0,
                "avg_storage": 0.0,
            }
