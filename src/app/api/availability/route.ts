import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { TimeSlot, BlockedDate } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required (YYYY-MM-DD)' }, { status: 400 });
    }

    const db = getDb();

    // 1. Check if the date is blocked (holiday or closed day)
    const blocked = db.prepare('SELECT * FROM blocked_dates WHERE blocked_date = ?').get(date) as BlockedDate | undefined;

    // 2. Fetch all active time slots
    const slots = db.prepare('SELECT * FROM time_slots WHERE is_active = 1 ORDER BY start_time ASC').all() as TimeSlot[];

    // 3. Count non-cancelled / non-rejected bookings for this date per slot
    const bookingsCount = db.prepare(`
      SELECT requested_time, COUNT(*) as count 
      FROM bookings 
      WHERE requested_date = ? AND status IN ('Pending', 'Approved')
      GROUP BY requested_time
    `).all(date) as Array<{ requested_time: string; count: number }>;

    const countMap = new Map<string, number>();
    for (const b of bookingsCount) {
      countMap.set(b.requested_time, b.count);
    }

    const computedSlots = slots.map(slot => {
      const booked = countMap.get(slot.slot_name) || 0;
      const available = Math.max(0, slot.max_capacity - booked);
      return {
        id: slot.id,
        slot_name: slot.slot_name,
        start_time: slot.start_time,
        end_time: slot.end_time,
        max_capacity: slot.max_capacity,
        booked_count: booked,
        available_slots: available,
        is_available: !blocked && available > 0,
      };
    });

    return NextResponse.json({
      date,
      is_blocked: !!blocked,
      block_reason: blocked ? blocked.reason : null,
      slots: computedSlots,
    });
  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
