#!/usr/bin/env python3
"""
NLP-Insights Capstone — Cross-platform bootstrap & runner
Works on Windows, macOS, and Linux. No shell scripts needed.
"""

import argparse
import os
import platform
import requests
import shlex
import shutil
import subprocess
import sys
from pathlib import Path
from textwrap import dedent

# --- Basic constants used across the script ----------------------------------
REPO_URL = "https://github.com/Nathan-J-22450784/NLP-Insights-Capstone.git"
DEFAULT_PROJECT_DIRNAME = "NLP-Insights-Capstone"
FRONTEND_SUBDIR = "frontend"
MANAGE_PY = Path("backend") / "manage.py"
# We ensure these spaCy models are present (small: keyness; medium: clustering).
SPACY_MODELS = ["en_core_web_sm", "en_core_web_md"]

# --- Utility helpers ---------------------------------------------------------
def is_windows(): 
    # True on Windows; used to branch command names and process flags.
    return platform.system().lower().startswith("win")

def which(cmd): 
    # Cross-platform way to check if a command exists on PATH.
    return shutil.which(cmd)

def run(cmd, cwd=None, env=None, new_console=False, check=True):
    """
    Run a command *synchronously* and print it nicely.
    - new_console=True opens a new terminal window on Windows (useful for servers).
    - check=True raises if the command fails.
    """
    printable = " ".join(shlex.quote(str(x)) for x in cmd)
    print(f"\n▶ {printable}")
    creationflags = subprocess.CREATE_NEW_CONSOLE if new_console and is_windows() else 0
    return subprocess.run(
        cmd, cwd=cwd, env=env,
        shell=False, check=check,
        creationflags=creationflags,
    )

def popen(cmd, cwd=None, env=None, new_console=False):
    """
    Start a command *asynchronously* (background process) and print it.
    We use this to launch long-running servers like Django or Ollama.
    """
    printable = " ".join(shlex.quote(str(x)) for x in cmd)
    print(f"\n▶ (bg) {printable}")
    creationflags = subprocess.CREATE_NEW_CONSOLE if new_console and is_windows() else 0
    return subprocess.Popen(
        cmd, cwd=cwd, env=env,
        shell=False, creationflags=creationflags,
    )

def npm_cmd():
    # On Windows the npm executable is npm.cmd; elsewhere it's npm.
    return "npm.cmd" if is_windows() else "npm"

def find_manage_py(project_dir: Path) -> tuple[Path, Path] | None:
    """
    Locate Django's manage.py and return (manage_py_path, its_parent_dir).
    Tries common locations first; falls back to a recursive search.
    """
    candidates = [
        project_dir / "manage.py",
        project_dir / "backend" / "manage.py",
    ]
    for p in candidates:
        if p.exists():
            return p, p.parent

    # Last resort: recursive search if the structure is different.
    hits = list(project_dir.rglob("manage.py"))
    if hits:
        p = hits[0]
        return p, p.parent
    return None

# --- Ollama helpers (cross-platform, conservative) ---------------------------
def has_winget(): return which("winget") is not None
def has_choco(): return which("choco") is not None  # not used by default (kept simple)

def find_ollama_exe():
    """
    Return the full path to the ollama executable if we can find it.
    Checks PATH first, then common install locations on Windows/macOS/Linux.
    """
    exe = which("ollama")
    if exe:
        return exe

    # Common Windows locations
    if is_windows():
        candidates = [
            Path(os.environ.get("ProgramFiles", r"C:\Program Files")) / "Ollama" / "ollama.exe",
            Path(os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)")) / "Ollama" / "ollama.exe",
            Path.home() / "AppData" / "Local" / "Programs" / "Ollama" / "ollama.exe",
        ]
        for p in candidates:
            if p.exists():
                return str(p)

    # macOS (brew) or standard paths
    if sys.platform == "darwin":
        candidates = [
            "/usr/local/bin/ollama",
            "/opt/homebrew/bin/ollama",
            "/usr/bin/ollama",
        ]
        for p in candidates:
            if Path(p).exists():
                return p

    # Linux – common locations
    if sys.platform.startswith("linux"):
        candidates = [
            "/usr/local/bin/ollama",
            "/usr/bin/ollama",
            str(Path.home() / ".local" / "bin" / "ollama"),
        ]
        for p in candidates:
            if Path(p).exists():
                return p

    return None

def ensure_requests_installed(py):
    """
    Ensure `requests` is installed in the current Python environment.
    This keeps the setup fully self-contained.
    """
    try:
        import requests  # noqa
    except ImportError:
        print("Installing 'requests' module …")
        run([str(py), "-m", "pip", "install", "requests"])

def verify_ollama_up(url="http://localhost:11434/api/tags", tries=5, delay=1.0, timeout=2.0):
    """
    Check if the Ollama HTTP endpoint responds with status code 200.
    Pure Python implementation using `requests`.
    
    Args:
        url (str): Ollama API endpoint to ping.
        tries (int): Number of retry attempts.
        delay (float): Seconds to wait between retries.
        timeout (float): Timeout for each HTTP request in seconds.
    
    Returns:
        bool: True if Ollama is ready, False otherwise.
    """
    for attempt in range(1, tries + 1):
        try:
            # Send GET request; timeout prevents hanging indefinitely
            resp = requests.get(url, timeout=timeout)
            if resp.status_code == 200:
                print(f"✓ Ollama is up (status 200) on attempt {attempt}")
                return True
            else:
                print(f"⚠ Ollama responded with {resp.status_code} (attempt {attempt})")
        except requests.RequestException as e:
            print(f"⚠ Attempt {attempt}: Ollama not reachable ({e})")
        import time
        time.sleep(delay)
    return False

def try_install_ollama_interactive():
    """
    Best-effort install: on Windows, try winget quietly; otherwise open the download page.
    Returns True if we believe install succeeded (i.e., we can find the exe afterward).
    Keeps things conservative to avoid permission/AV issues.
    """
    if is_windows() and has_winget():
        print("Attempting Ollama install via winget …")
        try:
            # -e exact id; --silent to avoid UI where possible, but it may still prompt elevation.
            run(["winget", "install", "-e", "--id", "Ollama.Ollama"])
        except subprocess.CalledProcessError:
            print("⚠ winget installation did not complete.")
    else:
        # Open the official download page so the user can click through quickly.
        url = "https://ollama.ai/download"
        print(f"Opening Ollama download page: {url}")
        try:
            if is_windows():
                run(["powershell", "-NoProfile", "-Command", f"Start-Process '{url}'"], check=False)
            elif sys.platform == "darwin":
                run(["open", url], check=False)
            else:
                run(["xdg-open", url], check=False)
        except Exception:
            print("⚠ Could not open browser. Please visit https://ollama.ai/download manually.")

    # Re-check after our attempt
    return find_ollama_exe() is not None

# --- Environment setup -------------------------------------------------------
def run_capture(cmd, cwd=None):
    """
    Run a command and return its combined stdout/stderr as text.
    Useful when we need the output (e.g., current git branch, HTTP status code).
    """
    return subprocess.run(
        cmd, cwd=cwd, shell=False, check=True,
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
    ).stdout.strip()

def create_or_use_repo(url, project_dir: Path, skip_clone=False):
    """
    Ensure the project directory contains a usable git checkout:
    - If the dir exists and is a git repo: try to update it (fetch + rebase).
    - If it exists but is NOT a repo: exit with guidance.
    - If it doesn't exist: clone it (unless --skip-clone is set).
    """
    if project_dir.exists():
        # If it’s already a git repo, just update it
        if (project_dir / ".git").exists():
            print(f"✓ Using existing repo at {project_dir}")
            try:
                # Show the current branch name for clarity.
                branch = run_capture(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=str(project_dir))
                print(f"Updating branch: {branch}")
                # Get latest remote refs, prune deleted branches.
                run(["git", "fetch", "--all", "--prune"], cwd=str(project_dir))
                # Rebase onto origin/<branch>. --autostash helps if there are local changes.
                run(["git", "pull", "--rebase", "--autostash", "origin", branch], cwd=str(project_dir))
            except subprocess.CalledProcessError:
                # If update fails, we keep working with current files.
                print("⚠ Git update failed; continuing with existing files.")
            return
        # Directory exists but isn't a git repo — we don't want to stomp user files.
        if skip_clone:
            sys.exit(f"ERROR: {project_dir} exists but is not a git repo, and --skip-clone was provided.")
        else:
            sys.exit(f"ERROR: {project_dir} exists but is not a git repo. Remove it or point --dir elsewhere.")
    else:
        if skip_clone:
            sys.exit(f"ERROR: {project_dir} not found and --skip-clone provided.")
        print(f"Cloning {url} into {project_dir} …")
        run(["git", "clone", url, str(project_dir)])

def ensure_git_available():
    # Hard-stop if Git isn't installed; we need it for clone/pull.
    if not which("git"):
        sys.exit("ERROR: Git not found. Please install Git and retry.")

def ensure_node_npm_available():
    # Node and npm are required for the React frontend.
    if not which("node"):
        sys.exit("ERROR: 'node' not found on PATH. Install Node.js and retry.")
    if not which(npm_cmd()):
        sys.exit("ERROR: 'npm' not found on PATH. Install Node.js and retry.")

def py_in_venv(venv): 
    # Compute the venv Python path for the current OS.
    return venv / ("Scripts/python.exe" if is_windows() else "bin/python")

def pip_in_venv(venv): 
    # Compute the venv pip path for the current OS (not used directly here).
    return venv / ("Scripts/pip.exe" if is_windows() else "bin/pip")

# --- Setup steps -------------------------------------------------------------
def create_venv(project_dir):
    """
    Create a Python virtual environment in <repo>/venv if it doesn't exist,
    and return (venv_path, python_exe_path).
    """
    venv = project_dir / "venv"
    if not venv.exists():
        print("Creating virtual environment …")
        run([sys.executable, "-m", "venv", str(venv)])
    else:
        print(f"✓ Using existing venv: {venv}")
    return venv, py_in_venv(venv)

def install_backend(py, project_dir, use_lock):

    """
    Install backend Python dependencies and ensure ConceptNet embeddings exist.
    """
    # Decide which requirements file to use
    req = project_dir / ("backend/backend/requirements-lock.txt" if use_lock else "backend/backend/requirements.txt")
    if not req.exists():
        sys.exit(f"ERROR: requirements file not found at {req}")
    print(f"Installing backend deps from {req.relative_to(project_dir)} …")

    # Upgrade pip, wheel, setuptools first
    run([str(py), "-m", "pip", "install", "--upgrade", "pip", "wheel", "setuptools"])

    # Install the requirements
    run([str(py), "-m", "pip", "install", "-r", str(req)])

    # Ensure ConceptNet embeddings exist
    embeddings_path = project_dir / "backend" / "backend" / "data" / "numberbatch-en.txt"
    req = project_dir / "backend" / "backend" / ("requirements-lock.txt" if use_lock else "requirements.txt")
    if not embeddings_path.exists():
        print("Downloading ConceptNet embeddings…")
        run([str(py), str(project_dir / "backend/backend/download_embeddings.py")])


def download_spacy_models(py, skip=False):
    """
    Ensure required spaCy models are available.
    - Use --skip-spacy if you know they're already installed or in CI.
    """
    if skip: return
    for model in SPACY_MODELS:
        print(f"Ensuring spaCy model: {model}")
        run([str(py), "-m", "spacy", "download", model])

def run_migrations(py, project_dir):
    """
    Run Django migrations using the project's manage.py.
    If manage.py isn't where we expect, we skip (no hard failure).
    """
    manage_py = project_dir / MANAGE_PY
    if not manage_py.exists():
        print(f"⚠ manage.py not found at {manage_py} — skipping migrations.")
        return
    print(f"Applying Django migrations … ({manage_py.relative_to(project_dir)})")
    run([str(py), str(manage_py), "migrate"], cwd=str(project_dir / "backend"))

def install_frontend(project_dir):
    """
    Run `npm install` in the frontend folder to install React dependencies.
    If frontend folder is missing, we simply skip.
    """
    ensure_node_npm_available()
    fe = project_dir / FRONTEND_SUBDIR
    if not fe.exists(): return
    print("Installing frontend dependencies …")
    run([npm_cmd(), "install"], cwd=str(fe))

def maybe_setup_ollama(skip, model):
    """
    Ensure Ollama is installed, pull the specified model, and start the service.
    - Skips entirely if --no-ollama is passed.
    - Finds an existing install (even if not on PATH).
    - On Windows, will try `winget` install; otherwise opens the download page.
    - Verifies the local service (http://localhost:11434) responds before pulling the model.
    """
    if skip:
        print("Skipping Ollama setup (--no-ollama).")
        return

    ollama_exe = find_ollama_exe()
    if not ollama_exe:
        print("Ollama not found on PATH or standard locations.")
        if not try_install_ollama_interactive():
            sys.exit(
                "ERROR: Ollama is required but not installed.\n"
                "Install from https://ollama.ai/download, then re-run setup.py."
            )
        ollama_exe = find_ollama_exe()

    # Start/ensure service
    print("Starting Ollama service…")
    try:
        # Launch in a separate console so logs are visible and it keeps running
        popen([ollama_exe, "serve"], new_console=is_windows())
    except Exception:
        print("⚠ Could not spawn 'ollama serve'. If it isn't running already, start it manually.")

    # Wait until the service responds
    if not verify_ollama_up():
        print("Waiting for Ollama to become ready…")
        if not verify_ollama_up(tries=10, delay=1.5):
            sys.exit("ERROR: Ollama did not respond at http://localhost:11434. "
                     "Start 'ollama serve' and re-run setup.py.")

    # Ensure the target model is available locally
    print(f"Ensuring Ollama model '{model}' …")
    try:
        run([ollama_exe, "pull", model])
    except subprocess.CalledProcessError:
        sys.exit(f"ERROR: Failed to pull Ollama model '{model}'. Try: {ollama_exe} pull {model}")

# --- Runtime (starting backend/frontend servers) -----------------------------
def start_backend(py, project_dir, port):
    """
    Start the Django dev server on the requested port in a new console window.
    Returns the Popen handle (so caller can manage it if needed).
    """
    manage_py = project_dir / MANAGE_PY
    if not manage_py.exists():
        print(f"⚠ manage.py not found at {manage_py} — cannot start backend.")
        return None
    print(f"Starting Django backend on http://localhost:{port} (cwd=backend/)")
    return popen([str(py), str(manage_py), "runserver", f"0.0.0.0:{port}"],
                 cwd=str(project_dir / "backend"), new_console=True)

def start_frontend(project_dir, port=None):
    """
    Start the React dev server (npm start).
    - If a custom port is provided, set PORT in env for create-react-app.
    """
    fe = project_dir / FRONTEND_SUBDIR
    if not fe.exists(): return
    env = os.environ.copy()
    if port: env["PORT"] = str(port)
    print(f"Starting React frontend on http://localhost:{port or 3000}")
    return popen([npm_cmd(), "start"], cwd=str(fe), env=env, new_console=True)

# --- Main driver -------------------------------------------------------------
def main():
    """
    Command-line interface:
      --repo / --dir        : where to clone or find the repo
      --skip-clone          : assume repo is already present
      --use-lock            : use requirements-lock.txt for backend deps
      --no-ollama           : skip installing/starting Ollama + model
      --ollama-model        : which Ollama model to pull (default: llama2)
      --backend-port        : Django port (default: 8000)
      --frontend-port       : React port (default: CRA default 3000)
      --start               : skip install steps; only start servers
      --skip-spacy          : skip spaCy model downloads
    """
    p = argparse.ArgumentParser(description="Cross-platform setup/runner for NLP-Insights Capstone")
    p.add_argument("--repo", default=REPO_URL)
    p.add_argument("--dir", default=DEFAULT_PROJECT_DIRNAME)
    p.add_argument("--skip-clone", action="store_true")
    p.add_argument("--use-lock", action="store_true")
    p.add_argument("--no-ollama", action="store_true")
    p.add_argument("--ollama-model", default="llama2")
    p.add_argument("--backend-port", type=int, default=8000)
    p.add_argument("--frontend-port", type=int, default=None)
    p.add_argument("--start", action="store_true", help="skip install; just start servers")
    p.add_argument("--skip-spacy", action="store_true")
    args = p.parse_args()

    # If the current working dir already looks like the repo root, use it.
    if (Path.cwd() / ".git").exists() or (Path.cwd() / "backend").exists() or (Path.cwd() / "frontend").exists():
        args.dir = "."
    target = Path(args.dir).resolve()

    # Quick pre-flight checks for core tools.
    ensure_git_available()
    ensure_node_npm_available()

    if not args.start:
        # Full setup flow: repo, venv, backend deps, spaCy, migrations, frontend deps, ollama.
        create_or_use_repo(args.repo, target, args.skip_clone)
        venv, py = create_venv(target)
        ensure_requests_installed(py)
        install_backend(py, target, args.use_lock)
        download_spacy_models(py, skip=args.skip_spacy)
        run_migrations(py, target)
        install_frontend(target)
        maybe_setup_ollama(args.no_ollama, args.ollama_model)
    else:
        # Start-only flow: reuse existing venv/Python.
        venv = target / "venv"
        py = py_in_venv(venv)
        if not py.exists():
            sys.exit("ERROR: venv not found. Run setup without --start first.")

    # Launch backend in a separate console window so logs are visible.
    backend = start_backend(py, target, args.backend_port)

    import time

    # Small pause so backend has time to print startup info before we prompt.
    print("\nWaiting a moment for backend to start up...\n")
    time.sleep(2)

    # Ask if the user wants the frontend launched too.
    try:
        print()
        choice = input("Would you like to launch the frontend as well? (y/n): ").strip().lower()
        if choice in ("y", "yes"):
            start_frontend(target, args.frontend_port)
        else:
            print("Skipping frontend launch.")
    except KeyboardInterrupt:
        print("\nAborted by user.")

    print(f"\nBackend running on http://localhost:{args.backend_port}")
    print("Press Ctrl+C in backend window(s) to stop.")

if __name__ == "__main__":
    main()
