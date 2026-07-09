import os

# Get base directory of the project
BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))

class Config:
    """Base configuration class."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'camguard-dev-secret-key-189230')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    # Place database in the root project folder during development
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        f'sqlite:///{os.path.join(BASE_DIR, "camguard.db")}'
    )

class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    # Use database URL from environment (e.g. Render PostgreSQL or SQLite instance)
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')

class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    DEBUG = True
    # In-memory database for fast, isolated tests
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'

# Export active configuration selection
config_by_name = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig
}
