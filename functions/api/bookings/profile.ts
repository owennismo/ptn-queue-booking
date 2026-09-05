import { DataStore } from '../_store';

export async function onRequestGet(context: { request: Request; env: any }) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const phone = url.searchParams.get('phone');
    const suggestions = url.searchParams.get('suggestions');

    const store = new DataStore(env);

    if (suggestions === 'true') {
      const data = await store.getFrequentSuggestions();
      return new Response(JSON.stringify({ success: true, ...data }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=60',
        },
      });
    }

    if (phone) {
      const result = await store.getLatestProfileByPhone(phone);
      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store',
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Missing query parameter (phone or suggestions)',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Error occurred' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }
}
