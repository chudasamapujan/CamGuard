"""
Camera Simulator Orchestrator
-------------------------------
Main entry point that creates N cameras and sends health data to the Flask API.

Design decisions:
- THREADED APPROACH: Each camera runs on its own thread with a staggered start
  (0.5s apart) so they don't all hit the API at the exact same time.
  This simulates real-world async camera reporting.

- GRACEFUL SHUTDOWN: Catches KeyboardInterrupt for clean exit.

- RETRY LOGIC: If the API is unreachable, logs a warning but continues
  (cameras keep simulating — data is transient anyway).

- CONSOLE OUTPUT: Colorized status output shows what each camera is sending
  in real-time, making it easy to verify the simulator is working.

Usage:
    python -m simulator.simulator
"""

import time
import sys
import os
import threading
import requests

# Resolve package name conflicts when executing simulator.py directly from the simulator directory
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Reconfigure stdout to support unicode symbols in standard Windows console
reconfigure = getattr(sys.stdout, 'reconfigure', None)
if reconfigure:
    try:
        reconfigure(encoding='utf-8')
    except Exception:
        pass

from simulator.camera import Camera
from simulator.config import BACKEND_URL

# ANSI colors for console output
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
CYAN = "\033[96m"
RESET = "\033[0m"
DIM = "\033[2m"


def send_health_data(camera, stop_event):
    """
    Worker function for a single camera thread.
    Ticks the camera simulation and POSTs data to the Flask API every reporting interval.
    """
    while not stop_event.is_set():
        try:
            data = camera.tick()

            # Color-code the status for console output
            if not data["is_online"]:
                status_color = RED
                status_text = "OFFLINE"
            elif data["fault_type"]:
                status_color = RED
                status_text = f"FAULT: {data['fault_type']}"
            elif data["cpu_usage"] > 75 or data["memory_usage"] > 75:
                status_color = YELLOW
                status_text = "WARNING"
            else:
                status_color = GREEN
                status_text = "ONLINE"

            print(
                f"{CYAN}[{camera.camera_id}]{RESET} "
                f"{status_color}{status_text}{RESET} | "
                f"CPU: {data['cpu_usage']:5.1f}% | "
                f"MEM: {data['memory_usage']:5.1f}% | "
                f"STO: {data['storage_usage']:5.1f}% | "
                f"LAT: {data['network_latency']:6.1f}ms"
            )

            # Send to Flask API
            response = requests.post(
                f"{BACKEND_URL}/api/health",
                json=data,
                timeout=10,
            )

            if response.status_code == 201:
                result = response.json()
                if result.get("new_alerts", 0) > 0:
                    print(
                        f"  {RED}[!] {result['new_alerts']} new alert(s) generated!{RESET}"
                    )
            elif response.status_code == 400:
                # Camera might have been disabled while thread was sleeping
                res_data = response.json()
                if res_data.get("is_enabled") is False:
                    print(f"  {YELLOW}[!] Camera is disabled on backend, thread will be synchronized shortly.{RESET}")
            else:
                print(
                    f"  {YELLOW}[!] API returned status {response.status_code}{RESET}"
                )

        except requests.ConnectionError:
            print(
                f"  {RED}[x] Cannot connect to API at {BACKEND_URL} — is Flask running?{RESET}"
            )
        except Exception as e:
            print(f"  {RED}[x] Error: {e}{RESET}")

        # Wait for the next reporting interval (check stop_event periodically)
        # Sleep for self.reporting_interval dynamically
        for _ in range(max(1, camera.reporting_interval)):
            if stop_event.is_set():
                break
            time.sleep(1)


def main():
    """Initialize camera thread pool and orchestrate dynamic state synchronization."""
    print(f"\n{CYAN}{'='*60}")
    print(f"  CamGuard Enterprise Dynamic Simulator")
    print(f"  Backend: {BACKEND_URL}")
    print(f"  Status: Synchronizing with backend API...")
    print(f"{'='*60}{RESET}\n")

    # Track active running threads: camera_id -> {"thread": Thread, "stop_event": Event, "camera": Camera}
    running_cameras = {}
    stop_orchestrator = False

    def orchestrator_loop():
        nonlocal stop_orchestrator
        while not stop_orchestrator:
            try:
                # Fetch settings from DB
                settings_res = requests.get(f"{BACKEND_URL}/api/settings", timeout=5)
                settings = settings_res.json() if settings_res.status_code == 200 else {}

                # Fetch all registered cameras
                res = requests.get(f"{BACKEND_URL}/api/cameras", timeout=5)
                if res.status_code != 200:
                    print(f"  {YELLOW}[!] Failed to fetch camera list from API. Status: {res.status_code}{RESET}")
                    time.sleep(10)
                    continue

                cameras_data = res.json()
                active_ids = set()

                for cam_data in cameras_data:
                    cam_id = cam_data["id"]
                    is_enabled = cam_data.get("is_enabled", True)

                    # Only simulate enabled cameras
                    if not is_enabled:
                        continue

                    active_ids.add(cam_id)

                    # Get camera attributes, fall back to global settings
                    storage_capacity = float(cam_data.get("storage_capacity") or 100.0)
                    reporting_interval = int(cam_data.get("reporting_interval") or settings.get("default_reporting_interval") or 30)
                    fault_probability = float(cam_data.get("fault_probability") or settings.get("fault_probability") or 0.05)
                    offline_probability = float(cam_data.get("offline_probability") or settings.get("offline_probability") or 0.03)

                    if cam_id in running_cameras:
                        # Update running camera parameters dynamically without resetting the thread
                        cam_instance = running_cameras[cam_id]["camera"]
                        cam_instance.name = cam_data["name"]
                        cam_instance.location = cam_data["location"]
                        cam_instance.storage_capacity = storage_capacity
                        cam_instance.reporting_interval = reporting_interval
                        cam_instance.fault_probability = fault_probability
                        cam_instance.offline_probability = offline_probability
                    else:
                        # Spawn new thread for this camera
                        print(f"  {GREEN}[+]{RESET} Starting telemetry thread for {cam_id} ({cam_data['name']})")
                        cam = Camera(
                            camera_id=cam_id,
                            name=cam_data["name"],
                            location=cam_data["location"],
                            storage_capacity=storage_capacity,
                            reporting_interval=reporting_interval,
                            fault_probability=fault_probability,
                            offline_probability=offline_probability
                        )
                        stop_event = threading.Event()
                        t = threading.Thread(
                            target=send_health_data,
                            args=(cam, stop_event),
                            daemon=True,
                            name=f"camera-{cam_id}"
                        )
                        running_cameras[cam_id] = {
                            "thread": t,
                            "stop_event": stop_event,
                            "camera": cam
                        }
                        t.start()
                        time.sleep(0.2)  # Stagger thread start-ups

                # Stop threads for cameras that have been disabled, deleted, or removed
                for cam_id in list(running_cameras.keys()):
                    if cam_id not in active_ids:
                        print(f"  {YELLOW}[-]{RESET} Stopping telemetry thread for {cam_id} (disabled/deleted)")
                        running_cameras[cam_id]["stop_event"].set()
                        running_cameras[cam_id]["thread"].join(timeout=1.0)
                        del running_cameras[cam_id]

            except requests.ConnectionError:
                print(f"  {RED}[x] Connection error. Retrying backend synchronization...{RESET}")
            except Exception as e:
                print(f"  {RED}[x] Orchestrator sync error: {e}{RESET}")

            # Sleep for 10 seconds before next sync loop (check stop_orchestrator)
            for _ in range(10):
                if stop_orchestrator:
                    break
                time.sleep(1)

    # Start the orchestrator thread
    orch_thread = threading.Thread(target=orchestrator_loop, daemon=True, name="orchestrator")
    orch_thread.start()

    # Wait for keyboard interrupt
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print(f"\n{YELLOW}Shutting down dynamic simulator...{RESET}")
        stop_orchestrator = True
        orch_thread.join(timeout=3)
        for cam_id, data in running_cameras.items():
            data["stop_event"].set()
        for cam_id, data in running_cameras.items():
            data["thread"].join(timeout=2)
        print(f"{GREEN}All camera telemetry threads stopped successfully.{RESET}")
        sys.exit(0)


if __name__ == "__main__":
    main()
