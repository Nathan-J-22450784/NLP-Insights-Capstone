from django.apps import AppConfig
import threading
import os


class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

class ApiConfig(AppConfig):
    name = "api"
    verbose_name = "API"

    def ready(self):
        # allow disabling warmup via env if needed
        if os.getenv("ENABLE_SYNONYM_WARMUP", "1") != "1":
            return

        # import here to avoid import cycles
        from .views import ensure_hf_loaded

        def _bg():
            try:
                ensure_hf_loaded()   
                print("[warmup] HF pipeline warmed", flush=True)
            except Exception as e:
                print(f"[warmup] failed: {e}", flush=True)

        threading.Thread(target=_bg, daemon=True).start()
