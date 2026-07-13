from datetime import datetime, timezone, timedelta
from backend.models import Camera, HealthRecord, Alert, Setting
from backend.services.health_evaluation_service import HealthEvaluationService
from backend.services.alert_service import AlertService
from backend.services.configuration_service import ConfigurationService


def test_get_threshold_bounds(app):
    with app.app_context():
        settings = {
            "cpu_threshold": 75.0,
            "memory_threshold": 80.0,
            "storage_threshold": 85.0,
            "latency_threshold": 200.0,
            "offline_timeout": 90
        }
        bounds = HealthEvaluationService.get_threshold_bounds(settings)
        assert bounds["cpu_warning"] == 75.0
        assert bounds["cpu_critical"] == 75.0 * 1.2
        assert bounds["memory_warning"] == 80.0
        assert bounds["memory_critical"] == 80.0 * 1.2
        assert bounds["storage_warning"] == 85.0
        assert abs(bounds["storage_critical"] - (85.0 * 1.15)) < 1e-6
        assert bounds["latency_warning"] == 200.0
        assert bounds["latency_critical"] == 200.0 * 2.5
        assert bounds["offline_timeout"] == 90


def test_calculate_status_online_warning_critical(app, db_session):
    with app.app_context():
        camera = Camera(id="CAM-999", name="Test Camera", last_heartbeat=datetime.now(timezone.utc))
        thresholds = {
            "cpu_warning": 75.0, "cpu_critical": 90.0,
            "memory_warning": 80.0, "memory_critical": 96.0,
            "storage_warning": 85.0, "storage_critical": 97.75,
            "latency_warning": 200.0, "latency_critical": 500.0,
            "offline_timeout": 90
        }

        # Online check
        record = HealthRecord("CAM-999", 50.0, 50.0, 50.0, 100.0, is_online=True)
        assert HealthEvaluationService.calculate_status(camera, record, thresholds) == "online"

        # CPU warning
        record = HealthRecord("CAM-999", 78.0, 50.0, 50.0, 100.0, is_online=True)
        assert HealthEvaluationService.calculate_status(camera, record, thresholds) == "warning"

        # CPU critical
        record = HealthRecord("CAM-999", 92.0, 50.0, 50.0, 100.0, is_online=True)
        assert HealthEvaluationService.calculate_status(camera, record, thresholds) == "critical"

        # Memory warning / critical
        record_warn = HealthRecord("CAM-999", 50.0, 82.0, 50.0, 100.0, is_online=True)
        assert HealthEvaluationService.calculate_status(camera, record_warn, thresholds) == "warning"
        record_crit = HealthRecord("CAM-999", 50.0, 98.0, 50.0, 100.0, is_online=True)
        assert HealthEvaluationService.calculate_status(camera, record_crit, thresholds) == "critical"

        # Storage warning / critical
        record_warn = HealthRecord("CAM-999", 50.0, 50.0, 88.0, 100.0, is_online=True)
        assert HealthEvaluationService.calculate_status(camera, record_warn, thresholds) == "warning"
        record_crit = HealthRecord("CAM-999", 50.0, 50.0, 99.0, 100.0, is_online=True)
        assert HealthEvaluationService.calculate_status(camera, record_crit, thresholds) == "critical"

        # Latency warning / critical
        record_warn = HealthRecord("CAM-999", 50.0, 50.0, 50.0, 250.0, is_online=True)
        assert HealthEvaluationService.calculate_status(camera, record_warn, thresholds) == "warning"
        record_crit = HealthRecord("CAM-999", 50.0, 50.0, 50.0, 550.0, is_online=True)
        assert HealthEvaluationService.calculate_status(camera, record_crit, thresholds) == "critical"

        # Combined warning/critical (critical overrides warning)
        record_combo = HealthRecord("CAM-999", 78.0, 98.0, 50.0, 100.0, is_online=True)
        assert HealthEvaluationService.calculate_status(camera, record_combo, thresholds) == "critical"

        # Fault check
        record_fault = HealthRecord("CAM-999", 50.0, 50.0, 50.0, 100.0, is_online=True, fault_type="Sensor Error")
        assert HealthEvaluationService.calculate_status(camera, record_fault, thresholds) == "critical"


def test_calculate_status_offline_paths(app, db_session):
    with app.app_context():
        thresholds = {
            "cpu_warning": 75.0, "cpu_critical": 90.0,
            "memory_warning": 80.0, "memory_critical": 96.0,
            "storage_warning": 85.0, "storage_critical": 97.75,
            "latency_warning": 200.0, "latency_critical": 500.0,
            "offline_timeout": 90
        }

        # Offline by last_heartbeat age (> offline_timeout)
        old_time = datetime.now(timezone.utc) - timedelta(seconds=120)
        camera_old = Camera(id="CAM-OLD", name="Old Heartbeat Cam", last_heartbeat=old_time)
        record = HealthRecord("CAM-OLD", 50.0, 50.0, 50.0, 100.0, is_online=True)
        assert HealthEvaluationService.calculate_status(camera_old, record, thresholds) == "offline"

        # Offline by no heartbeat at all
        camera_no_hb = Camera(id="CAM-NOHB", name="No HB Cam", last_heartbeat=None)
        assert HealthEvaluationService.calculate_status(camera_no_hb, record, thresholds) == "offline"

        # Offline by latest_record is None
        camera_fresh = Camera(id="CAM-FRESH", name="Fresh Cam", last_heartbeat=datetime.now(timezone.utc))
        assert HealthEvaluationService.calculate_status(camera_fresh, None, thresholds) == "offline"

        # Offline by latest_record.is_online == False
        record_offline = HealthRecord("CAM-FRESH", 50.0, 50.0, 50.0, 100.0, is_online=False)
        assert HealthEvaluationService.calculate_status(camera_fresh, record_offline, thresholds) == "offline"


def test_alert_service_ingest_and_auto_register(app, db_session):
    with app.app_context():
        payload = {
            "camera_id": "CAM-001",
            "name": "Front Door Camera",
            "cpu_usage": 40.0,
            "memory_usage": 45.0,
            "storage_usage": 50.0,
            "network_latency": 50.0,
            "is_online": True
        }
        res, err = AlertService.ingest_health_data(payload)
        assert err is None
        assert res["status"] == "ok"
        assert res["camera_status"] == "online"

        camera = db_session.get(Camera, "CAM-001")
        assert camera is not None
        assert camera.name == "Front Door Camera"
        assert camera.status == "online"
        assert camera.active is True


def test_alert_service_ingest_threshold_breach_and_deduplication(app, db_session):
    with app.app_context():
        # 1. Ingest normal
        AlertService.ingest_health_data({
            "camera_id": "CAM-002",
            "cpu_usage": 40.0, "memory_usage": 40.0, "storage_usage": 40.0, "network_latency": 50.0, "is_online": True
        })

        # 2. Breach threshold (CPU critical >= 90% when threshold is 75%)
        res, err = AlertService.ingest_health_data({
            "camera_id": "CAM-002",
            "cpu_usage": 92.0, "memory_usage": 40.0, "storage_usage": 40.0, "network_latency": 50.0, "is_online": True
        })
        assert err is None
        assert res["new_alerts"] == 1
        assert res["camera_status"] == "critical"

        alerts = Alert.query.filter_by(camera_id="CAM-002", resolved=False).all()
        assert len(alerts) == 1
        assert alerts[0].alert_type == "cpu_high"
        assert alerts[0].severity == "critical"

        # 3. Deduplication check: repeat identical breach
        res_repeat, _ = AlertService.ingest_health_data({
            "camera_id": "CAM-002",
            "cpu_usage": 95.0, "memory_usage": 40.0, "storage_usage": 40.0, "network_latency": 50.0, "is_online": True
        })
        assert res_repeat["new_alerts"] == 0
        active_alerts = Alert.query.filter_by(camera_id="CAM-002", resolved=False).all()
        assert len(active_alerts) == 1


def test_alert_service_auto_resolution(app, db_session):
    with app.app_context():
        # First breach CPU
        AlertService.ingest_health_data({
            "camera_id": "CAM-003",
            "cpu_usage": 95.0, "memory_usage": 40.0, "storage_usage": 40.0, "network_latency": 50.0, "is_online": True
        })
        active_before = Alert.query.filter_by(camera_id="CAM-003", resolved=False).all()
        assert len(active_before) == 1

        # Now return to normal
        AlertService.ingest_health_data({
            "camera_id": "CAM-003",
            "cpu_usage": 40.0, "memory_usage": 40.0, "storage_usage": 40.0, "network_latency": 50.0, "is_online": True
        })
        active_after = Alert.query.filter_by(camera_id="CAM-003", resolved=False).all()
        assert len(active_after) == 0

        resolved_alerts = Alert.query.filter_by(camera_id="CAM-003", resolved=True).all()
        assert len(resolved_alerts) == 1
        assert resolved_alerts[0].resolved_at is not None


def test_alert_service_resolve_alert(app, db_session):
    with app.app_context():
        alert = Alert(camera_id="CAM-004", severity="warning", alert_type="memory_high", message="High memory")
        db_session.add(alert)
        db_session.commit()
        alert_id = alert.id

        assert AlertService.resolve_alert(alert_id) is True
        updated = db_session.get(Alert, alert_id)
        assert updated.resolved is True
        assert updated.resolved_at is not None

        # Resolving nonexistent alert
        assert AlertService.resolve_alert(999999) is False


def test_configuration_service_update_settings_and_camera_scaling(app, db_session):
    with app.app_context():
        # 1. Increase camera count to 12
        ConfigurationService.update_settings({"camera_count": 12})
        cams = Camera.query.filter_by(active=True).all()
        assert len(cams) == 12
        cam12 = db_session.get(Camera, "CAM-012")
        assert cam12 is not None and cam12.active is True

        # Create an open alert on CAM-012
        alert = Alert(camera_id="CAM-012", severity="warning", alert_type="cpu_high", message="High CPU")
        db_session.add(alert)
        db_session.commit()

        # 2. Decrease camera count to 10
        ConfigurationService.update_settings({"camera_count": 10})
        active_cams = Camera.query.filter_by(active=True).all()
        assert len(active_cams) == 10

        cam12_updated = db_session.get(Camera, "CAM-012")
        assert cam12_updated.active is False

        # Verify open alert on CAM-012 was auto-resolved
        cam12_alert = db_session.get(Alert, alert.id)
        assert cam12_alert.resolved is True
        assert "Resolved: Camera Deactivated" in cam12_alert.message


def test_health_evaluation_list_cameras_and_summary(app, db_session):
    with app.app_context():
        # Trigger creation of cameras 1..10 by changing count from 0 to 10
        ConfigurationService.update_settings({"camera_count": 0})
        ConfigurationService.update_settings({"camera_count": 10})
        
        # Ingest for CAM-001 so it is online
        AlertService.ingest_health_data({
            "camera_id": "CAM-001",
            "cpu_usage": 20.0, "memory_usage": 20.0, "storage_usage": 20.0, "network_latency": 20.0, "is_online": True
        })

        cameras = HealthEvaluationService.list_cameras()
        assert len(cameras) == 10
        cam1 = next(c for c in cameras if c["id"] == "CAM-001")
        assert cam1["status"] == "online"

        summary = HealthEvaluationService.get_dashboard_summary()
        assert summary["total_cameras"] == 10
        assert summary["online"] >= 1
