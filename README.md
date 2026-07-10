# 🎥 CamGuard — Multi-Camera Health Monitoring System

A production-ready system for monitoring the health of multiple security cameras in real-time.

## Architecture

```
Camera Simulator (Python) → Flask Backend (REST API + SQLite) → React Dashboard (Vite)
```

## Quick Start

### 1. Install Python Dependencies

```bash
cd camera-health-monitor
pip install -r requirements.txt
```

### 2. Start the Flask Backend

```bash
cd camera-health-monitor
python -m backend.app
```

The API will be running at `http://localhost:5000`

### 3. Start the Camera Simulator

In a new terminal:

```bash
cd camera-health-monitor
python -m simulator.simulator
```

### 4. Start the React Dashboard

In a new terminal:

```bash
cd camera-health-monitor/dashboard
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Features

- **10 Simulated Cameras** with realistic drift-based metrics
- **Real-time Dashboard** with 5-second polling
- **Alert Generation** with deduplication and auto-resolution
- **Historical Charts** using Chart.js
- **Configurable Thresholds** via REST API
- **Responsive Design** — works on desktop and mobile
- **Fault Injection** — random hardware faults for testing alerts

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/health` | Ingest camera health data |
| GET | `/api/cameras` | List all cameras |
| GET | `/api/cameras/<id>` | Camera details |
| GET | `/api/cameras/<id>/history` | Historical data |
| GET | `/api/dashboard/summary` | Dashboard stats |
| GET | `/api/alerts` | List alerts |
| PUT | `/api/alerts/<id>/resolve` | Resolve alert |
| GET | `/api/config/thresholds` | Get thresholds |
| PUT | `/api/config/thresholds` | Update thresholds |

## Tech Stack

- **Simulator**: Python, threading, requests
- **Backend**: Flask, SQLAlchemy, SQLite, Flask-CORS
- **Frontend**: React, Vite, Chart.js, Axios
