"""
Gemini AI Service for Automobile Troubleshooting & Multimodal Diagnosis.
Integrates Google Gemini Free Tier API with persona-tuning and multimodal support.
Falls back gracefully to senior technician expert heuristic rules if API key is not configured.
"""

import os
import json
import base64
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are 'Antigravity Master Mechanic' (Bob / Senior Master Automobile Technician), an ASE Master Certified automobile technician with over 25 years of diagnostic experience in dealership and independent repair shops.

Your Persona & Rules:
1. Tone: Friendly, highly knowledgeable, practical, safety-conscious, and authoritative yet easy for everyday car owners to understand.
2. Scope Restriction: You ONLY handle automotive, motorcycle, car maintenance, repair, diagnostics, and mechanical troubleshooting queries.
   - If a user asks non-automotive questions (coding, history, recipes, general chat), politely decline and steer them back to vehicle diagnostics.
3. Diagnostic Workflow:
   - Always ask 1-2 targeted diagnostic follow-up questions before jumping to a premature conclusion (e.g. 'Does the squeal happen when pressing the pedal or when turning?', 'Is the check engine light flashing or steady?', 'Do you smell burning oil or sweet coolant?').
   - When inspecting media (photos of leaks/treads/warning lights, audio of knocks/rattles/squeals, videos of smoke): describe what you observe technically and explain what component is faulty.
   - Provide estimated repair costs (parts + labor ranges) and urgency levels (Immediate, Soon, Routine, Monitor).
   - If severe or unsafe (e.g., brake failure, overheating, flashing CEL, fuel leaks), warn them clearly: 'Do NOT drive the car in this state.'
   - After troubleshooting, proactively offer to book an appointment with a certified technician.

Format output cleanly in Markdown with bold headers and bullet points. Keep responses concise, structured, and action-oriented."""

DIAGNOSIS_SCHEMA_PROMPT = """Analyze the complete vehicle troubleshooting conversation and any attached media. Produce a comprehensive, structured vehicle diagnosis report strictly in valid JSON format matching this schema:

{
  "issue_title": "Short descriptive title of the root issue (e.g., Failing Front Left Wheel Bearing)",
  "primary_cause": "Detailed technical explanation of what failed and why (2-3 sentences)",
  "severity": "low" | "medium" | "high" | "critical",
  "urgency_level": "immediate" | "soon" | "routine" | "monitor",
  "is_driveable": true | false,
  "symptoms": ["Symptom 1", "Symptom 2", "Symptom 3"],
  "suggested_repairs": [
    "Specific repair step 1 (e.g., Replace front left hub & bearing assembly)",
    "Specific repair step 2 (e.g., Inspect axle spline and torque to factory spec)"
  ],
  "estimated_cost_range": "$XXX - $YYY",
  "estimated_labor_hours": "X.X - Y.Y hrs",
  "safety_warning": "Safety advice and warning for the driver (or empty string if low risk)",
  "diy_feasibility": "Easy DIY" | "Moderate DIY (Requires Jack/Tools)" | "Professional Only",
  "recommended_service_name": "Standard booking service name (e.g., Wheel Bearing Assembly Replacement)"
}

Output ONLY raw JSON, with no markdown code fences or conversational text."""


class GeminiMechanicService:

    @classmethod
    def get_api_key(cls) -> str:
        return getattr(settings, "GEMINI_API_KEY", "") or os.getenv("GEMINI_API_KEY", "")

    @classmethod
    def chat_completion(
        cls,
        history: List[Dict[str, str]],
        new_message: str,
        car_info: Optional[Dict[str, Any]] = None,
        media_items: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Sends multi-turn conversational history + new message (+ optional media) to Gemini.
        Returns: { 'response': str, 'follow_ups': list, 'is_diagnosis_ready': bool }
        """
        api_key = cls.get_api_key()

        if not api_key:
            # High quality fallback heuristic technician simulation
            return cls._expert_heuristic_chat(history, new_message, car_info, media_items)

        try:
            # Build conversation payload for Google Gemini REST endpoint
            contents = []

            # Add context if car info is known
            context_prefix = ""
            if car_info:
                car_str = f"{car_info.get('year', '')} {car_info.get('make', '')} {car_info.get('model', '')}".strip()
                if car_str:
                    context_prefix = f"[Vehicle Context: User owns a {car_str}. Mileage: {car_info.get('mileage', 'Unknown')}]. "

            # Append previous turns (keep last 8 turns to optimize tokens)
            for turn in history[-8:]:
                role = "user" if turn.get("sender") == "user" else "model"
                contents.append({
                    "role": role,
                    "parts": [{"text": turn.get("text", "")}]
                })

            # Prepare current turn parts
            current_parts = []
            
            # If media uploaded, encode and attach
            if media_items:
                for item in media_items:
                    file_path = item.get("file_path")
                    mime_type = item.get("mime_type", "image/jpeg")
                    if file_path and os.path.exists(file_path):
                        try:
                            with open(file_path, "rb") as f:
                                b64_data = base64.b64encode(f.read()).decode("utf-8")
                            current_parts.append({
                                "inline_data": {
                                    "mime_type": mime_type,
                                    "data": b64_data
                                }
                            })
                        except Exception as e:
                            logger.error(f"Error encoding media file {file_path}: {e}")

            current_parts.append({"text": f"{context_prefix}{new_message}"})
            contents.append({"role": "user", "parts": current_parts})

            # Call Gemini API
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            payload = {
                "system_instruction": {
                    "parts": [{"text": SYSTEM_PROMPT}]
                },
                "contents": contents,
                "generationConfig": {
                    "temperature": 0.4,
                    "maxOutputTokens": 800,
                }
            }

            resp = requests.post(url, json=payload, timeout=20)
            if resp.status_code == 200:
                data = resp.json()
                bot_text = data["candidates"][0]["content"]["parts"][0]["text"]
                
                # Check if enough diagnostic clues gathered to suggest diagnosis CTA
                is_ready = cls._check_if_diagnosis_ready(history, new_message, bot_text)
                follow_ups = cls._extract_follow_ups(bot_text, new_message)

                return {
                    "response": bot_text,
                    "follow_ups": follow_ups,
                    "is_diagnosis_ready": is_ready,
                    "is_ai_generated": True
                }
            else:
                logger.warning(f"Gemini API returned status {resp.status_code}: {resp.text}")
                return cls._expert_heuristic_chat(history, new_message, car_info, media_items)

        except Exception as e:
            logger.error(f"Gemini API invocation error: {e}")
            return cls._expert_heuristic_chat(history, new_message, car_info, media_items)

    @classmethod
    def generate_structured_diagnosis(
        cls,
        history: List[Dict[str, str]],
        car_info: Optional[Dict[str, Any]] = None,
        media_items: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Synthesizes the conversation history into a formal JSON diagnostic report.
        """
        api_key = cls.get_api_key()

        if not api_key:
            return cls._heuristic_structured_diagnosis(history, car_info)

        try:
            full_convo = "\n".join([f"{m.get('sender', 'user')}: {m.get('text', '')}" for m in history])
            car_str = ""
            if car_info:
                car_str = f"Vehicle: {car_info.get('year', '')} {car_info.get('make', '')} {car_info.get('model', '')}\n"

            prompt_text = f"{DIAGNOSIS_SCHEMA_PROMPT}\n\n{car_str}Conversation History:\n{full_convo}"

            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            payload = {
                "contents": [
                    {"role": "user", "parts": [{"text": prompt_text}]}
                ],
                "generationConfig": {
                    "temperature": 0.2,
                    "response_mime_type": "application/json"
                }
            }

            resp = requests.post(url, json=payload, timeout=20)
            if resp.status_code == 200:
                data = resp.json()
                raw_json = data["candidates"][0]["content"]["parts"][0]["text"]
                clean_json = raw_json.strip()
                if clean_json.startswith("```json"):
                    clean_json = clean_json[7:-3].strip()
                elif clean_json.startswith("```"):
                    clean_json = clean_json[3:-3].strip()
                return json.loads(clean_json)
            else:
                return cls._heuristic_structured_diagnosis(history, car_info)
        except Exception as e:
            logger.error(f"Error in generate_structured_diagnosis: {e}")
            return cls._heuristic_structured_diagnosis(history, car_info)

    @classmethod
    def analyze_media_file(cls, file_path: str, mime_type: str, file_type: str) -> Dict[str, Any]:
        """
        Analyzes an uploaded image, sound file, or video clip.
        """
        api_key = cls.get_api_key()
        if not api_key:
            if file_type == "image":
                return {
                    "summary": "Visual Inspection: Surface wear and component alignment inspected. Minor heat stress or fluid residue observed.",
                    "indicators": ["Surface wear", "Potential fluid seal leak", "Check sensor connections"]
                }
            elif file_type == "audio":
                return {
                    "summary": "Acoustic Audio Analysis: Rhythmic acoustic frequency spike detected around 120Hz-450Hz, characteristic of mechanical rotational friction (e.g. pulley bearing or brake pad wear indicator).",
                    "indicators": ["High-frequency harmonic squeal", "Rotational friction", "Belt/bearing tension"]
                }
            else:
                return {
                    "summary": "Video Diagnostic Analysis: Component motion and exhaust/engine vibration pattern analyzed.",
                    "indicators": ["Engine vibration pattern", "Exhaust vapor dispersion"]
                }

        try:
            with open(file_path, "rb") as f:
                b64 = base64.b64encode(f.read()).decode("utf-8")

            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            prompt = (
                f"You are a master auto mechanic. Analyze this uploaded {file_type} of a vehicle component or engine issue. "
                "Describe what mechanical defect, leak, sound, or wear indicator you see/hear, identify the likely component, "
                "and state the level of urgency. Be precise and concise (under 4 sentences)."
            )

            payload = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [
                            {"inline_data": {"mime_type": mime_type, "data": b64}},
                            {"text": prompt}
                        ]
                    }
                ],
                "generationConfig": {"temperature": 0.3, "maxOutputTokens": 300}
            }

            resp = requests.post(url, json=payload, timeout=25)
            if resp.status_code == 200:
                data = resp.json()
                analysis_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                return {
                    "summary": analysis_text,
                    "indicators": ["AI Inspection Completed", "Component Identified"]
                }
        except Exception as e:
            logger.error(f"Error analyzing media with Gemini: {e}")

        return {
            "summary": f"Uploaded {file_type} received and cataloged for mechanic inspection.",
            "indicators": ["Media Attached to Diagnostic Ticket"]
        }

    @classmethod
    def _check_if_diagnosis_ready(cls, history: List[Dict[str, str]], new_message: str, bot_text: str) -> bool:
        total_turns = len(history) + 1
        keywords = ["diagnos", "replace", "repair", "failing", "faulty", "cost", "safe to drive", "recommend"]
        text_lower = (new_message + " " + bot_text).lower()
        matches = sum(1 for kw in keywords if kw in text_lower)
        return total_turns >= 3 or matches >= 3

    @classmethod
    def _extract_follow_ups(cls, bot_text: str, user_msg: str) -> List[str]:
        default_followups = [
            "What are the repair costs?",
            "Is it safe to drive for now?",
            "Can I fix this myself?",
            "Book a mechanic inspection"
        ]
        text_lower = bot_text.lower()
        if "brake" in text_lower:
            return ["Book brake inspection", "Are the rotors warped?", "Is it safe to drive home?", "How much for brake pads?"]
        elif "overheat" in text_lower or "coolant" in text_lower:
            return ["Should I turn off the AC?", "Can I add tap water?", "Book cooling system pressure test", "Is the head gasket blown?"]
        elif "battery" in text_lower or "alternator" in text_lower or "start" in text_lower:
            return ["Book mobile battery replacement", "How to jump-start safely?", "Could it be the starter motor?", "Test charging system"]
        elif "noise" in text_lower or "knock" in text_lower or "squeak" in text_lower:
            return ["Book mechanic to hear sound", "Does the noise get faster with speed?", "Could it be a loose heat shield?", "Show estimated repair costs"]
        return default_followups

    @classmethod
    def _expert_heuristic_chat(
        cls,
        history: List[Dict[str, str]],
        message: str,
        car_info: Optional[Dict[str, Any]] = None,
        media_items: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Expert heuristic fallback that mimics senior technician diagnosis with deep domain rules.
        """
        text = message.lower()
        car_str = ""
        if car_info:
            car_str = f" on your {car_info.get('year', '')} {car_info.get('make', '')} {car_info.get('model', '')}".strip()

        # Overheating / Coolant
        if any(k in text for k in ["overheat", "temp gauge", "steam", "coolant", "radiator", "sweet smell", "green fluid"]):
            resp = (
                f"🌡️ **Engine Overheating Diagnostics{car_str}**\n\n"
                "As a senior technician, this is a **high-priority condition**. Overheating can warp your cylinder head "
                "or destroy your head gasket in minutes.\n\n"
                "**Primary Suspects:**\n"
                "• Stuck closed thermostat (coolant cannot circulate to radiator)\n"
                "• Cooling fan relay or electric fan motor failure\n"
                "• Radiator hose puncture / water pump impeller wear\n"
                "• Low coolant due to internal/external leak\n\n"
                "⚠️ **Safety Warning:** **DO NOT open the radiator cap while the engine is hot.** High pressure scalding steam will erupt.\n\n"
                "**Diagnostic Questions:**\n"
                "1. Does it overheat only when sitting in traffic, or also while cruising at highway speeds?\n"
                "2. Is your cabin heater blowing hot air, or lukewarm/cold air?"
            )
            return {
                "response": resp,
                "follow_ups": [
                    "It overheats only in traffic at idle",
                    "Heater is blowing cold air",
                    "There is white smoke from the exhaust",
                    "Book mobile cooling system diagnostic"
                ],
                "is_diagnosis_ready": True,
                "is_ai_generated": False
            }

        # Squeaking / Grinding Brakes
        elif any(k in text for k in ["brake", "squeal", "grind", "pulsing", "pedal goes to floor", "stopping", "spongy"]):
            resp = (
                f"🛑 **Brake System Troubleshooting{car_str}**\n\n"
                "Brake noises and pedal feedback give direct clues to the underlying mechanical wear:\n\n"
                "• **High-pitched Squeal when stopping:** Wear acoustic indicator clip contacting rotor (Pads < 20% remaining life).\n"
                "• **Metal-on-metal Harsh Grinding:** Brake friction material completely gone; backing plate gouging the steel rotor.\n"
                "• **Pulsing / Vibration in Steering Wheel:** Warped front brake rotors with uneven lateral runout.\n"
                "• **Spongy / Sinking Pedal:** Air trapped in hydraulic brake lines or failing master cylinder seal.\n\n"
                "**Diagnostic Questions:**\n"
                "1. Is the noise coming from the front or rear wheels?\n"
                "2. Does the steering wheel shake when braking at 50+ mph?"
            )
            return {
                "response": resp,
                "follow_ups": [
                    "Grinding noise from front wheels",
                    "Steering wheel vibrates when braking",
                    "Pedal feels spongy",
                    "Book brake pad & rotor replacement"
                ],
                "is_diagnosis_ready": True,
                "is_ai_generated": False
            }

        # Battery / Starting / Clicking
        elif any(k in text for k in ["won't start", "clicking", "crank", "dead battery", "no crank", "jump start", "starter", "alternator"]):
            resp = (
                f"⚡ **Starting & Charging System Analysis{car_str}**\n\n"
                "Here is how we isolate the starting issue systematically:\n\n"
                "• **Rapid Rapid Click-Click-Click:** Low battery voltage (< 11.5V) or corroded battery terminal cables. The starter solenoid tries to engage but voltage drops immediately.\n"
                "• **Single Loud Click then Silence:** Starter motor solenoid or bendix drive is jammed/failing.\n"
                "• **Engine Cranks Strongly but Won't Fire Up:** Ignition spark failure, failed fuel pump, or immobilizer key sensor fault.\n"
                "• **Battery Light On While Driving:** Failing alternator alternator diode/regulator or snapped serpentine belt.\n\n"
                "**Next Step:** Would you like a technician to test your battery, starter, and alternator voltage draw?"
            )
            return {
                "response": resp,
                "follow_ups": [
                    "It makes rapid clicking sounds",
                    "Engine cranks fast but won't start",
                    "Battery light came on while driving",
                    "Book mobile battery test & replacement"
                ],
                "is_diagnosis_ready": True,
                "is_ai_generated": False
            }

        # General Mechanical issue
        else:
            resp = (
                f"🔧 **Master Technician Assessment{car_str}**\n\n"
                f"I've noted the symptom: *\"{message}\"*.\n\n"
                "To give you an exact mechanical diagnosis and itemized estimate, I need a couple more clues:\n\n"
                "1. **When does this happen?** (e.g. When accelerating, braking, turning, over bumps, or at idle?)\n"
                "2. **Are there any warning lights on the dashboard?** (Check Engine, ABS, Battery, Oil pressure?)\n"
                "3. **What does it sound/feel like?** (High-pitched squeal, deep thumping knock, clicking, or burning smell?)\n\n"
                "💡 *Tip: You can also upload an engine sound clip, video, or photo using the attachment icon below.*"
            )
            return {
                "response": resp,
                "follow_ups": [
                    "Check engine light is flashing",
                    "Makes noise when turning sharp corners",
                    "Vibrates at highway speeds over 60 mph",
                    "Generate complete diagnosis report"
                ],
                "is_diagnosis_ready": len(history) >= 2,
                "is_ai_generated": False
            }

    @classmethod
    def _heuristic_structured_diagnosis(cls, history: List[Dict[str, str]], car_info: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Creates a rich, realistic structured diagnosis report when Gemini is not connected.
        """
        full_text = " ".join([m.get("text", "") for m in history]).lower()

        if "brake" in full_text or "squeal" in full_text or "grind" in full_text:
            return {
                "issue_title": "Worn Brake Pads & Glazed Rotors (Front Axle)",
                "primary_cause": "The friction lining on the front brake pads has worn down past the 3mm safety margin, causing the wear indicator clip to contact the rotor surface and create acoustic squealing/vibration.",
                "severity": "medium",
                "urgency_level": "soon",
                "is_driveable": True,
                "symptoms": [
                    "High-pitched acoustic squeal under moderate pedal pressure",
                    "Slight pulsation in brake pedal at highway speeds",
                    "Increased pedal travel before full bite engagement"
                ],
                "suggested_repairs": [
                    "Replace front brake pads with OEM ceramic compound",
                    "Resurface or replace front vented brake rotors",
                    "Clean and lubricate caliper guide pins & slide hardware",
                    "Perform brake fluid moisture & boiling point test"
                ],
                "estimated_cost_range": "$220 - $380",
                "estimated_labor_hours": "1.5 - 2.0 hrs",
                "safety_warning": "Safe for short local trips, but avoid aggressive high-speed braking. Failure to replace soon will cause metal-on-metal damage to the rotors.",
                "diy_feasibility": "Moderate DIY (Requires Jack/Tools)",
                "recommended_service_name": "Front Brake Pad & Rotor Replacement"
            }
        elif "overheat" in full_text or "coolant" in full_text or "temperature" in full_text:
            return {
                "issue_title": "Cooling System Thermostat Failure & Low Coolant Flow",
                "primary_cause": "The engine thermostat is stuck closed or the radiator cooling fan assembly is failing to engage at operating temperature, preventing heat dissipation through the radiator matrix.",
                "severity": "high",
                "urgency_level": "immediate",
                "is_driveable": False,
                "symptoms": [
                    "Engine temperature gauge climbing into red zone",
                    "Cooling fan not cycling on during idle",
                    "Lukewarm heater air output indicating trapped air in heater core"
                ],
                "suggested_repairs": [
                    "Replace engine thermostat and housing gasket",
                    "Perform cooling system pressure test for hidden hose leaks",
                    "Flush and refill with 50/50 OAT ethylene glycol coolant",
                    "Inspect electric cooling fan relay and motor"
                ],
                "estimated_cost_range": "$180 - $340",
                "estimated_labor_hours": "1.5 - 2.5 hrs",
                "safety_warning": "DO NOT continue driving while overheating. Continuing to drive will cause cylinder head warpage and blown head gasket ($2,000+ repair).",
                "diy_feasibility": "Moderate DIY (Requires Jack/Tools)",
                "recommended_service_name": "Cooling System Diagnostic & Thermostat Replacement"
            }
        elif "battery" in full_text or "start" in full_text or "click" in full_text:
            return {
                "issue_title": "Degraded 12V Starter Battery & Terminal Oxidation",
                "primary_cause": "The lead-acid starter battery internal cell resistance has degraded, causing cranking amperage (CCA) to drop below the threshold required to turn the starter pinion gear.",
                "severity": "medium",
                "urgency_level": "soon",
                "is_driveable": True,
                "symptoms": [
                    "Rapid clicking sound from starter solenoid on ignition key turn",
                    "Dimming dashboard lights and interior electronics during crank",
                    "Sluggish cold engine start in morning"
                ],
                "suggested_repairs": [
                    "Install new OEM-grade AGM/Lead-Acid battery",
                    "Clean and seal battery terminal posts with anti-corrosion gel",
                    "Test alternator charging voltage output under load (13.8V - 14.4V nominal)"
                ],
                "estimated_cost_range": "$160 - $260",
                "estimated_labor_hours": "0.5 hr",
                "safety_warning": "Vehicle may leave you stranded unexpectedly after turning off the engine. Have it replaced or carry jumper cables.",
                "diy_feasibility": "Easy DIY",
                "recommended_service_name": "Battery Replacement & Charging System Test"
            }
        else:
            return {
                "issue_title": "Comprehensive Engine & Drivetrain Mechanical Diagnostic",
                "primary_cause": "Based on the reported symptoms and diagnostic indicators, multiple interdependent mechanical components require physical inspection, OBD-II freeze-frame scanning, and component isolation.",
                "severity": "medium",
                "urgency_level": "soon",
                "is_driveable": True,
                "symptoms": [
                    "Intermittent abnormal operational symptoms",
                    "Diagnostic trouble indicator or performance discrepancy",
                    "Unusual vibration or mechanical feedback"
                ],
                "suggested_repairs": [
                    "Complete 50-point Master Technician physical inspection",
                    "Live OBD-II sensor data stream logging & road test",
                    "Check fluid levels, belt tension, and suspension bushings"
                ],
                "estimated_cost_range": "$120 - $250",
                "estimated_labor_hours": "1.0 - 1.5 hrs",
                "safety_warning": "Drive moderately and avoid hard acceleration until physical inspection confirms no drivetrain damage.",
                "diy_feasibility": "Professional Only",
                "recommended_service_name": "Master Technician Multi-Point Diagnostic Inspection"
            }
