import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    """Base configurations for CamGuard Flask API."""
    SECRET_KEY = os.environ.get("SECRET_KEY", "camera-health-monitor-secret-key")
    
    # SQLite local DB path
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, '..', 'health.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Standard fallback defaults if settings table is empty
    DEFAULT_SETTINGS = {
        "camera_count": "10",
        "reporting_interval": "30",
        "fault_probability": "0.05",
        "cpu_threshold": "75.0",
        "memory_threshold": "75.0",
        "storage_threshold": "80.0",
        "latency_threshold": "200.0",
        "offline_timeout": "90",
    }
