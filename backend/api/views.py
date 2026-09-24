import os
import logging
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import (
    ConversationSession,
    ChatMessage,
    UploadedMedia,
    DiagnosisReport,
    MechanicBooking
)
from .serializers import (
    ConversationSessionDetailSerializer,
    ChatMessageSerializer,
    UploadedMediaSerializer,
    DiagnosisReportSerializer,
    MechanicBookingSerializer
)
from .services.triage_service import TriageEngine, STANDARD_SERVICES
from .services.gemini_service import GeminiMechanicService

logger = logging.getLogger(__name__)


class HealthCheckView(APIView):
    """
    Health check endpoint for deployment monitoring.
    """
    def get(self, request):
        has_gemini = bool(GeminiMechanicService.get_api_key())
        return Response({
            "status": "healthy",
            "service": "AI Car Mechanic Diagnostic API",
            "version": "1.0.0",
            "gemini_configured": has_gemini,
            "database": "sqlite3",
        })


class ServiceCatalogView(APIView):
    """
    Returns standard service catalog with benchmark prices.
    """
    def get(self, request):
        services_list = []
        for key, s in STANDARD_SERVICES.items():
            services_list.append({
                "id": key,
                "name": s["name"],
                "price": s["price"],
                "duration": s["duration"],
                "description": s["desc"],
            })
        return Response({"services": services_list})


class SessionListView(APIView):
    """
    List all sessions or create a new diagnostic session.
    """
    def get(self, request):
        sessions = ConversationSession.objects.all()[:20]
        serializer = ConversationSessionDetailSerializer(sessions, many=True, context={"request": request})
        return Response({"sessions": serializer.data})

    def post(self, request):
        session = ConversationSession.objects.create(
            session_title=request.data.get("session_title", "New Diagnostic Session"),
            car_make=request.data.get("car_make"),
            car_model=request.data.get("car_model"),
            car_year=request.data.get("car_year"),
            car_mileage=request.data.get("car_mileage"),
        )
        # Add welcoming initial message
        ChatMessage.objects.create(
            session=session,
            sender="bot",
            text=(
                "👋 **Welcome to AI Car Mechanic!** I'm your Senior Master Automobile Technician.\n\n"
                "Tell me about the symptoms your vehicle is having, or upload an engine sound, "
                "dashboard photo, or video clip. What vehicle are you working on today?"
            ),
            is_ai_generated=False,
            triage_tag="welcome",
            suggested_actions=[
                "Squealing noise when braking",
                "Engine overheating in traffic",
                "Check engine light code P0420",
                "Car won't start in the morning"
            ]
        )
        serializer = ConversationSessionDetailSerializer(session, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SessionHistoryView(APIView):
    """
    Retrieve full conversation and diagnosis history for a session.
    """
    def get(self, request, session_id):
        session = get_object_or_404(ConversationSession, id=session_id)
        serializer = ConversationSessionDetailSerializer(session, context={"request": request})
        return Response(serializer.data)


class ChatView(APIView):
    """
    POST /api/chat/
    Core endpoint for conversational troubleshooting with senior technician persona.
    Uses rule-based triage first to minimize Gemini API usage.
    """
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def post(self, request):
        message_text = request.data.get("message", "").strip()
        session_id = request.data.get("session_id")
        media_id = request.data.get("media_id")

        if not message_text and not media_id:
            return Response(
                {"error": "Either 'message' or 'media_id' is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 1. Retrieve or create session
        session = None
        if session_id:
            try:
                session = ConversationSession.objects.get(id=session_id)
            except (ConversationSession.DoesNotExist, ValueError):
                pass

        if not session:
            session = ConversationSession.objects.create(
                session_title=f"Diagnostic Session - {message_text[:30]}..." if message_text else "New Diagnostic Session"
            )

        # 2. Extract vehicle information from message if present
        car_entities = TriageEngine.extract_car_details(message_text)
        if car_entities:
            if not session.car_year:
                session.car_year = car_entities["year"]
            if not session.car_make:
                session.car_make = car_entities["make"]
            if not session.car_model:
                session.car_model = car_entities["model"]
            session.session_title = f"{car_entities['year']} {car_entities['make']} {car_entities['model']} Diagnostics"
            session.save()

        # 3. Check for attached media
        media_url = None
        media_type = None
        media_items = []
        if media_id:
            try:
                media_obj = UploadedMedia.objects.get(id=media_id)
                media_obj.session = session
                media_obj.save()
                media_url = request.build_absolute_uri(media_obj.file.url)
                media_type = media_obj.file_type
                media_items.append({
                    "file_path": media_obj.file.path,
                    "mime_type": media_obj.mime_type,
                    "file_type": media_obj.file_type,
                })
            except (UploadedMedia.DoesNotExist, ValueError):
                pass

        # 4. Save user message to database
        user_msg = ChatMessage.objects.create(
            session=session,
            sender="user",
            text=message_text or f"[Uploaded {media_type or 'media'}]",
            media_url=media_url,
            media_type=media_type,
            is_ai_generated=False,
            triage_tag="user_input"
        )

        # 5. Execute Triage Engine to minimize Gemini API calls if no media is attached
        handled_by_rules = False
        rule_response_data = None
        if not media_items:
            handled_by_rules, rule_response_data = TriageEngine.evaluate_message(message_text, session)

        if handled_by_rules and rule_response_data:
            bot_text = rule_response_data["response"]
            follow_ups = rule_response_data.get("follow_ups", [])
            is_diagnosis_ready = rule_response_data.get("is_diagnosis_ready", False)
            diagnosis_preview = rule_response_data.get("diagnosis_preview")
            is_ai = rule_response_data.get("is_ai_generated", False)
            triage_tag = rule_response_data.get("triage_tag", "rule_triage")
        else:
            # 6. Fetch conversation history for Gemini AI
            prev_messages = session.messages.exclude(id=user_msg.id).order_by("created_at")
            history = [{"sender": m.sender, "text": m.text} for m in prev_messages]

            car_info = {}
            if session.car_make or session.car_model:
                car_info = {
                    "year": session.car_year,
                    "make": session.car_make,
                    "model": session.car_model,
                    "mileage": session.car_mileage
                }

            ai_result = GeminiMechanicService.chat_completion(
                history=history,
                new_message=message_text,
                car_info=car_info,
                media_items=media_items
            )
            bot_text = ai_result["response"]
            follow_ups = ai_result.get("follow_ups", [])
            is_diagnosis_ready = ai_result.get("is_diagnosis_ready", False)
            diagnosis_preview = None
            is_ai = ai_result.get("is_ai_generated", True)
            triage_tag = "gemini_ai"

        # 7. Save Bot Response
        bot_msg = ChatMessage.objects.create(
            session=session,
            sender="bot",
            text=bot_text,
            is_ai_generated=is_ai,
            triage_tag=triage_tag,
            suggested_actions=follow_ups
        )

        return Response({
            "session_id": str(session.id),
            "response": bot_text,
            "sender": "bot",
            "message_id": str(bot_msg.id),
            "follow_ups": follow_ups,
            "is_diagnosis_ready": is_diagnosis_ready,
            "diagnosis_preview": diagnosis_preview,
            "is_ai_generated": is_ai,
            "triage_tag": triage_tag,
            "car_context": {
                "year": session.car_year,
                "make": session.car_make,
                "model": session.car_model,
                "mileage": session.car_mileage,
            }
        }, status=status.HTTP_200_OK)


class MediaUploadView(APIView):
    """
    POST /api/upload/
    Uploads image, audio, or video files for mechanical diagnosis.
    Validates file format, stores in media storage, and triggers multimodal AI analysis.
    """
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file_obj = request.FILES.get("file")
        session_id = request.data.get("session_id")
        file_type_hint = request.data.get("media_type")

        if not file_obj:
            return Response({"error": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST)

        # Infer file type from extension / content_type
        content_type = file_obj.content_type or ""
        filename = file_obj.name or ""
        ext = os.path.splitext(filename)[1].lower()

        if content_type.startswith("image/") or ext in [".jpg", ".jpeg", ".png", ".webp", ".heic"]:
            inferred_type = "image"
        elif content_type.startswith("audio/") or ext in [".mp3", ".wav", ".m4a", ".ogg", ".aac", ".webm"]:
            inferred_type = "audio"
        elif content_type.startswith("video/") or ext in [".mp4", ".mov", ".avi", ".mkv", ".webm"]:
            inferred_type = "video"
        else:
            inferred_type = file_type_hint or "image"

        session = None
        if session_id:
            try:
                session = ConversationSession.objects.get(id=session_id)
            except (ConversationSession.DoesNotExist, ValueError):
                pass

        media_instance = UploadedMedia.objects.create(
            session=session,
            file=file_obj,
            file_type=inferred_type,
            original_filename=filename,
            file_size=file_obj.size,
            mime_type=content_type or "application/octet-stream"
        )

        # Trigger AI analysis of the uploaded media
        analysis_result = GeminiMechanicService.analyze_media_file(
            file_path=media_instance.file.path,
            mime_type=media_instance.mime_type,
            file_type=media_instance.file_type
        )

        media_instance.ai_analysis = analysis_result.get("summary", "")
        media_instance.detected_indicators = analysis_result.get("indicators", [])
        media_instance.save()

        file_url = request.build_absolute_uri(media_instance.file.url)

        return Response({
            "media_id": str(media_instance.id),
            "session_id": str(session.id) if session else None,
            "file_url": file_url,
            "file_type": media_instance.file_type,
            "original_filename": media_instance.original_filename,
            "file_size": media_instance.file_size,
            "analysis": media_instance.ai_analysis,
            "indicators": media_instance.detected_indicators,
        }, status=status.HTTP_201_CREATED)


class DiagnosisView(APIView):
    """
    POST /api/diagnosis/
    Generates a formal, structured diagnostic report based on complete conversation
    and uploaded media. Links report to session and provides 'Book Mechanic' CTA data.
    """
    parser_classes = [JSONParser, FormParser]

    def post(self, request):
        session_id = request.data.get("session_id")
        if not session_id:
            return Response({"error": "session_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        session = get_object_or_404(ConversationSession, id=session_id)
        messages = session.messages.all().order_by("created_at")

        history = [{"sender": m.sender, "text": m.text} for m in messages]
        car_info = {
            "year": session.car_year,
            "make": session.car_make,
            "model": session.car_model,
            "mileage": session.car_mileage
        }

        media_items = []
        for m in session.media_files.all():
            if m.file and os.path.exists(m.file.path):
                media_items.append({
                    "file_path": m.file.path,
                    "mime_type": m.mime_type,
                    "file_type": m.file_type
                })

        # Synthesize structured diagnosis report
        diag_data = GeminiMechanicService.generate_structured_diagnosis(
            history=history,
            car_info=car_info,
            media_items=media_items
        )

        # Create or update DiagnosisReport
        report, created = DiagnosisReport.objects.update_or_create(
            session=session,
            defaults={
                "issue_title": diag_data.get("issue_title", "Vehicle Mechanical Fault"),
                "primary_cause": diag_data.get("primary_cause", "Component failure identified during diagnostic assessment."),
                "severity": diag_data.get("severity", "medium").lower(),
                "urgency_level": diag_data.get("urgency_level", "soon").lower(),
                "is_driveable": diag_data.get("is_driveable", True),
                "symptoms": diag_data.get("symptoms", []),
                "suggested_repairs": diag_data.get("suggested_repairs", []),
                "estimated_cost_range": diag_data.get("estimated_cost_range", "$150 - $350"),
                "estimated_labor_hours": diag_data.get("estimated_labor_hours", "1.5 - 2.5 hrs"),
                "safety_warning": diag_data.get("safety_warning", ""),
                "diy_feasibility": diag_data.get("diy_feasibility", "Professional Recommended"),
                "recommended_service_name": diag_data.get("recommended_service_name", "Standard Mechanic Service"),
            }
        )

        # Update session status
        session.status = "diagnosed"
        session.troubleshooting_stage = "diagnosis_ready"
        session.save()

        serializer = DiagnosisReportSerializer(report)
        response_data = serializer.data
        response_data["cta_booking"] = {
            "recommended_service": report.recommended_service_name,
            "estimated_cost": report.estimated_cost_range,
            "car_make": session.car_make or "",
            "car_model": session.car_model or "",
            "car_year": session.car_year or "",
            "severity": report.severity,
            "is_driveable": report.is_driveable,
        }

        return Response(response_data, status=status.HTTP_200_OK)


class BookingView(APIView):
    """
    POST /api/booking/ -> Create a new mechanic booking
    GET /api/booking/{id}/ -> Retrieve booking details by ID
    """
    parser_classes = [JSONParser, FormParser]

    def post(self, request):
        data = request.data
        customer_name = data.get("customer_name")
        customer_phone = data.get("customer_phone")
        customer_email = data.get("customer_email")
        car_make = data.get("car_make")
        car_model = data.get("car_model")
        car_year = data.get("car_year")
        service_requested = data.get("service_requested")
        preferred_date = data.get("preferred_date")
        preferred_time = data.get("preferred_time")

        if not all([customer_name, customer_phone, customer_email, car_make, car_model, car_year, service_requested, preferred_date, preferred_time]):
            return Response(
                {"error": "Missing required booking fields (name, phone, email, vehicle details, service, date, time)."},
                status=status.HTTP_400_BAD_REQUEST
            )

        session = None
        session_id = data.get("session_id")
        if session_id:
            try:
                session = ConversationSession.objects.get(id=session_id)
            except (ConversationSession.DoesNotExist, ValueError):
                pass

        diagnosis = None
        diagnosis_id = data.get("diagnosis_id")
        if diagnosis_id:
            try:
                diagnosis = DiagnosisReport.objects.get(id=diagnosis_id)
            except (DiagnosisReport.DoesNotExist, ValueError):
                pass
        elif session and hasattr(session, "diagnosis"):
            diagnosis = session.diagnosis

        booking = MechanicBooking.objects.create(
            session=session,
            diagnosis=diagnosis,
            customer_name=customer_name,
            customer_phone=customer_phone,
            customer_email=customer_email,
            car_make=car_make,
            car_model=car_model,
            car_year=int(car_year),
            car_mileage=data.get("car_mileage", ""),
            service_requested=service_requested,
            service_type=data.get("service_type", "shop_visit"),
            preferred_date=preferred_date,
            preferred_time=preferred_time,
            customer_address=data.get("customer_address", ""),
            notes=data.get("notes", ""),
            estimated_cost=data.get("estimated_cost", "") or (diagnosis.estimated_cost_range if diagnosis else "$150 - $350"),
            status="confirmed"
        )

        if session:
            session.status = "booked"
            session.save()

            # Add confirmation message to chat
            ChatMessage.objects.create(
                session=session,
                sender="bot",
                text=(
                    f"🎉 **Mechanic Booking Confirmed!**\n\n"
                    f"• **Booking Reference:** `{booking.id}`\n"
                    f"• **Customer:** {booking.customer_name}\n"
                    f"• **Vehicle:** {booking.car_year} {booking.car_make} {booking.car_model}\n"
                    f"• **Service:** {booking.service_requested}\n"
                    f"• **Appointment:** {booking.preferred_date} at {booking.preferred_time}\n"
                    f"• **Service Mode:** {booking.get_service_type_display()}\n\n"
                    f"A confirmation email has been dispatched to `{booking.customer_email}`. "
                    f"Our master mechanic has received your diagnostic report and will have parts pre-staged."
                ),
                is_ai_generated=False,
                triage_tag="booking_confirmed"
            )

        serializer = MechanicBookingSerializer(booking)
        return Response({
            "success": True,
            "booking_id": booking.id,
            "booking_details": serializer.data,
            "confirmation_message": f"Booking {booking.id} has been successfully scheduled for {booking.customer_name} on {booking.preferred_date} at {booking.preferred_time}."
        }, status=status.HTTP_201_CREATED)


class BookingDetailView(APIView):
    """
    GET /api/booking/{id}/
    Retrieve booking details by ID.
    """
    def get(self, request, booking_id):
        booking = get_object_or_404(MechanicBooking, id=booking_id)
        serializer = MechanicBookingSerializer(booking)
        
        # Include diagnosis summary if available
        data = serializer.data
        if booking.diagnosis:
            data["diagnosis_summary"] = {
                "issue_title": booking.diagnosis.issue_title,
                "severity": booking.diagnosis.severity,
                "urgency_level": booking.diagnosis.urgency_level,
                "is_driveable": booking.diagnosis.is_driveable,
                "estimated_cost_range": booking.diagnosis.estimated_cost_range,
                "suggested_repairs": booking.diagnosis.suggested_repairs,
            }
        return Response(data, status=status.HTTP_200_OK)
