import { DataStore } from '../_store';

export async function onRequestGet(context: { env: any }) {
  try {
    const { env } = context;
    const store = new DataStore(env);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const allBookings = await store.getAdminBookings();

    const todayBookings = allBookings.filter((b) => b.requested_date === todayStr);
    const tomorrowBookings = allBookings.filter((b) => b.requested_date === tomorrowStr);
    const totalPending = allBookings.filter((b) => b.status === 'Pending').length;

    const todayTotal = todayBookings.length;
    const todayPending = todayBookings.filter((b) => b.status === 'Pending').length;
    const todayApproved = todayBookings.filter((b) => b.status === 'Approved').length;

    const tomorrowTotal = tomorrowBookings.length;
    const tomorrowPending = tomorrowBookings.filter((b) => b.status === 'Pending').length;
    const tomorrowApproved = tomorrowBookings.filter((b) => b.status === 'Approved').length;

    return new Response(
      JSON.stringify({
        today_date: todayStr,
        tomorrow_date: tomorrowStr,
        today_total: todayTotal,
        today_pending: todayPending,
        today_approved: todayApproved,
        tomorrow_total: tomorrowTotal,
        tomorrow_pending: tomorrowPending,
        tomorrow_approved: tomorrowApproved,
        total_pending_all: totalPending,
        notification_message: `พรุ่งนี้ (${tomorrowStr}) มีคิวที่ต้องรับการจัดการทั้งหมด ${tomorrowTotal} รายการ (อนุมัติแล้ว ${tomorrowApproved} รายการ, รอตรวจสอบ ${tomorrowPending} รายการ)`,
      }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error occurred' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
