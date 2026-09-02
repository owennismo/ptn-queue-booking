// Cloudflare Pages Function: GET /api/admin/forecast
export async function onRequestGet(context: { env: any }) {
  try {
    const { env } = context;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    let todayTotal = 0;
    let todayPending = 0;
    let todayApproved = 0;
    let tomorrowTotal = 0;
    let tomorrowPending = 0;
    let tomorrowApproved = 0;
    let totalPendingAll = 0;

    const d1 = env.DB;
    if (d1) {
      const todayRes = await d1.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved
        FROM bookings 
        WHERE requested_date = ?
      `).bind(todayStr).first();

      if (todayRes) {
        todayTotal = todayRes.total || 0;
        todayPending = todayRes.pending || 0;
        todayApproved = todayRes.approved || 0;
      }

      const tomorrowRes = await d1.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved
        FROM bookings 
        WHERE requested_date = ?
      `).bind(tomorrowStr).first();

      if (tomorrowRes) {
        tomorrowTotal = tomorrowRes.total || 0;
        tomorrowPending = tomorrowRes.pending || 0;
        tomorrowApproved = tomorrowRes.approved || 0;
      }

      const totalPendingRes = await d1.prepare(`
        SELECT COUNT(*) as count FROM bookings WHERE status = 'Pending'
      `).first();

      if (totalPendingRes) {
        totalPendingAll = totalPendingRes.count || 0;
      }
    }

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
        total_pending_all: totalPendingAll,
        notification_message: `พรุ่งนี้ (${tomorrowStr}) มีคิวที่ต้องรับการจัดการทั้งหมด ${tomorrowTotal} รายการ (อนุมัติแล้ว ${tomorrowApproved} รายการ, รอตรวจสอบ ${tomorrowPending} รายการ)`,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error occurred' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
