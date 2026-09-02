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
