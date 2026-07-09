import time
import random
import requests
from datetime import datetime, timezone

# Configuration settings
API_URL = "http://127.0.0.1:5000/api/telemetry"
TICK_INTERVAL_SECONDS = 5
MAX_POST_TIMEOUT_SECONDS = 3

class CameraDevice:
    """Represents a physical IP camera generating telemetry metrics."""
    def __init__(self, camera_id, name, profile):
        self.camera_id = camera_id
        self.name = name
        self.profile = profile
        
        # Initial status setup
        self.is_online = True
        self.cpu_usage = 10.0
        self.memory_usage = 20.0
        self.storage_usage = 30.0
        self.latency = 10.0
        self.fault_status = "None"
        
        # Persistent state trackers for gradual fluctuations
        self.ticks_offline_remaining = 0
        self.ticks_since_cpu_spike = 0

    def update_telemetry(self):
        """Update metrics dynamically based on the device profile."""
        
        # Handle Offline states for loading dock profile
        if self.profile == "loading_dock":
            if self.ticks_offline_remaining > 0:
                self.ticks_offline_remaining -= 1
                self._set_offline_metrics()
                return
            # 10% chance to drop offline for 3 ticks (15 seconds)
            if random.random() < 0.10:
                self.ticks_offline_remaining = 3
                self._set_offline_metrics()
                return
            self.is_online = True
            
        elif self.profile == "server_room":
            # Intermittent high CPU spikes (e.g. simulating video analytics calculations)
            self.is_online = True
            self.ticks_since_cpu_spike += 1
            # Spike CPU usage to 85-98% every 6-8 ticks
            if self.ticks_since_cpu_spike >= random.randint(6, 8):
                self.cpu_usage = round(random.uniform(85.0, 98.0), 1)
                self.fault_status = "High CPU Load"
                self.ticks_since_cpu_spike = 0 # Reset spike counter
            else:
                self.cpu_usage = round(random.uniform(15.0, 30.0), 1)
                self.fault_status = "None"
        else:
            self.is_online = True
            self.fault_status = "None"
            
        # Standard healthy fluctuations if online
        if self.is_online:
            # Latency (simulated network lag)
            if self.profile == "parking_lot":
                # Simulated long-range wifi/fiber link with high latency
                self.latency = round(random.uniform(90.0, 180.0), 1)
            else:
                self.latency = round(random.uniform(8.0, 25.0), 1)
                
            # Resource metrics (CPU and Memory)
            if self.profile != "server_room": # Server room spikes handled above
                self.cpu_usage = round(max(1.0, min(100.0, self.cpu_usage + random.uniform(-3.0, 3.0))), 1)
            self.memory_usage = round(max(10.0, min(100.0, self.memory_usage + random.uniform(-2.0, 2.0))), 1)
            
            # Storage usage (representing continuous edge circular buffer recording)
            # Gradually increments up to 98% then resets (circular overwrites)
            self.storage_usage = round(self.storage_usage + 0.1, 1)
            if self.storage_usage > 98.0:
                self.storage_usage = 30.0 # reset database roll-over simulation

    def _set_offline_metrics(self):
        """Set health parameters to zero when device disconnects."""
        self.is_online = False
        self.cpu_usage = 0.0
        self.memory_usage = 0.0
        self.latency = 0.0
        self.fault_status = "Connection Lost"

    def to_dict(self):
        """Convert metrics to data contract format for backend transmission."""
        return {
            "camera_id": self.camera_id,
            "camera_name": self.name,
            "is_online": self.is_online,
            "cpu_usage": self.cpu_usage,
            "memory_usage": self.memory_usage,
            "storage_usage": self.storage_usage,
            "latency": self.latency,
            "last_heartbeat": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "fault_status": self.fault_status
        }

def run_simulator():
    """Main simulation loop orchestrator."""
    print("==================================================", flush=True)
    print("  CamGuard - Multi-Camera Health Simulator Booted", flush=True)
    print(f"  Target Server Endpoint: {API_URL}", flush=True)
    print(f"  Polling Rate: every {TICK_INTERVAL_SECONDS} seconds", flush=True)
    print("==================================================", flush=True)
    
    # Initialize camera fleet
    cameras = [
        CameraDevice("cam-01", "Main Entrance Gateway", "entrance"),
        CameraDevice("cam-02", "North Parking Perimeter", "parking_lot"),
        CameraDevice("cam-03", "Main Office Lobby", "lobby"),
        CameraDevice("cam-04", "Server Rack Room", "server_room"),
        CameraDevice("cam-05", "Loading Dock Area", "loading_dock")
    ]
    
    ticks = 0
    while True:
        ticks += 1
        print(f"\n[Tick #{ticks}] Updating telemetry for {len(cameras)} devices...", flush=True)
        
        for camera in cameras:
            camera.update_telemetry()
            payload = camera.to_dict()
            
            # Send HTTP POST API request
            try:
                response = requests.post(
                    API_URL,
                    json=payload,
                    timeout=MAX_POST_TIMEOUT_SECONDS
                )
                if response.status_code in [200, 201]:
                    print(f"  [+] {camera.camera_id} ({camera.name}) sent heartbeat successfully.", flush=True)
                else:
                    print(f"  [-] {camera.camera_id} error: Server returned status {response.status_code}.", flush=True)
            except requests.exceptions.Timeout:
                print(f"  [!] {camera.camera_id} error: Connection timed out.", flush=True)
            except requests.exceptions.ConnectionError:
                print(f"  [!] {camera.camera_id} error: Could not connect to API server. Is it running?", flush=True)
            except Exception as e:
                print(f"  [!] {camera.camera_id} error: Unexpected failure: {e}", flush=True)
                
        time.sleep(TICK_INTERVAL_SECONDS)

if __name__ == '__main__':
    try:
        run_simulator()
    except KeyboardInterrupt:
        print("\nSimulator stopped by user.", flush=True)
