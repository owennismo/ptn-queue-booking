// Cloudflare Pages Function: GET /api/bookings/:id
export async function onRequestGet(context: { params: any; env: any }) {
  try {
    const { params, env } = context;
    const id = params.id;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing booking ID' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const d1 = env.DB;
    if (d1) {
      const booking = await d1.prepare('SELECT * FROM bookings WHERE booking_id = ?').bind(id.trim().toUpperCase()).first();
      if (booking) {
        return new Response(JSON.stringify({ booking }), { headers: { 'Content-Type': 'application/json' } });
      }
    }

    return new Response(JSON.stringify({ error: 'ไม่พบข้อมูลการจอง' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error occurred' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
