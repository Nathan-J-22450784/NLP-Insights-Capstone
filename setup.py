#!/usr/bin/env python3
"""
NLP-Insights Capstone — Cross-platform bootstrap & runner
Works on Windows, macOS, and Linux. No shell scripts needed.
"""

import argparse
import os
import platform
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

# --- Ollama helpers (install + verify service) -------------------------------
def has_winget(): 
    # Windows package manager (Win11+). Handy to install Ollama automatically.
    return which("winget") is not None

def has_choco(): 
    # Chocolatey package manager (Windows). Alternative path to install Ollama.
    return which("choco") is not None

def _elevate_ps(cmd: str):
    # run a PowerShell command as admin and wait
    return run([
        "powershell", "-NoProfile", "-ExecutionPolicy", "Bypass",
        "-Command",
        f"Start-Process powershell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -Command {cmd}' -Verb RunAs -Wait"
    ])

def _ensure_choco():
    # install Chocolatey if missing (elevated)
    if has_choco():
        return True
    print("Chocolatey not found. Installing (elevated)…")
    _elevate_ps(
        r"Set-ExecutionPolicy Bypass -Scope Process -Force; "
        r"[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12; "
        r"iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"
    )
    return has_choco()

def _cleanup_choco_ollama():
    # clear stale choco state that can block installs
    run(["powershell", "-NoProfile", "-Command",
         "Get-Process choco* -ErrorAction SilentlyContinue | Stop-Process -Force"], check=False)
    for p in [
        r"C:\ProgramData\chocolatey\lib\658f6699c36e95d3ce1dc0c5599432789345d94a",
        r"C:\ProgramData\chocolatey\lib\Ollama",
        r"C:\ProgramData\chocolatey\lib-bad\Ollama"
    ]:
        _elevate_ps(f"if (Test-Path '{p}') {{ Remove-Item '{p}' -Recurse -Force -ErrorAction SilentlyContinue }}")

def _maybe_add_ollama_to_path():
    # in current process only (fixes 'installed but not on PATH' in this shell)
    for p in map(os.path.expandvars, [
        r"C:\Program Files\Ollama\bin",
        r"%ProgramFiles%\Ollama\bin",
        r"%LOCALAPPDATA%\Microsoft\WinGet\Links"
    ]):
        if os.path.isdir(p):
            os.environ["PATH"] = p + os.pathsep + os.environ.get("PATH", "")
            if which("ollama"):
                return True
    return which("ollama") is not None

def ensure_ollama_installed():
    """
    Ensure 'ollama' is on PATH. Windows: winget (silent) → choco (elevated, non-interactive).
    Also handles 'already installed' but not visible in current PATH.
    """
    if which("ollama"):
        return True

    print("Ollama not found on PATH. Attempting to install…")

    if is_windows():
        # try winget first (quiet)
        if has_winget():
            run([
                "winget", "install", "-e", "--id", "Ollama.Ollama",
                "--silent", "--accept-package-agreements", "--accept-source-agreements"
            ], check=False)
            if which("ollama") or _maybe_add_ollama_to_path():
                return True

        # ensure Chocolatey is present
        if not _ensure_choco():
            print("⚠ Failed to install Chocolatey automatically.")
            return False

        # non-interactive choco flow (elevated)
        _elevate_ps("choco feature enable -n allowGlobalConfirmation")
        _cleanup_choco_ollama()
        _elevate_ps("choco install ollama -y")

        # handle case where choco reports 'already installed'
        if not which("ollama"):
            _maybe_add_ollama_to_path()

        return which("ollama") is not None

    # non-Windows: keep manual to avoid scope creep
    print("⚠ Non-Windows host: install Ollama from https://ollama.ai/ and re-run.")
    return False

def verify_ollama_up(url="http://localhost:11434/api/tags"):
    """
    Quick connectivity check to confirm ollama serve is accepting requests.
    - On Windows use PowerShell; otherwise try curl if available.
    Returns True if HTTP 200; False otherwise.
    """
    try:
        if is_windows() and which("powershell"):
            out = run_capture(["powershell", "-NoProfile", "-Command",
                               f"try {{ (Invoke-WebRequest -UseBasicParsing {url}).StatusCode }} catch {{ 0 }}"])
            return out.strip() == "200"
        elif which("curl"):
            out = run_capture(["curl", "-sS", "-o", "/dev/null", "-w", "%{http_code}", url])
            return out.strip() == "200"
    except Exception:
        pass
    return False

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
def create_or_use_repo(url, project_dir, skip_clone=False):
    """
    Lighter-weight variant used during the main flow:
    - If folder exists, assume it's already the repo.
    - Otherwise, clone it (unless --skip-clone says not to).
    """
    if project_dir.exists():
        print(f"✓ Using existing repo at {project_dir}")
    else:
        if skip_clone:
            sys.exit(f"ERROR: {project_dir} not found and --skip-clone provided.")
        run(["git", "clone", url, str(project_dir)])

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
    Install backend Python dependencies using either:
    - requirements.txt (default), or
    - requirements-lock.txt (when --use-lock is passed)
    """
    req = project_dir / ("backend/backend/requirements-lock.txt" if use_lock else "backend/backend/requirements.txt")
    if not req.exists():
        sys.exit(f"ERROR: requirements file not found at {req}")
    print(f"Installing backend deps from {req.relative_to(project_dir)} …")
    # Keep tooling up to date for smoother installs.
    run([str(py), "-m", "pip", "install", "--upgrade", "pip", "wheel", "setuptools"])
    # Install the pinned/flexible requirements.
    run([str(py), "-m", "pip", "install", "-r", str(req)])

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
    - Verifies the service is responding on localhost:11434 before continuing.
    """
    if skip:
        print("Skipping Ollama setup (--no-ollama).")
        return

    if not ensure_ollama_installed():
        sys.exit("ERROR: Ollama is required but could not be installed. Install manually and re-run setup.py.")

    # Start/ensure service
    print("Starting Ollama service…")
    try:
        # Launch in a separate console so logs are visible and it keeps running.
        popen(["ollama", "serve"], new_console=True)
    except Exception:
        print("⚠ Could not spawn 'ollama serve' window. If it isn't running already, please start it manually.")
    
    # Give the service a moment to come up, then verify.
    import time
    time.sleep(2)
    if not verify_ollama_up():
        print("Waiting for Ollama to become ready…")
        time.sleep(3)

    if not verify_ollama_up():
        sys.exit("ERROR: Ollama did not respond at http://localhost:11434. Please start 'ollama serve' and re-run.")

    # Ensure the target model is available locally.
    print(f"Ensuring Ollama model '{model}' …")
    try:
        run(["ollama", "pull", model])
    except subprocess.CalledProcessError:
        sys.exit(f"ERROR: Failed to pull Ollama model '{model}'. Try: ollama pull {model}")

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
