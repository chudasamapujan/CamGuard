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
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from simulator.camera import Camera
from simulator.config import (
    CAMERA_COUNT,
    SEND_INTERVAL,
    BACKEND_URL,
    CAMERA_LOCATIONS,
)

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
    Ticks the camera simulation and POSTs data to the Flask API every interval.
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

        # Wait for the next interval (check stop_event periodically)
        for _ in range(SEND_INTERVAL):
            if stop_event.is_set():
                break
            time.sleep(1)


def main():
    """Initialize cameras and start simulation threads."""
    print(f"\n{CYAN}{'='*60}")
    print(f"  Camera Health Monitoring Simulator")
    print(f"  Cameras: {CAMERA_COUNT} | Interval: {SEND_INTERVAL}s")
    print(f"  Backend: {BACKEND_URL}")
    print(f"{'='*60}{RESET}\n")

    # Create camera instances
    cameras = []
    for i in range(CAMERA_COUNT):
        cam_id = f"CAM-{i+1:03d}"
        location = CAMERA_LOCATIONS[i % len(CAMERA_LOCATIONS)]
        cam = Camera(cam_id, f"Camera {i+1}", location)
        cameras.append(cam)
        print(f"  {GREEN}[+]{RESET} Created {cam_id} at {location}")

    print(f"\n{CYAN}Starting simulation...{RESET}\n")

    # Start threads
    stop_event = threading.Event()
    threads = []

    for i, cam in enumerate(cameras):
        t = threading.Thread(
            target=send_health_data,
            args=(cam, stop_event),
            daemon=True,
            name=f"camera-{cam.camera_id}",
        )
        threads.append(t)
        t.start()
        time.sleep(0.5)  # Stagger start times

    # Wait for keyboard interrupt
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print(f"\n{YELLOW}Shutting down simulator...{RESET}")
        stop_event.set()
        for t in threads:
            t.join(timeout=5)
        print(f"{GREEN}Simulator stopped.{RESET}")
        sys.exit(0)


if __name__ == "__main__":
    main()
