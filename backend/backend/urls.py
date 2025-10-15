from django.contrib import admin
from django.urls import path, include
from api.views import health 

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", health),          # 200 for Render health checks
    path("api/", include("api.urls")),  
    path("api/sm/", include("api.sensorimotor.urls")),
    path("", health),                 # root returns 200 instead of 404
]
