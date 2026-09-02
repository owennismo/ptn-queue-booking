import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { TimeSlot, BlockedDate } from '@/lib/types';

export async function GET() {
  try {
    const db = getDb();
    const slots = db.prepare('SELECT * FROM time_slots ORDER BY start_time ASC').all() as TimeSlot[];
    const blockedDates = db.prepare('SELECT * FROM blocked_dates ORDER BY blocked_date ASC').all() as BlockedDate[];
    const settings = db.prepare('SELECT * FROM system_settings').all() as Array<{ key: string; value: string }>;

    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    return NextResponse.json({
      slots,
      blockedDates,
      settings: settingsMap,
    });
  } catch (error) {
    console.error('Error fetching admin settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    const db = getDb();

    // 1. Update time slot capacity or active toggle
    if (action === 'update_slot') {
      const { id, max_capacity, is_active } = body;
      if (!id || max_capacity === undefined) {
        return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
      }

      db.prepare(`
        UPDATE time_slots 
        SET max_capacity = ?, is_active = ?
        WHERE id = ?
      `).run(parseInt(max_capacity, 10), is_active ? 1 : 0, id);

      return NextResponse.json({ success: true, message: 'บันทึกการตั้งค่ารอบเวลาสำเร็จ' });
    }

    // 2. Add new blocked date
    if (action === 'add_blocked_date') {
      const { blocked_date, reason } = body;
      if (!blocked_date || !reason) {
        return NextResponse.json({ error: 'กรุณาระบุวันที่และเหตุผลการปิดรับจอง' }, { status: 400 });
      }

      db.prepare(`
        INSERT OR REPLACE INTO blocked_dates (blocked_date, reason)
        VALUES (?, ?)
      `).run(blocked_date, reason.trim());

      return NextResponse.json({ success: true, message: `ปิดรับจองวันที่ ${blocked_date} สำเร็จ` });
    }

    // 3. Remove blocked date
    if (action === 'remove_blocked_date') {
      const { id, blocked_date } = body;
      if (id) {
        db.prepare('DELETE FROM blocked_dates WHERE id = ?').run(id);
      } else if (blocked_date) {
        db.prepare('DELETE FROM blocked_dates WHERE blocked_date = ?').run(blocked_date);
      } else {
        return NextResponse.json({ error: 'Missing id or blocked_date' }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: 'ยกเลิกการปิดรับจองสำเร็จ' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Error modifying settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
