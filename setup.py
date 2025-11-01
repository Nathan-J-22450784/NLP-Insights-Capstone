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

REPO_URL = "https://github.com/Nathan-J-22450784/NLP-Insights-Capstone.git"
DEFAULT_PROJECT_DIRNAME = "NLP-Insights-Capstone"
DEFAULT_BRANCH = "local-dev"
FRONTEND_SUBDIR = "frontend"
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

def create_or_use_repo(url, project_dir: Path, skip_clone=False, branch=None):
    branch = branch or DEFAULT_BRANCH

    if project_dir.exists():
        # If it’s already a git repo, update & ensure desired branch is checked out
        if (project_dir / ".git").exists():
            print(f"✓ Using existing repo at {project_dir}")
            try:
                run(["git", "fetch", "--all", "--prune"], cwd=str(project_dir))

                # Try to checkout the branch; create local tracking branch if needed
                try:
                    run(["git", "checkout", branch], cwd=str(project_dir))
                except subprocess.CalledProcessError:
                    run(["git", "checkout", "-b", branch, f"origin/{branch}"], cwd=str(project_dir))

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
        # Clone directly to the desired branch
        run(["git", "clone", "-b", branch, url, str(project_dir)])

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
def assert_windows_py311_or_die():
    """
    On Windows we require Python 3.11 because SciPy==1.12.0 ships wheels for 3.11,
    and we do not want to trigger native builds.
    """
    if not is_windows():
        return
    # Try to discover a 3.11 interpreter via the Windows py launcher
    try:
        out = subprocess.run(
            ["py", "-3.11", "-c", "import sys; print(sys.executable)"],
            check=True, capture_output=True, text=True
        ).stdout.strip()
        if out and Path(out).exists():
            return
    except Exception:
        pass
    msg = """
    ERROR: Python 3.11 is required on Windows for prebuilt SciPy/Numpy wheels.
    Please install Python 3.11 from https://www.python.org/downloads/windows/
    (tick "Add python.exe to PATH") and then re-run:

        py -3.11 setup.py

    Tip: verify it's installed with:  py -3.11 -V
    """.strip()
    sys.exit(msg)

def resolve_python311() -> str:
    """
    Return the absolute path to a Python 3.11 interpreter.
    On Windows, we require it (see assert_windows_py311_or_die()).
    """
    if is_windows():
        assert_windows_py311_or_die()
        out = subprocess.run(
            ["py", "-3.11", "-c", "import sys; print(sys.executable)"],
            check=True, capture_output=True, text=True
        ).stdout.strip()
        return out

    # Non-Windows: prefer current interpreter if it's 3.11, else try python3.11
    if sys.version_info[:2] == (3, 11):
        return sys.executable
    candidate = shutil.which("python3.11") or shutil.which("python3")
    if candidate:
        ver = subprocess.run(
            [candidate, "-c", "import sys; print('.'.join(map(str, sys.version_info[:2])))"],
            check=True, capture_output=True, text=True
        ).stdout.strip()
        if ver == "3.11":
            return candidate
    sys.exit("ERROR: Python 3.11 interpreter not found. Please install Python 3.11 and re-run setup.py.")

def create_venv_with(python_exe: str, project_dir: Path):
    venv = project_dir / "venv"
    if venv.exists():
        # verify version inside venv
        py_in = venv / ("Scripts/python.exe" if is_windows() else "bin/python")
        try:
            ver = subprocess.run([str(py_in), "-c", "import sys; print('.'.join(map(str, sys.version_info[:2])))"],
                                 check=True, capture_output=True, text=True).stdout.strip()
        except Exception:
            ver = "unknown"
        if ver != "3.11":
            print("♻ Recreating venv with Python 3.11 …")
            shutil.rmtree(venv)
    if not venv.exists():
        print(f"Creating virtual environment with {python_exe} …")
        run([python_exe, "-m", "venv", str(venv)])
    return venv, (venv / ("Scripts/python.exe" if is_windows() else "bin/python"))

def install_backend(py, project_dir, use_lock):
    req = project_dir / ("backend/backend/requirements-lock.txt" if use_lock else "backend/backend/requirements.txt")
    if not req.exists():
        sys.exit(f"ERROR: requirements file not found at {req}")
    print(f"Installing backend deps from {req.relative_to(project_dir)} …")

    # Always keep pip tooling current
    run([str(py), "-m", "pip", "install", "--upgrade", "pip", "wheel", "setuptools"])

    # Wheels-only install on Windows to avoid native builds.
    # (If a wheel doesn't exist for a pinned version, pip will fail fast with a clear error.)
    pip_args = [str(py), "-m", "pip", "install"]
    if is_windows():
        pip_args += ["--only-binary", ":all:", "--no-binary", "en_core_web_sm,en_core_web_md"]

    # On Windows, don't try to preinstall numpy<2.0 unless we're *actually* on a 3.11 venv
    if is_windows():
        py_ver = subprocess.run(
            [str(py), "-c", "import sys; print('.'.join(map(str, sys.version_info[:2])))"],
            check=True, capture_output=True, text=True
        ).stdout.strip()
        if py_ver == "3.11":
            try:
                run([str(py), "-m", "pip", "install", "numpy<2.0", "--only-binary", ":all:"])
            except subprocess.CalledProcessError:
                # Not fatal; continue to main install which is wheels-only and will error clearly if needed
                pass

    run(pip_args + ["-r", str(req)])

def download_spacy_models(py, skip=False):
    if skip: return
    for model in SPACY_MODELS:
        print(f"Ensuring spaCy model: {model}")
        run([str(py), "-m", "spacy", "download", model])

def run_migrations(py, project_dir):
    found = find_manage_py(project_dir)
    if not found:
        print("⚠ manage.py not found — skipping migrations.")
        return
    manage_py, work_dir = found
    print(f"Applying Django migrations … ({manage_py.relative_to(project_dir)})")
    run([str(py), "manage.py", "migrate"], cwd=str(work_dir))

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
    found = find_manage_py(project_dir)
    if not found:
        print("⚠ manage.py not found — cannot start backend.")
        return None
    manage_py, work_dir = found
    print(f"Starting Django backend on http://localhost:{port} (cwd={work_dir.relative_to(project_dir)}/)")
    return popen([str(py), "manage.py", "runserver", f"0.0.0.0:{port}"], cwd=str(work_dir), new_console=True)

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
    p.add_argument("--branch", default=DEFAULT_BRANCH)
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
    target = Path(args.dir).resolve()

    ensure_git_available()
    
    if not args.start:
        create_or_use_repo(args.repo, target, args.skip_clone, branch=args.branch)
        py311 = resolve_python311()
        venv, py = create_venv_with(py311, target)
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

