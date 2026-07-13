"""
WSGI & Eventlet Entry Point for Production Gunicorn
--------------------------------------------------
Monkey patches standard library for Eventlet concurrency before importing Flask or SocketIO.
"""
import eventlet
eventlet.monkey_patch()

import os
from backend.app import create_app
from backend.socket_manager import socketio

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("API_PORT", 5000))
    socketio.run(app, host="0.0.0.0", port=port, allow_unsafe_werkzeug=True)
