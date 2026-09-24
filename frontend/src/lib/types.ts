export type MessageSender = "user" | "bot" | "system";

export type SeverityLevel = "low" | "medium" | "high" | "critical";
export type UrgencyLevel = "immediate" | "soon" | "routine" | "monitor";
export type ServiceType = "shop_visit" | "mobile_mechanic" | "emergency_towing";
export type BookingStatus = "confirmed" | "in_progress" | "completed" | "cancelled";

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  text: string;
  is_ai_generated?: boolean;
  triage_tag?: string;
  media_url?: string | null;
  media_type?: "image" | "audio" | "video" | string | null;
  suggested_actions?: string[];
  created_at: string;
}

export interface UploadedMedia {
  media_id: string;
  session_id?: string | null;
  file_url: string;
  file_type: "image" | "audio" | "video" | string;
  original_filename: string;
  file_size: number;
  analysis?: string;
  indicators?: string[];
}

export interface DiagnosisReport {
  id: string;
  session?: string;
  issue_title: string;
  primary_cause: string;
  severity: SeverityLevel;
  urgency_level: UrgencyLevel;
  is_driveable: boolean;
  symptoms: string[];
  suggested_repairs: string[];
  estimated_cost_range: string;
  estimated_labor_hours: string;
  safety_warning?: string;
  diy_feasibility?: string;
  recommended_service_name: string;
  created_at: string;
  cta_booking?: {
    recommended_service: string;
    estimated_cost: string;
    car_make: string;
    car_model: string;
    car_year: number | string;
    severity: SeverityLevel;
    is_driveable: boolean;
  };
}

export interface MechanicBooking {
  id: string;
  session?: string | null;
  diagnosis?: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  car_make: string;
  car_model: string;
  car_year: number;
  car_mileage?: string;
  service_requested: string;
  service_type: ServiceType;
  service_type_display?: string;
  preferred_date: string;
  preferred_time: string;
  customer_address?: string;
  notes?: string;
  estimated_cost?: string;
  status: BookingStatus;
  status_display?: string;
  created_at: string;
  diagnosis_summary?: {
    issue_title: string;
    severity: SeverityLevel;
    urgency_level: UrgencyLevel;
    is_driveable: boolean;
    estimated_cost_range: string;
    suggested_repairs: string[];
  };
}

export interface ConversationSession {
  id: string;
  session_title: string;
  car_make?: string | null;
  car_model?: string | null;
  car_year?: number | null;
  car_mileage?: string | null;
  status: "active" | "diagnosed" | "booked" | "closed";
  troubleshooting_stage?: string;
  created_at: string;
  updated_at: string;
  messages?: ChatMessage[];
  media_files?: UploadedMedia[];
  diagnosis?: DiagnosisReport | null;
  bookings?: MechanicBooking[];
}

export interface ServiceItem {
  id: string;
  name: string;
  price: string;
  duration: string;
  description: string;
}
