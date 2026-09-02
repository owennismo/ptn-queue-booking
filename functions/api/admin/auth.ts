import { DataStore } from '../_store';

export async function onRequestPost(context: { request: Request; env: any }) {
  try {
    const { request, env } = context;
    const body: any = await request.json();
    const { pin } = body;

    if (!pin) {
      return new Response(JSON.stringify({ error: 'กรุณากรอกรหัส PIN' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const store = new DataStore(env);
    const isValid = await store.verifyPin(pin);

    if (isValid) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'เข้าสู่ระบบสำเร็จ',
          token: 'ptn_admin_authenticated_' + Date.now(),
        }),
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    return new Response(JSON.stringify({ error: 'รหัส PIN ไม่ถูกต้อง' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error occurred' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
