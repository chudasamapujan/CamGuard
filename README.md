# 🎥 CamGuard — Multi-Camera Health Monitoring Platform

A production-ready monitoring platform for security cameras, inspired by Datadog and Grafana.

---

## 🏗️ Architecture

```
+--------------------------+          +-------------------------+          +------------------------+
|                          |          |                         |          |                        |
|  Camera Telemetry        |  POST    |  Flask API Server       |  Read    |  React SPA Dashboard   |
|  Simulator               | -------->|  (Services & Route      | <--------|  (Summary, Grid,       |
|  (Thread-based scaling)  |  JSON    |  Controllers)           |  JSON    |  Charts, Alerts Log)   |
|                          |          |                         |          |                        |
+--------------------------+          +-------------------------+          +------------------------+
                                                   |
                                                   | SQLite DB
                                                   v
                                      +-------------------------+
                                      |                         |
                                      |  Tables:                |
                                      |  - cameras              |
                                      |  - health_records       |
                                      |  - alerts               |
                                      |  - settings             |
                                      |                         |
                                      +-------------------------+
```

### System Flow
1. **Dynamic Initialization**: On startup, the backend spins up and automatically seeds default system configuration options (camera count, intervals, alerting thresholds) into the SQLite database.
2. **Telemetry Ingestion**: The Telemetry Simulator pulls the current camera count, reporting interval, and fault probability from `/settings`. It dynamically scales the telemetry threads to simulate that exact camera fleet, generating drift-based health metrics (CPU, Memory, Storage, network latency) and posting them to `/health`.
3. **Health Evaluation & Auto-Alerting**: The backend receives the metrics, logs a new time-series record, and evaluates them against warning/critical thresholds. If values cross thresholds, a warning or critical alert is generated automatically. When metrics return to normal, active alerts are auto-resolved.
4. **Interactive Dashboard**: The React client polls summary data, camera status grids, history charts, and recent alerts every 5 seconds, maintaining real-time system visibility.

---

## 📂 Folder Structure

```
camera-health-monitor/
├── backend/
│   ├── routes/                # Blueprint route controllers (requests mapping)
│   │   ├── health.py          # Telemetry & history routes
│   │   ├── cameras.py         # Camera listing & summary routes
│   │   ├── alerts.py          # Alert log & configurations routes
│   │   └── docs.py            # Swagger API documentation rendering
│   ├── services/              # Business logic layers (services architecture)
│   │   ├── configuration_service.py   # Seeding and managing DB configs
│   │   ├── health_evaluation_service.py # Cameras health status calculators
│   │   ├── alert_service.py           # Ingestion pipelines & incident generation
│   │   └── history_service.py         # Aggregators for time-series charts
│   ├── app.py                 # Application factory entry point
│   ├── config.py              # Server static configs and DB paths
│   └── database.py            # db initialization
├── dashboard/                 # React Frontend
│   ├── src/
│   │   ├── components/        # Isolated UI components (Cards, Drawers, Charts)
│   │   ├── contexts/          # Theme/CSS providers
│   │   ├── pages/             # Unified single-screen Dashboard page
│   │   ├── services/          # API Axios clients
│   │   └── App.jsx            # Main app page router
│   └── index.html
├── simulator/                 # Telemetry Simulator
│   ├── camera.py              # Telemetry metrics generator
│   └── run_simulator.py       # Orchestrator with thread scaling
├── requirements.txt           # Python backend dependencies
└── README.md                  # System manual
```

---

## 🚀 Deployment Guide

### Local Development Setup

#### 1. Install Dependencies
```bash
# Install Python packages
pip install -r requirements.txt

# Install React dashboard packages
cd dashboard
npm install
```

#### 2. Start Services
Ensure the backend is started first to configure databases and settings:
```bash
# Terminal 1: Start Backend Server
python -m backend.app
```
*Backend is running at `http://localhost:5000` (docs at `http://localhost:5000/docs`).*

```bash
# Terminal 2: Start Telemetry Simulator
python -m simulator.run_simulator
```

```bash
# Terminal 3: Start React Dashboard
cd dashboard
npm run dev
```
*Frontend dashboard is live at `http://localhost:5173`.*

---

## ⚙️ Configuration & Thresholds

System configurations are fully dynamic. You can edit them from the dashboard **Settings** tab. Changes take effect on both the backend and simulator instantly without reloading code.

- **Simulator Settings**:
  - `camera_count`: Spawns/despawns telemetry threads dynamically.
  - `reporting_interval`: Delay in seconds between telemetry check-ins.
  - `fault_probability`: Probability (0.0 to 1.0) of a camera experiencing a sudden metric spike.
- **Metric Thresholds**:
  - `cpu_threshold`: Warning ceiling (%). Critical is computed at `cpu_threshold * 1.2`.
  - `memory_threshold`: Warning ceiling (%). Critical is computed at `memory_threshold * 1.2`.
  - `storage_threshold`: Warning ceiling (%). Critical is computed at `storage_threshold * 1.15`.
  - `latency_threshold`: Warning ceiling (ms). Critical is computed at `latency_threshold * 2.5`.
  - `offline_timeout`: Heartbeat delay (seconds) before camera is flagged as `offline`.

---

## 📡 API Documentation

Available interactively at `http://localhost:5000/docs`.

### Primary Endpoints:
- `GET /cameras`: Fetch all cameras with status and latest health metrics.
- `GET /cameras/<id>`: Details of a single camera and active alerts list.
- `GET /history/<camera_id>`: Historical telemetry logs for a camera.
- `GET /dashboard/summary`: Summary metrics of total, online, and warning states.
- `GET /dashboard/history`: Time-series aggregates for fleet performance lines.
- `GET /alerts`: Active or historical alerts list.
- `PUT /alerts/<id>/resolve`: Resolve an active incident manually.
- `GET /settings`: Fetch all global settings.
- `POST /settings`: Update global configurations (Simulator & Thresholds).

---

## 🧪 Testing & Validation

- **Thread Scaling Test**: Open Settings, change `camera_count` from 10 to 5, and save. Check simulator output — you will see camera threads `CAM-006` through `CAM-010` safely shutdown, and only 5 camera telemetry check-ins continue.
- **Incident Verification Test**: Set thresholds to low values (e.g. CPU warning threshold to 10%). Check the dashboard — warnings/alerts will immediately list on the dashboard, and statuses will change to warning/critical. Revert thresholds back to 75% — warning incidents will automatically resolve.
- **Offline Detection Test**: Shut down the simulator process. After the configured `offline_timeout` (e.g., 90s), camera statuses on the dashboard will turn grey and display `offline`.

---

## 💡 Future Improvements
- **WebSockets / Socket.io**: Replace 5-second polling with event-driven WebSockets for sub-second telemetry updates.
- **User Authentication**: Implement OAuth/JWT authentication to prevent unauthorized setting overrides.
- **Slack/Email Webhooks**: Integrate Slack notification triggers on critical database incidents.

---

## 🤖 AI Tools Used
- **Antigravity IDE**: Automated refactoring, database schema migration, design enhancements, and verification checks.
