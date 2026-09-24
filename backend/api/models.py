import uuid
from django.db import models


class ConversationSession(models.Model):
    STATUS_CHOICES = [
        ("active", "Active"),
        ("diagnosed", "Diagnosed"),
        ("booked", "Booked"),
        ("closed", "Closed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session_title = models.CharField(max_length=255, default="New Diagnostic Session")
    car_make = models.CharField(max_length=100, blank=True, null=True)
    car_model = models.CharField(max_length=100, blank=True, null=True)
    car_year = models.IntegerField(blank=True, null=True)
    car_mileage = models.CharField(max_length=50, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    troubleshooting_stage = models.CharField(max_length=50, default="initial_inquiry")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.session_title} ({str(self.id)[:8]})"


class ChatMessage(models.Model):
    SENDER_CHOICES = [
        ("user", "User"),
        ("bot", "Bot"),
        ("system", "System"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(ConversationSession, on_delete=models.CASCADE, related_name="messages")
    sender = models.CharField(max_length=10, choices=SENDER_CHOICES)
    text = models.TextField()
    is_ai_generated = models.BooleanField(default=True)
    triage_tag = models.CharField(max_length=50, default="chat")
    media_url = models.CharField(max_length=500, blank=True, null=True)
    media_type = models.CharField(max_length=20, blank=True, null=True)
    suggested_actions = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"[{self.sender}] {self.text[:40]}..."


class UploadedMedia(models.Model):
    MEDIA_TYPE_CHOICES = [
        ("image", "Image"),
        ("audio", "Audio"),
        ("video", "Video"),
        ("other", "Other"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(ConversationSession, on_delete=models.CASCADE, related_name="media_files", null=True, blank=True)
    file = models.FileField(upload_to="uploads/%Y/%m/%d/")
    file_type = models.CharField(max_length=20, choices=MEDIA_TYPE_CHOICES, default="image")
    original_filename = models.CharField(max_length=255)
    file_size = models.BigIntegerField(default=0)
    mime_type = models.CharField(max_length=100, blank=True, default="")
    ai_analysis = models.TextField(blank=True, default="")
    detected_indicators = models.JSONField(default=list, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.original_filename} ({self.file_type})"


class DiagnosisReport(models.Model):
    SEVERITY_CHOICES = [
        ("low", "Low - Minor issue"),
        ("medium", "Medium - Attention needed"),
        ("high", "High - Urgent repair"),
        ("critical", "Critical - Do not drive"),
    ]
    URGENCY_CHOICES = [
        ("immediate", "Immediate (Within 24-48 hrs)"),
        ("soon", "Soon (Within 1-2 weeks)"),
        ("routine", "Routine Maintenance"),
        ("monitor", "Monitor closely"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.OneToOneField(ConversationSession, on_delete=models.CASCADE, related_name="diagnosis", null=True, blank=True)
    issue_title = models.CharField(max_length=255)
    primary_cause = models.TextField()
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default="medium")
    urgency_level = models.CharField(max_length=20, choices=URGENCY_CHOICES, default="soon")
    is_driveable = models.BooleanField(default=True)
    symptoms = models.JSONField(default=list, blank=True)
    suggested_repairs = models.JSONField(default=list, blank=True)
    estimated_cost_range = models.CharField(max_length=100, default="$150 - $350")
    estimated_labor_hours = models.CharField(max_length=50, default="1.5 - 2.5 hrs")
    safety_warning = models.TextField(blank=True, default="")
    diy_feasibility = models.CharField(max_length=50, default="Professional Recommended")
    recommended_service_name = models.CharField(max_length=200, default="Standard Inspection & Repair")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Diagnosis: {self.issue_title} ({self.severity})"


def generate_booking_code():
    import random
    return f"BK-{random.randint(100000, 999999)}"


class MechanicBooking(models.Model):
    SERVICE_TYPE_CHOICES = [
        ("shop_visit", "Certified Workshop Visit"),
        ("mobile_mechanic", "Doorstep Mobile Mechanic"),
        ("emergency_towing", "Emergency Towing & Diagnostics"),
    ]
    STATUS_CHOICES = [
        ("confirmed", "Confirmed"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ]

    id = models.CharField(primary_key=True, max_length=20, default=generate_booking_code, editable=False)
    session = models.ForeignKey(ConversationSession, on_delete=models.SET_NULL, null=True, blank=True, related_name="bookings")
    diagnosis = models.ForeignKey(DiagnosisReport, on_delete=models.SET_NULL, null=True, blank=True, related_name="bookings")
    customer_name = models.CharField(max_length=150)
    customer_phone = models.CharField(max_length=30)
    customer_email = models.EmailField()
    car_make = models.CharField(max_length=100)
    car_model = models.CharField(max_length=100)
    car_year = models.IntegerField()
    car_mileage = models.CharField(max_length=50, blank=True, default="")
    service_requested = models.CharField(max_length=255)
    service_type = models.CharField(max_length=30, choices=SERVICE_TYPE_CHOICES, default="shop_visit")
    preferred_date = models.DateField()
    preferred_time = models.CharField(max_length=50)
    customer_address = models.TextField(blank=True, default="")
    notes = models.TextField(blank=True, default="")
    estimated_cost = models.CharField(max_length=100, blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="confirmed")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Booking {self.id} - {self.customer_name} ({self.car_make} {self.car_model})"
