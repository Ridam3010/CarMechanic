# 🏛️ Architecture & AI Cost Optimization Explanation

## 1. System Overview

The **GearHead AI Car Mechanic** platform is engineered to balance state-of-the-art multimodal AI diagnostic capabilities with cost-effective, deterministic backend engineering.

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Frontend                     │
│  (Chat Stream, Media Upload, Diagnosis Card, Booking)   │
└────────────────────────────┬────────────────────────────┘
                             │  REST API (JSON / FormData)
┌────────────────────────────▼────────────────────────────┐
│               Django REST Framework API                 │
├────────────────────────────┬────────────────────────────┤
│   Triage & Filter Engine   │   Diagnostic State Machine │
│   (Off-Topic, DTC, Quotes) │   (Entity & Symptom Match) │
└─────────────┬──────────────┴──────────────┬─────────────┘
              │                             │
    [Deterministic Query]         [Complex AI Query]
              │                             │
              ▼                             ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│  Local Rules Engine (0$)  │ │ Google Gemini 1.5 Flash   │
│  - OBD-II DTC Database    │ │ - Multimodal Image/Sound  │
│  - Non-car Query Reject   │ │ - Senior Mechanic Persona │
│  - Service Price Matrix   │ │ - JSON Diagnosis Schema   │
└─────────────┬─────────────┘ └─────────────┬─────────────┘
              │                             │
              └──────────────┬──────────────┘
                             │
┌────────────────────────────▼────────────────────────────┐
│                 SQLite Database Models                  │
│   (Sessions, Messages, Uploads, Reports, Bookings)      │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Minimizing Unnecessary AI & API Usage Strategy

A primary requirement of this project is to **minimize unnecessary AI/API usage and use traditional backend logic wherever possible**. Here is the multi-layered strategy implemented:

### Layer 1: Deterministic Non-Car / Off-Topic Gatekeeper
- Non-automotive queries (e.g. coding requests, cooking recipes, general chit-chat, school homework, sports trivia) are intercepted via regex patterns and keyword whitelists.
- The system returns an immediate polite senior technician redirect **without invoking Gemini API**, saving 100% of LLM token costs for off-topic queries.

### Layer 2: Instant OBD-II Diagnostic Trouble Code (DTC) Database
- When users submit diagnostic trouble codes (e.g., `P0300`, `P0420`, `P0171`, `P0128`, `P0442`, `P0500`), the backend checks a built-in dictionary of verified automotive trouble codes.
- It returns severity levels, potential causes, and repair costs locally, creating an instant response and avoiding unnecessary token usage.

### Layer 3: Standard Service Catalog & Fixed Pricing Quotes
- Routine service inquiries ("How much for a synthetic oil change?", "Cost of brake replacement") are matched against the local `STANDARD_SERVICES` catalog with pre-calculated benchmark estimates.

### Layer 4: Context Window Compression
- For complex multi-turn conversations requiring Gemini reasoning, only the last **8 relevant turns** are sent to the model along with condensed vehicle context, preventing token bloat.

### Layer 5: Graceful Heuristic Fallback
- If Gemini API is offline, experiencing rate-limiting, or lacks an API key, the system seamlessly uses an internal heuristic domain engine with 0 downtime.

---

## 3. Database Schema & Data Models

The SQLite database uses 5 interconnected models:

1. **`ConversationSession`**:
   - `id`: UUID primary key
   - `session_title`: Auto-generated title (e.g., "2019 Toyota Camry Diagnostics")
   - `car_make`, `car_model`, `car_year`, `car_mileage`: Extracted car attributes
   - `status`: `active`, `diagnosed`, `booked`, `closed`

2. **`ChatMessage`**:
   - `id`: UUID
   - `session`: Foreign Key (`ConversationSession`)
   - `sender`: `user`, `bot`, `system`
   - `text`: Markdown content
   - `is_ai_generated`: Boolean (indicates rule-based vs LLM response)
   - `triage_tag`: Tag categorizing query type (`dtc_lookup`, `gemini_ai`, `off_topic_rejected`, etc.)
   - `media_url`: Optional media link
   - `suggested_actions`: Follow-up question chips

3. **`UploadedMedia`**:
   - `id`: UUID
   - `session`: Foreign Key
   - `file`: File path on media disk
   - `file_type`: `image`, `audio`, `video`
   - `original_filename`, `file_size`, `mime_type`
   - `ai_analysis`: Vision/acoustic summary

4. **`DiagnosisReport`**:
   - `id`: UUID
   - `session`: OneToOne (`ConversationSession`)
   - `issue_title`: Technical summary
   - `primary_cause`: Root cause explanation
   - `severity`: `low`, `medium`, `high`, `critical`
   - `urgency_level`: `immediate`, `soon`, `routine`, `monitor`
   - `is_driveable`: Boolean
   - `symptoms`, `suggested_repairs`: JSON arrays
   - `estimated_cost_range`, `estimated_labor_hours`
   - `safety_warning`: Safety advisory

5. **`MechanicBooking`**:
   - `id`: Unique human-readable code (e.g. `BK-762837`)
   - `session`, `diagnosis`: Foreign Keys
   - `customer_name`, `customer_phone`, `customer_email`, `customer_address`
   - `car_make`, `car_model`, `car_year`, `car_mileage`
   - `service_requested`, `service_type` (`shop_visit`, `mobile_mechanic`, `emergency_towing`)
   - `preferred_date`, `preferred_time`, `notes`, `estimated_cost`, `status`

---

## 4. API Error Handling & Resilience
- **Input Validation:** All endpoints validate required parameters and return appropriate HTTP 400 status codes with descriptive error messages.
- **Media Type Verification:** File uploads detect and validate MIME types for images, audio formats, and video containers up to 50MB.
- **CORS Support:** Full cross-origin support enabled for local development and Vercel production hosting.
