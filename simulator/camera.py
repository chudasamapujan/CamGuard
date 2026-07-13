import random
import os
import sys

# Resolve package name conflicts when executing simulator files directly
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from simulator.config import FAULT_TYPES

class Camera:
    """Simulates a single camera with telemetry metric behavior."""

    def __init__(self, camera_id, name, reporting_interval=30, fault_probability=0.05, location=None):
        self.camera_id = camera_id
        self.name = name
        self.reporting_interval = reporting_interval
        self.fault_probability = fault_probability
        self.location = location

        # Baseline metrics
        self.cpu_usage = random.uniform(20, 45)
        self.memory_usage = random.uniform(30, 50)
        self.storage_usage = random.uniform(35, 55)
        self.network_latency = random.uniform(10, 40)
        self.is_online = True
        self.fault_type = None

    def _drift(self, current, min_val, max_val, max_delta=5.0):
        """Apply random drift to a metric value."""
        delta = random.uniform(-max_delta, max_delta)
        new_val = current + delta
        return max(min_val, min(max_val, new_val))

    def tick(self):
        """Advance the simulation by one time step."""
        self.fault_type = None

        # 3% offline chance
        if random.random() < 0.03 and self.is_online:
            self.is_online = False
        elif not self.is_online:
            if random.random() < 0.4:
                self.is_online = True
                self.cpu_usage = random.uniform(20, 45)
                self.memory_usage = random.uniform(30, 50)
                self.storage_usage = random.uniform(35, 55)
                self.network_latency = random.uniform(10, 40)

        if not self.is_online:
            return self._build_payload()

        # Apply normal drift
        self.cpu_usage = self._drift(self.cpu_usage, 10, 95, max_delta=6)
        self.memory_usage = self._drift(self.memory_usage, 20, 95, max_delta=4)
        self.storage_usage = self._drift(self.storage_usage, 30, 98, max_delta=3)
        self.network_latency = self._drift(self.network_latency, 5, 150, max_delta=15)

        # Fault injection
        if random.random() < self.fault_probability:
            self.fault_type = random.choice(FAULT_TYPES)
            self.cpu_usage = random.uniform(80, 99)
            self.memory_usage = random.uniform(75, 98)
            self.network_latency = random.uniform(200, 800)

        return self._build_payload()

    def _build_payload(self):
        """Build the JSON payload to send to the backend."""
        return {
            "camera_id": self.camera_id,
            "name": self.name,
            "location": self.location,
            "cpu_usage": round(self.cpu_usage, 1) if self.is_online else 0.0,
            "memory_usage": round(self.memory_usage, 1) if self.is_online else 0.0,
            "storage_usage": round(self.storage_usage, 1) if self.is_online else 0.0,
            "network_latency": round(self.network_latency, 1) if self.is_online else 0.0,
            "is_online": self.is_online,
            "fault_type": self.fault_type,
        }
