export type ServiceType =
  | 'basic_service'
  | 'full_service'
  | 'strip_and_rebuild'
  | 'bosch_diagnostics';

export const SERVICE_LABELS: Record<ServiceType, string> = {
  basic_service: 'Basic Service',
  full_service: 'Full Service',
  strip_and_rebuild: 'Strip and Rebuild',
  bosch_diagnostics: 'Bosch Diagnostics',
};

export type BookingStatus = 'pending' | 'ready' | 'complete';

export interface Customer {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  opt_out_reminders?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  customer_id: string;
  service_type: ServiceType;
  date: string;
  bike_details: string;
  status: BookingStatus;
  notes: string | null;
  completed_at?: string;
  reminder_sent_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BookingWithCustomer extends Booking {
  customer: Customer;
}

export interface BookingFormData {
  name: string;
  phone: string;
  email?: string;
  service_type: ServiceType;
  date: string;
  bike_details: string;
}

export interface MessageLog {
  id: string;
  booking_id?: string;
  customer_id: string;
  message_type: 'reminder' | 'confirmation' | 'ready';
  recipient_phone: string;
  template_name?: string;
  success: boolean;
  error_message?: string;
  whatsapp_message_id?: string;
  api_response?: Record<string, unknown>;
  estimated_cost?: number;
  created_at: string;
}

export interface AvailabilitySettings {
  id: string;
  exclude_weekends: boolean;
  exclude_sundays: boolean;
  max_services_per_day: number | null;
  created_at: string;
  updated_at: string;
}

export interface ExcludedDate {
  id: string;
  start_date: string; // ISO date string (YYYY-MM-DD)
  end_date: string | null; // ISO date string or null for single dates
  reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExcludedDateRange {
  start_date: string;
  end_date?: string; // Optional, if omitted = single date
  reason?: string;
}

export interface AvailabilitySettingsResponse {
  settings: AvailabilitySettings;
  excludedDates: ExcludedDate[];
  bookingCounts?: { [date: string]: number };
}
