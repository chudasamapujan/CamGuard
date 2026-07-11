from datetime import datetime, timezone
from backend.database import db

def serialize_dt(dt):
    """Serialize datetime to ISO string with UTC indicator."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.isoformat() + "Z"
    return dt.isoformat()

class Camera(db.Model):
    """Represents a camera node in the system."""
    __tablename__ = "cameras"

    id = db.Column(db.String(50), primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(20), default="offline")  # online, warning, critical, offline
    last_heartbeat = db.Column(db.DateTime, nullable=True)

    # Relationships
    health_records = db.relationship("HealthRecord", back_populates="camera", cascade="all, delete-orphan", lazy="dynamic")
    alerts = db.relationship("Alert", back_populates="camera", cascade="all, delete-orphan", lazy="dynamic")

    def __init__(self, id, name, status="offline", last_heartbeat=None, **kwargs):
        self.id = id
        self.name = name
        self.status = status
        self.last_heartbeat = last_heartbeat

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "status": self.status,
            "last_heartbeat": serialize_dt(self.last_heartbeat)
        }

class HealthRecord(db.Model):
    """Time-series telemetry packet from a camera."""
    __tablename__ = "health_records"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    camera_id = db.Column(db.String(50), db.ForeignKey("cameras.id"), nullable=False)
    cpu_usage = db.Column(db.Float, nullable=False)
    memory_usage = db.Column(db.Float, nullable=False)
    storage_usage = db.Column(db.Float, nullable=False)
    network_latency = db.Column(db.Float, nullable=False)
    is_online = db.Column(db.Boolean, default=True)
    fault_type = db.Column(db.String(100), nullable=True)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    camera = db.relationship("Camera", back_populates="health_records")

    def __init__(self, camera_id, cpu_usage, memory_usage, storage_usage, network_latency, is_online=True, fault_type=None, timestamp=None, **kwargs):
        self.camera_id = camera_id
        self.cpu_usage = cpu_usage
        self.memory_usage = memory_usage
        self.storage_usage = storage_usage
        self.network_latency = network_latency
        self.is_online = is_online
        self.fault_type = fault_type
        self.timestamp = timestamp or datetime.now(timezone.utc)

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
            "timestamp": serialize_dt(self.timestamp)
        }

class Alert(db.Model):
    """Incidents triggered when thresholds are crossed."""
    __tablename__ = "alerts"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    camera_id = db.Column(db.String(50), db.ForeignKey("cameras.id"), nullable=False)
    severity = db.Column(db.String(20), nullable=False)  # warning, critical
    alert_type = db.Column(db.String(50), nullable=False)  # cpu_high, memory_high, etc.
    message = db.Column(db.String(500), nullable=False)
    resolved = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    resolved_at = db.Column(db.DateTime, nullable=True)

    camera = db.relationship("Camera", back_populates="alerts")

    def __init__(self, camera_id, severity, alert_type, message, resolved=False, created_at=None, resolved_at=None, **kwargs):
        self.camera_id = camera_id
        self.severity = severity
        self.alert_type = alert_type
        self.message = message
        self.resolved = resolved
        self.created_at = created_at or datetime.now(timezone.utc)
        self.resolved_at = resolved_at

    def to_dict(self):
        return {
            "id": self.id,
            "camera_id": self.camera_id,
            "camera_name": self.camera.name if self.camera else "Unknown",
            "severity": self.severity,
            "alert_type": self.alert_type,
            "message": self.message,
            "resolved": self.resolved,
            "created_at": serialize_dt(self.created_at),
            "resolved_at": serialize_dt(self.resolved_at)
        }

class Setting(db.Model):
    """Global system configuration stored in key-value format."""
    __tablename__ = "settings"

    key = db.Column(db.String(50), primary_key=True)
    value = db.Column(db.String(255), nullable=False)

    def __init__(self, key, value, **kwargs):
        self.key = key
        self.value = value

    def to_dict(self):
        return {
            "key": self.key,
            "value": self.value
        }
