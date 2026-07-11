from flask import Flask, jsonify
from flask_cors import CORS
from backend.config import Config
from backend.database import db

def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize CORS
    CORS(app)
    db.init_app(app)

    # Register blueprints
    from backend.routes.health import health_bp
    from backend.routes.cameras import cameras_bp
    from backend.routes.alerts import alerts_bp
    from backend.routes.docs import docs_bp

    app.register_blueprint(health_bp)
    app.register_blueprint(cameras_bp)
    app.register_blueprint(alerts_bp)
    app.register_blueprint(docs_bp)

    # Recreate and seed DB tables
    with app.app_context():
        db.create_all()
        from backend.services.configuration_service import ConfigurationService
        ConfigurationService.seed_default_settings()

    @app.route("/")
    def index():
        return jsonify({
            "service": "Camera Health Monitor API",
            "status": "running",
            "version": "1.0.0",
        })

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host="0.0.0.0", port=5000)
