import { DataStore } from '../_store';
import { checkAuthHeader } from '../_jwt';

export async function onRequestGet(context: { request: Request; env: any }) {
  try {
    const { request, env } = context;

    // Verify JWT Token
    const auth = await checkAuthHeader(request);
    if (!auth.authorized) {
      return auth.errorResponse!;
    }

    const role = auth.payload?.role;
    const store = new DataStore(env);
    let logs = await store.getAuditLogs(100);

    // Strict Access Control: Super Admin ONLY
    if (role !== 'super_admin' && role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'คุณไม่มีสิทธิ์ในการดูประวัติการใช้งาน (สงวนสิทธิ์เฉพาะ Super Admin เท่านั้น)' }),
        { status: 403, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    return new Response(JSON.stringify({ logs }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error occurred' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
