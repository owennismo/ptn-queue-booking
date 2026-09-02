import { Booking, TimeSlot, BlockedDate } from './types';

export interface DbAdapter {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  get<T = any>(sql: string, params?: any[]): Promise<T | undefined>;
  run(sql: string, params?: any[]): Promise<{ success: boolean }>;
}

const inMemoryStore = {
  bookings: [] as Booking[],
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
  settings: {
    company_name: 'บริษัท พีทีเอ็น ฟาร์มาเซ็นเตอร์ จำกัด (พัฒนาเภสัช)',
    admin_pin: 'otello',
  } as Record<string, string>,
};

function getD1Database(): any {
  try {
    const globalObj = globalThis as any;
    if (globalObj.DB && typeof globalObj.DB.prepare === 'function') {
      return globalObj.DB;
    }
    if (globalObj.process?.env?.DB && typeof globalObj.process.env.DB.prepare === 'function') {
      return globalObj.process.env.DB;
    }
  } catch (e) {}
  return null;
}

export async function getDbAdapter(): Promise<DbAdapter> {
  const d1 = getD1Database();
  if (d1) {
    return {
      async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
        const stmt = d1.prepare(sql).bind(...params);
        const res = await stmt.all();
        return (res.results || []) as T[];
      },
      async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
        const stmt = d1.prepare(sql).bind(...params);
        const res = await stmt.first();
        return (res || undefined) as T | undefined;
      },
      async run(sql: string, params: any[] = []): Promise<{ success: boolean }> {
        const stmt = d1.prepare(sql).bind(...params);
        const res = await stmt.run();
        return { success: res.success };
      },
    };
  }

  // Pure in-memory fallback
  return {
    async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
      const lower = sql.toLowerCase();
      if (lower.includes('from time_slots')) {
        return inMemoryStore.timeSlots.filter(s => s.is_active === 1) as any;
      }
      if (lower.includes('from blocked_dates')) {
        return inMemoryStore.blockedDates as any;
      }
      if (lower.includes('from system_settings')) {
        return Object.entries(inMemoryStore.settings).map(([key, value]) => ({ key, value })) as any;
      }
      if (lower.includes('from bookings')) {
        let results = [...inMemoryStore.bookings];
        if (params.length > 0 && typeof params[0] === 'string' && params[0].includes('-')) {
          results = results.filter(b => b.requested_date === params[0]);
        }
        return results as any;
      }
      return [];
    },

    async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
      const lower = sql.toLowerCase();
      if (lower.includes('from system_settings')) {
        const key = params[0] || 'admin_pin';
        return { value: inMemoryStore.settings[key] || '8888' } as any;
      }
      if (lower.includes('from blocked_dates')) {
        const date = params[0];
        return inMemoryStore.blockedDates.find(b => b.blocked_date === date) as any;
      }
      if (lower.includes('from time_slots')) {
        const slotName = params[0];
        return inMemoryStore.timeSlots.find(s => s.slot_name === slotName) as any;
      }
      if (lower.includes('from bookings')) {
        const id = params[0];
        return inMemoryStore.bookings.find(b => b.booking_id === id) as any;
      }
      return undefined;
    },

    async run(sql: string, params: any[] = []): Promise<{ success: boolean }> {
      const lower = sql.toLowerCase();
      if (lower.includes('insert into bookings')) {
        const booking: Booking = {
          booking_id: params[0],
          user_phone: params[1],
          carrier_name: params[2],
          client_name: params[3],
          pallet_count: params[4],
          vehicle_count: params[5],
          requested_date: params[6],
          requested_time: params[7],
          driver_name: params[8] || null,
          license_plate: params[9] || null,
          notes: params[10] || null,
          status: 'Pending',
          created_at: params[11] || new Date().toISOString(),
        };
        inMemoryStore.bookings.unshift(booking);
      } else if (lower.includes('update bookings')) {
        const status = params[0];
        const reason = params[1];
        const actionDate = params[2];
        const actionBy = params[3];
        const id = params[4];
        const item = inMemoryStore.bookings.find(b => b.booking_id === id);
        if (item) {
          item.status = status;
          item.admin_reason = reason;
          item.admin_action_date = actionDate;
          item.admin_action_by = actionBy;
        }
      } else if (lower.includes('insert or replace into blocked_dates')) {
        inMemoryStore.blockedDates.push({
          id: Date.now(),
          blocked_date: params[0],
          reason: params[1],
          created_at: new Date().toISOString(),
        });
      } else if (lower.includes('delete from blocked_dates')) {
        const target = params[0];
        inMemoryStore.blockedDates = inMemoryStore.blockedDates.filter(b => b.id !== target && b.blocked_date !== target);
      }
      return { success: true };
    },
  };
}
