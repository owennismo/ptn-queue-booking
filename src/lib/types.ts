export type BookingStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface Booking {
  booking_id: string;
  user_phone: string;
  carrier_name: string;
  client_name: string;
  pallet_count: number;
  vehicle_count: number;
  requested_date: string; // YYYY-MM-DD
  requested_time: string; // e.g. "09:30 - 10:30"
  driver_name?: string | null;
  license_plate?: string | null;
  status: BookingStatus;
  notes?: string | null;
  created_at: string;
  admin_action_date?: string | null;
  admin_action_by?: string | null;
  admin_reason?: string | null;
}

export interface TimeSlot {
  id: number;
  slot_name: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  is_active: number;
  booked_count?: number;
  available_slots?: number;
}

export interface BlockedDate {
  id: number;
  blocked_date: string;
  reason: string;
  created_at: string;
}

export interface AvailabilityResponse {
  date: string;
  is_blocked: boolean;
  block_reason?: string | null;
  slots: Array<{
    id: number;
    slot_name: string;
    start_time: string;
    end_time: string;
    max_capacity: number;
    booked_count: number;
    available_slots: number;
    is_available: boolean;
    is_active?: number;
  }>;
}

export interface DailyForecast {
  today_date: string;
  tomorrow_date: string;
  today_total: number;
  today_pending: number;
  today_approved: number;
  tomorrow_total: number;
  tomorrow_pending: number;
  tomorrow_approved: number;
  total_pending_all: number;
  notification_message?: string;
}

export type StaffRole = 'super_admin' | 'warehouse_officer' | 'security_gate';

export interface StaffUser {
  id: string;
  username: string;
  full_name: string;
  pin: string;
  role: StaffRole;
  role_name: string;
  is_active: number;
  created_at: string;
  last_login?: string | null;
}
