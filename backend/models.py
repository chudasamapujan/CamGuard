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

    # Relationships
    health_records = db.relationship("HealthRecord", backref="camera", lazy="dynamic")
    alerts = db.relationship("Alert", backref="camera", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "location": self.location,
            "status": self.status,
            "last_heartbeat": self.last_heartbeat.isoformat() if self.last_heartbeat else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
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

    def to_dict(self):
        return {
            "id": self.id,
            "camera_id": self.camera_id,
            "alert_type": self.alert_type,
            "severity": self.severity,
            "message": self.message,
            "resolved": self.resolved,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
        }
