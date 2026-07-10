"""
Database Initialization
-----------------------
Creates the SQLAlchemy instance used across the application.
Separated from app.py to avoid circular imports.

Design decision:
- Single db instance imported by models and routes
- init_app pattern allows deferred initialization with Flask app factory
"""

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
