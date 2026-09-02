import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();

    // Helper to format date in YYYY-MM-DD
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Stats for Today
    const todayStats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved
      FROM bookings 
      WHERE requested_date = ?
    `).get(todayStr) as { total: number; pending: number; approved: number };

    // Stats for Tomorrow
    const tomorrowStats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved
      FROM bookings 
      WHERE requested_date = ?
    `).get(tomorrowStr) as { total: number; pending: number; approved: number };

    // Total Pending All Time
    const totalPendingAll = (db.prepare(`
      SELECT COUNT(*) as count FROM bookings WHERE status = 'Pending'
    `).get() as { count: number }).count;

    return NextResponse.json({
      today_date: todayStr,
      tomorrow_date: tomorrowStr,
      today_total: todayStats.total || 0,
      today_pending: todayStats.pending || 0,
      today_approved: todayStats.approved || 0,
      tomorrow_total: tomorrowStats.total || 0,
      tomorrow_pending: tomorrowStats.pending || 0,
      tomorrow_approved: tomorrowStats.approved || 0,
      total_pending_all: totalPendingAll || 0,
      notification_message: `พรุ่งนี้ (${tomorrowStr}) มีคิวที่ต้องรับการจัดการทั้งหมด ${tomorrowStats.total || 0} รายการ (อนุมัติแล้ว ${tomorrowStats.approved || 0} รายการ, รอตรวจสอบ ${tomorrowStats.pending || 0} รายการ)`,
    });
  } catch (error) {
    console.error('Error fetching forecast:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
