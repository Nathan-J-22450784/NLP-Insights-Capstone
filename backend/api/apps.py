from django.apps import AppConfig
import threading
import os


class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'
    verbose_name = "API"

    def ready(self):
        """
        Optional model warm-up. Disabled by default for low-RAM plans.
        Enable by setting ENABLE_SYNONYM_WARMUP=1 (name is stable & documented here).
        """
        if os.getenv("ENABLE_SYNONYM_WARMUP", "0") != "1":
            # Warm-up OFF unless explicitly enabled
            return

        # Import lazily to avoid import cycles at app load
        try:
            from .views import ensure_hf_loaded as _warmup  
        except Exception as e:
            print(f"[warmup] import skipped: {e}", flush=True)
            return

        def _bg():
            try:
                _warmup()  
                print("[warmup] HF pipeline warmed", flush=True)
            except Exception as e:
                print(f"[warmup] failed: {e}", flush=True)

        threading.Thread(target=_bg, daemon=True).start()
