"""
SQLAlchemy Models
-----------------
Three tables matching the schema design:

1. Camera       - Registered cameras and their current status
2. HealthRecord - Time-series health data (one row per camera per tick)
3. Alert        - Generated alerts when thresholds are crossed

Design decisions:
- camera_id is a string (e.g., "CAM-001") not auto-int, to match real-world camera IDs
- HealthRecord stores a snapshot of all metrics at a point in time
- Alerts have a resolved flag + resolved_at for lifecycle tracking
- to_dict() methods on every model for easy JSON serialization
"""

from datetime import datetime, timezone
from backend.database import db


class Camera(db.Model):
    """Represents a registered camera in the monitoring system."""

    __tablename__ = "cameras"

    id = db.Column(db.String(20), primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(200), default="Unknown")
    status = db.Column(db.String(20), default="offline")  # online/offline/warning/critical
    last_heartbeat = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    # New configurations
    storage_capacity = db.Column(db.Float, default=100.0)      # in GB
    reporting_interval = db.Column(db.Integer, default=30)     # in seconds
    fault_probability = db.Column(db.Float, default=0.05)      # 0.0 to 1.0
    offline_probability = db.Column(db.Float, default=0.03)    # 0.0 to 1.0
    is_enabled = db.Column(db.Boolean, default=True)
    notes = db.Column(db.String(500), nullable=True)

    # Relationships
    health_records = db.relationship("HealthRecord", back_populates="camera", lazy="dynamic")
    alerts = db.relationship("Alert", back_populates="camera", lazy="dynamic")

    def __init__(
        self,
        id,
        name,
        location="Unknown",
        status="offline",
        last_heartbeat=None,
        created_at=None,
        storage_capacity=100.0,
        reporting_interval=30,
        fault_probability=0.05,
        offline_probability=0.03,
        is_enabled=True,
        notes="",
        **kwargs
    ):
        self.id = id
        self.name = name
        self.location = location
        self.status = status
        self.last_heartbeat = last_heartbeat
        if created_at is not None:
            self.created_at = created_at
        self.storage_capacity = storage_capacity
        self.reporting_interval = reporting_interval
        self.fault_probability = fault_probability
        self.offline_probability = offline_probability
        self.is_enabled = is_enabled
        self.notes = notes

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "location": self.location,
            "status": self.status,
            "last_heartbeat": self.last_heartbeat.isoformat() if self.last_heartbeat else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "storage_capacity": self.storage_capacity,
            "reporting_interval": self.reporting_interval,
            "fault_probability": self.fault_probability,
            "offline_probability": self.offline_probability,
            "is_enabled": self.is_enabled,
            "notes": self.notes,
        }


class HealthRecord(db.Model):
    """A single health data snapshot from a camera."""

    __tablename__ = "health_records"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    camera_id = db.Column(db.String(20), db.ForeignKey("cameras.id"), nullable=False)
    cpu_usage = db.Column(db.Float, nullable=False)
    memory_usage = db.Column(db.Float, nullable=False)
    storage_usage = db.Column(db.Float, nullable=False)
    network_latency = db.Column(db.Float, nullable=False)
    is_online = db.Column(db.Boolean, default=True)
    fault_type = db.Column(db.String(100), nullable=True)
    timestamp = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), index=True
    )

    # Relationships
    camera = db.relationship("Camera", back_populates="health_records")

    def __init__(
        self,
        camera_id,
        cpu_usage,
        memory_usage,
        storage_usage,
        network_latency,
        is_online=True,
        fault_type=None,
        timestamp=None,
        **kwargs
    ):
        self.camera_id = camera_id
        self.cpu_usage = cpu_usage
        self.memory_usage = memory_usage
        self.storage_usage = storage_usage
        self.network_latency = network_latency
        self.is_online = is_online
        self.fault_type = fault_type
        if timestamp is not None:
            self.timestamp = timestamp

    def to_dict(self):
        return {
            "id": self.id,
            "camera_id": self.camera_id,
            "cpu_usage": round(self.cpu_usage, 1),
            "memory_usage": round(self.memory_usage, 1),
            "storage_usage": round(self.storage_usage, 1),
            "network_latency": round(self.network_latency, 1),
            "is_online": self.is_online,
            "fault_type": self.fault_type,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }


class Alert(db.Model):
    """An alert generated when a camera metric crosses a threshold."""

    __tablename__ = "alerts"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    camera_id = db.Column(db.String(20), db.ForeignKey("cameras.id"), nullable=False)
    alert_type = db.Column(db.String(50), nullable=False)  # cpu_high, memory_high, etc.
    severity = db.Column(db.String(20), nullable=False)     # warning, critical
    message = db.Column(db.String(500), nullable=False)
    resolved = db.Column(db.Boolean, default=False)
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), index=True
    )
    resolved_at = db.Column(db.DateTime, nullable=True)

    # Relationships
    camera = db.relationship("Camera", back_populates="alerts")

    def __init__(
        self,
        camera_id,
        alert_type,
        severity,
        message,
        resolved=False,
        created_at=None,
        resolved_at=None,
        **kwargs
    ):
        self.camera_id = camera_id
        self.alert_type = alert_type
        self.severity = severity
        self.message = message
        self.resolved = resolved
        if created_at is not None:
            self.created_at = created_at
        if resolved_at is not None:
            self.resolved_at = resolved_at

    def to_dict(self):
        return {
            "id": self.id,
            "camera_id": self.camera_id,
            "camera_name": self.camera.name if self.camera else "Unknown",
            "location": self.camera.location if self.camera else "Unknown",
            "alert_type": self.alert_type,
            "severity": self.severity,
            "message": self.message,
            "resolved": self.resolved,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
        }


class Setting(db.Model):
    """Represents a global configuration setting stored in the database."""

    __tablename__ = "settings"

    key = db.Column(db.String(50), primary_key=True)
    value = db.Column(db.String(255), nullable=False)

    def __init__(self, key, value, **kwargs):
        self.key = key
        self.value = value

    def to_dict(self):
        return {
            "key": self.key,
            "value": self.value,
        }
