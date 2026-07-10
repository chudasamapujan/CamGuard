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

    # Create database tables
    with app.app_context():
        db.create_all()

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
