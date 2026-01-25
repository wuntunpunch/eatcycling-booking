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
