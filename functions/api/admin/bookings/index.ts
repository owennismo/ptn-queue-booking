import { DataStore } from '../../_store';

export async function onRequestGet(context: { request: Request; env: any }) {
  try {
    const { request, env } = context;
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
