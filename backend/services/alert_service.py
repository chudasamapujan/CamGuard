"""
Alert Service
-------------
Handles alert creation, deduplication, and resolution.

Design decisions:
- Deduplication: Won't create a new alert if an identical unresolved alert already
  exists for the same camera + alert_type. This prevents alert storms.
- Auto-resolution: When a metric returns to normal, any active alerts of that type
  for that camera are automatically resolved.
- Batch processing: process_health_data() handles the full pipeline:
  check thresholds → create/deduplicate alerts → auto-resolve cleared alerts
"""

from datetime import datetime, timezone
from backend.database import db
from backend.models import Alert
from backend.services.threshold import check_thresholds


def process_health_data(health_data, thresholds=None):
    """
    Process incoming health data: check thresholds, create alerts, auto-resolve.

    Args:
        health_data: dict of health metrics from a camera
        thresholds: optional custom thresholds

    Returns:
        list of new Alert objects created
    """
    camera_id = health_data.get("camera_id")
    if not camera_id:
        return []

    # Step 1: Check which thresholds are violated
    violations = check_thresholds(health_data, thresholds)
    violated_types = {v["alert_type"] for v in violations}

    # Step 2: Auto-resolve alerts that are no longer violated
    all_alert_types = {
        "cpu_high", "memory_high", "storage_full",
        "latency_high", "camera_offline", "fault_detected",
    }
    cleared_types = all_alert_types - violated_types

    for alert_type in cleared_types:
        active_alerts = Alert.query.filter_by(
            camera_id=camera_id, alert_type=alert_type, resolved=False
        ).all()
        for alert in active_alerts:
            alert.resolved = True
            alert.resolved_at = datetime.now(timezone.utc)

    # Step 3: Create new alerts (with deduplication)
    new_alerts = []
    for violation in violations:
        # Check if identical unresolved alert already exists
        existing = Alert.query.filter_by(
            camera_id=camera_id,
            alert_type=violation["alert_type"],
            severity=violation["severity"],
            resolved=False,
        ).first()

        if not existing:
            alert = Alert(
                camera_id=camera_id,
                alert_type=violation["alert_type"],
                severity=violation["severity"],
                message=violation["message"],
            )
            db.session.add(alert)
            new_alerts.append(alert)

    db.session.commit()
    return new_alerts
