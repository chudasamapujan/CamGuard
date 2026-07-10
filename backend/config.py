"""
Backend Configuration
---------------------
Centralized configuration for the Flask application.
Uses a class-based config pattern for easy environment switching.

Design decisions:
- SQLALCHEMY_DATABASE_URI uses SQLite for zero-config local development
- CORS is enabled for all origins in dev (React runs on :5173)
- Default thresholds are stored here and can be overridden at runtime via API
"""

import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    """Base configuration."""

    SECRET_KEY = os.environ.get("SECRET_KEY", "camera-health-monitor-secret-key")

    # Database
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, '..', 'health.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Default health thresholds — crossing these triggers alerts
    THRESHOLDS = {
        "cpu_warning": 75.0,       # CPU % above this = warning
        "cpu_critical": 90.0,      # CPU % above this = critical
        "memory_warning": 75.0,    # Memory % above this = warning
        "memory_critical": 90.0,   # Memory % above this = critical
        "storage_warning": 80.0,   # Storage % above this = warning
        "storage_critical": 95.0,  # Storage % above this = critical
        "latency_warning": 200.0,  # Latency ms above this = warning
        "latency_critical": 500.0, # Latency ms above this = critical
        "heartbeat_timeout": 90,   # Seconds without heartbeat = offline
    }
