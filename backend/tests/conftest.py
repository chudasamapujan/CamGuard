import pytest
from backend.app import create_app
from backend.database import db as _db

@pytest.fixture
def app():
    """Create and configure a new app instance for each test using in-memory SQLite."""
    app = create_app({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "SECRET_KEY": "test-secret-key"
    })

    with app.app_context():
        _db.create_all()
        yield app
        _db.session.remove()
        _db.drop_all()

@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()

@pytest.fixture
def db_session(app):
    """Yield database session for direct model manipulation in tests."""
    with app.app_context():
        yield _db.session
