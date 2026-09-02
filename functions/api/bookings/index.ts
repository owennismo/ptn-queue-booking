// Cloudflare Pages Function: POST & GET /api/bookings
export async function onRequestPost(context: { request: Request; env: any }) {
  try {
    const { request, env } = context;
    const body: any = await request.json();
    const {
      user_phone,
      carrier_name,
      client_name,
      pallet_count,
      vehicle_count,
      requested_date,
      requested_time,
      driver_name,
      license_plate,
      notes,
    } = body;

    if (!user_phone || !carrier_name || !client_name || !requested_date || !requested_time) {
      return new Response(
        JSON.stringify({ error: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (เบอร์โทร, บริษัทขนส่ง, บริษัทเจ้าของสินค้า, วันที่, และช่วงเวลา)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const pallets = parseInt(pallet_count, 10) || 1;
    const vehicles = parseInt(vehicle_count, 10) || 1;
    const cleanDate = requested_date.replace(/-/g, '');
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    const bookingId = `PTN-${cleanDate}-${randomChars}`;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const d1 = env.DB;
    if (d1) {
      // Check blocked date
      const blocked = await d1.prepare('SELECT * FROM blocked_dates WHERE blocked_date = ?').bind(requested_date).first();
      if (blocked) {
        return new Response(
          JSON.stringify({ error: `วันที่ ${requested_date} ปิดรับจองคิวชั่วคราว เนื่องจาก: ${blocked.reason}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      await d1.prepare(`
        INSERT INTO bookings (
          booking_id, user_phone, carrier_name, client_name,
          pallet_count, vehicle_count, requested_date, requested_time,
          driver_name, license_plate, notes, status, created_at
        ) VALUES (
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, 'Pending', ?
        )
      `).bind(
        bookingId,
        user_phone.trim(),
        carrier_name.trim(),
        client_name.trim(),
        pallets,
        vehicles,
        requested_date,
        requested_time,
        driver_name?.trim() || null,
        license_plate?.trim() || null,
        notes?.trim() || null,
        nowStr
      ).run();
    }

    const createdBooking = {
      booking_id: bookingId,
      user_phone,
      carrier_name,
      client_name,
      pallet_count: pallets,
      vehicle_count: vehicles,
      requested_date,
      requested_time,
      driver_name: driver_name || null,
      license_plate: license_plate || null,
      notes: notes || null,
      status: 'Pending',
      created_at: nowStr,
    };

    return new Response(
      JSON.stringify({
        success: true,
        message: 'จองคิวสำเร็จ กรุณาบันทึกรหัสการจองหรือดาวน์โหลดบัตรคิว',
        booking: createdBooking,
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

export async function onRequestGet(context: { request: Request; env: any }) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const phone = url.searchParams.get('phone');
    const id = url.searchParams.get('id');
    const d1 = env.DB;

    if (id && d1) {
      const booking = await d1.prepare('SELECT * FROM bookings WHERE booking_id = ?').bind(id.trim().toUpperCase()).first();
      if (!booking) {
        return new Response(JSON.stringify({ error: 'ไม่พบคิวการจองนี้ในระบบ' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ bookings: [booking] }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (phone && d1) {
      const cleanPhone = phone.trim().replace(/[- ]/g, '');
      const res = await d1.prepare(`
        SELECT * FROM bookings 
        WHERE REPLACE(REPLACE(user_phone, '-', ''), ' ', '') LIKE ?
        ORDER BY created_at DESC
      `).bind(`%${cleanPhone}%`).all();

      return new Response(JSON.stringify({ bookings: res.results || [] }), { headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ bookings: [] }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error occurred' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
