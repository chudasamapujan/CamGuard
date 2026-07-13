import os
import logging
from logging.handlers import RotatingFileHandler
from flask import Flask, jsonify, request
from werkzeug.exceptions import HTTPException
from flask_cors import CORS
from backend.config import Config, BASE_DIR
from backend.database import db, migrate
from backend.socket_manager import socketio
from backend.limiter import limiter

def setup_logging():
    """Configure rotating file logging and console logging for production."""
    log_dir = os.path.join(BASE_DIR, '..', 'logs')
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(log_dir, 'backend.log')

    log_level = getattr(logging, Config.LOG_LEVEL, logging.INFO)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

    file_handler = RotatingFileHandler(log_file, maxBytes=10*1024*1024, backupCount=5)
    file_handler.setFormatter(formatter)
    file_handler.setLevel(log_level)

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    console_handler.setLevel(log_level)

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    if not root_logger.handlers:
        root_logger.addHandler(file_handler)
        root_logger.addHandler(console_handler)

    return logging.getLogger(__name__)

logger = setup_logging()

def create_app(test_config=None):
    """Create and configure the Flask application."""
    app = Flask(__name__)
    app.config.from_object(Config)
    if "ENVIRONMENT" in os.environ:
        app.config["ENVIRONMENT"] = os.environ.get("ENVIRONMENT")
    if "API_KEY" in os.environ or os.environ.get("ENVIRONMENT") == "production":
        app.config["API_KEY"] = os.environ.get("API_KEY")
    if test_config:
        app.config.update(test_config)

    if (app.config.get("TESTING") or (test_config and test_config.get("TESTING"))) and not (test_config and "RATELIMIT_ENABLED" in test_config):
        app.config["RATELIMIT_ENABLED"] = False

    if not app.config.get("TESTING"):
        env_mode = app.config.get("ENVIRONMENT")
        api_key = app.config.get("API_KEY")
        if env_mode == "production" and not api_key:
            raise RuntimeError("API_KEY must be set when ENVIRONMENT=production — refusing to start with an unauthenticated /settings endpoint")

    # Initialize CORS with allowed origins
    CORS(app, resources={r"/*": {"origins": Config.CORS_ALLOWED_ORIGINS}})
    db.init_app(app)
    migrate.init_app(app, db)
    socketio.init_app(app)
    limiter.init_app(app)

    # Register blueprints
    from backend.routes.health import health_bp
    from backend.routes.cameras import cameras_bp
    from backend.routes.alerts import alerts_bp
    from backend.routes.docs import docs_bp
    from backend.routes.settings import settings_bp
    from backend.routes.auth import auth_bp

    app.register_blueprint(health_bp)
    app.register_blueprint(cameras_bp)
    app.register_blueprint(alerts_bp)
    app.register_blueprint(docs_bp)
    app.register_blueprint(settings_bp)
    app.register_blueprint(auth_bp)

    # Request / Response logging hooks
    @app.before_request
    def log_request_info():
        logger.info(f"Incoming request: {request.method} {request.path} from {request.remote_addr}")

    @app.after_request
    def log_response_info(response):
        logger.info(f"Outgoing response: {request.method} {request.path} -> {response.status_code}")
        return response

    # Global Error Handlers
    @app.errorhandler(404)
    def not_found_error(error):
        return jsonify({"error": "Resource not found"}), 404

    @app.errorhandler(429)
    def rate_limit_error(error):
        return jsonify({"error": f"Rate limit exceeded: {getattr(error, 'description', str(error))}"}), 429

    @app.errorhandler(500)
    def internal_error(error):
        logger.exception(f"Internal Server Error: {error}")
        return jsonify({"error": "Internal server error"}), 500

    @app.errorhandler(Exception)
    def unhandled_exception(error):
        if isinstance(error, HTTPException):
            return jsonify({"error": getattr(error, "description", str(error))}), error.code
        logger.exception(f"Unhandled Exception: {error}")
        if app.config.get("ENVIRONMENT") == "production":
            return jsonify({"error": "An internal server error occurred."}), 500
        return jsonify({"error": f"An unexpected error occurred: {str(error)}"}), 500

    # Recreate and seed DB tables if not running migration tool
    if not os.environ.get("FLASK_DB_MIGRATING"):
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

    @app.route("/health", methods=["GET"])
    @app.route("/api/health_check", methods=["GET"])
    def check_health():
        """Production health check endpoint."""
        db_status = "ok"
        try:
            db.session.execute(db.text("SELECT 1"))
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            db_status = "error"
            return jsonify({"status": "unhealthy", "database": db_status}), 503

        return jsonify({
            "status": "ok",
            "database": db_status,
            "service": "CamGuard Backend",
            "version": "1.0.0"
        }), 200

    @app.route("/status", methods=["GET"])
    @app.route("/api/status", methods=["GET"])
    def get_status():
        """Production status verification endpoint."""
        return jsonify({
            "status": "running",
            "service": "CamGuard Backend",
            "database": "connected",
            "uptime": "ok"
        }), 200

    @app.route("/version", methods=["GET"])
    @app.route("/api/version", methods=["GET"])
    def get_version():
        """Production API version endpoint."""
        return jsonify({
            "version": "1.0.0",
            "service": "CamGuard Backend",
            "api": "v1"
        }), 200

    return app

if __name__ == "__main__":
    app = create_app()
    port = int(os.environ.get("API_PORT", 5000))
    socketio.run(app, debug=False, host="0.0.0.0", port=port, allow_unsafe_werkzeug=True)


