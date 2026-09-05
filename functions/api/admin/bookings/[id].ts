import { DataStore } from '../../_store';
import { checkAuthHeader } from '../../_jwt';
import { sendWebPushNotification } from '../../_vapid';

export async function onRequestPatch(context: { params: any; request: Request; env: any }) {
  try {
    const { params, request, env } = context;

    // Verify JWT Token
    const auth = await checkAuthHeader(request);
    if (!auth.authorized) {
      return auth.errorResponse!;
    }

    const id = params.id;
    const body: any = await request.json();
    const { status, admin_reason, actual_pallet_count, receiving_notes, received_by, receiving_photo_url } = body;
    const operatorName = auth.payload?.operator || 'Admin';
    const clientIp = request.headers.get('CF-Connecting-IP') || '127.0.0.1';

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
    const updated = await store.updateBookingStatus(
      id,
      status,
      admin_reason,
      operatorName,
      clientIp,
      {
        actual_pallet_count: actual_pallet_count !== undefined ? (parseInt(actual_pallet_count, 10) >= 0 ? parseInt(actual_pallet_count, 10) : null) : undefined,
        receiving_notes: receiving_notes !== undefined ? receiving_notes : undefined,
        received_by: received_by || operatorName,
        receiving_photo_url: receiving_photo_url !== undefined ? receiving_photo_url : undefined,
      }
    );

    if (!updated) {
      return new Response(JSON.stringify({ error: 'ไม่พบรายการจองนี้' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Send Real-Time Web Push Notification to booker device(s)
    try {
      const subscriptions = await store.getPushSubscriptions(id);
      if (subscriptions && subscriptions.length > 0) {
        let title = '🔔 อัปเดตสถานะคิวส่งสินค้า!';
        let body = `คิว ${updated.booking_id} (${updated.carrier_name}) เปลี่ยนสถานะเป็น "${status}"`;

        if (status === 'Approved') {
          title = '🎉 คิวส่งสินค้าได้รับการอนุมัติแล้ว!';
          body = `คิว ${updated.booking_id} (${updated.requested_date} ${updated.requested_time}) ได้รับการอนุมัติแล้ว พร้อมเข้าส่งสินค้าได้`;
        } else if (status === 'Rejected') {
          title = '❌ คิวส่งสินค้าไม่ได้รับการอนุมัติ';
          body = `คิว ${updated.booking_id}: ${updated.admin_reason || 'กรุณาตรวจสอบสาเหตุบนบัตรคิว'}`;
        } else if (status === 'CheckedIn') {
          title = '🚗 รถขนส่งเช็คอินเข้าพื้นที่แล้ว!';
          body = `คิว ${updated.booking_id} ตรวจสอบเข้าพื้นที่คลังสินค้าแล้ว กรุณารอเรียกเทียบท่า`;
        } else if (status === 'Receiving') {
          title = '📦 เริ่มการตรวจนับและลงสินค้า!';
          body = `คิว ${updated.booking_id} กำลังดำเนินการลงสินค้าที่คลังยา`;
        } else if (status === 'Completed') {
          title = '✨ ตรวจรับสินค้าเสร็จสิ้นสมบูรณ์!';
          body = `คิว ${updated.booking_id} ตรวจรับเสร็จสิ้นแล้ว ${updated.actual_pallet_count !== undefined && updated.actual_pallet_count !== null ? `(รับจริง ${updated.actual_pallet_count} ลัง)` : ''}`;
        } else if (status === 'Cancelled') {
          title = '🚫 คิวถูกยกเลิกแล้ว';
          body = `คิว ${updated.booking_id} ได้รับการยกเลิกเรียบร้อยแล้ว`;
        }

        const pushPayload = {
          title,
          body,
          booking_id: updated.booking_id,
          url: `/booking/${updated.booking_id}`,
        };

        // Fire push to all registered devices concurrently
        await Promise.allSettled(
          subscriptions.map(async (sub) => {
            const pushResult = await sendWebPushNotification(sub, pushPayload);
            // If subscription has expired (HTTP 410 Gone or 404 Not Found), purge it
            if (!pushResult.success && (pushResult.status === 410 || pushResult.status === 404)) {
              await store.removePushSubscription(sub.endpoint);
            }
          })
        );
      }
    } catch (pushErr) {
      console.warn('Web Push trigger notice:', pushErr);
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

    // Verify JWT Token
    const auth = await checkAuthHeader(request);
    if (!auth.authorized) {
      return auth.errorResponse!;
    }

    const id = params.id;
    const body: any = await request.json();
    const { cancellation_reason, confirm_code } = body;
    const operatorName = auth.payload?.operator || 'Admin';
    const clientIp = request.headers.get('CF-Connecting-IP') || '127.0.0.1';

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
      operatorName,
      clientIp
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

export async function onRequestDelete(context: { params: any; request: Request; env: any }) {
  try {
    const { params, request, env } = context;

    // Verify JWT Token
    const auth = await checkAuthHeader(request);
    if (!auth.authorized) {
      return auth.errorResponse!;
    }

    // Strict Authorization: ONLY Super Admin can delete bookings
    const userRole = auth.payload?.role;
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'คุณไม่มีสิทธิ์ในการลบรายการจองคิว (สงวนสิทธิ์เฉพาะ Super Admin เท่านั้น)' }),
        { status: 403, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const id = params.id;
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing booking ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const operatorName = auth.payload?.operator || auth.payload?.full_name || 'Super Admin';
    const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || '127.0.0.1';

    const store = new DataStore(env);
    const success = await store.deleteBooking(id, operatorName, clientIp);

    if (!success) {
      return new Response(JSON.stringify({ error: 'ไม่พบรายการจองนี้ หรือถูกลบไปแล้ว' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `ลบรายการจองคิว ${id} ออกจากระบบเรียบร้อยแล้ว`,
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
