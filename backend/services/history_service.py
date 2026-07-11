from datetime import datetime, timedelta, timezone
from backend.database import db
from backend.models import HealthRecord

class HistoryService:
    @staticmethod
    def get_camera_history(camera_id, hours=24):
        """Retrieve telemetry history records for a single camera node."""
        since = datetime.now(timezone.utc) - timedelta(hours=hours)
        records = (
            HealthRecord.query
            .filter_by(camera_id=camera_id)
            .filter(HealthRecord.timestamp >= since)
            .order_by(HealthRecord.timestamp.asc())
            .all()
        )
        return {
            "camera_id": camera_id,
            "hours": hours,
            "count": len(records),
            "records": [r.to_dict() for r in records]
        }

    @staticmethod
    def get_dashboard_history(hours=24):
        """Retrieve aggregated fleet-wide historical trends grouped in 5-minute slots."""
        since = datetime.now(timezone.utc) - timedelta(hours=hours)
        records = (
            HealthRecord.query
            .filter(HealthRecord.timestamp >= since)
            .order_by(HealthRecord.timestamp.asc())
            .all()
        )

        # Round logs to nearest 5 minutes
        grouped = {}
        for r in records:
            dt = r.timestamp
            # Handle tz-aware or naive datetimes safely
            minute = (dt.minute // 5) * 5
            rounded_time = dt.replace(minute=minute, second=0, microsecond=0)
            time_str = rounded_time.isoformat() + "Z" if rounded_time.tzinfo is None else rounded_time.isoformat()

            if time_str not in grouped:
                grouped[time_str] = {
                    "timestamp": time_str,
                    "cpu_sum": 0.0,
                    "mem_sum": 0.0,
                    "storage_sum": 0.0,
                    "latency_sum": 0.0,
                    "count": 0
                }

            grouped[time_str]["cpu_sum"] += r.cpu_usage
            grouped[time_str]["mem_sum"] += r.memory_usage
            grouped[time_str]["storage_sum"] += r.storage_usage
            grouped[time_str]["latency_sum"] += r.network_latency
            grouped[time_str]["count"] += 1

        result = []
        for time_str, data in sorted(grouped.items()):
            count = data["count"]
            cpu_avg = data["cpu_sum"] / count
            mem_avg = data["mem_sum"] / count
            latency_avg = data["latency_sum"] / count

            # Dynamic Health Score calculation for dashboard line chart
            health_score = max(0, 100 - (
                ((cpu_avg - 50) * 0.4 if cpu_avg > 50 else 0) +
                ((mem_avg - 50) * 0.4 if mem_avg > 50 else 0) +
                ((latency_avg - 150) * 0.1 if latency_avg > 150 else 0)
            ))

            result.append({
                "timestamp": time_str,
                "cpu_usage": round(cpu_avg, 1),
                "memory_usage": round(mem_avg, 1),
                "storage_usage": round(data["storage_sum"] / count, 1),
                "network_latency": round(latency_avg, 1),
                "health_score": round(health_score, 1)
            })
        return result
