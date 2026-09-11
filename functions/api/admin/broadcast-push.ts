import { DataStore, PushSubscriptionRecord } from '../_store';
import { checkAuthHeader } from '../_jwt';
import { sendWebPushNotification } from '../_vapid';

export async function onRequestGet(context: { request: Request; env: any }) {
  try {
    const { request, env } = context;

    // Verify JWT Token
    const auth = await checkAuthHeader(request);
    if (!auth.authorized) {
      return auth.errorResponse!;
    }

    const store = new DataStore(env);
    const subs = await store.getAllPushSubscriptions();

    return new Response(
      JSON.stringify({
        success: true,
        count: subs.length,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Error fetching push subscription count' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

export async function onRequestPost(context: { request: Request; env: any }) {
  try {
    const { request, env } = context;

    // Verify JWT Token
    const auth = await checkAuthHeader(request);
    if (!auth.authorized) {
      return auth.errorResponse!;
    }

    // Strict Authorization: ONLY Super Admin can send broadcast announcements
    const userRole = auth.payload?.role;
    if (userRole !== 'super_admin') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'คุณไม่มีสิทธิ์ส่งบรอดแคสต์ประกาศ (สงวนสิทธิ์เฉพาะ Super Admin เท่านั้น)',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const body: any = await request.json();
    const announcementText = (body.body || body.announcement || '').trim();
    const announcementTitle = (body.title || '📢 ประกาศสำคัญจากคลังสินค้า PTN').trim();
    const targetUrl = (body.url || '/').trim();

    if (!announcementText) {
      return new Response(
        JSON.stringify({ success: false, error: 'กรุณากรอกข้อความประกาศที่ต้องการส่ง' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const store = new DataStore(env);
    const subs: PushSubscriptionRecord[] = await store.getAllPushSubscriptions();

    if (!subs || subs.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          total: 0,
          sent: 0,
          failed: 0,
          message: 'ยังไม่มีอุปกรณ์ที่ลงทะเบียนรับการแจ้งเตือนในระบบ',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const operatorName = auth.payload?.operator || auth.payload?.full_name || 'Admin';
    const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';

    let sentCount = 0;
    let failedCount = 0;
    const expiredEndpoints: string[] = [];

    // Push payload definition
    const payload = {
      title: announcementTitle,
      body: announcementText,
      icon: '/icon-192.png',
      badge: '/favicon.png',
      tag: 'ptn-announcement',
      url: targetUrl,
    };

    // Send push notifications concurrently in batches of 15 to avoid overloading
    const BATCH_SIZE = 15;
    for (let i = 0; i < subs.length; i += BATCH_SIZE) {
      const batch = subs.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (sub) => {
          const res = await sendWebPushNotification(sub, payload);
          return { sub, res };
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { sub, res } = result.value;
          if (res.success) {
            sentCount++;
          } else {
            failedCount++;
            // 404 Not Found or 410 Gone indicates subscription has expired or user unsubscribed
            if (res.status === 404 || res.status === 410) {
              expiredEndpoints.push(sub.endpoint);
            }
          }
        } else {
          failedCount++;
        }
      }
    }

    // Automatically clean up expired endpoints from KV store
    if (expiredEndpoints.length > 0) {
      await store.removePushSubscriptions(expiredEndpoints);
    }

    // Record Audit Log
    store.addAuditLog(
      'BROADCAST_PUSH',
      `บรอดแคสต์ประกาศ "${announcementTitle}": ส่งสำเร็จ ${sentCount}/${subs.length} เครื่อง (ล้มเหลว ${failedCount})`,
      operatorName,
      clientIp
    );

    return new Response(
      JSON.stringify({
        success: true,
        total: subs.length,
        sent: sentCount,
        failed: failedCount,
        expired_pruned: expiredEndpoints.length,
        message: `บรอดแคสต์ข้อความแจ้งเตือนสำเร็จ ${sentCount} เครื่อง จากทั้งหมด ${subs.length} เครื่อง`,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'เกิดข้อผิดพลาดในการบรอดแคสต์ข้อความ' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
