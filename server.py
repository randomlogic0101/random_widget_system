import json
import os
import subprocess
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SETTINGS_LOCK = threading.Lock()
SETTINGS = {
  "message": "Stream Starting In:",
  "duration": 300,
  "running": False,
  "startedAt": 0
}
TERMINAL_PROCESS = None


def read_json(filename):
  filename = os.path.basename(filename)
  DATA_DIR = os.path.join(BASE_DIR, "Data")
  path = os.path.join(DATA_DIR, filename)
  if not os.path.exists(path):
    return {}

  with open(path, "r", encoding="utf-8") as file:
    try:
      return json.load(file)
    except json.JSONDecodeError:
      return {}


def write_json(filename, data):
  filename = os.path.basename(filename)
  DATA_DIR = os.path.join(BASE_DIR, "Data")
  path = os.path.join(DATA_DIR, filename)

  with open(path, "w", encoding="utf-8") as file:
    json.dump(data, file, indent=2)


def start_terminal_server():

  global TERMINAL_PROCESS

  terminal_server = os.path.join(
    BASE_DIR,
    "Scripts",
    "terminal_server.py"
  )

  if not os.path.exists(terminal_server):
    print(
      "Terminal server not found:",
      terminal_server
    )
    return


  TERMINAL_PROCESS = subprocess.Popen(
    [
      "python3",
      terminal_server
    ]
  )


  print("Terminal server started")


class Handler(BaseHTTPRequestHandler):

  def log_message(self, fmt, *args):
    pass


  def send_content(self, status, content_type, content):
    if isinstance(content, str):
      content = content.encode("utf-8")

    self.send_response(status)
    self.send_header("Content-Type", content_type)
    self.send_header("Cache-Control", "no-store")
    self.send_header("Content-Length", len(content))
    self.end_headers()

    self.wfile.write(content)


  def send_json(self, data, status=200):
    self.send_content(
      status,
      "application/json; charset=utf-8",
      json.dumps(data)
    )


  def send_ok(self):
    self.send_json({"ok": True})


  def send_error_json(self, error):
    self.send_json({"error": str(error)}, 400)


  def serve_file(self, filename, content_type):
    path = os.path.join(BASE_DIR, filename)

    try:
      with open(path, "rb") as file:
        content = file.read()

      self.send_content(
        200,
        content_type,
        content
      )

    except FileNotFoundError:
      self.send_error(404, "File not found")


  def serve_static(self, path):

    if not (
      path.startswith("/Css/")
      or path.startswith("/Scripts/")
      or path.startswith("/Assets/")
    ):
      return False

    content_types = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp",
    }

    for extension, content_type in content_types.items():
      if path.endswith(extension):
        self.serve_file(path[1:], content_type)
        return True

    return False


  def do_GET(self):
    path = urlparse(self.path).path

    routes = {
      "/api/settings": self.get_settings,
      "/api/json": self.get_json,
    }

    widget_routes = {
      "/settings": ("Html/settings.html",
        "text/html; charset=utf-8"),
      "/tasks": ("Html/tasks.html",
        "text/html; charset=utf-8"),
      "/timer": ("Html/timer.html",
        "text/html; charset=utf-8"),
      "/terminal": ("Html/terminal.html",
        "text/html; charset=utf-8"),
    }

    if path in routes:
      routes[path]()
      return

    if path in widget_routes:
      filename, content_type = widget_routes[path]
      self.serve_file(filename, content_type)
      return

    if self.serve_static(path):
      return

    self.send_error(404)


  def get_settings(self):
    with SETTINGS_LOCK:
      data = SETTINGS.copy()

    self.send_json(data)


  def get_json(self):
    try:
      params = parse_qs(urlparse(self.path).query)
      filename = params.get("file", [""])[0]

      self.send_json(read_json(filename))

    except Exception as error:
      self.send_error_json(error)


  def do_POST(self):
    path = urlparse(self.path).path

    routes = {
      "/api/settings": self.update_settings,
      "/api/json": self.update_json,
    }

    handler = routes.get(path)

    if handler:
      handler()
      return

    self.send_error(404)


  def get_request_body(self):
    length = int(self.headers.get("Content-Length", 0))
    return self.rfile.read(length).decode()


  def update_settings(self):
    try:
      data = json.loads(self.get_request_body())

      with SETTINGS_LOCK:
        SETTINGS.update(data)

      print(
        f"[Updated] Message='{SETTINGS['message']}' "
        f"Duration={SETTINGS['duration']}s"
      )

      self.send_ok()

    except Exception as error:
      self.send_error_json(error)


  def update_json(self):
    try:
      params = parse_qs(urlparse(self.path).query)
      filename = params.get("file", [""])[0]

      data = json.loads(self.get_request_body())

      write_json(filename, data)

      self.send_ok()

    except Exception as error:
      self.send_error_json(error)


if __name__ == "__main__":

  data_dir = os.path.join(BASE_DIR, "Data")
  tasks_file = os.path.join(data_dir, "tasks.json")

  if not os.path.exists(tasks_file):
    try:
      write_json("tasks.json", {"tasks": []})

    except FileNotFoundError:
      print(
        "\nERROR: Data directory not found.\n"
        f"Create the directory: {data_dir}\n"
        "and restart the server."
      )
      raise SystemExit(1)


  PORT = 8765

  server = HTTPServer(
    ("127.0.0.1", PORT),
    Handler
  )

  print(f"Widget server running at http://127.0.0.1:{PORT}")
  print(f"  Settings dock:  http://127.0.0.1:{PORT}/settings")
  print(f"  Tasks display:  http://127.0.0.1:{PORT}/tasks")
  print(f"  Timer display:  http://127.0.0.1:{PORT}/timer")
  start_terminal_server()
  print(f"  Terminal dock:  http://127.0.0.1:{PORT}/terminal")
  print("  Press Ctrl+C to stop")

  try:
    server.serve_forever()

  except KeyboardInterrupt:
    print("\nStopping server...")

  finally:

    server.server_close()
    if TERMINAL_PROCESS:
      TERMINAL_PROCESS.terminate()
      TERMINAL_PROCESS.wait()
    print("Server stopped")
