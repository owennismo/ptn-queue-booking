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
    const { pin, operator_name = 'เจ้าหน้าที่คลังสินค้า' } = body;

    if (!pin) {
      return new Response(JSON.stringify({ error: 'กรุณากรอกรหัส PIN' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const isValid = await store.verifyPin(pin);

    if (isValid) {
      store.recordSuccessfulLogin(clientIp, clientIp, operator_name);
      
      // Issue cryptographically signed JWT Token (Valid 8 hours)
      const token = await createAdminToken({
        operator: operator_name,
        ip: clientIp,
      }, 28800);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'เข้าสู่ระบบสำเร็จ',
          token,
          expires_in: 28800,
          operator_name,
        }),
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Record failure
    const failInfo = store.recordFailedLogin(clientIp, clientIp);
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
        error: `รหัส PIN ไม่ถูกต้อง (เหลือโอกาสกรอกอีก ${failInfo.remainingAttempts} ครั้ง)`,
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
      expires_at: auth.payload?.exp,
    }),
    { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
  );
}
