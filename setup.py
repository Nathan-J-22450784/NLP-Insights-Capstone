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

REPO_URL = "https://github.com/Nathan-J-22450784/NLP-Insights-Capstone.git"
DEFAULT_PROJECT_DIRNAME = "NLP-Insights-Capstone"
FRONTEND_SUBDIR = "frontend"
MANAGE_PY = Path("backend") / "manage.py"
SPACY_MODELS = ["en_core_web_sm", "en_core_web_md"]

# --- Utility helpers ---------------------------------------------------------
def is_windows(): return platform.system().lower().startswith("win")
def which(cmd): return shutil.which(cmd)

def run(cmd, cwd=None, env=None, new_console=False, check=True):
    printable = " ".join(shlex.quote(str(x)) for x in cmd)
    print(f"\n▶ {printable}")
    creationflags = subprocess.CREATE_NEW_CONSOLE if new_console and is_windows() else 0
    return subprocess.run(
        cmd, cwd=cwd, env=env,
        shell=False, check=check,
        creationflags=creationflags,
    )

def popen(cmd, cwd=None, env=None, new_console=False):
    printable = " ".join(shlex.quote(str(x)) for x in cmd)
    print(f"\n▶ (bg) {printable}")
    creationflags = subprocess.CREATE_NEW_CONSOLE if new_console and is_windows() else 0
    return subprocess.Popen(
        cmd, cwd=cwd, env=env,
        shell=False, creationflags=creationflags,
    )

def npm_cmd(): #invoke npm.cmd (or call via shell)
    return "npm.cmd" if is_windows() else "npm"

def find_manage_py(project_dir: Path) -> tuple[Path, Path] | None:
    """
    Find manage.py and return (manage_py_path, work_dir).
    Tries common locations, or falls back to a search.
    """
    candidates = [
        project_dir / "manage.py",
        project_dir / "backend" / "manage.py",
    ]
    for p in candidates:
        if p.exists():
            return p, p.parent

    # last resort: search (first hit)
    hits = list(project_dir.rglob("manage.py"))
    if hits:
        p = hits[0]
        return p, p.parent
    return None

# --- Environment setup -------------------------------------------------------
def run_capture(cmd, cwd=None):
    return subprocess.run(
        cmd, cwd=cwd, shell=False, check=True,
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
    ).stdout.strip()

def create_or_use_repo(url, project_dir: Path, skip_clone=False):
    if project_dir.exists():
        # If it’s already a git repo, just update it
        if (project_dir / ".git").exists():
            print(f"✓ Using existing repo at {project_dir}")
            try:
                # show current branch
                branch = run_capture(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=str(project_dir))
                print(f"Updating branch: {branch}")
                # get latest and fast-forward/rebase
                run(["git", "fetch", "--all", "--prune"], cwd=str(project_dir))
                # --autostash lets it rebase even if you have local edits
                run(["git", "pull", "--rebase", "--autostash", "origin", branch], cwd=str(project_dir))
            except subprocess.CalledProcessError:
                print("⚠ Git update failed; continuing with existing files.")
            return
        # Exists but not a git repo
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
    if not which("git"):
        sys.exit("ERROR: Git not found. Please install Git and retry.")

def ensure_node_npm_available():
    if not which("node"):
        sys.exit("ERROR: 'node' not found on PATH. Install Node.js and retry.")
    if not which(npm_cmd()):
        sys.exit("ERROR: 'npm' not found on PATH. Install Node.js and retry.")

def py_in_venv(venv): return venv / ("Scripts/python.exe" if is_windows() else "bin/python")
def pip_in_venv(venv): return venv / ("Scripts/pip.exe" if is_windows() else "bin/pip")

# --- Setup steps -------------------------------------------------------------
def create_or_use_repo(url, project_dir, skip_clone=False):
    if project_dir.exists():
        print(f"✓ Using existing repo at {project_dir}")
    else:
        if skip_clone:
            sys.exit(f"ERROR: {project_dir} not found and --skip-clone provided.")
        run(["git", "clone", url, str(project_dir)])

def create_venv(project_dir):
    venv = project_dir / "venv"
    if not venv.exists():
        print("Creating virtual environment …")
        run([sys.executable, "-m", "venv", str(venv)])
    else:
        print(f"✓ Using existing venv: {venv}")
    return venv, py_in_venv(venv)

def install_backend(py, project_dir, use_lock):
    req = project_dir / ("backend/backend/requirements-lock.txt" if use_lock else "backend/backend/requirements.txt")
    if not req.exists():
        sys.exit(f"ERROR: requirements file not found at {req}")
    print(f"Installing backend deps from {req.relative_to(project_dir)} …")
    run([str(py), "-m", "pip", "install", "--upgrade", "pip", "wheel", "setuptools"])
    run([str(py), "-m", "pip", "install", "-r", str(req)])

def download_spacy_models(py, skip=False):
    if skip: return
    for model in SPACY_MODELS:
        print(f"Ensuring spaCy model: {model}")
        run([str(py), "-m", "spacy", "download", model])

def run_migrations(py, project_dir):
    manage_py = project_dir / MANAGE_PY
    if not manage_py.exists():
        print(f"⚠ manage.py not found at {manage_py} — skipping migrations.")
        return
    print(f"Applying Django migrations … ({manage_py.relative_to(project_dir)})")
    run([str(py), str(manage_py), "migrate"], cwd=str(project_dir / "backend"))

def install_frontend(project_dir):
    ensure_node_npm_available()
    fe = project_dir / FRONTEND_SUBDIR
    if not fe.exists(): return
    print("Installing frontend dependencies …")
    run([npm_cmd(), "install"], cwd=str(fe))

def maybe_setup_ollama(skip, model):
    if skip or not which("ollama"):
        print("Skipping Ollama setup.")
        return
    print(f"Ensuring Ollama model '{model}' …")
    try: run(["ollama", "pull", model])
    except subprocess.CalledProcessError: pass
    popen(["ollama", "serve"], new_console=True)

# --- Runtime -----------------------------------------------------------------
def start_backend(py, project_dir, port):
    manage_py = project_dir / MANAGE_PY
    if not manage_py.exists():
        print(f"⚠ manage.py not found at {manage_py} — cannot start backend.")
        return None
    print(f"Starting Django backend on http://localhost:{port} (cwd=backend/)")
    return popen([str(py), str(manage_py), "runserver", f"0.0.0.0:{port}"],
                 cwd=str(project_dir / "backend"), new_console=True)

def start_frontend(project_dir, port=None):
    fe = project_dir / FRONTEND_SUBDIR
    if not fe.exists(): return
    env = os.environ.copy()
    if port: env["PORT"] = str(port)
    print(f"Starting React frontend on http://localhost:{port or 3000}")
    return popen([npm_cmd(), "start"], cwd=str(fe), env=env, new_console=True)

# --- Main driver -------------------------------------------------------------
def main():
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

    # If already at repo root (has .git or common top-level dirs), use CWD
    if (Path.cwd() / ".git").exists() or (Path.cwd() / "backend").exists() or (Path.cwd() / "frontend").exists():
        args.dir = "."
    target = Path(args.dir).resolve()

    ensure_git_available()
    ensure_node_npm_available()

    if not args.start:
        create_or_use_repo(args.repo, target, args.skip_clone)
        venv, py = create_venv(target)
        install_backend(py, target, args.use_lock)
        download_spacy_models(py, skip=args.skip_spacy)
        run_migrations(py, target)
        install_frontend(target)
        maybe_setup_ollama(args.no_ollama, args.ollama_model)
    else:
        venv = target / "venv"
        py = py_in_venv(venv)
        if not py.exists():
            sys.exit("ERROR: venv not found. Run setup without --start first.")

    backend = start_backend(py, target, args.backend_port)

    import time

    # Allow a short pause so backend logs appear before prompting
    print("\nWaiting a moment for backend to start up...\n")
    time.sleep(2)

    # --- Interactive prompt for frontend launch ---
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
