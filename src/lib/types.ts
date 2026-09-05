export type BookingStatus = 'Pending' | 'Approved' | 'CheckedIn' | 'Receiving' | 'Completed' | 'Rejected' | 'Cancelled';

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
  vehicle_type?: string | null;
  cargo_type?: string | null;
  status: BookingStatus;
  notes?: string | null;
  created_at: string;
  admin_action_date?: string | null;
  admin_action_by?: string | null;
  admin_reason?: string | null;
  actual_pallet_count?: number | null;
  receiving_notes?: string | null;
  received_by?: string | null;
  receiving_completed_at?: string | null;
  photo_url?: string | null;
  receiving_photo_url?: string | null;
}

export interface TimeSlot {
  id: number;
  slot_name: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  is_active: number;
  order_index?: number;
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

export interface SystemSettings {
  company_name: string;
  contact_phone: string;
  contact_phone_label: string;
  contact_phone_sub?: string;
  contact_phone_sub_label?: string;
  contact_line_id: string;
  contact_line_url: string;
  booking_notice_text: string;
  booking_announcement?: string;
  booking_announcement_active: boolean;
  warehouse_address: string;
  ticket_instruction?: string;
  admin_announcement?: string;
  admin_announcement_active: boolean;
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  company_name: 'บริษัท พีทีเอ็น ฟาร์มาเซ็นเตอร์ จำกัด (พัฒนาเภสัช)',
  contact_phone: '099-378-7463',
  contact_phone_label: 'แผนกรับสินค้า',
  contact_phone_sub: '',
  contact_phone_sub_label: 'ติดต่อเพิ่มเติม',
  contact_line_id: 'ptnexpress',
  contact_line_url: 'https://line.me/ti/p/~ptnexpress',
  booking_notice_text: 'คลังเปิดรับสินค้าจันทร์ - เสาร์ (หยุดวันอาทิตย์) ล่วงหน้าได้ 14 วัน',
  booking_announcement: '',
  booking_announcement_active: false,
  warehouse_address: 'บริษัท พีทีเอ็น ฟาร์มาเซ็นเตอร์ จำกัด (พัฒนาเภสัช)',
  ticket_instruction: 'กรุณานำรถและสินค้าเข้าส่งตามวันและเวลาที่ระบุ พร้อมแสดงบัตรคิวและ QR Code นี้ต่อเจ้าหน้าที่รักษาความปลอดภัยและฝ่ายรับสินค้า',
  admin_announcement: '',
  admin_announcement_active: false,
};
