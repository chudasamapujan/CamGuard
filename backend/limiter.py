"""
Rate Limiter Initialization
---------------------------
Creates the Flask-Limiter instance used across routes.
Separated from app.py and database.py to avoid circular imports.
"""

from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="memory://",
    default_limits=["1000 per day", "200 per hour"]
)
