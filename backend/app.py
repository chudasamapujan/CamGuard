"""
Flask Application Factory
--------------------------
Creates and configures the Flask application.

Design decisions:
- App factory pattern for testability and flexibility
- CORS enabled globally (React dev server on different port)
- All blueprints registered here — single source of truth for all routes
- Database tables created on startup (create_all)
- Health check endpoint at root for quick liveness verification
"""

from flask import Flask, jsonify
from flask_cors import CORS
from backend.config import Config
from backend.database import db


def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize extensions
    CORS(app)
    db.init_app(app)

    # Register blueprints
    from backend.routes.health import health_bp
    from backend.routes.cameras import cameras_bp
    from backend.routes.alerts import alerts_bp

    app.register_blueprint(health_bp)
    app.register_blueprint(cameras_bp)
    app.register_blueprint(alerts_bp)

    # Create and migrate database tables
    with app.app_context():
        db.create_all()

        try:
            from sqlalchemy import inspect, text
            from backend.models import Setting

            engine = db.engine
            inspector = inspect(engine)
            columns = [col["name"] for col in inspector.get_columns("cameras")]

            new_cols = {
                "storage_capacity": "FLOAT DEFAULT 100.0",
                "reporting_interval": "INTEGER DEFAULT 30",
                "fault_probability": "FLOAT DEFAULT 0.05",
                "offline_probability": "FLOAT DEFAULT 0.03",
                "is_enabled": "BOOLEAN DEFAULT 1",
                "notes": "VARCHAR(500)"
            }

            for col, col_type in new_cols.items():
                if col not in columns:
                    db.session.execute(text(f"ALTER TABLE cameras ADD COLUMN {col} {col_type}"))
            db.session.commit()

            # Seed default configuration settings if missing
            defaults = {
                "camera_count": "10",
                "default_reporting_interval": "30",
                "cpu_threshold": "75.0",
                "memory_threshold": "75.0",
                "storage_threshold": "85.0",
                "latency_threshold": "200.0",
                "offline_probability": "0.03",
                "fault_probability": "0.05",
                "heartbeat_timeout": "90"
            }
            for key, val in defaults.items():
                existing = db.session.get(Setting, key)
                if not existing:
                    setting = Setting(key=key, value=val)
                    db.session.add(setting)
            db.session.commit()

        except Exception as e:
            print(f"Database migration/initialization error: {e}")

    # Root health check
    @app.route("/")
    def index():
        return jsonify({
            "service": "Camera Health Monitor API",
            "status": "running",
            "version": "1.0.0",
        })

    return app


# Entry point for running directly
if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host="0.0.0.0", port=5000)
