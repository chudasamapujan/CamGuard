"""
Threshold Checking Service
---------------------------
Compares incoming health metrics against configurable thresholds.
Returns a list of threshold violations for alert generation.

Design decisions:
- Pure function (no side effects) — takes data + thresholds, returns violations
- Checks each metric independently so multiple alerts can fire per data point
- Returns severity level so the alert service knows how urgent it is
- Offline detection is separate from metric thresholds
"""

from backend.config import Config


def check_thresholds(health_data, thresholds=None):
    """
    Check health data against thresholds and return violations.

    Args:
        health_data: dict with cpu_usage, memory_usage, storage_usage,
                     network_latency, is_online, fault_type
        thresholds: dict of threshold values (uses Config defaults if None)

    Returns:
        list of dicts: [{alert_type, severity, message}, ...]
    """
    if thresholds is None:
        thresholds = Config.THRESHOLDS

    violations = []
    camera_id = health_data.get("camera_id", "UNKNOWN")

    # --- CPU Check ---
    cpu = health_data.get("cpu_usage", 0)
    if cpu >= thresholds["cpu_critical"]:
        violations.append({
            "alert_type": "cpu_high",
            "severity": "critical",
            "message": f"Camera {camera_id}: CPU usage critically high at {cpu:.1f}% (threshold: {thresholds['cpu_critical']}%)",
        })
    elif cpu >= thresholds["cpu_warning"]:
        violations.append({
            "alert_type": "cpu_high",
            "severity": "warning",
            "message": f"Camera {camera_id}: CPU usage elevated at {cpu:.1f}% (threshold: {thresholds['cpu_warning']}%)",
        })

    # --- Memory Check ---
    memory = health_data.get("memory_usage", 0)
    if memory >= thresholds["memory_critical"]:
        violations.append({
            "alert_type": "memory_high",
            "severity": "critical",
            "message": f"Camera {camera_id}: Memory usage critically high at {memory:.1f}% (threshold: {thresholds['memory_critical']}%)",
        })
    elif memory >= thresholds["memory_warning"]:
        violations.append({
            "alert_type": "memory_high",
            "severity": "warning",
            "message": f"Camera {camera_id}: Memory usage elevated at {memory:.1f}% (threshold: {thresholds['memory_warning']}%)",
        })

    # --- Storage Check ---
    storage = health_data.get("storage_usage", 0)
    if storage >= thresholds["storage_critical"]:
        violations.append({
            "alert_type": "storage_full",
            "severity": "critical",
            "message": f"Camera {camera_id}: Storage critically full at {storage:.1f}% (threshold: {thresholds['storage_critical']}%)",
        })
    elif storage >= thresholds["storage_warning"]:
        violations.append({
            "alert_type": "storage_full",
            "severity": "warning",
            "message": f"Camera {camera_id}: Storage usage high at {storage:.1f}% (threshold: {thresholds['storage_warning']}%)",
        })

    # --- Latency Check ---
    latency = health_data.get("network_latency", 0)
    if latency >= thresholds["latency_critical"]:
        violations.append({
            "alert_type": "latency_high",
            "severity": "critical",
            "message": f"Camera {camera_id}: Network latency critically high at {latency:.0f}ms (threshold: {thresholds['latency_critical']}ms)",
        })
    elif latency >= thresholds["latency_warning"]:
        violations.append({
            "alert_type": "latency_high",
            "severity": "warning",
            "message": f"Camera {camera_id}: Network latency elevated at {latency:.0f}ms (threshold: {thresholds['latency_warning']}ms)",
        })

    # --- Offline Check ---
    if not health_data.get("is_online", True):
        violations.append({
            "alert_type": "camera_offline",
            "severity": "critical",
            "message": f"Camera {camera_id}: Camera is offline (no heartbeat)",
        })

    # --- Fault Check ---
    fault = health_data.get("fault_type")
    if fault:
        violations.append({
            "alert_type": "fault_detected",
            "severity": "critical",
            "message": f"Camera {camera_id}: Fault detected — {fault}",
        })

    return violations
