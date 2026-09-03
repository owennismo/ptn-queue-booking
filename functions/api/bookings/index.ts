import { DataStore } from '../_store';

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
      vehicle_type,
      cargo_type,
      notes,
    } = body;

    if (!user_phone || !carrier_name || !client_name || !requested_date || !requested_time) {
      return new Response(
        JSON.stringify({ error: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (เบอร์โทร, บริษัทขนส่ง, บริษัทเจ้าของสินค้า, วันที่, และช่วงเวลา)' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const store = new DataStore(env);
    const avail = await store.getAvailability(requested_date);
    if (avail.is_blocked) {
      return new Response(
        JSON.stringify({ error: `วันที่ ${requested_date} ปิดรับจองคิวชั่วคราว: ${avail.block_reason || 'ปิดทำการ'}` }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const booking = await store.createBooking({
      user_phone,
      carrier_name,
      client_name,
      pallet_count,
      vehicle_count,
      requested_date,
      requested_time,
      driver_name,
      license_plate,
      vehicle_type,
      cargo_type,
      notes,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'จองคิวสำเร็จ กรุณาบันทึกรหัสการจองหรือดาวน์โหลดบัตรคิว',
        booking,
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

export async function onRequestGet(context: { request: Request; env: any }) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const phone = url.searchParams.get('phone');
    const id = url.searchParams.get('id');

    const store = new DataStore(env);
    const bookings = await store.searchBookings(phone || undefined, id || undefined);

    if (id && bookings.length === 0) {
      return new Response(JSON.stringify({ error: 'ไม่พบคิวการจองนี้ในระบบ' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

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
