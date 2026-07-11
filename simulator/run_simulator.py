import time
import sys
import os
import threading
import requests

# Resolve package name conflicts when executing simulator.py directly
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Reconfigure stdout for Windows console UTF-8
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

def send_telemetry(camera, stop_event):
    """Worker thread function for simulating a single camera and POSTing health data."""
    while not stop_event.is_set():
        try:
            data = camera.tick()

            # Status determination for log output
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

            # Send payload to backend ingestion
            # Try /health, fallback to /api/health
            try:
                response = requests.post(f"{BACKEND_URL}/health", json=data, timeout=5)
            except Exception:
                response = requests.post(f"{BACKEND_URL}/api/health", json=data, timeout=5)

            if response.status_code == 201:
                res = response.json()
                if res.get("new_alerts", 0) > 0:
                    print(f"  {RED}[!] {res['new_alerts']} new alert(s) generated!{RESET}")

        except requests.ConnectionError:
            print(f"  {RED}[x] Connection error to API at {BACKEND_URL}{RESET}")
        except Exception as e:
            print(f"  {RED}[x] Telemetry error: {e}{RESET}")

        # Sleep for dynamic interval (check stop_event periodically)
        for _ in range(max(1, int(camera.reporting_interval))):
            if stop_event.is_set():
                break
            time.sleep(1)

def main():
    print(f"\n{CYAN}{'='*60}")
    print(f"  CamGuard Enterprise Dynamic Telemetry Simulator")
    print(f"  Target API: {BACKEND_URL}")
    print(f"  Status: Spawning camera threads based on settings...")
    print(f"{'='*60}{RESET}\n")

    running_threads = {}  # camera_id -> {"thread": Thread, "stop_event": Event, "camera": Camera}
    stop_orchestrator = False

    def orchestrator():
        nonlocal stop_orchestrator
        while not stop_orchestrator:
            try:
                # Fetch settings from API
                try:
                    res = requests.get(f"{BACKEND_URL}/settings", timeout=3)
                except Exception:
                    res = requests.get(f"{BACKEND_URL}/api/settings", timeout=3)

                if res.status_code == 200:
                    settings = res.json()
                else:
                    settings = {}

                # Extract settings
                camera_count = int(settings.get("camera_count", 10))
                interval = int(settings.get("reporting_interval", 30))
                fault_prob = float(settings.get("fault_probability", 0.05))

                active_ids = {f"CAM-{i:03d}" for i in range(1, camera_count + 1)}

                # Update running threads parameters dynamically
                for cam_id in active_ids:
                    if cam_id in running_threads:
                        cam = running_threads[cam_id]["camera"]
                        cam.reporting_interval = interval
                        cam.fault_probability = fault_prob
                    else:
                        # Spawn new camera thread
                        print(f"  {GREEN}[+]{RESET} Starting camera simulation for {cam_id}")
                        cam = Camera(
                            camera_id=cam_id,
                            name=f"Camera {cam_id.split('-')[1]}",
                            reporting_interval=interval,
                            fault_probability=fault_prob
                        )
                        stop_event = threading.Event()
                        t = threading.Thread(
                            target=send_telemetry,
                            args=(cam, stop_event),
                            daemon=True,
                            name=f"sim-{cam_id}"
                        )
                        running_threads[cam_id] = {
                            "thread": t,
                            "stop_event": stop_event,
                            "camera": cam
                        }
                        t.start()
                        time.sleep(0.2)  # Stagger startups

                # Stop threads for cameras that are no longer in scope
                for cam_id in list(running_threads.keys()):
                    if cam_id not in active_ids:
                        print(f"  {YELLOW}[-]{RESET} Stopping camera simulation for {cam_id}")
                        running_threads[cam_id]["stop_event"].set()
                        running_threads[cam_id]["thread"].join(timeout=1.0)
                        del running_threads[cam_id]

            except requests.ConnectionError:
                print(f"  {YELLOW}[!] Connection to API failed, retrying sync...{RESET}")
            except Exception as e:
                print(f"  {RED}[x] Orchestrator sync error: {e}{RESET}")

            # Sleep 2s between checks for rapid config changes responsiveness
            for _ in range(2):
                if stop_orchestrator:
                    break
                time.sleep(1)

    # Start orchestrator thread
    orch_t = threading.Thread(target=orchestrator, daemon=True, name="orch-loop")
    orch_t.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print(f"\n{YELLOW}Shutting down telemetry threads...{RESET}")
        stop_orchestrator = True
        orch_t.join(timeout=2)
        for cam_id, data in running_threads.items():
            data["stop_event"].set()
        for cam_id, data in running_threads.items():
            data["thread"].join(timeout=2)
        print(f"{GREEN}Simulator stopped.{RESET}")
        sys.exit(0)

if __name__ == "__main__":
    main()
