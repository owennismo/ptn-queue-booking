// Cloudflare Pages Function: GET /api/admin/bookings
export async function onRequestGet(context: { request: Request; env: any }) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');

    const d1 = env.DB;
    if (!d1) {
      return new Response(JSON.stringify({ bookings: [] }), { headers: { 'Content-Type': 'application/json' } });
    }

    let query = 'SELECT * FROM bookings WHERE 1=1';
    const params: any[] = [];

    if (date) {
      query += ' AND requested_date = ?';
      params.push(date);
    }

    if (status && status !== 'All') {
      query += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (booking_id LIKE ? OR carrier_name LIKE ? OR client_name LIKE ? OR user_phone LIKE ? OR driver_name LIKE ? OR license_plate LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s, s, s);
    }

    query += ' ORDER BY requested_date DESC, requested_time ASC, created_at DESC';

    const res = await d1.prepare(query).bind(...params).all();

    return new Response(JSON.stringify({ bookings: res.results || [] }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error occurred' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
