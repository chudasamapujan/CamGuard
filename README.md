# 🎥 CamGuard — Multi-Camera Enterprise Health Monitoring Platform

An enterprise-grade, production-ready real-time health monitoring and anomaly detection platform for distributed security camera networks. Designed with modern DevOps best practices, high-concurrency event handling (`Gunicorn` + `Eventlet`), and seamless Docker orchestration for **AWS EC2 Ubuntu 22.04 LTS**.

---

## 🏗️ Architecture & AWS EC2 Deployment Diagram

CamGuard uses a multi-tier containerized architecture orchestrated via Docker Compose. Traffic flows securely from the internet through a production `Nginx` reverse proxy down to our event-driven Flask WSGI backend and real-time Socket.IO communication layer.

```
+-----------------------------------------------------------------------------------------------+
|                                        INTERNET                                               |
+-----------------------------------------------------------------------------------------------+
                                            ↓ HTTPS / HTTP (Port 80/443)
+===============================================================================================+
| AWS EC2 Instance (Ubuntu 22.04 LTS)                                                           |
|                                                                                               |
|   +---------------------------------------------------------------------------------------+   |
|   | Docker Compose Network (camguard-net)                                                 |   |
|   |                                                                                       |   |
|   |   +-------------------------------------------------------------------------------+   |   |
|   |   | Nginx Reverse Proxy & Asset Server (camguard-frontend:80)                     |   |   |
|   |   |                                                                               |   |   |
|   |   |   +--------------------------+         +----------------------------------+   |   |   |
|   |   |   | Static React SPA Build   |         | Reverse Proxy Rules:             |   |   |   |
|   |   |   | (Served from /dist)      |         |  • /api/      -> backend:5000    |   |   |   |
|   |   |   |  • Dynamic Dashboard     |         |  • /socket.io -> backend:5000    |   |   |   |
|   |   |   |  • Real-Time Charts      |         |  • /health    -> backend:5000    |   |   |   |
|   |   |   +--------------------------+         +----------------------------------+   |   |   |
|   |   +-------------------------------------------------------------------------------+   |   |
|   |                           ↓ Internal Proxy / WebSocket Upgrades                       |   |
|   |   +-------------------------------------------------------------------------------+   |   |
|   |   | Gunicorn + Eventlet WSGI Backend (camguard-backend:5000)                      |   |   |
|   |   |                                                                               |   |   |
|   |   |   +--------------------------+         +----------------------------------+   |   |   |
|   |   |   | Flask API Controllers    |         | Socket.IO Real-Time Engine       |   |   |   |
|   |   |   |  • /health, /status      |         |  • async_mode: eventlet          |   |   |   |
|   |   |   |  • /cameras, /alerts     |         |  • Heartbeat & auto-reconnect    |   |   |   |
|   |   |   +--------------------------+         +----------------------------------+   |   |   |
|   |   +-------------------------------------------------------------------------------+   |   |
|   |               ↓ (Read / Write)                     ↑ (HTTP POST Telemetry)            |   |
|   |   +--------------------------+         +----------------------------------+           |   |
|   |   | Persistent Volume Storage|         | Autonomous Telemetry Simulator   |           |   |
|   |   |  • SQLite (health.db)    |         | (camguard-simulator)             |           |   |
|   |   |  • Rotating Logs (/logs) |         |  • Multi-threaded worker pool    |           |   |
|   |   +--------------------------+         +----------------------------------+           |   |
|   +---------------------------------------------------------------------------------------+   |
+===============================================================================================+
```

---

## 🔄 Real-Time Data Flow

1. **Autonomous Initialization & Configuration Sync**:
   On startup, `camguard-backend` initializes database schemas and seeds default global thresholds into SQLite (or PostgreSQL). The `camguard-simulator` container connects to the backend (`GET /settings`) to synchronize configuration and dynamically scale its camera telemetry threads (`CAM-001` through `CAM-N`).

2. **Telemetry Ingestion & Evaluation**:
   Each camera thread ticks at the configured interval (`SIMULATOR_INTERVAL`) and sends rich JSON telemetry metrics (`CPU`, `Memory`, `Storage`, `Latency`, `Online Status`, `Device Faults`) to `POST /health`.
   The backend's `AlertService` and `HealthEvaluationService` process the payload, update real-time node status (`online`, `warning`, `critical`, `offline`), and record telemetry points.

3. **Event-Driven WebSocket Broadcast**:
   If metric boundaries or offline heartbeats exceed thresholds, alarms are created or auto-resolved. Immediately upon database transaction commit, `Flask-SocketIO` pushes sub-second updates across the network:
   - `camera_update`: Pushes exact node health and active alert counts to dashboards.
   - `dashboard_summary`: Emits fleet-wide statistical counts (`Total`, `Online`, `Warning`, `Critical`, `Offline`).
   - `alert_created` / `alert_resolved`: Instantly triggers UI drawer notifications and status indicator updates.
   - `settings_updated`: Broadcasts threshold adjustments across all active client views.

4. **Live React Dashboard**:
   The React dashboard connects to Nginx via `/socket.io/`, automatically upgrading to persistent Eventlet WebSockets. Users observe real-time health score trends, manage individual camera streams, and adjust global thresholds with instant visual feedback.

---

## 📂 Folder Structure

```
camera-health-monitor/
├── backend/
│   ├── routes/                      # Blueprint HTTP controllers
│   │   ├── health.py                # Telemetry ingestion (/health) & time-series history
│   │   ├── cameras.py               # Fleet listing & individual node diagnostics
│   │   ├── alerts.py                # System alerts & global settings modification
│   │   └── docs.py                  # Embedded Swagger UI & OpenAPI spec serving
│   ├── services/                    # Core business logic layer
│   │   ├── configuration_service.py # System threshold seeding & dynamic node scaling
│   │   ├── health_evaluation_service.py # Status evaluation & fleet summary aggregations
│   │   ├── alert_service.py         # Ingestion pipeline, rule evaluation & deduplication
│   │   └── history_service.py       # Time-series slotting for 24h/5m charts
│   ├── app.py                       # Application factory, logging setup & health checks
│   ├── config.py                    # Environment variable parsing & database URI resolver
│   ├── database.py                  # SQLAlchemy ORM initialization
│   ├── models.py                    # Database schema models (Camera, HealthRecord, Alert, Setting)
│   ├── socket_manager.py            # Socket.IO Eventlet server & broadcast helpers
│   └── wsgi.py                      # Production WSGI entry point for Gunicorn + Eventlet
├── dashboard/                       # React (Vite) Frontend Single Page Application
│   ├── src/
│   │   ├── components/              # Modular UI components (Cards, Drawers, MetricCharts)
│   │   ├── contexts/                # Theme & state providers
│   │   ├── pages/                   # Main Dashboard UI view
│   │   ├── services/                # API clients (`api.js`, `socket.js` with Nginx routing)
│   │   └── App.jsx                  # Main router & live connection status header
│   ├── package.json
│   └── vite.config.js
├── simulator/                       # Autonomous Multi-Threaded Camera Simulator
│   ├── camera.py                    # Camera state machine & realistic metric generator
│   ├── config.py                    # Simulator environment configuration
│   └── run_simulator.py             # Orchestrator with dynamic thread pool management
├── deployment/                      # AWS EC2 Ubuntu Production Deployment Suite
│   ├── setup.sh                     # Server prep script (Docker, UFW firewall, folder creation)
│   ├── deploy.sh                    # Automated multi-container build & health verification script
│   ├── backup.sh                    # Automated database & rotating log archive script
│   └── update.sh                    # Zero-downtime rolling update & cleanup script
├── Dockerfile.backend               # Backend Gunicorn + Eventlet container build
├── Dockerfile.frontend              # Frontend Multi-stage (Node build -> Nginx static server)
├── Dockerfile.simulator             # Autonomous simulator container build
├── docker-compose.yml               # Production multi-container orchestration
├── nginx.conf                       # Production reverse proxy, security headers & caching rules
├── .env.example                     # Comprehensive environment variable template
├── requirements.txt                 # Backend Python package dependencies
└── README.md                        # Platform manual
```

---

## ⚙️ Environment Variables (`.env`)

Copy `.env.example` to `.env` before deploying. All services are strictly configured via environment variables—no hardcoded URLs or ports are used.

| Variable | Default | Description |
| :--- | :--- | :--- |
| `SECRET_KEY` | `camguard-super-secret...` | Cryptographic secret used by Flask for secure session management. |
| `API_KEY` | *(empty / unprotected)* | Optional admin token to secure global `/settings` modifications. |
| `DATABASE_URL` | `sqlite:////app/data/health.db` | Database connection string (`sqlite:///...` or `postgresql://...`). |
| `LOG_LEVEL` | `INFO` | System logging verbosity (`DEBUG`, `INFO`, `WARNING`, `ERROR`). |
| `API_PORT` | `5000` | Internal port bound by Gunicorn inside the backend container. |
| `CORS_ALLOWED_ORIGINS` | `*` | Comma-separated list of allowed origins or `*` for Nginx reverse proxying. |
| `SOCKET_ASYNC_MODE` | `eventlet` | Socket.IO concurrency driver (`eventlet` in production, `threading` in dev). |
| `BACKEND_URL` | `http://backend:5000` | Internal Docker Compose network target used by the Simulator. |
| `SIMULATOR_INTERVAL` | `30` | Default telemetry send interval per camera in seconds. |
| `CAMERA_COUNT` | `10` | Initial number of camera nodes to simulate. |
| `VITE_API_URL` | `/api` | React build target pointing to Nginx `/api` reverse proxy path. |
| `VITE_SOCKET_URL` | `/` | React build target pointing to Nginx root (`/socket.io/` upgrade path). |

---

## 🐳 Docker Setup & Local Testing

The entire system starts with a single command without manual configuration or local database setups:

```bash
# 1. Clone the repository and configure environment variables
git clone https://github.com/your-username/camera-health-monitor.git
cd camera-health-monitor
cp .env.example .env

# 2. Build and launch all production services in detached mode
docker compose up --build -d

# 3. Verify service container status and health checks
docker compose ps
```

Once running locally:
- **Dashboard UI**: [http://localhost](http://localhost)
- **API Health Check**: [http://localhost/health](http://localhost/health)
- **API Status Verification**: [http://localhost/status](http://localhost/status)
- **API Version Info**: [http://localhost/version](http://localhost/version)
- **Interactive Swagger Docs**: [http://localhost/docs](http://localhost/docs)

---

## ☁️ AWS EC2 (Ubuntu 22.04 LTS) Deployment Guide

We have included automated scripts inside the `deployment/` directory to deploy CamGuard on a fresh **AWS EC2 Ubuntu 22.04 instance** in under 5 minutes.

### Step 1: Provision AWS EC2 Instance
1. Launch an EC2 instance using the **Ubuntu Server 22.04 LTS (HVM)** AMI (`t2.medium` or `t3.medium` recommended).
2. Configure **Security Group** inbound rules:
   - **SSH (Port 22)**: From your IP address.
   - **HTTP (Port 80)**: From `0.0.0.0/0` (Anywhere - IPv4 & IPv6).
   - **HTTPS (Port 443)**: From `0.0.0.0/0` (Anywhere - IPv4 & IPv6).
3. Connect to your server via SSH:
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-public-ip
   ```

### Step 2: Run Server Setup Script
Transfer or clone your project, then execute the automated setup script to install Docker, Docker Compose V2, UFW firewall rules, and application directories (`/opt/camguard`):

```bash
# Upload project or clone via Git
git clone https://github.com/your-username/camera-health-monitor.git /opt/camguard
cd /opt/camguard

# Run setup script with sudo privileges
sudo bash deployment/setup.sh
```

### Step 3: Deploy Application
Execute `deploy.sh` to build optimized container images, start Gunicorn/Eventlet, initialize the database, verify endpoint health, and display live URLs:

```bash
# Execute automated production deployment
bash deployment/deploy.sh
```

### Step 4: Automated Backups & Updates
- **Automated Backups**: Run `bash deployment/backup.sh` to extract `health.db` and log files into timestamped `.tar.gz` archives (`/opt/camguard/backups/`). To schedule daily backups at 2 AM, add this entry to crontab (`crontab -e`):
  ```cron
  0 2 * * * /bin/bash /opt/camguard/deployment/backup.sh >> /opt/camguard/logs/backup.log 2>&1
  ```
- **Zero-Downtime Updates**: To pull new code from Git, backup existing data, rebuild containers, and prune old layers automatically:
  ```bash
  bash deployment/update.sh
  ```

---

## ⚡ Socket.IO Production Architecture

CamGuard uses `flask-socketio` with the `eventlet` WSGI asynchronous worker inside Gunicorn (`--worker-class eventlet -w 1`) to achieve robust, high-concurrency real-time WebSocket communication:

1. **Nginx Reverse Proxy Upgrades**:
   Nginx intercepts traffic at `/socket.io/` and upgrades HTTP requests to persistent WebSocket connections using custom headers (`Upgrade`, `Connection: upgrade`). Extended read/send timeouts (`86400s`) prevent premature disconnections during idle periods.
2. **Heartbeat & Auto-Reconnect**:
   The server is configured with `ping_timeout=20` and `ping_interval=10`. If a network interruption occurs, `socket.io-client` on the React dashboard executes automatic exponential backoff attempts (`reconnectionAttempts: Infinity`), switching dynamically between `websocket` and `polling` transports as needed.
3. **Multi-Tab Synchronization**:
   All state transitions (`camera_update`, `alert_created`, `settings_updated`) are broadcast across the backend event bus to every open browser session simultaneously without polling.

---

## 📖 Swagger API & OpenAPI Documentation

CamGuard features embedded interactive Swagger UI documentation and a full OpenAPI 3.0 specification:

- **Swagger UI**: Access `http://your-server-ip/docs` to interactively test endpoints right from your browser.
- **OpenAPI Spec**: The raw YAML schema is served at `http://your-server-ip/openapi.yaml`.

### Core API Endpoints

| HTTP Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Production health check (`database`, `service`, `version`). |
| `GET` | `/status` | Quick service verification check (`status: running`). |
| `GET` | `/version` | Returns current API semantic version (`1.0.0`). |
| `POST` | `/health` (or `/api/health`) | Telemetry ingestion endpoint for simulator packets. |
| `GET` | `/cameras` (or `/api/cameras`) | Retrieves active camera fleet with latest status metrics. |
| `GET` | `/cameras/<id>` (or `/api/cameras/<id>`) | Retrieves deep diagnostics and active alerts for a single node. |
| `GET` | `/history/<id>` (or `/api/history/<id>`) | Retrieves 24-hour time-series telemetry logs for a camera. |
| `GET` | `/dashboard/summary` (or `/api/dashboard/summary`) | Retrieves aggregated counts (`Online`, `Warning`, `Critical`, `Offline`). |
| `GET` | `/dashboard/history` (or `/api/dashboard/history`) | Retrieves 5-minute slotted fleet history for line chart visualizations. |
| `GET` | `/alerts` (or `/api/alerts`) | Retrieves active and resolved system incident logs (`?active=true&limit=50`). |
| `PUT` | `/alerts/<id>/resolve` (or `/api/alerts/<id>/resolve`) | Manually acknowledges and resolves an active incident alert. |
| `GET` | `/settings` (or `/api/settings`) | Retrieves current global anomaly detection thresholds. |
| `PUT/POST`| `/settings` (or `/api/settings`) | Updates global configuration thresholds and scales camera fleet. |

---

## 🧪 Test Suite Instructions

CamGuard includes comprehensive automated test suites for both backend and frontend components. For complete execution logs and coverage details, reference [TEST_REPORT.md](TEST_REPORT.md).

### Backend Test Suite (`pytest`)
To run the Python backend test suite and generate a terminal coverage report:
```bash
# 1. Install development and testing dependencies
pip install -r requirements-dev.txt

# 2. Execute pytest with coverage reporting
pytest --cov=backend --cov-report=term-missing
```
*Expected Output*: All 21 unit and integration tests pass with ~87% code coverage across routes, business logic services, models, and rate limiting.

### Frontend Test Suite (`vitest`)
To run the React frontend unit and integration tests:
```bash
# 1. Navigate to dashboard directory and install packages
cd dashboard
npm install

# 2. Execute Vitest test suite
npm test -- --run
```
*Expected Output*: All 25 tests across 6 test files (`StatusBadge`, `DashboardSummary`, `CameraCard`, `MetricChart`, `AlertBanner`, `AppRouting`) pass cleanly using the `happy-dom` virtual environment.

---

## 🤖 AI Tools Used

This project utilized AI assistance (DeepMind Antigravity / Gemini code agent) collaboratively with human engineering oversight to accelerate development while ensuring strict architectural standards:

- **AI-Assisted Scaffolding**: Initial boilerplate for Flask blueprints (`health.py`, `cameras.py`, `alerts.py`, `settings.py`), SQLAlchemy models, and basic React component layouts were scaffolded using AI.
- **AI-Assisted DevOps & Infrastructure**: Nginx reverse proxy configuration (WebSocket headers, dual-stack TLS on port 443, rate limiting pass-throughs), multi-stage Dockerfiles (`Dockerfile.backend`, `Dockerfile.frontend`), and GitHub Actions CI pipeline (`.github/workflows/ci.yml`) were generated and tuned with AI assistance.
- **AI-Assisted Test Generation**: Initial drafts for `pytest` fixtures, API integration tests (`test_routes.py`, `test_services.py`), and Vitest React Testing Library tests (`StatusBadge.test.jsx`, `CameraCard.test.jsx`, `MetricChart.test.jsx`, etc.) were generated by AI and subsequently refined to cover edge cases.
- **Hand-Written / Human Refinement & Verification**: Core architectural decisions (Eventlet concurrency monkey-patching, N+1 query elimination via window functions/group-wise maximums, SQLite thread safety management, strict environment variable enforcement, dynamic threshold propagation to UI components, and all final debugging/verification passes) were hand-written and rigorously validated end-to-end by human engineering review.

---

## ⚠️ Known Limitations & Trade-offs

1. **SQLite Datastore (Not Multi-Writer Safe)**: The system defaults to SQLite (`health.db`) for zero-configuration local deployment. While adequate for single-process operations, SQLite does not support high-concurrency multi-writer scaling across network volumes. For horizontal scaling, `DATABASE_URL` must be updated to point to a production PostgreSQL cluster.
2. **Single Gunicorn/Eventlet Worker**: To maintain in-memory Socket.IO client session tables and prevent WebSocket broadcast fragmentation, the backend container runs with `-w 1 --worker-class eventlet`. Horizontal scaling across multiple containers requires integrating a Redis message broker (`message_queue='redis://...'`).
3. **Self-Signed TLS Certificates**: The containerized Nginx reverse proxy automatically generates 2048-bit self-signed RSA TLS certificates (`server.crt` / `server.key`) on startup if custom certificates are not mounted. Browsers will display a security warning until valid SSL/TLS certificates (e.g., Let's Encrypt / ACME) for a registered domain name are provided via volume mount.
4. **Production `/settings` Authentication Lockdown**: When `ENVIRONMENT=production`, the application strictly mandates that `API_KEY` must be set. If `ENVIRONMENT=production` and `API_KEY` is left blank/unset, `create_app()` will raise a `RuntimeError` and refuse to boot, ensuring sensitive threshold mutations and camera scaling cannot be exposed unauthenticated.
5. **No CI-Blocking Coverage Thresholds**: While automated tests run inside GitHub Actions (`ci.yml`), the pipeline does not currently enforce a strict failure threshold (e.g., blocking merges if backend coverage drops below 85%).

---

## 🔮 Future Improvements

1. **PostgreSQL / TimescaleDB Migration**: While SQLite handles thousands of records cleanly inside Docker volumes, `backend/config.py` is pre-configured to transition seamlessly to PostgreSQL (`postgresql://...`) by updating `DATABASE_URL` in `.env` for multi-node horizontally scaled deployments.
2. **Redis Message Broker**: Integrating `Redis` as a Socket.IO message queue (`message_queue='redis://...'`) to allow running multiple Gunicorn worker processes concurrently across multiple backend containers.
3. **Role-Based Access Control (RBAC)**: Expanding the optional `API_KEY` header protection into JWT-based authentication (`Access/Refresh tokens`) with granular operator vs. read-only roles.
4. **Automated Alert Notifications**: Connecting `AlertService` violations directly to Slack webhooks, PagerDuty, or AWS SNS email/SMS notifications.

---

## 🛠️ Troubleshooting & Diagnostics

### 1. Check Container Health Status
If a service reports `unhealthy` in `docker compose ps`, inspect the specific health check failure:
```bash
docker inspect --format "{{json .State.Health}}" camguard-backend | jq .
docker inspect --format "{{json .State.Health}}" camguard-frontend | jq .
```

### 2. View Real-Time Rotating Logs
Log files are streamed both to console stdout and into rotating file handlers (`logs/backend.log` and `logs/simulator.log`):
```bash
# View live container stdout logs
docker compose logs -f backend
docker compose logs -f simulator

# View structured rotating log files from host volume
tail -f logs/backend.log
tail -f logs/simulator.log
```

### 3. Verify Nginx Reverse Proxy Routing
If API calls return `502 Bad Gateway`, verify that `camguard-backend` is listening inside the bridge network:
```bash
docker exec -it camguard-frontend curl -i http://backend:5000/health
```

### 4. Database Reset / Recovery
If you need to wipe or reset the local SQLite database cleanly:
```bash
# Stop containers and remove persistent database volume
docker compose down -v
docker compose up --build -d
```
