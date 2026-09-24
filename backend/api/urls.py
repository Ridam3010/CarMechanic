from django.urls import path
from .views import (
    HealthCheckView,
    ServiceCatalogView,
    SessionListView,
    SessionHistoryView,
    ChatView,
    MediaUploadView,
    DiagnosisView,
    BookingView,
    BookingDetailView,
)

urlpatterns = [
    # Health & Meta
    path("health/", HealthCheckView.as_view(), name="api_health"),
    path("services/", ServiceCatalogView.as_view(), name="api_services"),
    
    # Sessions & History
    path("sessions/", SessionListView.as_view(), name="api_sessions"),
    path("history/<uuid:session_id>/", SessionHistoryView.as_view(), name="api_history"),

    # Core Spec Endpoints
    path("chat/", ChatView.as_view(), name="api_chat"),
    path("upload/", MediaUploadView.as_view(), name="api_upload"),
    path("diagnosis/", DiagnosisView.as_view(), name="api_diagnosis"),
    path("booking/", BookingView.as_view(), name="api_booking_create"),
    path("booking/<str:booking_id>/", BookingDetailView.as_view(), name="api_booking_detail"),
]
