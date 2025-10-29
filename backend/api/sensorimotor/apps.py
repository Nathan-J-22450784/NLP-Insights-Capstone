from django.apps import AppConfig

class SensorimotorConfig(AppConfig):
    name = "api.sensorimotor"

    def ready(self):
        # lazy import to avoid Django startup cycles
        from .loader import warm_start
        warm_start()  # download & parse CSV in a background thread
