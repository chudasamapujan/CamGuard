# CamGuard - Multi-Camera Health Monitoring System

CamGuard is an enterprise-grade dashboard and monitoring system designed to track the physical and operating health of multi-camera surveillance deployments. It evaluates camera performance metrics (such as CPU usage, memory, storage, and network latency) and generates alerts on health threshold breaches.

> [!NOTE]
> This application is a health monitoring and diagnostic system. It does **not** capture or stream live video feeds.

---

## Technical Stack

### Backend
- **Language**: Python
- **Framework**: Flask (REST API)
- **Database**: SQLite (SQLAlchemy ORM)

### Frontend
- **Language**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Charts**: Chart.js

### Camera Simulator
- **Language**: Python (Simulates camera devices transmitting telemetry data to the backend REST API)

---

## Directory Structure

```text
CamGuard/
├── backend/          # Flask application, routes, config, and models (Commit 2+)
├── frontend/         # Web dashboard assets (HTML, CSS, JS) (Commit 5+)
├── simulator/        # Multi-camera client telemetry simulator (Commit 3+)
├── .gitignore        # Git ignore rules
└── requirements.txt  # Python backend dependencies
```

---

## Getting Started

### Prerequisites
- Python 3.8 or higher installed on your system.

### Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd CamGuard
   ```

2. **Set up a virtual environment**:
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv .venv
     .venv\Scripts\Activate.ps1
     ```
   - **macOS / Linux**:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. **Install backend dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
