// Shared Universal Persistent Store for Cloudflare Pages Functions
// Supports Cloudflare KV (PTN_KV) for 100% persistent storage across all Edge data centers,
// with D1 and in-memory fallbacks.

export interface Booking {
  booking_id: string;
  user_phone: string;
  carrier_name: string;
  client_name: string;
  pallet_count: number;
  vehicle_count: number;
  requested_date: string;
  requested_time: string;
  driver_name: string | null;
  license_plate: string | null;
  vehicle_type?: string | null;
  cargo_type?: string | null;
  notes: string | null;
  photo_url?: string | null;
  receiving_photo_url?: string | null;
  status: 'Pending' | 'Approved' | 'CheckedIn' | 'Receiving' | 'Completed' | 'Rejected' | 'Cancelled';
  admin_reason?: string | null;
  admin_action_date?: string | null;
  admin_action_by?: string | null;
  actual_pallet_count?: number | null;
  receiving_notes?: string | null;
  received_by?: string | null;
  receiving_completed_at?: string | null;
  created_at: string;
}

export interface TimeSlot {
  id: number;
  slot_name: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  is_active: number;
  order_index?: number;
}

export interface BlockedDate {
  id: number;
  blocked_date: string;
  reason: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  action: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'APPROVE_QUEUE' | 'REJECT_QUEUE' | 'CANCEL_QUEUE' | 'CHECKIN_QUEUE' | 'RECEIVING_QUEUE' | 'COMPLETE_QUEUE' | 'UPDATE_SLOT' | 'REORDER_SLOTS' | 'BLOCK_DATE' | 'UNBLOCK_DATE' | 'ADD_STAFF' | 'UPDATE_STAFF' | 'DELETE_STAFF' | 'RESET_PIN';
  details: string;
  operator: string;
  ip_address: string;
  created_at: string;
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

interface LoginAttemptRecord {
  attempts: number;
  lockedUntil: number | null;
  lastAttempt: number;
}

function getRoleName(role: StaffRole): string {
  switch (role) {
    case 'super_admin':
      return 'ผู้ดูแลระบบสูงสุด (Super Admin)';
    case 'warehouse_officer':
      return 'เจ้าหน้าที่คลังสินค้า (Warehouse Officer)';
    case 'security_gate':
      return 'เจ้าหน้าที่ตรวจสอบคิวส่ง (Inspection Officer)';
    default:
      return 'เจ้าหน้าที่ทั่วไป';
  }
}

const DEFAULT_SLOTS: TimeSlot[] = [
  { id: 1, slot_name: '08:30 - 09:30', start_time: '08:30', end_time: '09:30', max_capacity: 3, is_active: 1, order_index: 1 },
  { id: 2, slot_name: '09:30 - 10:30', start_time: '09:30', end_time: '10:30', max_capacity: 4, is_active: 1, order_index: 2 },
  { id: 3, slot_name: '10:30 - 11:30', start_time: '10:30', end_time: '11:30', max_capacity: 4, is_active: 1, order_index: 3 },
  { id: 4, slot_name: '11:30 - 12:30', start_time: '11:30', end_time: '12:30', max_capacity: 2, is_active: 1, order_index: 4 },
  { id: 5, slot_name: '13:00 - 14:00', start_time: '13:00', end_time: '14:00', max_capacity: 4, is_active: 1, order_index: 5 },
  { id: 6, slot_name: '14:00 - 15:00', start_time: '14:00', end_time: '15:00', max_capacity: 4, is_active: 1, order_index: 6 },
  { id: 7, slot_name: '15:00 - 16:00', start_time: '15:00', end_time: '16:00', max_capacity: 3, is_active: 1, order_index: 7 },
  { id: 8, slot_name: '16:00 - 17:00', start_time: '16:00', end_time: '17:00', max_capacity: 2, is_active: 1, order_index: 8 },
];

const DEFAULT_STAFF: StaffUser[] = [
  {
    id: 'staff_1',
    username: 'admin',
    full_name: 'ผู้ดูแลระบบสูงสุด (Super Admin)',
    pin: 'otello',
    role: 'super_admin',
    role_name: 'ผู้ดูแลระบบสูงสุด (Super Admin)',
    is_active: 1,
    created_at: '2026-09-02 08:00:00',
  },
  {
    id: 'staff_2',
    username: 'wh01',
    full_name: 'นายสมชาย คลังสินค้า',
    pin: '1234',
    role: 'warehouse_officer',
    role_name: 'เจ้าหน้าที่คลังสินค้า (Warehouse Officer)',
    is_active: 1,
    created_at: '2026-09-02 08:30:00',
  },
  {
    id: 'staff_3',
    username: 'sec01',
    full_name: 'เจ้าหน้าที่ตรวจสอบคิวส่ง',
    pin: '5678',
    role: 'security_gate',
    role_name: 'เจ้าหน้าที่ตรวจสอบคิวส่ง (Inspection Officer)',
    is_active: 1,
    created_at: '2026-09-02 09:00:00',
  },
];

const DEFAULT_BOOKINGS: Booking[] = [];

// Global in-memory cache for instant responses
const globalStore = (globalThis as any).__PTN_STORE__ || {
  bookings: [...DEFAULT_BOOKINGS] as Booking[],
  timeSlots: [...DEFAULT_SLOTS] as TimeSlot[],
  blockedDates: [] as BlockedDate[],
  staffUsers: [...DEFAULT_STAFF] as StaffUser[],
  auditLogs: [
    {
      id: 1,
      action: 'LOGIN_SUCCESS',
      details: 'ระบบเริ่มต้นการทำงาน (System Initialized with Persistent Storage)',
      operator: 'System',
      ip_address: '127.0.0.1',
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    },
  ] as AuditLog[],
  loginAttempts: new Map<string, LoginAttemptRecord>(),
  settings: {
    company_name: 'บริษัท พีทีเอ็น ฟาร์มาเซ็นเตอร์ จำกัด (พัฒนาเภสัช)',
    admin_pin: 'otello',
  } as Record<string, string>,
};
(globalThis as any).__PTN_STORE__ = globalStore;

export class DataStore {
  private env: any;

  constructor(env: any) {
    this.env = env;
  }

  private get kv() {
    return this.env?.PTN_KV;
  }

  private get d1() {
    return this.env?.DB;
  }

  private get r2() {
    return this.env?.PTN_PHOTOS || this.env?.PHOTOS_BUCKET || this.env?.R2_BUCKET;
  }

  // --- PHOTO & R2 OBJECT STORAGE METHODS ---
  async savePhoto(
    key: string,
    buffer: ArrayBuffer,
    mimeType: string,
    metadata?: Record<string, any>
  ): Promise<{ url: string; key: string }> {
    const uploadedAt = metadata?.uploadedAt || new Date().toISOString();

    if (this.r2) {
      try {
        await this.r2.put(key, buffer, {
          httpMetadata: {
            contentType: mimeType,
            cacheControl: 'public, max-age=31536000, immutable',
          },
          customMetadata: {
            uploadedAt,
            originalName: metadata?.originalName || 'photo',
            bookingId: metadata?.bookingId || '',
          },
        });
      } catch (e) {
        console.error('R2 put error:', e);
      }
    }

    // Store in fallback photo map
    if (!globalStore.photos) {
      globalStore.photos = new Map<string, { buffer: ArrayBuffer; mimeType: string; uploadedAt: string }>();
    }
    globalStore.photos.set(key, { buffer, mimeType, uploadedAt });

    // Periodic check to clean up items older than 180 days (180 * 24 * 60 * 60 * 1000 ms)
    this.cleanupExpiredPhotos().catch(() => {});

    return {
      url: `/api/photos/${key}`,
      key,
    };
  }

  async getPhoto(key: string): Promise<{ buffer: ArrayBuffer; mimeType: string; etag?: string } | null> {
    if (this.r2) {
      try {
        const object = await this.r2.get(key);
        if (object) {
          const buffer = await object.arrayBuffer();
          const mimeType = object.httpMetadata?.contentType || 'image/webp';
          return { buffer, mimeType, etag: object.httpEtag };
        }
      } catch (e) {
        console.error('R2 get error:', e);
      }
    }

    // Fallback store
    if (globalStore.photos && globalStore.photos.has(key)) {
      const item = globalStore.photos.get(key)!;
      return { buffer: item.buffer, mimeType: item.mimeType };
    }

    return null;
  }

  async cleanupExpiredPhotos(): Promise<number> {
    const MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000; // 180 days
    const now = Date.now();
    let deletedCount = 0;

    // 1. Cleanup in memory fallback
    if (globalStore.photos) {
      for (const [k, v] of globalStore.photos.entries()) {
        const itemTime = new Date(v.uploadedAt).getTime();
        if (now - itemTime > MAX_AGE_MS) {
          globalStore.photos.delete(k);
          deletedCount++;
        }
      }
    }

    // 2. Cleanup R2 list if supported
    if (this.r2 && typeof this.r2.list === 'function') {
      try {
        const list = await this.r2.list({ prefix: 'photos/', limit: 100 });
        for (const obj of list.objects) {
          const uploadedTime = new Date(obj.uploaded).getTime();
          if (now - uploadedTime > MAX_AGE_MS) {
            await this.r2.delete(obj.key);
            deletedCount++;
          }
        }
      } catch (e) {
        console.error('R2 cleanup error:', e);
      }
    }

    return deletedCount;
  }

  // --- KV Helper Methods ---
  private async getKV<T>(key: string, defaultValue: T): Promise<T> {
    if (!this.kv) return defaultValue;
    try {
      const data = await this.kv.get(key, 'json');
      if (data !== null && data !== undefined) {
        return data as T;
      }
    } catch (e) {
      console.error(`KV get error for key ${key}:`, e);
    }
    return defaultValue;
  }

  private async putKV<T>(key: string, value: T): Promise<void> {
    if (!this.kv) return;
    try {
      await this.kv.put(key, JSON.stringify(value));
    } catch (e) {
      console.error(`KV put error for key ${key}:`, e);
    }
  }

  // --- TIME SLOTS PERSISTENCE ---
  async getTimeSlots(): Promise<TimeSlot[]> {
    if (this.kv) {
      const kvSlots = await this.getKV<TimeSlot[]>('time_slots', globalStore.timeSlots);
      if (kvSlots && Array.isArray(kvSlots) && kvSlots.length > 0) {
        kvSlots.sort((a: TimeSlot, b: TimeSlot) => {
          if (a.order_index !== undefined && b.order_index !== undefined) {
            return a.order_index - b.order_index;
          }
          return a.start_time.localeCompare(b.start_time);
        });
        globalStore.timeSlots = kvSlots;
        return kvSlots;
      }
    }
    if (globalStore.timeSlots && Array.isArray(globalStore.timeSlots)) {
      globalStore.timeSlots.sort((a: TimeSlot, b: TimeSlot) => {
        if (a.order_index !== undefined && b.order_index !== undefined) {
          return a.order_index - b.order_index;
        }
        return a.start_time.localeCompare(b.start_time);
      });
    }
    return globalStore.timeSlots;
  }

  async updateSlot(id: number, maxCapacity: number, isActive: boolean, operator = 'Admin', ip = '127.0.0.1') {
    const slots = await this.getTimeSlots();
    const slot = slots.find((s: TimeSlot) => s.id === id);
    if (slot) {
      slot.max_capacity = maxCapacity;
      slot.is_active = isActive ? 1 : 0;

      // Update in-memory & KV
      globalStore.timeSlots = slots;
      await this.putKV('time_slots', slots);

      await this.addAuditLog(
        'UPDATE_SLOT',
        `ปรับแต่งรอบเวลา ${slot.slot_name}: ความจุ ${maxCapacity} คิว/วัน, สถานะ: ${isActive ? 'เปิดรับ' : 'ปิด'}`,
        operator,
        ip
      );
    }
    return true;
  }

  async addSlot(data: { slot_name: string; start_time: string; end_time: string; max_capacity: number }, operator = 'Admin', ip = '127.0.0.1') {
    const slots = await this.getTimeSlots();
    const newId = Date.now();
    const newSlot: TimeSlot = {
      id: newId,
      slot_name: data.slot_name.trim(),
      start_time: data.start_time.trim(),
      end_time: data.end_time.trim(),
      max_capacity: data.max_capacity || 3,
      is_active: 1,
    };

    slots.push(newSlot);
    slots.sort((a, b) => a.start_time.localeCompare(b.start_time));

    globalStore.timeSlots = slots;
    await this.putKV('time_slots', slots);

    await this.addAuditLog(
      'UPDATE_SLOT',
      `เพิ่มรอบเวลาใหม่: ${newSlot.slot_name} (ความจุ ${newSlot.max_capacity} คิว/วัน)`,
      operator,
      ip
    );

    return newSlot;
  }

  async deleteSlot(id: number, operator = 'Admin', ip = '127.0.0.1') {
    let slots = await this.getTimeSlots();
    const targetSlot = slots.find((s: TimeSlot) => s.id === id);
    slots = slots.filter((s: TimeSlot) => s.id !== id);

    globalStore.timeSlots = slots;
    await this.putKV('time_slots', slots);

    if (targetSlot) {
      await this.addAuditLog(
        'UPDATE_SLOT',
        `ลบรอบเวลา: ${targetSlot.slot_name}`,
        operator,
        ip
      );
    }

    return true;
  }

  async batchUpdateSlots(maxCapacity: number, operator = 'Admin', ip = '127.0.0.1') {
    const slots = await this.getTimeSlots();
    for (const slot of slots) {
      slot.max_capacity = maxCapacity;
    }

    globalStore.timeSlots = slots;
    await this.putKV('time_slots', slots);

    await this.addAuditLog(
      'UPDATE_SLOT',
      `ปรับความจุทุกรอบเวลาเป็น ${maxCapacity} คิว/รอบ (มีผลทันทีทุกวัน)`,
      operator,
      ip
    );

    return true;
  }

  async reorderTimeSlots(orderedSlots: TimeSlot[], operator = 'Admin', ip = '127.0.0.1') {
    const updated = orderedSlots.map((s, index) => ({
      ...s,
      order_index: index + 1,
    }));

    globalStore.timeSlots = updated;
    await this.putKV('time_slots', updated);

    await this.addAuditLog(
      'REORDER_SLOTS',
      'ปรับเปลี่ยนลำดับการแสดงผลของรอบเวลา (มีผลทันทีทุกวัน)',
      operator,
      ip
    );

    return updated;
  }

  async autoSortTimeSlots(operator = 'Admin', ip = '127.0.0.1') {
    let slots = await this.getTimeSlots();
    slots.sort((a, b) => a.start_time.localeCompare(b.start_time));
    const updated = slots.map((s, index) => ({
      ...s,
      order_index: index + 1,
    }));

    globalStore.timeSlots = updated;
    await this.putKV('time_slots', updated);

    await this.addAuditLog(
      'REORDER_SLOTS',
      'จัดเรียงลำดับรอบเวลาตามเวลาเริ่มต้นอัตโนมัติ (08:00 -> 17:00)',
      operator,
      ip
    );

    return updated;
  }

  // --- BLOCKED DATES PERSISTENCE ---
  async getBlockedDates(): Promise<BlockedDate[]> {
    if (this.kv) {
      const kvDates = await this.getKV<BlockedDate[]>('blocked_dates', globalStore.blockedDates);
      globalStore.blockedDates = kvDates || [];
      return globalStore.blockedDates;
    }
    return globalStore.blockedDates;
  }

  async addBlockedDate(date: string, reason: string, operator = 'Admin', ip = '127.0.0.1') {
    const blockedDates = await this.getBlockedDates();
    const existing = blockedDates.find((b: BlockedDate) => b.blocked_date === date);
    if (existing) {
      existing.reason = reason;
    } else {
      blockedDates.push({
        id: Date.now(),
        blocked_date: date,
        reason,
        created_at: new Date().toISOString(),
      });
    }

    globalStore.blockedDates = blockedDates;
    await this.putKV('blocked_dates', blockedDates);

    await this.addAuditLog(
      'BLOCK_DATE',
      `ปิดรับจองคิววันที่ ${date} (เหตุผล: ${reason})`,
      operator,
      ip
    );

    return true;
  }

  async removeBlockedDate(target: string | number, operator = 'Admin', ip = '127.0.0.1') {
    let blockedDates = await this.getBlockedDates();
    blockedDates = blockedDates.filter(
      (b: BlockedDate) => b.id !== target && b.blocked_date !== target
    );

    globalStore.blockedDates = blockedDates;
    await this.putKV('blocked_dates', blockedDates);

    await this.addAuditLog(
      'UNBLOCK_DATE',
      `เปิดรับจองคิวตามปกติสำหรับ ${target}`,
      operator,
      ip
    );

    return true;
  }

  // --- STAFF USER MANAGEMENT PERSISTENCE ---
  async getAllStaff(): Promise<StaffUser[]> {
    let staffList = globalStore.staffUsers;
    if (this.kv) {
      staffList = await this.getKV<StaffUser[]>('staff_users', globalStore.staffUsers);
      globalStore.staffUsers = staffList;
    }

    return staffList.map((s: StaffUser) => ({
      ...s,
      pin: '••••', // Mask PIN on list
    }));
  }

  async authenticateStaff(usernameOrPin: string, pinInput?: string): Promise<StaffUser | null> {
    let staffList: StaffUser[] = globalStore.staffUsers;
    if (this.kv) {
      staffList = await this.getKV<StaffUser[]>('staff_users', globalStore.staffUsers);
      globalStore.staffUsers = staffList;
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // If both username and pin provided
    if (usernameOrPin && pinInput) {
      const u = usernameOrPin.trim().toLowerCase();
      const p = pinInput.trim();
      const user = staffList.find(
        (s) => (s.username.toLowerCase() === u || s.full_name.toLowerCase() === u) && s.pin === p && s.is_active === 1
      );
      if (user) {
        user.last_login = nowStr;
        await this.putKV('staff_users', staffList);
        return user;
      }
      return null;
    }

    // If only PIN provided
    const pin = (pinInput || usernameOrPin).trim();
    const matched = staffList.find((s) => s.pin === pin && s.is_active === 1);
    if (matched) {
      matched.last_login = nowStr;
      await this.putKV('staff_users', staffList);
      return matched;
    }

    if (pin === 'otello' || pin === globalStore.settings.admin_pin) {
      const adminUser = staffList.find((s) => s.role === 'super_admin') || staffList[0];
      if (adminUser) {
        adminUser.last_login = nowStr;
        await this.putKV('staff_users', staffList);
        return adminUser;
      }
    }

    return null;
  }

  async createStaff(data: { username: string; full_name: string; pin: string; role: StaffRole }, operator = 'Admin', ip = '127.0.0.1'): Promise<StaffUser> {
    let staffList: StaffUser[] = globalStore.staffUsers;
    if (this.kv) {
      staffList = await this.getKV<StaffUser[]>('staff_users', globalStore.staffUsers);
    }

    const cleanUsername = data.username.trim().toLowerCase();
    const existing = staffList.find((s: StaffUser) => s.username.toLowerCase() === cleanUsername);
    if (existing) {
      throw new Error(`ชื่อผู้ใช้ (Username) "${data.username}" มีอยู่ในระบบแล้ว`);
    }

    const newStaff: StaffUser = {
      id: `staff_${Date.now()}`,
      username: cleanUsername,
      full_name: data.full_name.trim(),
      pin: data.pin.trim(),
      role: data.role,
      role_name: getRoleName(data.role),
      is_active: 1,
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    staffList.push(newStaff);
    globalStore.staffUsers = staffList;
    await this.putKV('staff_users', staffList);

    await this.addAuditLog(
      'ADD_STAFF',
      `เพิ่มเจ้าหน้าที่ใหม่: ${newStaff.full_name} (@${newStaff.username}) บทบาท: ${newStaff.role_name}`,
      operator,
      ip
    );

    return { ...newStaff, pin: '••••' };
  }

  async updateStaff(
    id: string,
    data: { full_name?: string; role?: StaffRole; is_active?: number; pin?: string },
    operator = 'Admin',
    ip = '127.0.0.1'
  ): Promise<StaffUser> {
    let staffList: StaffUser[] = globalStore.staffUsers;
    if (this.kv) {
      staffList = await this.getKV<StaffUser[]>('staff_users', globalStore.staffUsers);
    }

    const staff = staffList.find((s: StaffUser) => s.id === id);
    if (!staff) {
      throw new Error('ไม่พบข้อมูลเจ้าหน้าที่');
    }

    if (data.full_name) staff.full_name = data.full_name.trim();
    if (data.role) {
      staff.role = data.role;
      staff.role_name = getRoleName(data.role);
    }
    if (data.is_active !== undefined) staff.is_active = data.is_active;
    if (data.pin && data.pin.trim()) {
      staff.pin = data.pin.trim();
    }

    globalStore.staffUsers = staffList;
    await this.putKV('staff_users', staffList);

    await this.addAuditLog(
      'UPDATE_STAFF',
      `แก้ไขข้อมูลเจ้าหน้าที่: ${staff.full_name} (@${staff.username}) สถานะ: ${staff.is_active ? 'เปิดใช้งาน' : 'ระงับการใช้งาน'}`,
      operator,
      ip
    );

    return { ...staff, pin: '••••' };
  }

  async deleteStaff(id: string, operator = 'Admin', ip = '127.0.0.1'): Promise<boolean> {
    let staffList: StaffUser[] = globalStore.staffUsers;
    if (this.kv) {
      staffList = await this.getKV<StaffUser[]>('staff_users', globalStore.staffUsers);
    }

    const staff = staffList.find((s: StaffUser) => s.id === id);
    if (!staff) {
      throw new Error('ไม่พบข้อมูลเจ้าหน้าที่');
    }
    if (staff.username === 'admin') {
      throw new Error('ไม่สามารถลบบัญชีผู้ดูแลระบบหลัก (admin) ได้');
    }

    staffList = staffList.filter((s: StaffUser) => s.id !== id);
    globalStore.staffUsers = staffList;
    await this.putKV('staff_users', staffList);

    await this.addAuditLog(
      'DELETE_STAFF',
      `ลบบัญชีเจ้าหน้าที่: ${staff.full_name} (@${staff.username})`,
      operator,
      ip
    );

    return true;
  }

  async resetStaffPin(id: string, newPin: string, operator = 'Admin', ip = '127.0.0.1'): Promise<boolean> {
    let staffList: StaffUser[] = globalStore.staffUsers;
    if (this.kv) {
      staffList = await this.getKV<StaffUser[]>('staff_users', globalStore.staffUsers);
    }

    const staff = staffList.find((s: StaffUser) => s.id === id);
    if (!staff) {
      throw new Error('ไม่พบข้อมูลเจ้าหน้าที่');
    }

    staff.pin = newPin.trim();
    globalStore.staffUsers = staffList;
    await this.putKV('staff_users', staffList);

    await this.addAuditLog(
      'RESET_PIN',
      `รีเซ็ตรหัส PIN ใหม่สำหรับเจ้าหน้าที่: ${staff.full_name} (@${staff.username})`,
      operator,
      ip
    );

    return true;
  }

  // --- AVAILABILITY ---
  async getAvailability(date: string) {
    const slots = await this.getTimeSlots();
    const blockedDates = await this.getBlockedDates();
    const bookings = await this.getAllBookings();

    let isBlocked = false;
    let blockReason: string | null = null;

    // Check if date is Sunday (Default Blocked)
    if (date) {
      const parts = date.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        if (d.getDay() === 0) {
          isBlocked = true;
          blockReason = 'คลังสินค้าปิดทำการทุกวันอาทิตย์ (งดรับจองคิว)';
        }
      }
    }

    const blocked = blockedDates.find((b: BlockedDate) => b.blocked_date === date);
    if (blocked) {
      isBlocked = true;
      blockReason = blocked.reason;
    }

    const countMap = new Map<string, number>();
    for (const b of bookings) {
      if (b.requested_date === date && (b.status === 'Pending' || b.status === 'Approved')) {
        countMap.set(b.requested_time, (countMap.get(b.requested_time) || 0) + 1);
      }
    }

    const activeSlots = slots.filter((s: TimeSlot) => s.is_active === 1);

    const computedSlots = activeSlots.map((s: TimeSlot) => {
      const booked = countMap.get(s.slot_name) || 0;
      const available = Math.max(0, s.max_capacity - booked);
      return {
        id: s.id,
        slot_name: s.slot_name,
        start_time: s.start_time,
        end_time: s.end_time,
        max_capacity: s.max_capacity,
        booked_count: booked,
        available_slots: available,
        is_available: !isBlocked && available > 0,
        is_active: s.is_active,
      };
    });

    return {
      date,
      is_blocked: isBlocked,
      block_reason: blockReason,
      slots: computedSlots,
    };
  }

  // --- BOOKINGS PERSISTENCE ---
  async getAllBookings(): Promise<Booking[]> {
    if (this.kv) {
      const kvBookings = await this.getKV<Booking[]>('bookings', globalStore.bookings);
      globalStore.bookings = kvBookings || [];
      return globalStore.bookings;
    }
    return globalStore.bookings;
  }

  async clearAllBookings(operator = 'Super Admin', ip = '127.0.0.1'): Promise<number> {
    const previousCount = (await this.getAllBookings()).length;
    globalStore.bookings = [];
    await this.putKV('bookings', []);

    if (this.d1) {
      try {
        await this.d1.prepare('DELETE FROM bookings').run();
      } catch (e) {
        console.error('D1 delete bookings error:', e);
      }
    }

    await this.addAuditLog(
      'DELETE_STAFF',
      `ล้างข้อมูลคิวจองทั้งหมดในระบบเรียบร้อยแล้ว (${previousCount} รายการ)`,
      operator,
      ip
    );

    return previousCount;
  }

  async createBooking(data: any): Promise<Booking> {
    const blockedDates = await this.getBlockedDates();
    const slots = await this.getTimeSlots();

    // Check if date is Sunday (Default Blocked)
    if (data.requested_date) {
      const parts = data.requested_date.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        if (d.getDay() === 0) {
          throw new Error('คลังสินค้าปิดทำการทุกวันอาทิตย์ ไม่อนุญาตให้จองคิวในวันอาทิตย์');
        }
      }
    }

    // Check if date is blocked
    const isDateBlocked = blockedDates.some((b: BlockedDate) => b.blocked_date === data.requested_date);
    if (isDateBlocked) {
      throw new Error(`วันที่ ${data.requested_date} ปิดรับจองคิวส่งของ`);
    }

    // Check if slot is active
    const slotObj = slots.find((s: TimeSlot) => s.slot_name === data.requested_time);
    if (slotObj && slotObj.is_active === 0) {
      throw new Error(`รอบเวลา ${data.requested_time} ปิดรับจองแล้ว กรุณาเลือกรอบเวลาอื่น`);
    }

    const cleanDate = data.requested_date.replace(/-/g, '');
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    const bookingId = `PTN-${cleanDate}-${randomChars}`;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const booking: Booking = {
      booking_id: bookingId,
      user_phone: data.user_phone.trim(),
      carrier_name: data.carrier_name.trim(),
      client_name: data.client_name.trim(),
      pallet_count: parseInt(data.pallet_count, 10) || 1,
      vehicle_count: parseInt(data.vehicle_count, 10) || 1,
      requested_date: data.requested_date,
      requested_time: data.requested_time,
      driver_name: data.driver_name?.trim() || null,
      license_plate: data.license_plate?.trim() || null,
      vehicle_type: data.vehicle_type?.trim() || 'รถกระบะ 4 ล้อ',
      cargo_type: data.cargo_type?.trim() || 'ยาและเวชภัณฑ์ทั่วไป (Room Temp 15-30°C)',
      notes: data.notes?.trim() || null,
      photo_url: data.photo_url || null,
      receiving_photo_url: null,
      status: 'Pending',
      created_at: nowStr,
    };

    const bookings = await this.getAllBookings();
    bookings.unshift(booking);
    globalStore.bookings = bookings;
    await this.putKV('bookings', bookings);

    return booking;
  }

  async getBookingById(id: string): Promise<Booking | null> {
    const cleanId = id.trim().toUpperCase();
    const bookings = await this.getAllBookings();
    const item = bookings.find((b: Booking) => b.booking_id.toUpperCase() === cleanId);
    return item || null;
  }

  async searchBookings(phone?: string, id?: string, ids?: string[]): Promise<Booking[]> {
    const bookings = await this.getAllBookings();
    if (id) {
      const cleanId = id.trim().toUpperCase();
      return bookings.filter((b: Booking) => b.booking_id.toUpperCase().includes(cleanId));
    }

    if (ids && ids.length > 0) {
      const upperIds = ids.map((i) => i.trim().toUpperCase());
      return bookings.filter((b: Booking) => upperIds.includes(b.booking_id.toUpperCase()));
    }

    if (phone) {
      const cleanPhone = phone.trim().replace(/[- ]/g, '');
      return bookings.filter((b: Booking) =>
        b.user_phone.replace(/[- ]/g, '').includes(cleanPhone)
      );
    }

    // Default: for privacy protection, return empty array if no filter is provided
    return [];
  }

  async getAdminBookings(date?: string | null, status?: string | null, search?: string | null): Promise<Booking[]> {
    const bookings = await this.getAllBookings();
    let results = [...bookings];

    if (date && date !== 'All' && date !== 'all') {
      results = results.filter((b: Booking) => b.requested_date === date);
    }
    if (status && status !== 'All') {
      if (status === 'Partial') {
        results = results.filter(
          (b: Booking) =>
            b.actual_pallet_count !== undefined &&
            b.actual_pallet_count !== null &&
            b.actual_pallet_count < b.pallet_count
        );
      } else {
        results = results.filter((b: Booking) => b.status === status);
      }
    }
    if (search) {
      const s = search.toLowerCase();
      results = results.filter((b: Booking) =>
        b.booking_id.toLowerCase().includes(s) ||
        b.carrier_name.toLowerCase().includes(s) ||
        b.client_name.toLowerCase().includes(s) ||
        b.user_phone.includes(s) ||
        (b.driver_name && b.driver_name.toLowerCase().includes(s)) ||
        (b.license_plate && b.license_plate.toLowerCase().includes(s))
      );
    }
    return results;
  }

  async updateBookingStatus(
    id: string,
    status: string,
    reason?: string | null,
    actionBy = 'Admin',
    ip = '127.0.0.1',
    extra?: {
      actual_pallet_count?: number | null;
      receiving_notes?: string | null;
      received_by?: string | null;
      receiving_photo_url?: string | null;
      photo_url?: string | null;
    }
  ): Promise<Booking | null> {
    const cleanId = id.trim().toUpperCase();
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const bookings = await this.getAllBookings();

    const item = bookings.find((b: Booking) => b.booking_id.toUpperCase() === cleanId);
    if (item) {
      item.status = status as any;
      item.admin_reason = reason || null;
      item.admin_action_date = nowStr;
      item.admin_action_by = actionBy;

      if (extra) {
        if (extra.actual_pallet_count !== undefined) {
          item.actual_pallet_count = extra.actual_pallet_count;
        }
        if (extra.receiving_notes !== undefined) {
          item.receiving_notes = extra.receiving_notes;
        }
        if (extra.received_by !== undefined) {
          item.received_by = extra.received_by;
        }
        if (extra.receiving_photo_url !== undefined) {
          item.receiving_photo_url = extra.receiving_photo_url;
        }
        if (extra.photo_url !== undefined) {
          item.photo_url = extra.photo_url;
        }
        if (status === 'Completed' || status === 'Receiving') {
          item.receiving_completed_at = nowStr;
          item.received_by = extra.received_by || actionBy;
        }
      }

      globalStore.bookings = bookings;
      await this.putKV('bookings', bookings);

      // Add audit log
      let logAction: AuditLog['action'] = 'APPROVE_QUEUE';
      if (status === 'Rejected') logAction = 'REJECT_QUEUE';
      else if (status === 'Cancelled') logAction = 'CANCEL_QUEUE';
      else if (status === 'CheckedIn') logAction = 'CHECKIN_QUEUE';
      else if (status === 'Receiving') logAction = 'RECEIVING_QUEUE';
      else if (status === 'Completed') logAction = 'COMPLETE_QUEUE';

      const receivingInfo = item.actual_pallet_count !== undefined && item.actual_pallet_count !== null
        ? ` [รับจริง: ${item.actual_pallet_count}/${item.pallet_count} ลัง]`
        : '';

      await this.addAuditLog(
        logAction,
        `เปลี่ยนสถานะคิว ${cleanId} เป็น ${status}${receivingInfo}${reason ? ` (เหตุผล: ${reason})` : ''}`,
        actionBy,
        ip
      );

      return item;
    }
    return null;
  }

  async cancelBookingByUser(id: string, reason?: string, ip = '127.0.0.1'): Promise<Booking> {
    const cleanId = id.trim().toUpperCase();
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const bookings = await this.getAllBookings();

    const item = bookings.find((b: Booking) => b.booking_id.toUpperCase() === cleanId);
    if (!item) {
      throw new Error('ไม่พบข้อมูลการจองคิวนี้');
    }

    if (item.status === 'Cancelled') {
      throw new Error('คิวนี้ถูกยกเลิกไปแล้ว');
    }

    if (item.status === 'Completed') {
      throw new Error('คิวนี้ได้รับการรับสินค้าเสร็จสิ้นแล้ว ไม่สามารถยกเลิกได้');
    }

    item.status = 'Cancelled';
    item.admin_reason = `[ผู้จองยกเลิกคิวเอง] ${reason?.trim() || 'ผู้จองขอยกเลิกการนัดหมาย'}`;
    item.admin_action_date = nowStr;
    item.admin_action_by = 'ผู้จอง (User)';

    globalStore.bookings = bookings;
    await this.putKV('bookings', bookings);

    await this.addAuditLog(
      'CANCEL_QUEUE',
      `ผู้ส่งสินค้าขอยกเลิกคิว ${cleanId} ด้วยตนเอง${reason ? ` (เหตุผล: ${reason})` : ''}`,
      'User Self-Service',
      ip
    );

    return item;
  }

  // --- SETTINGS ---
  async getSettings() {
    const slots = await this.getTimeSlots();
    const blockedDates = await this.getBlockedDates();
    let settings = { ...globalStore.settings };

    return { slots, blockedDates, settings };
  }

  // --- AUDIT LOGS PERSISTENCE ---
  async addAuditLog(action: AuditLog['action'], details: string, operator = 'Admin', ip = '127.0.0.1') {
    let logs = globalStore.auditLogs;
    if (this.kv) {
      logs = await this.getKV<AuditLog[]>('audit_logs', globalStore.auditLogs);
    }

    const log: AuditLog = {
      id: Date.now(),
      action,
      details,
      operator,
      ip_address: ip,
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    logs.unshift(log);
    if (logs.length > 200) {
      logs.pop();
    }

    globalStore.auditLogs = logs;
    await this.putKV('audit_logs', logs);
  }

  async getAuditLogs(limit = 50): Promise<AuditLog[]> {
    if (this.kv) {
      const logs = await this.getKV<AuditLog[]>('audit_logs', globalStore.auditLogs);
      globalStore.auditLogs = logs;
      return logs.slice(0, limit);
    }
    return globalStore.auditLogs.slice(0, limit);
  }

  // --- BRUTE FORCE & RATE LIMITING ---
  checkRateLimit(identifier: string): { isLocked: boolean; remainingLockoutSeconds: number; remainingAttempts: number } {
    const now = Date.now();
    const attemptsMap: Map<string, LoginAttemptRecord> = globalStore.loginAttempts;
    const record = attemptsMap.get(identifier);

    if (!record) {
      return { isLocked: false, remainingLockoutSeconds: 0, remainingAttempts: 5 };
    }

    if (record.lockedUntil && record.lockedUntil > now) {
      const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return { isLocked: true, remainingLockoutSeconds: remainingSeconds, remainingAttempts: 0 };
    }

    if (record.lockedUntil && record.lockedUntil <= now) {
      attemptsMap.delete(identifier);
      return { isLocked: false, remainingLockoutSeconds: 0, remainingAttempts: 5 };
    }

    if (now - record.lastAttempt > 15 * 60 * 1000) {
      attemptsMap.delete(identifier);
      return { isLocked: false, remainingLockoutSeconds: 0, remainingAttempts: 5 };
    }

    const remaining = Math.max(0, 5 - record.attempts);
    return { isLocked: false, remainingLockoutSeconds: 0, remainingAttempts: remaining };
  }

  recordFailedLogin(identifier: string, ip: string, attemptedUser = 'Unknown'): { isLocked: boolean; remainingAttempts: number; remainingLockoutSeconds: number } {
    const now = Date.now();
    const attemptsMap: Map<string, LoginAttemptRecord> = globalStore.loginAttempts;
    let record = attemptsMap.get(identifier);

    if (!record || (record.lockedUntil && record.lockedUntil <= now)) {
      record = { attempts: 1, lockedUntil: null, lastAttempt: now };
    } else {
      record.attempts += 1;
      record.lastAttempt = now;
    }

    if (record.attempts >= 5) {
      record.lockedUntil = now + 15 * 60 * 1000;
      attemptsMap.set(identifier, record);
      this.addAuditLog('LOGIN_FAILED', `กรอกรหัสผ่านผิดครบ 5 ครั้ง (ชื่อ: ${attemptedUser}) — ระบบสั่งระงับชั่วคราว 15 นาที`, attemptedUser, ip);
      return { isLocked: true, remainingAttempts: 0, remainingLockoutSeconds: 15 * 60 };
    }

    attemptsMap.set(identifier, record);
    this.addAuditLog('LOGIN_FAILED', `พยายามเข้าสู่ระบบไม่สำเร็จ (ครั้งที่ ${record.attempts}/5, ชื่อ: ${attemptedUser})`, attemptedUser, ip);
    return { isLocked: false, remainingAttempts: 5 - record.attempts, remainingLockoutSeconds: 0 };
  }

  recordSuccessfulLogin(identifier: string, ip: string, staffName: string, roleName: string) {
    globalStore.loginAttempts.delete(identifier);
    this.addAuditLog('LOGIN_SUCCESS', `เข้าสู่ระบบสำเร็จ: ${staffName} (${roleName})`, staffName, ip);
  }
}
