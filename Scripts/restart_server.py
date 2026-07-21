#!/usr/bin/env python3

import os
import signal
import subprocess
import time


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SERVER = os.path.join(BASE_DIR, "server.py")


def find_server_processes():

    result = subprocess.run(
        ["pgrep", "-f", "python.*server.py"],
        capture_output=True,
        text=True
    )

    if not result.stdout.strip():
        return []

    return [
        int(pid)
        for pid in result.stdout.split()
    ]


def stop_server():

    pids = find_server_processes()

    for pid in pids:

        # don't kill ourselves
        if pid == os.getpid():
            continue

        print(f"Stopping server process {pid}")

        os.kill(
            pid,
            signal.SIGTERM
        )


    if pids:
        time.sleep(2)


def start_server():

    print("Starting server.py")

    subprocess.Popen(
        [
            "python3",
            SERVER
        ],
        cwd=BASE_DIR,
        start_new_session=True
    )


if __name__ == "__main__":

    stop_server()
    start_server()

    print("Server restarted")

