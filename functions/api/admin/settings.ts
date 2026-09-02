// Cloudflare Pages Function: GET & POST /api/admin/settings
export async function onRequestGet(context: { env: any }) {
  try {
    const { env } = context;
    const d1 = env.DB;
    let slots = [
      { id: 1, slot_name: '08:30 - 09:30', start_time: '08:30', end_time: '09:30', max_capacity: 3, is_active: 1 },
      { id: 2, slot_name: '09:30 - 10:30', start_time: '09:30', end_time: '10:30', max_capacity: 4, is_active: 1 },
      { id: 3, slot_name: '10:30 - 11:30', start_time: '10:30', end_time: '11:30', max_capacity: 4, is_active: 1 },
      { id: 4, slot_name: '11:30 - 12:30', start_time: '11:30', end_time: '12:30', max_capacity: 2, is_active: 1 },
      { id: 5, slot_name: '13:00 - 14:00', start_time: '13:00', end_time: '14:00', max_capacity: 4, is_active: 1 },
      { id: 6, slot_name: '14:00 - 15:00', start_time: '14:00', end_time: '15:00', max_capacity: 4, is_active: 1 },
      { id: 7, slot_name: '15:00 - 16:00', start_time: '15:00', end_time: '16:00', max_capacity: 3, is_active: 1 },
      { id: 8, slot_name: '16:00 - 17:00', start_time: '16:00', end_time: '17:00', max_capacity: 2, is_active: 1 },
    ];
    let blockedDates = [];
    let settingsMap: Record<string, string> = {
      company_name: 'บริษัท พีทีเอ็น ฟาร์มาเซ็นเตอร์ จำกัด (พัฒนาเภสัช)',
      admin_pin: '8888',
    };

    if (d1) {
      const slotsRes = await d1.prepare('SELECT * FROM time_slots ORDER BY start_time ASC').all();
      if (slotsRes.results) slots = slotsRes.results as any;

      const blockRes = await d1.prepare('SELECT * FROM blocked_dates ORDER BY blocked_date ASC').all();
      if (blockRes.results) blockedDates = blockRes.results as any;

      const settRes = await d1.prepare('SELECT * FROM system_settings').all();
      if (settRes.results) {
        for (const s of settRes.results as any[]) {
          settingsMap[s.key] = s.value;
        }
      }
    }

    return new Response(
      JSON.stringify({
        slots,
        blockedDates,
        settings: settingsMap,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error occurred' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestPost(context: { request: Request; env: any }) {
  try {
    const { request, env } = context;
    const body: any = await request.json();
    const { action } = body;
    const d1 = env.DB;

    if (!d1) {
      return new Response(JSON.stringify({ error: 'Database not available' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    if (action === 'update_slot') {
      const { id, max_capacity, is_active } = body;
      await d1.prepare(`
        UPDATE time_slots 
        SET max_capacity = ?, is_active = ?
        WHERE id = ?
      `).bind(parseInt(max_capacity, 10), is_active ? 1 : 0, id).run();

      return new Response(JSON.stringify({ success: true, message: 'บันทึกการตั้งค่ารอบเวลาสำเร็จ' }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (action === 'add_blocked_date') {
      const { blocked_date, reason } = body;
      await d1.prepare(`
        INSERT OR REPLACE INTO blocked_dates (blocked_date, reason)
        VALUES (?, ?)
      `).bind(blocked_date, reason.trim()).run();

      return new Response(JSON.stringify({ success: true, message: `ปิดรับจองวันที่ ${blocked_date} สำเร็จ` }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (action === 'remove_blocked_date') {
      const { id, blocked_date } = body;
      if (id) {
        await d1.prepare('DELETE FROM blocked_dates WHERE id = ?').bind(id).run();
      } else if (blocked_date) {
        await d1.prepare('DELETE FROM blocked_dates WHERE blocked_date = ?').bind(blocked_date).run();
      }
      return new Response(JSON.stringify({ success: true, message: 'ยกเลิกการปิดรับจองสำเร็จ' }), { headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error occurred' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
