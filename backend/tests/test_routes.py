from backend.models import Alert, Camera
from backend.services.configuration_service import ConfigurationService


def test_health_ingest_valid_and_missing_camera_id(client, db_session):
    # Missing camera_id -> 400
    res_bad = client.post("/health", json={"cpu_usage": 50.0})
    assert res_bad.status_code == 400
    assert "error" in res_bad.get_json()

    # Valid payload -> 201
    res_good = client.post("/health", json={
        "camera_id": "CAM-101",
        "name": "Lobby Camera",
        "cpu_usage": 50.0,
        "memory_usage": 50.0,
        "storage_usage": 50.0,
        "network_latency": 50.0,
        "is_online": True
    })
    assert res_good.status_code == 201
    assert res_good.get_json()["status"] == "ok"


def test_health_ingest_input_validation_rules(client, db_session):
    # 1. Out of range CPU (> 100)
    res = client.post("/health", json={"camera_id": "CAM-101", "cpu_usage": 105.0})
    assert res.status_code == 400
    assert "between 0 and 100" in res.get_json()["error"]

    # 2. Out of range Memory (< 0)
    res = client.post("/health", json={"camera_id": "CAM-101", "memory_usage": -5.0})
    assert res.status_code == 400
    assert "between 0 and 100" in res.get_json()["error"]

    # 3. Non-numeric storage
    res = client.post("/health", json={"camera_id": "CAM-101", "storage_usage": "full"})
    assert res.status_code == 400
    assert "must be numeric" in res.get_json()["error"]

    # 4. Negative network latency
    res = client.post("/health", json={"camera_id": "CAM-101", "network_latency": -20.0})
    assert res.status_code == 400
    assert "non-negative" in res.get_json()["error"]

    # 5. Invalid / non-dict payload
    res = client.post("/health", data="not json", content_type="application/json")
    assert res.status_code == 400
    assert "Invalid or missing JSON payload" in res.get_json()["error"]



def test_health_ingest_increases_active_alerts(client, db_session):
    # Normal telemetry
    client.post("/health", json={
        "camera_id": "CAM-102",
        "cpu_usage": 40.0, "memory_usage": 40.0, "storage_usage": 40.0, "network_latency": 50.0, "is_online": True
    })
    assert Alert.query.filter_by(camera_id="CAM-102", resolved=False).count() == 0

    # Breach threshold (CPU critical >= 90%)
    res_breach = client.post("/health", json={
        "camera_id": "CAM-102",
        "cpu_usage": 95.0, "memory_usage": 40.0, "storage_usage": 40.0, "network_latency": 50.0, "is_online": True
    })
    assert res_breach.status_code == 201
    assert res_breach.get_json()["new_alerts"] == 1
    assert Alert.query.filter_by(camera_id="CAM-102", resolved=False).count() == 1


def test_cameras_routes(client, db_session):
    # Ensure camera exists
    client.post("/health", json={
        "camera_id": "CAM-200",
        "name": "Parking Cam",
        "cpu_usage": 30.0, "memory_usage": 30.0, "storage_usage": 30.0, "network_latency": 30.0, "is_online": True
    })

    # GET /cameras
    res_list = client.get("/cameras")
    assert res_list.status_code == 200
    cams = res_list.get_json()
    assert isinstance(cams, list)
    assert any(c["id"] == "CAM-200" for c in cams)

    # GET /cameras/<id> found
    res_get = client.get("/cameras/CAM-200")
    assert res_get.status_code == 200
    assert res_get.get_json()["id"] == "CAM-200"

    # GET /cameras/<id> 404
    res_404 = client.get("/cameras/CAM-NONEXISTENT")
    assert res_404.status_code == 404
    assert "error" in res_404.get_json()


def test_dashboard_summary_route(client, db_session):
    res = client.get("/dashboard/summary")
    assert res.status_code == 200
    data = res.get_json()
    assert "total_cameras" in data
    assert "online" in data
    assert "active_alerts" in data


def test_alerts_list_and_resolve_routes(client, db_session):
    # Create an alert via breach
    client.post("/health", json={
        "camera_id": "CAM-300",
        "cpu_usage": 98.0, "memory_usage": 40.0, "storage_usage": 40.0, "network_latency": 50.0, "is_online": True
    })

    # GET /alerts
    res_alerts = client.get("/alerts?active=true")
    assert res_alerts.status_code == 200
    alerts = res_alerts.get_json()
    assert len(alerts) >= 1
    alert_id = alerts[0]["id"]

    # PUT /alerts/<id>/resolve
    res_resolve = client.put(f"/alerts/{alert_id}/resolve")
    assert res_resolve.status_code == 200
    assert "resolved successfully" in res_resolve.get_json()["message"]

    # PUT /alerts/<id>/resolve for nonexistent alert
    res_not_found = client.put("/alerts/999999/resolve")
    assert res_not_found.status_code == 404


def test_settings_routes_without_api_key(client, monkeypatch):
    from backend.config import Config
    monkeypatch.setattr(Config, "API_KEY", None)

    # GET /settings
    res_get = client.get("/settings")
    assert res_get.status_code == 200
    assert "cpu_threshold" in res_get.get_json()

    # PUT /settings without API_KEY should succeed when Config.API_KEY is None
    res_put = client.put("/settings", json={"cpu_threshold": 77.0})
    assert res_put.status_code == 200
    assert res_put.get_json()["settings"]["cpu_threshold"] == 77.0


def test_settings_routes_with_api_key(client, monkeypatch):
    from backend.config import Config
    monkeypatch.setattr(Config, "API_KEY", "secret-test-key")

    # PUT /settings without header -> 401
    res_unauth = client.put("/settings", json={"cpu_threshold": 78.0})
    assert res_unauth.status_code == 401

    # PUT /settings with wrong key -> 401
    res_wrong = client.put("/settings", json={"cpu_threshold": 78.0}, headers={"X-API-Key": "wrong-key"})
    assert res_wrong.status_code == 401

    # PUT /settings with correct X-API-Key -> 200
    res_auth_x = client.put("/settings", json={"cpu_threshold": 79.0}, headers={"X-API-Key": "secret-test-key"})
    assert res_auth_x.status_code == 200
    assert res_auth_x.get_json()["settings"]["cpu_threshold"] == 79.0

    # PUT /settings with Authorization Bearer -> 200
    res_auth_b = client.put("/settings", json={"cpu_threshold": 80.0}, headers={"Authorization": "Bearer secret-test-key"})
    assert res_auth_b.status_code == 200
    assert res_auth_b.get_json()["settings"]["cpu_threshold"] == 80.0


def test_history_routes(client, db_session):
    client.post("/health", json={
        "camera_id": "CAM-400",
        "cpu_usage": 60.0, "memory_usage": 60.0, "storage_usage": 60.0, "network_latency": 160.0, "is_online": True
    })

    # GET /history/<camera_id>
    res_cam_hist = client.get("/history/CAM-400?hours=12")
    assert res_cam_hist.status_code == 200
    data_cam = res_cam_hist.get_json()
    assert data_cam["camera_id"] == "CAM-400"
    assert data_cam["count"] >= 1

    # GET /dashboard/history
    res_dash_hist = client.get("/dashboard/history?hours=6")
    assert res_dash_hist.status_code == 200
    data_dash = res_dash_hist.get_json()
    assert isinstance(data_dash, list)
    assert len(data_dash) >= 1
    assert "health_score" in data_dash[0]


def test_exception_handler_production_vs_development(app, client):
    # Add a temporary failing route to trigger Exception handler
    @app.route("/error-test-endpoint")
    def trigger_error():
        raise ValueError("Secret database password db_pass_123 leaked!")

    # Test development mode (should include error details)
    app.config["ENVIRONMENT"] = "development"
    res_dev = client.get("/error-test-endpoint")
    assert res_dev.status_code == 500
    data_dev = res_dev.get_json()
    assert "Secret database password db_pass_123 leaked!" in data_dev["error"]

    # Test production mode (should mask error details with generic message)
    app.config["ENVIRONMENT"] = "production"
    res_prod = client.get("/error-test-endpoint")
    assert res_prod.status_code == 500
    data_prod = res_prod.get_json()
    assert data_prod["error"] == "An internal server error occurred."
    assert "db_pass_123" not in data_prod["error"]

    # Reset environment to default
    app.config["ENVIRONMENT"] = "development"


