from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

def root_view(request):
    return JsonResponse({
        "project": "AI Car Mechanic Backend API",
        "status": "online",
        "endpoints": {
            "health": "/api/health/",
            "chat": "/api/chat/",
            "upload": "/api/upload/",
            "diagnosis": "/api/diagnosis/",
            "booking": "/api/booking/",
            "services": "/api/services/"
        }
    })

urlpatterns = [
    path("", root_view, name="api_root"),
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
