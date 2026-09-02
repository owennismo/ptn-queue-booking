import { DataStore } from '../../_store';

export async function onRequestPatch(context: { params: any; request: Request; env: any }) {
  try {
    const { params, request, env } = context;
    const id = params.id;
    const body: any = await request.json();
    const { status, admin_reason, admin_action_by = 'Admin' } = body;

    if (!id || !status) {
      return new Response(JSON.stringify({ error: 'Missing booking ID or status' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    if (status === 'Rejected' && (!admin_reason || !admin_reason.trim())) {
      return new Response(JSON.stringify({ error: 'กรณีปฏิเสธคิว (Reject) จำเป็นต้องระบุเหตุผล' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const store = new DataStore(env);
    const updated = await store.updateBookingStatus(id, status, admin_reason, admin_action_by);

    if (!updated) {
      return new Response(JSON.stringify({ error: 'ไม่พบรายการจองนี้' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `อัปเดตสถานะเป็น ${status} เรียบร้อยแล้ว`,
        booking: updated,
      }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error occurred' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
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
      return new Response(JSON.stringify({ error: 'Missing booking ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    if (!cancellation_reason || !cancellation_reason.trim()) {
      return new Response(JSON.stringify({ error: 'กรุณาระบุเหตุผลในการยกเลิกคิว' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const store = new DataStore(env);
    const booking = await store.getBookingById(id);
    if (!booking) {
      return new Response(JSON.stringify({ error: 'ไม่พบรายการจองนี้' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const expectedCode = booking.booking_id.toUpperCase();
    if (!confirm_code || (confirm_code.trim().toUpperCase() !== expectedCode && confirm_code.trim().toUpperCase() !== 'CONFIRM')) {
      return new Response(JSON.stringify({ error: `รหัสยืนยันการยกเลิกไม่ถูกต้อง (กรุณากรอก '${booking.booking_id}' หรือ 'CONFIRM')` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const cancelled = await store.updateBookingStatus(
      id,
      'Cancelled',
      `[ยกเลิกคิว] ${cancellation_reason.trim()}`,
      admin_action_by
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: `ยกเลิกคิว ${booking.booking_id} เรียบร้อยแล้ว`,
        booking: cancelled,
      }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error occurred' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
