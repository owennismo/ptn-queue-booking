import { DataStore, getBangkokDateTime } from '../_store';
import { checkAuthHeader } from '../_jwt';

export async function onRequestGet(context: { request: Request; env: any }) {
  try {
    const { request, env } = context;

    // Verify JWT Token
    const auth = await checkAuthHeader(request);
    if (!auth.authorized) {
      return auth.errorResponse!;
    }

    const store = new DataStore(env);
    const { todayStr, tomorrowStr } = getBangkokDateTime();

    const allBookings = await store.getAdminBookings();

    const todayBookings = allBookings.filter((b) => b.requested_date === todayStr);
    const tomorrowBookings = allBookings.filter((b) => b.requested_date === tomorrowStr);
    const totalPending = allBookings.filter((b) => b.status === 'Pending').length;
    const overdueCount = allBookings.filter((b: any) => Boolean(b.is_overdue)).length;

    const todayTotal = todayBookings.length;
    const todayPending = todayBookings.filter((b) => b.status === 'Pending').length;
    const todayApproved = todayBookings.filter((b) => b.status === 'Approved').length;

    const tomorrowTotal = tomorrowBookings.length;
    const tomorrowPending = tomorrowBookings.filter((b) => b.status === 'Pending').length;
    const tomorrowApproved = tomorrowBookings.filter((b) => b.status === 'Approved').length;

    const formatThaiNumeric = (dStr: string) => {
      try {
        const [y, m, d] = dStr.split('-');
        return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${parseInt(y, 10) + 543}`;
      } catch (e) {
        return dStr;
      }
    };

    const tomorrowThai = formatThaiNumeric(tomorrowStr);

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
        overdue_count: overdueCount,
        notification_message: `พรุ่งนี้ (${tomorrowThai}) มีคิวที่ต้องรับการจัดการทั้งหมด ${tomorrowTotal} รายการ (อนุมัติแล้ว ${tomorrowApproved} รายการ, รอตรวจสอบ ${tomorrowPending} รายการ)`,
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
