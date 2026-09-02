// Cloudflare Pages Function: PATCH & POST /api/admin/bookings/:id
export async function onRequestPatch(context: { params: any; request: Request; env: any }) {
  try {
    const { params, request, env } = context;
    const id = params.id;
    const body: any = await request.json();
    const { status, admin_reason, admin_action_by = 'Admin' } = body;

    if (!id || !status) {
      return new Response(JSON.stringify({ error: 'Missing booking ID or status' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (status === 'Rejected' && (!admin_reason || !admin_reason.trim())) {
      return new Response(JSON.stringify({ error: 'กรณีปฏิเสธคิว (Reject) จำเป็นต้องระบุเหตุผล' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const d1 = env.DB;
    if (!d1) {
      return new Response(JSON.stringify({ error: 'Database not available' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const booking = await d1.prepare('SELECT * FROM bookings WHERE booking_id = ?').bind(id.trim().toUpperCase()).first();
    if (!booking) {
      return new Response(JSON.stringify({ error: 'ไม่พบรายการจองนี้' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await d1.prepare(`
      UPDATE bookings 
      SET status = ?,
          admin_reason = ?,
          admin_action_date = ?,
          admin_action_by = ?
      WHERE booking_id = ?
    `).bind(status, admin_reason?.trim() || null, nowStr, admin_action_by, booking.booking_id).run();

    const updated = await d1.prepare('SELECT * FROM bookings WHERE booking_id = ?').bind(booking.booking_id).first();

    return new Response(
      JSON.stringify({
        success: true,
        message: `อัปเดตสถานะเป็น ${status} เรียบร้อยแล้ว`,
        booking: updated,
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

export async function onRequestPost(context: { params: any; request: Request; env: any }) {
  try {
    const { params, request, env } = context;
    const id = params.id;
    const body: any = await request.json();
    const { cancellation_reason, confirm_code, admin_action_by = 'Admin' } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing booking ID' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!cancellation_reason || !cancellation_reason.trim()) {
      return new Response(JSON.stringify({ error: 'กรุณาระบุเหตุผลในการยกเลิกคิว' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const d1 = env.DB;
    if (!d1) {
      return new Response(JSON.stringify({ error: 'Database not available' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const booking = await d1.prepare('SELECT * FROM bookings WHERE booking_id = ?').bind(id.trim().toUpperCase()).first();
    if (!booking) {
      return new Response(JSON.stringify({ error: 'ไม่พบรายการจองนี้' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const expectedCode = booking.booking_id.toUpperCase();
    if (!confirm_code || (confirm_code.trim().toUpperCase() !== expectedCode && confirm_code.trim().toUpperCase() !== 'CONFIRM')) {
      return new Response(JSON.stringify({ error: `รหัสยืนยันการยกเลิกไม่ถูกต้อง (กรุณากรอก '${booking.booking_id}' หรือ 'CONFIRM')` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    await d1.prepare(`
      UPDATE bookings 
      SET status = 'Cancelled',
          admin_reason = ?,
          admin_action_date = ?,
          admin_action_by = ?
      WHERE booking_id = ?
    `).bind(`[ยกเลิกคิว] ${cancellation_reason.trim()}`, nowStr, admin_action_by, booking.booking_id).run();

    const cancelled = await d1.prepare('SELECT * FROM bookings WHERE booking_id = ?').bind(booking.booking_id).first();

    return new Response(
      JSON.stringify({
        success: true,
        message: `ยกเลิกคิว ${booking.booking_id} เรียบร้อยแล้ว`,
        booking: cancelled,
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
