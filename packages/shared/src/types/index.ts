export interface User {
  id: string;
  email: string;
  display_name: string;
  status: 'pending' | 'approved' | 'denied' | 'suspended';
  role: 'user' | 'admin';
  tier: 'free' | 'paid';
  user_type: 'clinic' | 'patient';
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  clinic_name: string;
  clinic_address: string;
  clinic_phone: string;
  clinic_email: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Template {
  id: string;
  user_id: string;
  hotkey: number;
  name: string;
  sessions_per_week: number;
  duration_weeks: number;
  default_time: string;
  is_active: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Schedule {
  id: string;
  user_id: string;
  template_id: string | null;
  patient_initials: string;
  patient_alias: string;
  start_date: string;
  end_date: string;
  sessions_per_week: number;
  duration_weeks: number;
  notes: string;
  view_preference: 'table' | 'calendar';
  share_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  schedule_id: string;
  appointment_date: string;
  appointment_time: string;
  provider_name: string;
  reminder_sent: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  display_name?: string;
}

export interface CreateScheduleRequest {
  template_id?: string;
  patient_initials: string;
  start_date: string;
  sessions_per_week: number;
  duration_weeks: number;
  notes?: string;
}

export interface AliasRequest {
  initials: string;
}

export interface AliasResponse {
  alias: string;
  initials: string;
}

export interface PatientCode {
  id: string;
  schedule_id: string;
  code: string;
  created_by: string;
  created_at: string;
  expires_at: string | null;
}

export interface PatientScheduleLink {
  id: string;
  patient_id: string;
  schedule_id: string;
  linked_at: string;
}
