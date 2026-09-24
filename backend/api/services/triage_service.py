"""
Triage & Rule-based Engine for AI Car Mechanic Backend.
Minimizes unnecessary Gemini API calls by handling deterministic queries locally:
- Non-car / off-topic query rejection with polite senior mechanic persona
- Instant OBD-II Diagnostic Trouble Code (DTC) database lookups
- Routine service catalog and standard pricing quotes
- Booking status inquiries via Booking Code
- Car year/make/model entity extraction
"""

import re
from typing import Optional, Dict, Any, Tuple


# Common OBD-II Diagnostic Trouble Codes mapped to senior mechanic insights
OBD2_DATABASE = {
    "P0300": {
        "title": "Random/Multiple Cylinder Misfire Detected",
        "severity": "high",
        "urgency": "immediate",
        "is_driveable": False,
        "causes": ["Worn spark plugs", "Failing ignition coil packs", "Low fuel pressure", "Vacuum leak"],
        "cost_range": "$120 - $450",
        "repair": "Spark Plug & Ignition Coil Replacement / Compression Test",
    },
    "P0301": {
        "title": "Cylinder 1 Misfire Detected",
        "severity": "medium",
        "urgency": "soon",
        "is_driveable": True,
        "causes": ["Cylinder 1 spark plug/coil failure", "Clogged fuel injector #1"],
        "cost_range": "$90 - $280",
        "repair": "Cylinder 1 Coil & Plug Service",
    },
    "P0420": {
        "title": "Catalytic Converter System Efficiency Below Threshold (Bank 1)",
        "severity": "medium",
        "urgency": "soon",
        "is_driveable": True,
        "causes": ["Degraded catalytic converter", "Faulty Downstream O2 Oxygen Sensor", "Exhaust leak"],
        "cost_range": "$400 - $1,400",
        "repair": "O2 Sensor Test & Catalytic Converter Replacement",
    },
    "P0171": {
        "title": "System Too Lean (Bank 1)",
        "severity": "medium",
        "urgency": "soon",
        "is_driveable": True,
        "causes": ["Dirty/faulty MAF (Mass Air Flow) sensor", "Intake vacuum leak", "Weak fuel pump / clogged fuel filter"],
        "cost_range": "$110 - $350",
        "repair": "Smoke Test for Vacuum Leaks & MAF Sensor Cleaning/Replacement",
    },
    "P0128": {
        "title": "Coolant Thermostat (Coolant Temp Below Regulating Temperature)",
        "severity": "low",
        "urgency": "routine",
        "is_driveable": True,
        "causes": ["Thermostat stuck open", "Faulty engine coolant temperature (ECT) sensor", "Low coolant level"],
        "cost_range": "$150 - $300",
        "repair": "Thermostat Replacement & Coolant Flush",
    },
    "P0442": {
        "title": "EVAP System Small Leak Detected",
        "severity": "low",
        "urgency": "routine",
        "is_driveable": True,
        "causes": ["Loose or cracked gas cap", "Faulty purge valve or charcoal canister hose"],
        "cost_range": "$25 - $220",
        "repair": "Gas Cap Replacement / EVAP Smoke Test",
    },
    "P0455": {
        "title": "EVAP System Gross Leak Detected",
        "severity": "medium",
        "urgency": "routine",
        "is_driveable": True,
        "causes": ["Missing or broken gas cap", "Disconnected EVAP vent hose", "Defective EVAP canister vent solenoid"],
        "cost_range": "$30 - $280",
        "repair": "EVAP Purge/Vent Valve Inspection",
    },
    "P0500": {
        "title": "Vehicle Speed Sensor (VSS) Malfunction",
        "severity": "medium",
        "urgency": "soon",
        "is_driveable": True,
        "causes": ["Defective vehicle speed sensor", "Damaged wiring harness", "ABS wheel speed sensor fault"],
        "cost_range": "$140 - $320",
        "repair": "VSS / ABS Sensor Replacement",
    },
    "P0113": {
        "title": "Intake Air Temperature Sensor 1 Circuit High",
        "severity": "low",
        "urgency": "routine",
        "is_driveable": True,
        "causes": ["IAT sensor connector loose", "Faulty IAT sensor / MAF assembly"],
        "cost_range": "$80 - $200",
        "repair": "IAT / MAF Sensor Service",
    },
}

# Standard maintenance services catalog with fixed benchmark estimates
STANDARD_SERVICES = {
    "oil_change": {
        "name": "Full Synthetic Oil & Filter Service",
        "keywords": ["oil change", "engine oil", "lube service", "synthetic oil", "filter change"],
        "price": "$65 - $110",
        "duration": "45 mins",
        "desc": "Drain and refill up to 5 qts premium synthetic oil, OEM oil filter replacement, plus multi-point inspection.",
    },
    "brake_service": {
        "name": "Brake Pad & Rotor Replacement (Per Axle)",
        "keywords": ["brake pad", "brakes replacement", "brake rotor", "brake squeak price", "front brakes", "rear brakes"],
        "price": "$220 - $480",
        "duration": "1.5 - 2.5 hrs",
        "desc": "Ceramic or semi-metallic pads, resurfacing or new vented rotors, hardware kit, and brake fluid inspection.",
    },
    "battery_replacement": {
        "name": "Battery Health Test & Replacement",
        "keywords": ["battery replacement", "dead battery", "new battery cost", "car won't crank", "alternator test"],
        "price": "$160 - $280",
        "duration": "30 mins",
        "desc": "OEM-spec AGM or Lead-Acid battery with 3-year free replacement warranty, terminal cleaning, and charging system test.",
    },
    "transmission_flush": {
        "name": "Transmission Fluid Exchange",
        "keywords": ["transmission flush", "transmission fluid", "gearbox oil", "transmission service"],
        "price": "$180 - $350",
        "duration": "1.5 hrs",
        "desc": "Complete fluid evacuation and refill with synthetic ATF/CVT fluid, pan gasket replacement if applicable.",
    },
    "spark_plugs": {
        "name": "Iridium Spark Plug Replacement",
        "keywords": ["spark plugs", "spark plug replacement", "tune up", "ignition tune-up"],
        "price": "$140 - $380",
        "duration": "1 - 2 hrs",
        "desc": "Long-life OEM Iridium/Platinum plugs, gap verification, and ignition boot inspection.",
    },
    "wheel_alignment": {
        "name": "4-Wheel Precision Laser Alignment",
        "keywords": ["wheel alignment", "alignment cost", "tire alignment", "car pulls to left", "car pulls to right"],
        "price": "$90 - $160",
        "duration": "1 hr",
        "desc": "Camber, caster, and toe adjustment to factory specifications for even tire wear and straight tracking.",
    },
}

# Non-car / off-topic keywords
NON_CAR_PATTERNS = [
    r"\b(python|javascript|react|html|css|coding|software|code for|write code|game script)\b",
    r"\b(who won the|world cup|football match|cricket match|nba game|super bowl)\b",
    r"\b(recipe|how to cook|bake a cake|pasta recipe|dinner ideas|food recipe)\b",
    r"\b(write an essay|homework help|math problem|solve equation|quantum physics)\b",
    r"\b(relationship advice|dating advice|love life|horoscope|zodiac sign)\b",
    r"\b(movie recommendations|netflix shows|latest songs|spotify playlist)\b",
    r"\b(politics|president election|prime minister|crypto price|bitcoin price)\b",
]

# Greetings
GREETING_PATTERNS = [
    r"^(hi|hello|hey|greetings|good morning|good afternoon|good evening|howdy|sup)[\s!\.]*$",
    r"^who are you\??$",
    r"^what can you do\??$",
    r"^help me\??$",
]

# Year Make Model extraction regex (clean single/hyphenated model token)
CAR_YMM_PATTERN = re.compile(
    r"\b(19\d{2}|20\d{2})\s+([A-Za-z]+)\s+([A-Za-z0-9\-]+)",
    re.IGNORECASE
)


class TriageEngine:
    @classmethod
    def evaluate_message(cls, message_text: str, session=None) -> Tuple[bool, Optional[Dict[str, Any]]]:
        clean_text = message_text.strip().lower()

        # 1. Check for off-topic non-car queries
        if cls._is_off_topic(clean_text):
            return True, {
                "response": (
                    "👨‍🔧 **Car & Mechanical Assistance Only**\n\n"
                    "I'm your **Senior Automobile Diagnostic Technician**. I strictly specialize in automotive "
                    "troubleshooting, mechanical failures, engine diagnostics, electrical issues, maintenance, "
                    "and repair estimates.\n\n"
                    "How can I help you with your vehicle today? You can tell me symptoms like squeaking brakes, "
                    "check engine lights, overheating, or upload a photo/sound recording of the issue!"
                ),
                "is_ai_generated": False,
                "triage_tag": "off_topic_rejected",
                "follow_ups": [
                    "My check engine light is on",
                    "My brakes make a squealing noise",
                    "Car won't start in the morning",
                    "Engine is overheating in traffic"
                ],
                "is_diagnosis_ready": False,
            }

        # 2. Check for simple greetings / introductions
        if cls._is_greeting(clean_text):
            return True, {
                "response": (
                    "👋 **Hello! I'm your Senior Automotive Master Technician.**\n\n"
                    "With over 25 years of hands-on garage experience, I'm here to help diagnose any issues "
                    "with your car, truck, or SUV.\n\n"
                    "To get started with an accurate diagnosis, please tell me:\n"
                    "1. **Vehicle Year, Make & Model** (e.g., *2018 Honda Civic*)\n"
                    "2. **What symptoms you're experiencing** (noises, dashboard lights, vibrations, fluid leaks)\n"
                    "3. Feel free to **upload a photo, video, or audio clip** of the engine/issue!\n\n"
                    "What's happening with your ride today?"
                ),
                "is_ai_generated": False,
                "triage_tag": "greeting",
                "follow_ups": [
                    "Engine makes a ticking/knocking sound",
                    "Check engine light code P0420",
                    "Brake pedal feels soft and spongy",
                    "How much is a full synthetic oil change?"
                ],
                "is_diagnosis_ready": False,
            }

        # 3. Check for specific OBD-II diagnostic fault codes (e.g. P0300, P0420)
        dtc_match = re.search(r"\b(p[0-3][0-9]{3})\b", clean_text, re.IGNORECASE)
        if dtc_match:
            code = dtc_match.group(1).upper()
            if code in OBD2_DATABASE:
                data = OBD2_DATABASE[code]
                resp = (
                    f"🔧 **DTC Code Analysis: {code} - {data['title']}**\n\n"
                    f"As a master tech, here is what this code indicates from my diagnostic records:\n\n"
                    f"• **Severity:** `{data['severity'].upper()}`\n"
                    f"• **Urgency:** {data['urgency'].title()}\n"
                    f"• **Safe to Drive:** {'✅ Yes, but get it serviced soon' if data['is_driveable'] else '⚠️ No / High Risk of damage - avoid driving'}\n"
                    f"• **Most Common Causes:**\n" + "\n".join([f"  - {c}" for c in data['causes']]) + "\n\n"
                    f"• **Recommended Action:** {data['repair']}\n"
                    f"• **Estimated Repair Cost:** `{data['cost_range']}` (parts + labor)\n\n"
                    f"👉 Would you like me to book a certified mechanic for a full physical inspection & repair?"
                )
                return True, {
                    "response": resp,
                    "is_ai_generated": False,
                    "triage_tag": "dtc_lookup",
                    "follow_ups": [
                        f"Book mechanic for {code} repair",
                        "What happens if I ignore this code?",
                        "How can I test this myself?",
                        "Clear the code and re-test"
                    ],
                    "is_diagnosis_ready": True,
                    "diagnosis_preview": {
                        "issue_title": f"DTC Code {code}: {data['title']}",
                        "primary_cause": ", ".join(data['causes'][:2]),
                        "severity": data['severity'],
                        "suggested_repairs": [data['repair']],
                        "estimated_cost_range": data['cost_range'],
                        "urgency_level": data['urgency'],
                        "is_driveable": data['is_driveable'],
                        "recommended_service_name": data['repair'],
                    }
                }

        # 4. Check for standard service price inquiries
        for s_key, s_data in STANDARD_SERVICES.items():
            for kw in s_data["keywords"]:
                if kw in clean_text:
                    resp = (
                        f"🛠️ **Service Estimate: {s_data['name']}**\n\n"
                        f"• **Estimated Price:** `{s_data['price']}`\n"
                        f"• **Typical Duration:** `{s_data['duration']}`\n"
                        f"• **Service Details:** {s_data['desc']}\n\n"
                        f"All bookings through our platform include a **multi-point safety inspection** and **workmanship guarantee**.\n\n"
                        f"Would you like to schedule an appointment with a local certified mechanic?"
                    )
                    return True, {
                        "response": resp,
                        "is_ai_generated": False,
                        "triage_tag": "standard_service_quote",
                        "follow_ups": [
                            f"Book {s_data['name']}",
                            "What is included in the inspection?",
                            "Can a mobile mechanic come to my house?",
                            "Ask about another service"
                        ],
                        "is_diagnosis_ready": True,
                        "diagnosis_preview": {
                            "issue_title": s_data['name'],
                            "primary_cause": "Scheduled Maintenance / Wear & Tear",
                            "severity": "low",
                            "suggested_repairs": [s_data['name']],
                            "estimated_cost_range": s_data['price'],
                            "urgency_level": "routine",
                            "is_driveable": True,
                            "recommended_service_name": s_data['name'],
                        }
                    }

        # 5. Check for booking lookup query
        bk_match = re.search(r"\b(bk-\d{5,8})\b", clean_text, re.IGNORECASE)
        if bk_match:
            from api.models import MechanicBooking
            code = bk_match.group(1).upper()
            try:
                booking = MechanicBooking.objects.get(id=code)
                resp = (
                    f"📋 **Booking Found: {booking.id}**\n\n"
                    f"• **Customer:** {booking.customer_name}\n"
                    f"• **Vehicle:** {booking.car_year} {booking.car_make} {booking.car_model}\n"
                    f"• **Service:** {booking.service_requested}\n"
                    f"• **Date & Time:** {booking.preferred_date} at {booking.preferred_time}\n"
                    f"• **Status:** `{booking.status.upper()}`\n"
                    f"• **Type:** {booking.get_service_type_display()}\n\n"
                    f"Our technician will contact you at `{booking.customer_phone}` prior to arrival."
                )
                return True, {
                    "response": resp,
                    "is_ai_generated": False,
                    "triage_tag": "booking_status",
                    "follow_ups": [
                        "Reschedule booking",
                        "Cancel this appointment",
                        "Start a new car diagnosis"
                    ],
                    "is_diagnosis_ready": False,
                }
            except MechanicBooking.DoesNotExist:
                return True, {
                    "response": (
                        f"🔍 I couldn't find an active booking with reference code **{code}**.\n\n"
                        f"Please double-check the booking number from your confirmation message, "
                        f"or provide your phone number/email to search."
                    ),
                    "is_ai_generated": False,
                    "triage_tag": "booking_not_found",
                    "follow_ups": ["Book a new appointment", "Diagnose my car issue"],
                    "is_diagnosis_ready": False,
                }

        # Query requires complex diagnostic reasoning / Gemini AI
        return False, None

    @classmethod
    def _is_off_topic(cls, text: str) -> bool:
        # Check explicit car terms first
        car_whitelist = ["car", "vehicle", "engine", "brake", "transmission", "tire", "honda", "toyota", "ford", "bmw", "chevy", "mercedes", "radiator", "exhaust", "misfire", "clutch", "spark plug", "coolant", "battery"]
        if any(w in text for w in car_whitelist):
            return False

        for pat in NON_CAR_PATTERNS:
            if re.search(pat, text, re.IGNORECASE):
                return True
        return False

    @classmethod
    def _is_greeting(cls, text: str) -> bool:
        for pat in GREETING_PATTERNS:
            if re.match(pat, text, re.IGNORECASE):
                return True
        return False

    @classmethod
    def extract_car_details(cls, text: str) -> Optional[Dict[str, Any]]:
        match = CAR_YMM_PATTERN.search(text)
        if match:
            return {
                "year": int(match.group(1)),
                "make": match.group(2).strip().title(),
                "model": match.group(3).strip().title()
            }
        return None
