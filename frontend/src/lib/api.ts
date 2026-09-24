import {
  ConversationSession,
  ChatMessage,
  UploadedMedia,
  DiagnosisReport,
  MechanicBooking,
  ServiceItem
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

export async function checkHealth(): Promise<{ status: string; gemini_configured: boolean }> {
  try {
    const res = await fetch(`${API_BASE_URL}/health/`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Backend health check warning:", err);
    return { status: "offline", gemini_configured: false };
  }
}

export async function getSessions(): Promise<ConversationSession[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/sessions/`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load sessions");
    const data = await res.json();
    return data.sessions || [];
  } catch (err) {
    console.error("Error fetching sessions:", err);
    return [];
  }
}

export async function createSession(carDetails?: {
  make?: string;
  model?: string;
  year?: number;
  mileage?: string;
  session_title?: string;
}): Promise<ConversationSession> {
  const res = await fetch(`${API_BASE_URL}/sessions/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(carDetails || {}),
  });
  if (!res.ok) throw new Error("Failed to create new session");
  return await res.json();
}

export async function getSessionHistory(sessionId: string): Promise<ConversationSession> {
  const res = await fetch(`${API_BASE_URL}/history/${sessionId}/`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load session history");
  return await res.json();
}

export async function sendChatMessage(payload: {
  session_id?: string;
  message: string;
  media_id?: string;
}): Promise<{
  session_id: string;
  response: string;
  sender: "bot";
  message_id: string;
  follow_ups: string[];
  is_diagnosis_ready: boolean;
  diagnosis_preview?: any;
  is_ai_generated: boolean;
  triage_tag: string;
  car_context: {
    year?: number | null;
    make?: string | null;
    model?: string | null;
    mileage?: string | null;
  };
}> {
  const res = await fetch(`${API_BASE_URL}/chat/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to send chat message");
  }
  return await res.json();
}

export async function uploadMediaFile(
  file: File,
  sessionId?: string,
  mediaType?: "image" | "audio" | "video"
): Promise<UploadedMedia> {
  const formData = new FormData();
  formData.append("file", file);
  if (sessionId) formData.append("session_id", sessionId);
  if (mediaType) formData.append("media_type", mediaType);

  const res = await fetch(`${API_BASE_URL}/upload/`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to upload media file");
  }
  return await res.json();
}

export async function generateDiagnosis(sessionId: string): Promise<DiagnosisReport> {
  const res = await fetch(`${API_BASE_URL}/diagnosis/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to generate diagnosis");
  }
  return await res.json();
}

export async function createBooking(bookingData: {
  session_id?: string;
  diagnosis_id?: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  car_make: string;
  car_model: string;
  car_year: number;
  car_mileage?: string;
  service_requested: string;
  service_type: string;
  preferred_date: string;
  preferred_time: string;
  customer_address?: string;
  notes?: string;
  estimated_cost?: string;
}): Promise<{
  success: boolean;
  booking_id: string;
  booking_details: MechanicBooking;
  confirmation_message: string;
}> {
  const res = await fetch(`${API_BASE_URL}/booking/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bookingData),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to schedule mechanic booking");
  }
  return await res.json();
}

export async function getBookingById(bookingId: string): Promise<MechanicBooking> {
  const res = await fetch(`${API_BASE_URL}/booking/${bookingId}/`, { cache: "no-store" });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Booking not found");
  }
  return await res.json();
}

export async function getServices(): Promise<ServiceItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/services/`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.services || [];
  } catch {
    return [];
  }
}
