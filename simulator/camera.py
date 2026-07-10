"""
Camera Model
-------------
Simulates a single camera's health metrics.

Design decisions:
- DRIFT MODEL: Instead of pure random values, metrics "drift" from their previous
  value by a small delta. This produces realistic-looking time-series data that
  gradually rises/falls rather than jumping wildly.
  
  Example: cpu starts at 35%, next tick it might be 35 ± random(0,5) = 33-40%
  
- METRIC RANGES:
  - CPU: 10-100% (cameras always use some CPU for video processing)
  - Memory: 20-100% (base memory for OS + camera firmware)
  - Storage: 30-100% (local buffer always has some data, grows over time)
  - Latency: 5-800ms (normal is 5-50ms, spikes for network issues)

- FAULT INJECTION: Each tick has a configurable probability of injecting a fault.
  When a fault occurs, metrics spike to simulate stress (e.g., CPU jumps to 85-99%).
  Faults are transient — they clear on the next tick automatically.

- OFFLINE SIMULATION: Separate probability for going offline entirely.
  When offline, all metrics go to 0 and is_online=False.
"""

import random
from simulator.config import FAULT_TYPES, FAULT_PROBABILITY, OFFLINE_PROBABILITY


class Camera:
    """Simulates a single camera with realistic health metric behavior."""

    def __init__(self, camera_id, name, location):
        self.camera_id = camera_id
        self.name = name
        self.location = location

        # Initialize with "normal" baseline values
        self.cpu_usage = random.uniform(20, 45)
        self.memory_usage = random.uniform(30, 50)
        self.storage_usage = random.uniform(35, 55)
        self.network_latency = random.uniform(10, 40)
        self.is_online = True
        self.fault_type = None

    def _drift(self, current, min_val, max_val, max_delta=5.0):
        """Apply random drift to a metric value. Clamps to [min_val, max_val]."""
        delta = random.uniform(-max_delta, max_delta)
        new_val = current + delta
        return max(min_val, min(max_val, new_val))

    def tick(self):
        """
        Advance the simulation by one time step.
        Updates all metrics with drift and optionally injects faults.
        Returns the current health data as a dict.
        """
        # Reset fault from previous tick
        self.fault_type = None

        # Check if camera goes offline this tick
        if random.random() < OFFLINE_PROBABILITY and self.is_online:
            self.is_online = False
        elif not self.is_online:
            # 50% chance to come back online each tick
            if random.random() < 0.5:
                self.is_online = True
                # Reset metrics to normal when coming back
                self.cpu_usage = random.uniform(20, 45)
                self.memory_usage = random.uniform(30, 50)
                self.storage_usage = random.uniform(35, 55)
                self.network_latency = random.uniform(10, 40)

        if not self.is_online:
            return self._build_payload()

        # Normal drift
        self.cpu_usage = self._drift(self.cpu_usage, 10, 95, max_delta=6)
        self.memory_usage = self._drift(self.memory_usage, 20, 95, max_delta=4)
        self.storage_usage = self._drift(self.storage_usage, 30, 98, max_delta=3)
        self.network_latency = self._drift(self.network_latency, 5, 150, max_delta=15)

        # Fault injection
        if random.random() < FAULT_PROBABILITY:
            self.fault_type = random.choice(FAULT_TYPES)
            # Faults cause metric spikes
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
            "cpu_usage": round(self.cpu_usage, 1) if self.is_online else 0,
            "memory_usage": round(self.memory_usage, 1) if self.is_online else 0,
            "storage_usage": round(self.storage_usage, 1) if self.is_online else 0,
            "network_latency": round(self.network_latency, 1) if self.is_online else 0,
            "is_online": self.is_online,
            "fault_type": self.fault_type,
        }
