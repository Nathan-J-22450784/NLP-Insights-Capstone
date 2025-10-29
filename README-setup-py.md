How to use setup.py

Open a terminal in the root folder (the same dir as setup.py)

Run one of:

### Full setup from scratch (recommended first run):

    python setup.py

This will clone the repo into ./NLP-Insights-Capstone, create a venv, install deps, download spaCy models, run migrations, (optionally) prep Ollama, then start backend + frontend.
    If the repo is already cloned it will rebase it to ensure it is up to date.
### Start only (on later runs):

    python setup.py --start

### Use the pinned lockfile for backend deps (e.g., for prod parity):

    python setup.py --use-lock

### Skip Ollama entirely (no local LLM):

    python setup.py --no-ollama

### Change ports:

    python setup.py --backend-port 8001 --frontend-port 3001

### Use an existing clone (don’t clone again):

    python setup.py --skip-clone --dir /path/to/NLP-Insights-Capstone

### Time Delay before showing frontend prompt

    <!-- print("\nWaiting a moment for backend to start up...\n")
    time.sleep(2) -->

If system needs a few more seconds for Django to boot up before showing the "Run frontend" prompt

### Run frontend

Command Line asks interactively:

    Would you like to launch the frontend as well? (y/n):

If you type y, it launches the React app in its own console (Windows) or background process (macOS/Linux).
If n, the backend continues running by itself.

### 💡 Example usage

Full first-time setup

    python setup.py

### Next time (reuse everything)

    python setup.py --start

### When prompted:

    Would you like to launch the frontend as well? (y/n):

Type y if you want the UI. If n, the backend continues running by itself.

### Notes

No venv activation needed. The script calls the venv’s Python directly (venv/bin/python or venv\Scripts\python.exe).

Separate windows for servers. On Windows, it opens backend and frontend in new consoles. On macOS/Linux, they run in the background of your current terminal session (you’ll still see logs until you close them).

.env helper. It will create or update a .env with:

OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2

Safe re-runs. If the repo/venv already exists, it reuses them; if you want a fresh start, just delete the venv/ or the project folder and run again.