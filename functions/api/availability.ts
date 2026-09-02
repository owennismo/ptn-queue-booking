import { DataStore } from './_store';

export async function onRequestGet(context: { request: Request; env: any }) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const date = url.searchParams.get('date');

    if (!date) {
      return new Response(JSON.stringify({ error: 'Date parameter is required (YYYY-MM-DD)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const store = new DataStore(env);
    const result = await store.getAvailability(date);

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Internal Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
