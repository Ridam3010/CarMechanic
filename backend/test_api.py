import os
import sys
import django
import json
import tempfile
from PIL import Image
import io

# Force utf-8 encoding for windows terminal output
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mechanic_backend.settings")
django.setup()

from rest_framework.test import APIClient

def run_tests():
    client = APIClient()
    print(">> Starting End-to-End API Tests...\n")

    # 1. Health Check
    print("1. Testing GET /api/health/ ...")
    res = client.get("/api/health/")
    assert res.status_code == 200, f"Failed: {res.status_code}"
    print(f"   [OK] Health: {res.data['status']}\n")

    # 2. Non-car / Off-topic query rejection
    print("2. Testing POST /api/chat/ with Off-Topic Query ('write python code for a game') ...")
    res = client.post("/api/chat/", {"message": "write python code for a snake game"}, format="json")
    assert res.status_code == 200
    assert res.data["is_ai_generated"] is False
    assert res.data["triage_tag"] == "off_topic_rejected"
    session_id = res.data["session_id"]
    print(f"   [OK] Off-topic filtered locally without LLM cost! Response excerpt: {res.data['response'][:70]}...\n")

    # 3. Deterministic DTC OBD-II code lookup
    print("3. Testing POST /api/chat/ with OBD-II DTC Code P0300 ...")
    res = client.post("/api/chat/", {"session_id": session_id, "message": "My scanner showed code P0300"}, format="json")
    assert res.status_code == 200
    assert res.data["triage_tag"] == "dtc_lookup"
    print(f"   [OK] DTC Lookup handled locally: {res.data['diagnosis_preview']['issue_title']}\n")

    # 4. Realistic Mechanical Query with Car Entity Extraction
    print("4. Testing POST /api/chat/ with Car Issue ('2019 Toyota Camry squeaking front brakes') ...")
    res = client.post("/api/chat/", {"session_id": session_id, "message": "My 2019 Toyota Camry has loud squeaking from the front wheels whenever I apply the brakes"}, format="json")
    assert res.status_code == 200
    assert res.data["car_context"]["make"] == "Toyota"
    assert res.data["car_context"]["model"] == "Camry"
    print(f"   [OK] Diagnostic Response generated. Car extracted: {res.data['car_context']}\n")

    # 5. Media Upload
    print("5. Testing POST /api/upload/ with image ...")
    img_byte_arr = io.BytesIO()
    image = Image.new("RGB", (200, 200), color=(180, 50, 50))
    image.save(img_byte_arr, format="JPEG")
    img_byte_arr.seek(0)
    img_byte_arr.name = "worn_brake_pad.jpg"

    res = client.post("/api/upload/", {"file": img_byte_arr, "session_id": session_id, "media_type": "image"}, format="multipart")
    assert res.status_code == 201
    media_id = res.data["media_id"]
    print(f"   [OK] Media uploaded & analyzed: {media_id} ({res.data['file_type']})\n")

    # 6. Diagnosis Generation
    print("6. Testing POST /api/diagnosis/ ...")
    res = client.post("/api/diagnosis/", {"session_id": session_id}, format="json")
    assert res.status_code == 200
    diag_id = res.data["id"]
    print(f"   [OK] Diagnosis Report Created:")
    print(f"      - Issue: {res.data['issue_title']}")
    print(f"      - Severity: {res.data['severity'].upper()}")
    print(f"      - Cost Range: {res.data['estimated_cost_range']}")
    print(f"      - Recommended Service: {res.data['recommended_service_name']}\n")

    # 7. Mechanic Booking Creation
    print("7. Testing POST /api/booking/ ...")
    booking_payload = {
        "session_id": session_id,
        "diagnosis_id": diag_id,
        "customer_name": "Alex Johnson",
        "customer_phone": "+1 (555) 234-5678",
        "customer_email": "alex.johnson@example.com",
        "car_make": "Toyota",
        "car_model": "Camry",
        "car_year": 2019,
        "car_mileage": "62,500 miles",
        "service_requested": res.data["recommended_service_name"],
        "service_type": "shop_visit",
        "preferred_date": "2026-09-28",
        "preferred_time": "10:00 AM",
        "customer_address": "742 Evergreen Terrace, Springfield",
        "notes": "Please check both front and rear rotors as well."
    }
    res = client.post("/api/booking/", booking_payload, format="json")
    assert res.status_code == 201
    booking_id = res.data["booking_id"]
    print(f"   [OK] Booking Created Successfully: Code {booking_id}\n")

    # 8. Retrieve Booking by ID
    print(f"8. Testing GET /api/booking/{booking_id}/ ...")
    res = client.get(f"/api/booking/{booking_id}/")
    assert res.status_code == 200
    assert res.data["id"] == booking_id
    assert res.data["customer_name"] == "Alex Johnson"
    print(f"   [OK] Retrieved Booking details: {res.data['customer_name']} | {res.data['car_year']} {res.data['car_make']} {res.data['car_model']} | Status: {res.data['status']}\n")

    print(">> ALL 8 BACKEND API TESTS PASSED PERFECTLY!\n")

if __name__ == "__main__":
    run_tests()
