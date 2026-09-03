import { DataStore } from '../_store';

export async function onRequestGet(context: { params: any; env: any }) {
  try {
    const { params, env } = context;
    const id = params.id;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing booking ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const store = new DataStore(env);
    const booking = await store.getBookingById(id);

    if (!booking) {
      return new Response(JSON.stringify({ error: 'ไม่พบข้อมูลการจอง' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    return new Response(JSON.stringify({ booking }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error occurred' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}

// User Self-Service Cancellation Endpoint
export async function onRequestPost(context: { params: any; request: Request; env: any }) {
  try {
    const { params, request, env } = context;
    const id = params.id;
    const body: any = await request.json().catch(() => ({}));
    const { action, reason } = body;
    const clientIp = request.headers.get('CF-Connecting-IP') || '127.0.0.1';

    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing booking ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const store = new DataStore(env);
    const cancelled = await store.cancelBookingByUser(id, reason, clientIp);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'ยกเลิกการจองคิวเรียบร้อยแล้ว',
        booking: cancelled,
      }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error occurred' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}

export async function onRequestPatch(context: { params: any; request: Request; env: any }) {
  return onRequestPost(context);
}
