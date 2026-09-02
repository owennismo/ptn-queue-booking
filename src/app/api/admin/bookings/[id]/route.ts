import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Booking } from '@/lib/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, admin_reason, admin_action_by = 'Admin' } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing booking ID or status' }, { status: 400 });
    }

    const validStatuses = ['Pending', 'Approved', 'Rejected', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'สถานะไม่ถูกต้อง' }, { status: 400 });
    }

    // If status is Rejected, reason is mandatory
    if (status === 'Rejected' && (!admin_reason || !admin_reason.trim())) {
      return NextResponse.json({ error: 'กรณีปฏิเสธคิว (Reject) จำเป็นต้องระบุเหตุผล' }, { status: 400 });
    }

    const db = getDb();
    const booking = db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(id.trim().toUpperCase()) as Booking | undefined;

    if (!booking) {
      return NextResponse.json({ error: 'ไม่พบรายการจองนี้' }, { status: 404 });
    }

    const updateStmt = db.prepare(`
      UPDATE bookings 
      SET status = ?,
          admin_reason = ?,
          admin_action_date = datetime('now', 'localtime'),
          admin_action_by = ?
      WHERE booking_id = ?
    `);

    updateStmt.run(status, admin_reason?.trim() || null, admin_action_by, booking.booking_id);

    const updatedBooking = db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(booking.booking_id) as Booking;

    return NextResponse.json({
      success: true,
      message: `อัปเดตสถานะเป็น ${status} เรียบร้อยแล้ว`,
      booking: updatedBooking,
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Multi-Step Cancellation Endpoint
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { cancellation_reason, confirm_code, admin_action_by = 'Admin' } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing booking ID' }, { status: 400 });
    }

    const db = getDb();
    const booking = db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(id.trim().toUpperCase()) as Booking | undefined;

    if (!booking) {
      return NextResponse.json({ error: 'ไม่พบรายการจองนี้' }, { status: 404 });
    }

    // Step 1 check: Reason must not be empty
    if (!cancellation_reason || !cancellation_reason.trim()) {
      return NextResponse.json({ error: 'กรุณาระบุเหตุผลในการยกเลิกคิว' }, { status: 400 });
    }

    // Step 2 check: Double confirmation code match (either Booking ID or 'CONFIRM')
    const expectedCode = booking.booking_id.toUpperCase();
    if (!confirm_code || (confirm_code.trim().toUpperCase() !== expectedCode && confirm_code.trim().toUpperCase() !== 'CONFIRM')) {
      return NextResponse.json({ error: `รหัสยืนยันการยกเลิกไม่ถูกต้อง (กรุณากรอก '${booking.booking_id}' หรือ 'CONFIRM')` }, { status: 400 });
    }

    const updateStmt = db.prepare(`
      UPDATE bookings 
      SET status = 'Cancelled',
          admin_reason = ?,
          admin_action_date = datetime('now', 'localtime'),
          admin_action_by = ?
      WHERE booking_id = ?
    `);

    updateStmt.run(`[ยกเลิกคิว] ${cancellation_reason.trim()}`, admin_action_by, booking.booking_id);

    const cancelledBooking = db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(booking.booking_id) as Booking;

    return NextResponse.json({
      success: true,
      message: `ยกเลิกคิว ${booking.booking_id} เรียบร้อยแล้ว`,
      booking: cancelledBooking,
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
