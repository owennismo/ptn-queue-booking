import { DataStore } from '../_store';
import { createAdminToken, checkAuthHeader } from '../_jwt';

export async function onRequestPost(context: { request: Request; env: any }) {
  try {
    const { request, env } = context;
    const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '127.0.0.1';
    const store = new DataStore(env);

    // 1. Check Rate Limit / Lockout
    const rateLimit = store.checkRateLimit(clientIp);
    if (rateLimit.isLocked) {
      const minutes = Math.ceil(rateLimit.remainingLockoutSeconds / 60);
      return new Response(
        JSON.stringify({
          error: `ระบบถูกระงับการเข้าสู่ระบบชั่วคราวเนื่องจากกรอกรหัสผิดเกิน 5 ครั้ง กรุณารออีก ${minutes} นาที`,
          is_locked: true,
          remaining_seconds: rateLimit.remainingLockoutSeconds,
        }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const body: any = await request.json();
    const { username, pin } = body;

    if (!pin) {
      return new Response(JSON.stringify({ error: 'กรุณากรอกรหัส PIN' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // 2. Authenticate Staff Member
    const staff = await store.authenticateStaff(username || '', pin);

    if (staff) {
      store.recordSuccessfulLogin(clientIp, clientIp, staff.full_name, staff.role_name);

      // Issue JWT Token with Staff Role & Identity
      const token = await createAdminToken({
        staff_id: staff.id,
        username: staff.username,
        operator: staff.full_name,
        role: staff.role, // 'super_admin' | 'warehouse_officer' | 'security_gate'
        role_name: staff.role_name,
        ip: clientIp,
      }, 28800);

      return new Response(
        JSON.stringify({
          success: true,
          message: `เข้าสู่ระบบสำเร็จ: ยินดีต้อนรับ ${staff.full_name}`,
          token,
          expires_in: 28800,
          staff: {
            id: staff.id,
            username: staff.username,
            full_name: staff.full_name,
            role: staff.role,
            role_name: staff.role_name,
          },
        }),
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Record failure
    const failInfo = store.recordFailedLogin(clientIp, clientIp, username || 'PIN');
    if (failInfo.isLocked) {
      return new Response(
        JSON.stringify({
          error: 'คุณกรอกรหัสผิดครบ 5 ครั้งแล้ว ระบบถูกระงับการเข้าสู่ระบบชั่วคราวเป็นเวลา 15 นาที เพื่อความปลอดภัย',
          is_locked: true,
          remaining_attempts: 0,
          remaining_seconds: failInfo.remainingLockoutSeconds,
        }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    return new Response(
      JSON.stringify({
        error: `ชื่อผู้ใช้หรือรหัส PIN ไม่ถูกต้อง (เหลือโอกาสกรอกอีก ${failInfo.remainingAttempts} ครั้ง)`,
        remaining_attempts: failInfo.remainingAttempts,
        is_locked: false,
      }),
      { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error occurred' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}

// Token verification / Session check endpoint
export async function onRequestGet(context: { request: Request }) {
  const { request } = context;
  const auth = await checkAuthHeader(request);
  if (!auth.authorized) {
    return auth.errorResponse!;
  }

  return new Response(
    JSON.stringify({
      valid: true,
      operator: auth.payload?.operator || 'Admin',
      role: auth.payload?.role || 'warehouse_officer',
      role_name: auth.payload?.role_name || 'เจ้าหน้าที่',
      expires_at: auth.payload?.exp,
    }),
    { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
  );
}
