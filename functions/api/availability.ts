// Cloudflare Pages Function: GET /api/availability?date=YYYY-MM-DD
export async function onRequestGet(context: { request: Request; env: any }) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const date = url.searchParams.get('date');

    if (!date) {
      return new Response(JSON.stringify({ error: 'Date parameter is required (YYYY-MM-DD)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const d1 = env.DB;
    let isBlocked = false;
    let blockReason: string | null = null;
    let defaultSlots = [
      { id: 1, slot_name: '08:30 - 09:30', start_time: '08:30', end_time: '09:30', max_capacity: 3, is_active: 1 },
      { id: 2, slot_name: '09:30 - 10:30', start_time: '09:30', end_time: '10:30', max_capacity: 4, is_active: 1 },
      { id: 3, slot_name: '10:30 - 11:30', start_time: '10:30', end_time: '11:30', max_capacity: 4, is_active: 1 },
      { id: 4, slot_name: '11:30 - 12:30', start_time: '11:30', end_time: '12:30', max_capacity: 2, is_active: 1 },
      { id: 5, slot_name: '13:00 - 14:00', start_time: '13:00', end_time: '14:00', max_capacity: 4, is_active: 1 },
      { id: 6, slot_name: '14:00 - 15:00', start_time: '14:00', end_time: '15:00', max_capacity: 4, is_active: 1 },
      { id: 7, slot_name: '15:00 - 16:00', start_time: '15:00', end_time: '16:00', max_capacity: 3, is_active: 1 },
      { id: 8, slot_name: '16:00 - 17:00', start_time: '16:00', end_time: '17:00', max_capacity: 2, is_active: 1 },
    ];
    let countMap = new Map<string, number>();

    if (d1) {
      // 1. Check blocked date
      const blocked = await d1.prepare('SELECT * FROM blocked_dates WHERE blocked_date = ?').bind(date).first();
      if (blocked) {
        isBlocked = true;
        blockReason = blocked.reason;
      }

      // 2. Fetch slots from D1
      const slotsRes = await d1.prepare('SELECT * FROM time_slots WHERE is_active = 1 ORDER BY start_time ASC').all();
      if (slotsRes.results && slotsRes.results.length > 0) {
        defaultSlots = slotsRes.results as any;
      }

      // 3. Count bookings
      const countsRes = await d1.prepare(`
        SELECT requested_time, COUNT(*) as count 
        FROM bookings 
        WHERE requested_date = ? AND status IN ('Pending', 'Approved')
        GROUP BY requested_time
      `).bind(date).all();

      if (countsRes.results) {
        for (const row of countsRes.results as any[]) {
          countMap.set(row.requested_time, row.count);
        }
      }
    }

    const computedSlots = defaultSlots.map((slot) => {
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
        is_available: !isBlocked && available > 0,
      };
    });

    return new Response(
      JSON.stringify({
        date,
        is_blocked: isBlocked,
        block_reason: blockReason,
        slots: computedSlots,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Internal Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
