"""
FlowSentinel AI — All-in-One Single-Command Launcher
===================================================
Run the complete FlowSentinel AI platform with a single command:
    python run.py   

Optional arguments:
    --port 8000         Port for the backend and web interface (default: 8000)
    --host 127.0.0.1    Host address to bind (default: 127.0.0.1)
    --no-browser        Do not automatically open the web browser
    --dev               Run with Vite dev server (port 5173) in addition to backend
"""
import sys
import os
import time
import argparse
import webbrowser
import threading
import subprocess
from pathlib import Path

# Ensure root directory is on PYTHONPATH
ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))
os.environ["PYTHONPATH"] = str(ROOT_DIR) + os.pathsep + os.environ.get("PYTHONPATH", "")


def verify_python_packages():
    """Verify and notify if critical backend packages are installed."""
    required = [
        ("fastapi", "fastapi"),
        ("uvicorn", "uvicorn"),
        ("pydantic", "pydantic"),
        ("numpy", "numpy"),
        ("pandas", "pandas"),
        ("sklearn", "scikit-learn"),
        ("joblib", "joblib"),
        ("serial", "pyserial"),
        ("websockets", "websockets"),
    ]
    missing = []
    for mod_name, pkg_name in required:
        try:
            __import__(mod_name)
        except ImportError:
            missing.append(pkg_name)

    if missing:
        print(f"\n[WARNING] Missing Python packages: {', '.join(missing)}")
        print("Installing missing packages now...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", *missing])
        print("[INFO] Dependencies successfully installed.\n")


def ensure_frontend_built():
    """Check if frontend/dist exists, and build it if missing."""
    dist_dir = ROOT_DIR / "frontend" / "dist"
    if not dist_dir.exists() or not (dist_dir / "index.html").exists():
        print("[INFO] Building frontend production bundle for first run...")
        try:
            subprocess.check_call(["npm", "run", "build"], cwd=str(ROOT_DIR / "frontend"), shell=True)
            print("[INFO] Frontend successfully compiled.\n")
        except Exception as e:
            print(f"[WARNING] Could not auto-compile frontend with npm: {e}")
            print("If you haven't built the frontend, run: cd frontend && npm install && npm run build\n")


def open_browser(url: str, delay: float = 1.5):
    """Open user's default browser after server initialization."""
    def _open():
        time.sleep(delay)
        print(f"[INFO] Opening web dashboard: {url}")
        try:
            webbrowser.open(url)
        except Exception:
            pass
    t = threading.Thread(target=_open, daemon=True)
    t.start()


def main():
    parser = argparse.ArgumentParser(description="FlowSentinel AI Unified Launcher")
    parser.add_argument("--host", type=str, default=os.getenv("HOST", "127.0.0.1"), help="Host address (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=int(os.getenv("PORT", 8000)), help="Port number (default: 8000)")
    parser.add_argument("--no-browser", action="store_true", help="Disable automatic browser opening")
    parser.add_argument("--dev", action="store_true", help="Launch Vite Dev Server on port 5173 alongside backend")
    args = parser.parse_args()

    print("=" * 60)
    print("  FlowSentinel — INDUSTRIAL CHUTE BLOCKAGE INTELLIGENCE  ")
    print("=" * 60)

    # 1. Dependency checks
    verify_python_packages()
    ensure_frontend_built()

    # 2. Dev mode support
    if args.dev:
        print("[INFO] Starting Vite Frontend Dev Server on http://localhost:5173 ...")
        subprocess.Popen(["npm", "run", "dev"], cwd=str(ROOT_DIR / "frontend"), shell=True)
        web_url = "http://localhost:5173"
    else:
        web_url = f"http://{args.host}:{args.port}"

    # 3. Browser auto-launch
    if not args.no_browser:
        open_browser(web_url, delay=1.5)

    print(f"\n[READY] Server starting on: http://{args.host}:{args.port}")
    print(f"[READY] Web Dashboard:     {web_url}")
    print(f"[READY] API Health Check:  http://{args.host}:{args.port}/api/health")
    print("\nPress Ctrl+C to stop the server.\n")

    # 4. Import & Run Uvicorn Server
    import uvicorn
    from backend.app.main import app

    uvicorn.run(app, host=args.host, port=args.port, log_level="info")


if __name__ == "__main__":
    main()
