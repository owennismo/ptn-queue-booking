import { DataStore } from '../_store';
import { sendWebPushNotification } from '../_vapid';

export async function onRequestPost(context: { request: Request; env: any }) {
  try {
    const { request, env } = context;
    const body: any = await request.json();
    const { booking_id, subscription } = body;

    if (!booking_id || !subscription || !subscription.endpoint || !subscription.keys) {
      return new Response(
        JSON.stringify({ error: 'ข้อมูลไม่ครบถ้วน (ต้องการ booking_id และ subscription)' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const store = new DataStore(env);
    const saved = await store.savePushSubscription(booking_id, subscription);

    if (!saved) {
      return new Response(
        JSON.stringify({ error: 'ไม่สามารถบันทึก Subscription ได้' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Send an immediate welcome confirmation push
    try {
      await sendWebPushNotification(subscription, {
        title: '✅ เปิดรับการแจ้งเตือนสำเร็จ!',
        body: `อุปกรณ์นี้พร้อมรับแจ้งเตือนเมื่อคิว ${booking_id} มีการเปลี่ยนสถานะหรือได้รับการอนุมัติ`,
        booking_id,
        url: `/booking/${booking_id}`,
      });
    } catch (pushErr) {
      console.warn('Welcome push delivery note:', pushErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'ลงทะเบียนรับการแจ้งเตือนทาง Web Push สำเร็จ',
        booking_id,
      }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'เกิดข้อผิดพลาดในการบันทึก Push Subscription' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
