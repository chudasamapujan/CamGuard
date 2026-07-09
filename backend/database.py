from flask_sqlalchemy import SQLAlchemy

# Instantiate SQLAlchemy db object.
# It will be bound to the application lifecycle inside the application factory.
db = SQLAlchemy()
