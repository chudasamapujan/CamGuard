import logging
from backend.database import db
from backend.models import Setting
from backend.config import Config

logger = logging.getLogger(__name__)

class ConfigurationService:
    @staticmethod
    def get_all_settings():
        """Retrieve all configuration settings from the database as typed values."""
        try:
            settings = Setting.query.all()
            s_dict = {s.key: s.value for s in settings}

            # Ensure all standard keys are present with fallbacks
            result = {}
            for key, default in Config.DEFAULT_SETTINGS.items():
                db_val = s_dict.get(key, default)
                # Cast type based on key
                if key in ["camera_count", "reporting_interval", "offline_timeout"]:
                    result[key] = int(db_val)
                else:
                    result[key] = float(db_val)
            return result
        except Exception as e:
            logger.error(f"Failed to fetch system settings from database: {e}")
            # Return static defaults on failure
            return {
                "camera_count": int(Config.DEFAULT_SETTINGS["camera_count"]),
                "reporting_interval": int(Config.DEFAULT_SETTINGS["reporting_interval"]),
                "fault_probability": float(Config.DEFAULT_SETTINGS["fault_probability"]),
                "cpu_threshold": float(Config.DEFAULT_SETTINGS["cpu_threshold"]),
                "memory_threshold": float(Config.DEFAULT_SETTINGS["memory_threshold"]),
                "storage_threshold": float(Config.DEFAULT_SETTINGS["storage_threshold"]),
                "latency_threshold": float(Config.DEFAULT_SETTINGS["latency_threshold"]),
                "offline_timeout": int(Config.DEFAULT_SETTINGS["offline_timeout"]),
            }

    @staticmethod
    def update_settings(data):
        """Update system configurations in the database."""
        if not data:
            return False

        try:
            for key, val in data.items():
                # Standardize checking to only save configured keys
                if key in Config.DEFAULT_SETTINGS:
                    setting = db.session.get(Setting, key)
                    if setting:
                        setting.value = str(val)
                    else:
                        db.session.add(Setting(key=key, value=str(val)))
            
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            logger.exception(f"Failed to update global settings in database: {e}")
            return False

    @staticmethod
    def seed_default_settings():
        """Seed initial configuration values if database is empty."""
        try:
            for key, val in Config.DEFAULT_SETTINGS.items():
                existing = db.session.get(Setting, key)
                if not existing:
                    db.session.add(Setting(key=key, value=val))
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            logger.exception(f"Failed to seed default settings in database: {e}")
