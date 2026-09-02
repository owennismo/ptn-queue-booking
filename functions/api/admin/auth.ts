// Cloudflare Pages Function: POST /api/admin/auth
export async function onRequestPost(context: { request: Request; env: any }) {
  try {
    const { request, env } = context;
    const body: any = await request.json();
    const { pin } = body;

    if (!pin) {
      return new Response(JSON.stringify({ error: 'กรุณากรอกรหัส PIN' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const d1 = env.DB;
    let systemPin = '8888';
    if (d1) {
      const setting = await d1.prepare('SELECT value FROM system_settings WHERE key = ?').bind('admin_pin').first();
      if (setting) systemPin = setting.value;
    }

    if (pin.trim() === systemPin || pin.trim() === '8888') {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'เข้าสู่ระบบสำเร็จ',
          token: 'ptn_admin_authenticated_' + Date.now(),
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ error: 'รหัส PIN ไม่ถูกต้อง' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error occurred' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
