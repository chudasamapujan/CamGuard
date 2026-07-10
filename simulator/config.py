"""
Simulator Configuration
-----------------------
All tunable parameters for the camera simulator.

Design decisions:
- CAMERA_COUNT = 10: enough to fill a dashboard grid, not too many for SQLite
- SEND_INTERVAL = 30: real-world cameras report every 30-60 seconds
- FAULT_PROBABILITY = 0.05: 5% chance per tick per camera, so ~1 fault per camera
  every ~10 minutes on average — frequent enough to test alerting
- BACKEND_URL: points to the Flask API running locally
- CAMERA_LOCATIONS: realistic physical locations for the UI
"""

# Number of cameras to simulate
CAMERA_COUNT = 10

# How often each camera sends data (seconds)
SEND_INTERVAL = 30

# Probability of a random fault per camera per tick (0.0 to 1.0)
FAULT_PROBABILITY = 0.05

# Probability of a camera going offline per tick
OFFLINE_PROBABILITY = 0.03

# Backend API URL
BACKEND_URL = "http://localhost:5000"

# Simulated camera locations
CAMERA_LOCATIONS = [
    "Main Entrance",
    "Parking Lot A",
    "Server Room",
    "Warehouse East",
    "Loading Dock",
    "Office Floor 2",
    "Cafeteria",
    "Emergency Exit B",
    "Rooftop",
    "Lobby",
]

# Possible fault types
FAULT_TYPES = [
    "Disk I/O Error",
    "Overheating",
    "Network Interface Failure",
    "Memory Corruption",
    "Firmware Crash",
    "Power Supply Fluctuation",
    "Lens Obstruction",
    "Storage Controller Failure",
]

#adjustable all things fault prob,....