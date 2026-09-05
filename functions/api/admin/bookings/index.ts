import { DataStore } from '../../_store';
import { checkAuthHeader } from '../../_jwt';

export async function onRequestGet(context: { request: Request; env: any }) {
  try {
    const { request, env } = context;

    // Verify JWT Token
    const auth = await checkAuthHeader(request);
    if (!auth.authorized) {
      return auth.errorResponse!;
    }

    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');

    const store = new DataStore(env);
    const bookings = await store.getAdminBookings(date, status, search);

    return new Response(JSON.stringify({ bookings }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error occurred' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}

export async function onRequestDelete(context: { request: Request; env: any }) {
  try {
    const { request, env } = context;

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

    const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';
    const store = new DataStore(env);
    const operatorName = auth.payload?.operator || auth.payload?.full_name || 'Super Admin';

    // Check if request provided specific booking IDs to delete
    let body: any = null;
    try {
      const text = await request.text();
      if (text && text.trim()) {
        body = JSON.parse(text);
      }
    } catch (e) {
      body = null;
    }

    const idsToDelete = (body && (body.ids || body.booking_ids)) as string[] | undefined;

    if (Array.isArray(idsToDelete) && idsToDelete.length > 0) {
      const result = await store.deleteBookings(idsToDelete, operatorName, clientIp);
      return new Response(
        JSON.stringify({
          success: true,
          message: `ลบรายการจองคิวที่เลือกเรียบร้อยแล้ว (${result.deleted_count} รายการ)`,
          deleted_count: result.deleted_count,
          not_found: result.not_found,
        }),
        {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // Otherwise, fallback to clear all bookings
    const count = await store.clearAllBookings(operatorName, clientIp);

    return new Response(
      JSON.stringify({
        success: true,
        message: `ล้างข้อมูลคิวจองทั้งหมดสำเร็จ (${count} รายการ)`,
        deleted_count: count,
      }),
      {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error occurred' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
