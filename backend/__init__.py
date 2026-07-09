from flask import Flask
from flask_cors import CORS
from backend.config import config_by_name
from backend.database import db
from backend.routes.main import main_bp

def create_app(config_name='development'):
    """Application factory for the Flask app."""
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(config_by_name[config_name])
    
    # Initialize extensions
    db.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # Register blueprints
    app.register_blueprint(main_bp)
    
    # Ensure database tables are created (useful for SQLite deployments)
    with app.app_context():
        db.create_all()
        
    return app
