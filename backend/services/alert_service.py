import logging
from datetime import datetime, timezone
from backend.database import db
from backend.models import Camera, HealthRecord, Alert
from backend.services.configuration_service import ConfigurationService
from backend.services.health_evaluation_service import HealthEvaluationService
from backend.socket_manager import (
    broadcast_camera_update,
    broadcast_alert_created,
    broadcast_alert_resolved,
    broadcast_dashboard_summary
)

logger = logging.getLogger(__name__)

class AlertService:
    @staticmethod
    def ingest_health_data(data):
        """Process incoming telemetry from a camera: register, save record, evaluate metrics, and generate alerts."""
        if not data or "camera_id" not in data:
            return None, "Missing camera_id in payload"

        camera_id = data["camera_id"]
        
        try:
            # 1. Auto-register camera if missing or reactivate if inactive
            camera = db.session.get(Camera, camera_id)
            if not camera:
                camera = Camera(
                    id=camera_id,
                    name=data.get("name", f"Camera {camera_id}"),
                    status="offline",
                    active=True
                )
                db.session.add(camera)
            elif not camera.active:
                # Only auto-reactivate if this camera ID is within the configured count
                settings = ConfigurationService.get_all_settings()
                try:
                    cam_num = int(camera_id.split("-")[1])
                except (IndexError, ValueError):
                    cam_num = 0
                if cam_num <= int(settings.get("camera_count", 0)):
                    camera.active = True
                    db.session.add(camera)
                    db.session.flush()
                    from backend.socket_manager import broadcast_camera_activated
                    broadcast_camera_activated(camera.to_dict())
                else:
                    # Camera is beyond configured count — drop telemetry silently
                    logger.debug(f"Dropped telemetry for inactive camera {camera_id}: beyond configured count")
                    return {"status": "ignored", "camera_status": "inactive", "new_alerts": 0}, None

            # 2. Extract metrics
            is_online = data.get("is_online", True)
            cpu = data.get("cpu_usage", 0.0)
            memory = data.get("memory_usage", 0.0)
            storage = data.get("storage_usage", 0.0)
            latency = data.get("network_latency", 0.0)
            fault = data.get("fault_type")

            # Update last heartbeat time
            camera.last_heartbeat = datetime.now(timezone.utc)

            # 3. Create health record
            record = HealthRecord(
                camera_id=camera_id,
                cpu_usage=cpu,
                memory_usage=memory,
                storage_usage=storage,
                network_latency=latency,
                is_online=is_online,
                fault_type=fault
            )
            db.session.add(record)

            # 4. Evaluate status and rules
            settings = ConfigurationService.get_all_settings()
            bounds = HealthEvaluationService.get_threshold_bounds(settings)

            # Calculate camera status
            camera.status = HealthEvaluationService.calculate_status(camera, record, bounds)

            # Evaluate violations
            violations = []

            # --- CPU ---
            if cpu >= bounds["cpu_critical"]:
                violations.append({"type": "cpu_high", "severity": "critical", "msg": f"CPU usage critically high at {cpu:.1f}% (threshold: {bounds['cpu_critical']:.1f}%)"})
            elif cpu >= bounds["cpu_warning"]:
                violations.append({"type": "cpu_high", "severity": "warning", "msg": f"CPU usage elevated at {cpu:.1f}% (threshold: {bounds['cpu_warning']:.1f}%)"})

            # --- Memory ---
            if memory >= bounds["memory_critical"]:
                violations.append({"type": "memory_high", "severity": "critical", "msg": f"Memory usage critically high at {memory:.1f}% (threshold: {bounds['memory_critical']:.1f}%)"})
            elif memory >= bounds["memory_warning"]:
                violations.append({"type": "memory_high", "severity": "warning", "msg": f"Memory usage elevated at {memory:.1f}% (threshold: {bounds['memory_warning']:.1f}%)"})

            # --- Storage ---
            if storage >= bounds["storage_critical"]:
                violations.append({"type": "storage_full", "severity": "critical", "msg": f"Storage critically full at {storage:.1f}% (threshold: {bounds['storage_critical']:.1f}%)"})
            elif storage >= bounds["storage_warning"]:
                violations.append({"type": "storage_full", "severity": "warning", "msg": f"Storage usage high at {storage:.1f}% (threshold: {bounds['storage_warning']:.1f}%)"})

            # --- Latency ---
            if latency >= bounds["latency_critical"]:
                violations.append({"type": "latency_high", "severity": "critical", "msg": f"Network latency critically high at {latency:.0f}ms (threshold: {bounds['latency_critical']:.0f}ms)"})
            elif latency >= bounds["latency_warning"]:
                violations.append({"type": "latency_high", "severity": "warning", "msg": f"Network latency elevated at {latency:.0f}ms (threshold: {bounds['latency_warning']:.0f}ms)"})

            # --- Offline ---
            if not is_online:
                violations.append({"type": "camera_offline", "severity": "critical", "msg": "Camera is offline (telemetry payload is_online == False)"})

            # --- Fault ---
            if fault:
                violations.append({"type": "fault_detected", "severity": "critical", "msg": f"Device Fault Detected: {fault}"})

            # Process violations and manage alerts lifecycle
            violated_types = {v["type"] for v in violations}
            all_alert_types = {"cpu_high", "memory_high", "storage_full", "latency_high", "camera_offline", "fault_detected"}
            cleared_types = all_alert_types - violated_types

            resolved_alerts = []
            # Auto-resolve cleared alert types
            for a_type in cleared_types:
                active_alerts = Alert.query.filter_by(camera_id=camera_id, alert_type=a_type, resolved=False).all()
                for alert in active_alerts:
                    alert.resolved = True
                    alert.resolved_at = datetime.now(timezone.utc)
                    resolved_alerts.append(alert)

            # Trigger new alerts with deduplication (and update existing active alerts if severity/message changes)
            new_alerts_count = 0
            created_alerts = []
            for v in violations:
                existing = Alert.query.filter_by(
                    camera_id=camera_id,
                    alert_type=v["type"],
                    resolved=False
                ).first()

                if not existing:
                    alert = Alert(
                        camera_id=camera_id,
                        alert_type=v["type"],
                        severity=v["severity"],
                        message=v["msg"]
                    )
                    db.session.add(alert)
                    created_alerts.append(alert)
                    new_alerts_count += 1
                else:
                    # Update existing active alert instead of creating a duplicate
                    existing.severity = v["severity"]
                    existing.message = v["msg"]

            db.session.commit()

            # Broadcast WebSocket updates after successful DB commit
            cam_dict = camera.to_dict()
            cam_dict["latest_health"] = record.to_dict()
            cam_dict["active_alerts"] = Alert.query.filter_by(camera_id=camera_id, resolved=False).count()
            broadcast_camera_update(cam_dict)

            # Emit dashboard summary updates
            summary_dict = HealthEvaluationService.get_dashboard_summary()
            broadcast_dashboard_summary(summary_dict)

            # Emit newly created alerts
            for a in created_alerts:
                broadcast_alert_created(a.to_dict())

            # Emit newly resolved alerts
            for a in resolved_alerts:
                broadcast_alert_resolved(a.to_dict())

            return {
                "status": "ok",
                "camera_status": camera.status,
                "new_alerts": new_alerts_count
            }, None

        except Exception as e:
            db.session.rollback()
            logger.exception(f"Error during health telemetry ingestion for camera {camera_id}: {e}")
            return None, f"Database transaction failed during telemetry ingestion: {str(e)}"

    @staticmethod
    def list_alerts(active_only=False, limit=50, camera_id=None):
        """Query system alerts with filters."""
        try:
            query = Alert.query
            if active_only:
                query = query.filter_by(resolved=False)
            if camera_id:
                query = query.filter_by(camera_id=camera_id)
            
            alerts = query.order_by(Alert.created_at.desc()).limit(limit).all()
            return [a.to_dict() for a in alerts]
        except Exception as e:
            logger.error(f"Failed to query system alerts: {e}")
            return []

    @staticmethod
    def resolve_alert(alert_id):
        """Mark an active alert as resolved."""
        try:
            alert = db.session.get(Alert, alert_id)
            if not alert:
                return False

            if not alert.resolved:
                alert.resolved = True
                alert.resolved_at = datetime.now(timezone.utc)
                db.session.commit()

                # Broadcast resolving action
                broadcast_alert_resolved(alert.to_dict())

                # Broadcast summary update
                summary_dict = HealthEvaluationService.get_dashboard_summary()
                broadcast_dashboard_summary(summary_dict)

            return True
        except Exception as e:
            db.session.rollback()
            logger.exception(f"Failed to resolve alert {alert_id}: {e}")
            return False
