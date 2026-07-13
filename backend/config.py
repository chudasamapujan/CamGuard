import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

def get_database_uri():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        db_path = os.environ.get("DATABASE_PATH", os.path.join(BASE_DIR, '..', 'data', 'health.db'))
        # If fallback directory doesn't exist, use .. directly
        if not os.path.exists(os.path.dirname(db_path)) and 'data' in db_path:
            db_path = os.path.join(BASE_DIR, '..', 'health.db')
        return f"sqlite:///{os.path.abspath(db_path)}"
    if db_url.startswith("postgres://"):
        return db_url.replace("postgres://", "postgresql://", 1)
    return db_url

class Config:
    """Base configurations for CamGuard Flask API."""
    SECRET_KEY = os.environ.get("SECRET_KEY", "camera-health-monitor-secret-key")
    
    SQLALCHEMY_DATABASE_URI = get_database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Logging and CORS configurations
    LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
    CORS_ALLOWED_ORIGINS = os.environ.get("CORS_ALLOWED_ORIGINS", "*").split(",") if os.environ.get("CORS_ALLOWED_ORIGINS") != "*" else "*"
    SOCKET_ASYNC_MODE = os.environ.get("SOCKET_ASYNC_MODE", "threading")
    API_KEY = os.environ.get("API_KEY")

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

