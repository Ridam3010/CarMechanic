from rest_framework import serializers
from .models import (
    ConversationSession,
    ChatMessage,
    UploadedMedia,
    DiagnosisReport,
    MechanicBooking
)


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "session",
            "sender",
            "text",
            "is_ai_generated",
            "triage_tag",
            "media_url",
            "media_type",
            "suggested_actions",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class UploadedMediaSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = UploadedMedia
        fields = [
            "id",
            "session",
            "file",
            "file_url",
            "file_type",
            "original_filename",
            "file_size",
            "mime_type",
            "ai_analysis",
            "detected_indicators",
            "uploaded_at",
        ]
        read_only_fields = ["id", "uploaded_at", "file_url"]

    def get_file_url(self, obj):
        request = self.context.get("request")
        if obj.file and hasattr(obj.file, "url"):
            if request is not None:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return ""


class DiagnosisReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiagnosisReport
        fields = [
            "id",
            "session",
            "issue_title",
            "primary_cause",
            "severity",
            "urgency_level",
            "is_driveable",
            "symptoms",
            "suggested_repairs",
            "estimated_cost_range",
            "estimated_labor_hours",
            "safety_warning",
            "diy_feasibility",
            "recommended_service_name",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class MechanicBookingSerializer(serializers.ModelSerializer):
    service_type_display = serializers.CharField(source="get_service_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = MechanicBooking
        fields = [
            "id",
            "session",
            "diagnosis",
            "customer_name",
            "customer_phone",
            "customer_email",
            "car_make",
            "car_model",
            "car_year",
            "car_mileage",
            "service_requested",
            "service_type",
            "service_type_display",
            "preferred_date",
            "preferred_time",
            "customer_address",
            "notes",
            "estimated_cost",
            "status",
            "status_display",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "service_type_display", "status_display"]


class ConversationSessionDetailSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)
    media_files = UploadedMediaSerializer(many=True, read_only=True)
    diagnosis = DiagnosisReportSerializer(read_only=True)
    bookings = MechanicBookingSerializer(many=True, read_only=True)

    class Meta:
        model = ConversationSession
        fields = [
            "id",
            "session_title",
            "car_make",
            "car_model",
            "car_year",
            "car_mileage",
            "status",
            "troubleshooting_stage",
            "created_at",
            "updated_at",
            "messages",
            "media_files",
            "diagnosis",
            "bookings",
        ]
