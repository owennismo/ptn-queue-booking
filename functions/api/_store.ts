// Shared Universal Store for Cloudflare Pages Functions
// Supports Cloudflare D1 database when bound, with a seamless in-memory fallback.

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
  notes: string | null;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  admin_reason?: string | null;
  admin_action_date?: string | null;
  admin_action_by?: string | null;
  created_at: string;
}

export interface TimeSlot {
  id: number;
  slot_name: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  is_active: number;
}

export interface BlockedDate {
  id: number;
  blocked_date: string;
  reason: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  action: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'APPROVE_QUEUE' | 'REJECT_QUEUE' | 'CANCEL_QUEUE' | 'UPDATE_SLOT' | 'BLOCK_DATE' | 'UNBLOCK_DATE' | 'ADD_STAFF' | 'UPDATE_STAFF' | 'DELETE_STAFF' | 'RESET_PIN';
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
      return 'รปภ. จุดตรวจหน้าประตู (Security Gate)';
    default:
      return 'เจ้าหน้าที่ทั่วไป';
  }
}

// Global persistent state for Edge instance
const globalStore = (globalThis as any).__PTN_STORE__ || {
  bookings: [
    {
      booking_id: 'PTN-DEMO-001',
      user_phone: '081-234-5678',
      carrier_name: 'Kerry Express',
      client_name: 'บริษัท พีทีเอ็น ฟาร์มาเซ็นเตอร์ จำกัด (พัฒนาเภสัช)',
      pallet_count: 5,
      vehicle_count: 1,
      requested_date: '2026-09-03',
      requested_time: '09:30 - 10:30',
      driver_name: 'สมชาย ใจดี',
      license_plate: '1กข-9999 กทม.',
      notes: 'สินค้าควบคุมอุณหภูมิ 2-8 องศา',
      status: 'Pending',
      created_at: '2026-09-02 12:00:00',
    },
  ] as Booking[],
  timeSlots: [
    { id: 1, slot_name: '08:30 - 09:30', start_time: '08:30', end_time: '09:30', max_capacity: 3, is_active: 1 },
    { id: 2, slot_name: '09:30 - 10:30', start_time: '09:30', end_time: '10:30', max_capacity: 4, is_active: 1 },
    { id: 3, slot_name: '10:30 - 11:30', start_time: '10:30', end_time: '11:30', max_capacity: 4, is_active: 1 },
    { id: 4, slot_name: '11:30 - 12:30', start_time: '11:30', end_time: '12:30', max_capacity: 2, is_active: 1 },
    { id: 5, slot_name: '13:00 - 14:00', start_time: '13:00', end_time: '14:00', max_capacity: 4, is_active: 1 },
    { id: 6, slot_name: '14:00 - 15:00', start_time: '14:00', end_time: '15:00', max_capacity: 4, is_active: 1 },
    { id: 7, slot_name: '15:00 - 16:00', start_time: '15:00', end_time: '16:00', max_capacity: 3, is_active: 1 },
    { id: 8, slot_name: '16:00 - 17:00', start_time: '16:00', end_time: '17:00', max_capacity: 2, is_active: 1 },
  ] as TimeSlot[],
  blockedDates: [] as BlockedDate[],
  staffUsers: [
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
      full_name: 'เจ้าหน้าที่ รปภ. ประตูหน้า',
      pin: '5678',
      role: 'security_gate',
      role_name: 'รปภ. จุดตรวจหน้าประตู (Security Gate)',
      is_active: 1,
      created_at: '2026-09-02 09:00:00',
    },
  ] as StaffUser[],
  auditLogs: [
    {
      id: 1,
      action: 'LOGIN_SUCCESS',
      details: 'ระบบเริ่มต้นการทำงานและโหลดข้อมูลบุคลากรเริ่มต้น',
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

  private get d1() {
    return this.env?.DB;
  }

  // --- STAFF USER MANAGEMENT ---
  async getAllStaff(): Promise<StaffUser[]> {
    return globalStore.staffUsers.map((s: StaffUser) => ({
      ...s,
      pin: '••••', // Mask PIN on list
    }));
  }

  async getStaffById(id: string): Promise<StaffUser | null> {
    const user = globalStore.staffUsers.find((s: StaffUser) => s.id === id);
    return user || null;
  }

  async authenticateStaff(usernameOrPin: string, pinInput?: string): Promise<StaffUser | null> {
    const staffList: StaffUser[] = globalStore.staffUsers;
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
        return user;
      }
      return null;
    }

    // If only PIN provided (legacy or quick pin)
    const pin = (pinInput || usernameOrPin).trim();
    // 1. Check direct staff PIN match
    const matched = staffList.find((s) => s.pin === pin && s.is_active === 1);
    if (matched) {
      matched.last_login = nowStr;
      return matched;
    }

    // 2. Check master system PIN (otello)
    if (pin === 'otello' || pin === globalStore.settings.admin_pin) {
      const adminUser = staffList.find((s) => s.role === 'super_admin') || staffList[0];
      if (adminUser) {
        adminUser.last_login = nowStr;
        return adminUser;
      }
    }

    return null;
  }

  async createStaff(data: { username: string; full_name: string; pin: string; role: StaffRole }, operator = 'Admin', ip = '127.0.0.1'): Promise<StaffUser> {
    const cleanUsername = data.username.trim().toLowerCase();
    const existing = globalStore.staffUsers.find((s: StaffUser) => s.username.toLowerCase() === cleanUsername);
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

    globalStore.staffUsers.push(newStaff);
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
    const staff = globalStore.staffUsers.find((s: StaffUser) => s.id === id);
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

    await this.addAuditLog(
      'UPDATE_STAFF',
      `แก้ไขข้อมูลเจ้าหน้าที่: ${staff.full_name} (@${staff.username}) สถานะ: ${staff.is_active ? 'เปิดใช้งาน' : 'ระงับการใช้งาน'}`,
      operator,
      ip
    );

    return { ...staff, pin: '••••' };
  }

  async deleteStaff(id: string, operator = 'Admin', ip = '127.0.0.1'): Promise<boolean> {
    const staff = globalStore.staffUsers.find((s: StaffUser) => s.id === id);
    if (!staff) {
      throw new Error('ไม่พบข้อมูลเจ้าหน้าที่');
    }
    if (staff.username === 'admin') {
      throw new Error('ไม่สามารถลบบัญชีผู้ดูแลระบบหลัก (admin) ได้');
    }

    globalStore.staffUsers = globalStore.staffUsers.filter((s: StaffUser) => s.id !== id);
    await this.addAuditLog(
      'DELETE_STAFF',
      `ลบบัญชีเจ้าหน้าที่: ${staff.full_name} (@${staff.username})`,
      operator,
      ip
    );

    return true;
  }

  async resetStaffPin(id: string, newPin: string, operator = 'Admin', ip = '127.0.0.1'): Promise<boolean> {
    const staff = globalStore.staffUsers.find((s: StaffUser) => s.id === id);
    if (!staff) {
      throw new Error('ไม่พบข้อมูลเจ้าหน้าที่');
    }

    staff.pin = newPin.trim();
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
    let isBlocked = false;
    let blockReason: string | null = null;
    let slots = [...globalStore.timeSlots];
    const countMap = new Map<string, number>();

    if (this.d1) {
      try {
        const blocked = await this.d1.prepare('SELECT * FROM blocked_dates WHERE blocked_date = ?').bind(date).first();
        if (blocked) {
          isBlocked = true;
          blockReason = blocked.reason;
        }

        const dbSlots = await this.d1.prepare('SELECT * FROM time_slots WHERE is_active = 1 ORDER BY start_time ASC').all();
        if (dbSlots?.results?.length) {
          slots = dbSlots.results as any;
        }

        const counts = await this.d1.prepare(`
          SELECT requested_time, COUNT(*) as count 
          FROM bookings 
          WHERE requested_date = ? AND status IN ('Pending', 'Approved')
          GROUP BY requested_time
        `).bind(date).all();

        if (counts?.results) {
          for (const c of counts.results as any[]) {
            countMap.set(c.requested_time, c.count);
          }
        }
      } catch (e) {
        console.error('D1 availability query error:', e);
      }
    } else {
      const blocked = globalStore.blockedDates.find((b: BlockedDate) => b.blocked_date === date);
      if (blocked) {
        isBlocked = true;
        blockReason = blocked.reason;
      }
      for (const b of globalStore.bookings) {
        if (b.requested_date === date && (b.status === 'Pending' || b.status === 'Approved')) {
          countMap.set(b.requested_time, (countMap.get(b.requested_time) || 0) + 1);
        }
      }
    }

    const computedSlots = slots.map((s: TimeSlot) => {
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
      };
    });

    return {
      date,
      is_blocked: isBlocked,
      block_reason: blockReason,
      slots: computedSlots,
    };
  }

  // --- BOOKINGS ---
  async createBooking(data: any): Promise<Booking> {
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
      notes: data.notes?.trim() || null,
      status: 'Pending',
      created_at: nowStr,
    };

    if (this.d1) {
      try {
        await this.d1.prepare(`
          INSERT INTO bookings (
            booking_id, user_phone, carrier_name, client_name,
            pallet_count, vehicle_count, requested_date, requested_time,
            driver_name, license_plate, notes, status, created_at
          ) VALUES (
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, 'Pending', ?
          )
        `).bind(
          booking.booking_id,
          booking.user_phone,
          booking.carrier_name,
          booking.client_name,
          booking.pallet_count,
          booking.vehicle_count,
          booking.requested_date,
          booking.requested_time,
          booking.driver_name,
          booking.license_plate,
          booking.notes,
          booking.created_at
        ).run();
      } catch (e) {
        console.error('D1 insert error:', e);
      }
    }

    // Always keep in memory store as fallback
    globalStore.bookings.unshift(booking);
    return booking;
  }

  async getBookingById(id: string): Promise<Booking | null> {
    const cleanId = id.trim().toUpperCase();

    if (this.d1) {
      try {
        const item = await this.d1.prepare('SELECT * FROM bookings WHERE booking_id = ?').bind(cleanId).first();
        if (item) return item as Booking;
      } catch (e) {
        console.error('D1 getBooking error:', e);
      }
    }

    const memItem = globalStore.bookings.find((b: Booking) => b.booking_id.toUpperCase() === cleanId);
    return memItem || null;
  }

  async searchBookings(phone?: string, id?: string): Promise<Booking[]> {
    if (id) {
      const b = await this.getBookingById(id);
      return b ? [b] : [];
    }

    if (phone) {
      const cleanPhone = phone.trim().replace(/[- ]/g, '');
      if (this.d1) {
        try {
          const res = await this.d1.prepare(`
            SELECT * FROM bookings 
            WHERE REPLACE(REPLACE(user_phone, '-', ''), ' ', '') LIKE ?
            ORDER BY created_at DESC
          `).bind(`%${cleanPhone}%`).all();
          if (res?.results) return res.results as Booking[];
        } catch (e) {}
      }

      return globalStore.bookings.filter((b: Booking) =>
        b.user_phone.replace(/[- ]/g, '').includes(cleanPhone)
      );
    }

    return [];
  }

  async getAdminBookings(date?: string | null, status?: string | null, search?: string | null): Promise<Booking[]> {
    if (this.d1) {
      try {
        let query = 'SELECT * FROM bookings WHERE 1=1';
        const params: any[] = [];
        if (date) {
          query += ' AND requested_date = ?';
          params.push(date);
        }
        if (status && status !== 'All') {
          query += ' AND status = ?';
          params.push(status);
        }
        if (search) {
          query += ' AND (booking_id LIKE ? OR carrier_name LIKE ? OR client_name LIKE ? OR user_phone LIKE ? OR driver_name LIKE ? OR license_plate LIKE ?)';
          const s = `%${search.trim()}%`;
          params.push(s, s, s, s, s, s);
        }
        query += ' ORDER BY requested_date DESC, requested_time ASC, created_at DESC';
        const res = await this.d1.prepare(query).bind(...params).all();
        if (res?.results) return res.results as Booking[];
      } catch (e) {}
    }

    let results = [...globalStore.bookings];
    if (date) {
      results = results.filter((b: Booking) => b.requested_date === date);
    }
    if (status && status !== 'All') {
      results = results.filter((b: Booking) => b.status === status);
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

  async updateBookingStatus(id: string, status: string, reason?: string | null, actionBy = 'Admin', ip = '127.0.0.1'): Promise<Booking | null> {
    const cleanId = id.trim().toUpperCase();
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    if (this.d1) {
      try {
        await this.d1.prepare(`
          UPDATE bookings 
          SET status = ?, admin_reason = ?, admin_action_date = ?, admin_action_by = ?
          WHERE booking_id = ?
        `).bind(status, reason || null, nowStr, actionBy, cleanId).run();
      } catch (e) {}
    }

    const memItem = globalStore.bookings.find((b: Booking) => b.booking_id.toUpperCase() === cleanId);
    if (memItem) {
      memItem.status = status as any;
      memItem.admin_reason = reason || null;
      memItem.admin_action_date = nowStr;
      memItem.admin_action_by = actionBy;

      // Add audit log
      let logAction: AuditLog['action'] = 'APPROVE_QUEUE';
      if (status === 'Rejected') logAction = 'REJECT_QUEUE';
      if (status === 'Cancelled') logAction = 'CANCEL_QUEUE';

      await this.addAuditLog(
        logAction,
        `เปลี่ยนสถานะคิว ${cleanId} เป็น ${status}${reason ? ` (เหตุผล: ${reason})` : ''}`,
        actionBy,
        ip
      );

      return memItem;
    }
    return null;
  }

  // --- SETTINGS ---
  async getSettings() {
    let slots = [...globalStore.timeSlots];
    let blockedDates = [...globalStore.blockedDates];
    let settings = { ...globalStore.settings };

    if (this.d1) {
      try {
        const slotsRes = await this.d1.prepare('SELECT * FROM time_slots ORDER BY start_time ASC').all();
        if (slotsRes?.results?.length) slots = slotsRes.results as any;

        const bRes = await this.d1.prepare('SELECT * FROM blocked_dates ORDER BY blocked_date ASC').all();
        if (bRes?.results) blockedDates = bRes.results as any;

        const sRes = await this.d1.prepare('SELECT * FROM system_settings').all();
        if (sRes?.results) {
          for (const s of sRes.results as any[]) {
            settings[s.key] = s.value;
          }
        }
      } catch (e) {}
    }

    return { slots, blockedDates, settings };
  }

  async updateSlot(id: number, maxCapacity: number, isActive: boolean, operator = 'Admin', ip = '127.0.0.1') {
    if (this.d1) {
      try {
        await this.d1.prepare('UPDATE time_slots SET max_capacity = ?, is_active = ? WHERE id = ?')
          .bind(maxCapacity, isActive ? 1 : 0, id).run();
      } catch (e) {}
    }

    const slot = globalStore.timeSlots.find((s: TimeSlot) => s.id === id);
    if (slot) {
      slot.max_capacity = maxCapacity;
      slot.is_active = isActive ? 1 : 0;
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
    const newId = Date.now();
    const newSlot: TimeSlot = {
      id: newId,
      slot_name: data.slot_name.trim(),
      start_time: data.start_time.trim(),
      end_time: data.end_time.trim(),
      max_capacity: data.max_capacity || 3,
      is_active: 1,
    };

    if (this.d1) {
      try {
        await this.d1.prepare('INSERT INTO time_slots (slot_name, start_time, end_time, max_capacity, is_active) VALUES (?, ?, ?, ?, 1)')
          .bind(newSlot.slot_name, newSlot.start_time, newSlot.end_time, newSlot.max_capacity).run();
      } catch (e) {}
    }

    globalStore.timeSlots.push(newSlot);
    // Sort slots by start_time
    globalStore.timeSlots.sort((a: TimeSlot, b: TimeSlot) => a.start_time.localeCompare(b.start_time));

    await this.addAuditLog(
      'UPDATE_SLOT',
      `เพิ่มรอบเวลาใหม่: ${newSlot.slot_name} (ความจุ ${newSlot.max_capacity} คิว/วัน)`,
      operator,
      ip
    );

    return newSlot;
  }

  async deleteSlot(id: number, operator = 'Admin', ip = '127.0.0.1') {
    if (this.d1) {
      try {
        await this.d1.prepare('DELETE FROM time_slots WHERE id = ?').bind(id).run();
      } catch (e) {}
    }

    const targetSlot = globalStore.timeSlots.find((s: TimeSlot) => s.id === id);
    globalStore.timeSlots = globalStore.timeSlots.filter((s: TimeSlot) => s.id !== id);

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
    if (this.d1) {
      try {
        await this.d1.prepare('UPDATE time_slots SET max_capacity = ?').bind(maxCapacity).run();
      } catch (e) {}
    }

    for (const slot of globalStore.timeSlots) {
      slot.max_capacity = maxCapacity;
    }

    await this.addAuditLog(
      'UPDATE_SLOT',
      `ปรับความจุทุกรอบเวลาเป็น ${maxCapacity} คิว/รอบ (มีผลทันทีทุกวัน)`,
      operator,
      ip
    );

    return true;
  }

  async addBlockedDate(date: string, reason: string, operator = 'Admin', ip = '127.0.0.1') {
    if (this.d1) {
      try {
        await this.d1.prepare('INSERT OR REPLACE INTO blocked_dates (blocked_date, reason) VALUES (?, ?)')
          .bind(date, reason).run();
      } catch (e) {}
    }

    const existing = globalStore.blockedDates.find((b: BlockedDate) => b.blocked_date === date);
    if (existing) {
      existing.reason = reason;
    } else {
      globalStore.blockedDates.push({
        id: Date.now(),
        blocked_date: date,
        reason,
        created_at: new Date().toISOString(),
      });
    }

    await this.addAuditLog(
      'BLOCK_DATE',
      `ปิดรับจองคิววันที่ ${date} (เหตุผล: ${reason})`,
      operator,
      ip
    );

    return true;
  }

  async removeBlockedDate(target: string | number, operator = 'Admin', ip = '127.0.0.1') {
    if (this.d1) {
      try {
        if (typeof target === 'number') {
          await this.d1.prepare('DELETE FROM blocked_dates WHERE id = ?').bind(target).run();
        } else {
          await this.d1.prepare('DELETE FROM blocked_dates WHERE blocked_date = ?').bind(target).run();
        }
      } catch (e) {}
    }

    globalStore.blockedDates = globalStore.blockedDates.filter(
      (b: BlockedDate) => b.id !== target && b.blocked_date !== target
    );

    await this.addAuditLog(
      'UNBLOCK_DATE',
      `เปิดรับจองคิวตามปกติสำหรับ ${target}`,
      operator,
      ip
    );

    return true;
  }

  // --- AUDIT LOGS ---
  async addAuditLog(action: AuditLog['action'], details: string, operator = 'Admin', ip = '127.0.0.1') {
    const log: AuditLog = {
      id: Date.now(),
      action,
      details,
      operator,
      ip_address: ip,
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    globalStore.auditLogs.unshift(log);
    if (globalStore.auditLogs.length > 200) {
      globalStore.auditLogs.pop();
    }
  }

  async getAuditLogs(limit = 50): Promise<AuditLog[]> {
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

    // Check if locked
    if (record.lockedUntil && record.lockedUntil > now) {
      const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return { isLocked: true, remainingLockoutSeconds: remainingSeconds, remainingAttempts: 0 };
    }

    // If lock expired, reset
    if (record.lockedUntil && record.lockedUntil <= now) {
      attemptsMap.delete(identifier);
      return { isLocked: false, remainingLockoutSeconds: 0, remainingAttempts: 5 };
    }

    // Window expiration (15 minutes of inactivity clears failed count)
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
      // Lock for 15 minutes
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
