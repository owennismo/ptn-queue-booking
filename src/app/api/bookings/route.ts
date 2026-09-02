import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Booking, BlockedDate, TimeSlot } from '@/lib/types';

function generateBookingId(dateStr: string): string {
  const cleanDate = dateStr.replace(/-/g, '');
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PTN-${cleanDate}-${randomChars}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_phone,
      carrier_name,
      client_name,
      pallet_count,
      vehicle_count,
      requested_date,
      requested_time,
      driver_name,
      license_plate,
      notes,
    } = body;

    // 1. Mandatory fields validation
    if (!user_phone || !carrier_name || !client_name || !requested_date || !requested_time) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (เบอร์โทร, บริษัทขนส่ง, บริษัทเจ้าของสินค้า, วันที่, และช่วงเวลา)' },
        { status: 400 }
      );
    }

    const pallets = parseInt(pallet_count, 10) || 1;
    const vehicles = parseInt(vehicle_count, 10) || 1;

    if (pallets < 1 || vehicles < 1) {
      return NextResponse.json({ error: 'จำนวนพาเลท/ลัง และจำนวนรถต้องไม่น้อยกว่า 1' }, { status: 400 });
    }

    const db = getDb();

    // 2. Check blocked date
    const blocked = db.prepare('SELECT * FROM blocked_dates WHERE blocked_date = ?').get(requested_date) as BlockedDate | undefined;
    if (blocked) {
      return NextResponse.json(
        { error: `วันที่ ${requested_date} ปิดรับจองคิวชั่วคราว เนื่องจาก: ${blocked.reason}` },
        { status: 400 }
      );
    }

    // 3. Check time slot validity & capacity
    const slot = db.prepare('SELECT * FROM time_slots WHERE slot_name = ? AND is_active = 1').get(requested_time) as TimeSlot | undefined;
    if (!slot) {
      return NextResponse.json({ error: 'ช่วงเวลาที่เลือกไม่เปิดให้บริการ' }, { status: 400 });
    }

    const bookedCount = (db.prepare(`
      SELECT COUNT(*) as count 
      FROM bookings 
      WHERE requested_date = ? AND requested_time = ? AND status IN ('Pending', 'Approved')
    `).get(requested_date, requested_time) as { count: number }).count;

    if (bookedCount >= slot.max_capacity) {
      return NextResponse.json(
        { error: `ช่วงเวลา ${requested_time} ของวันที่ ${requested_date} มีผู้จองเต็มแล้ว (รับได้สูงสุด ${slot.max_capacity} คิว)` },
        { status: 400 }
      );
    }

    // 4. Generate unique Booking ID and insert
    let bookingId = generateBookingId(requested_date);
    // Ensure uniqueness
    while (db.prepare('SELECT booking_id FROM bookings WHERE booking_id = ?').get(bookingId)) {
      bookingId = generateBookingId(requested_date);
    }

    const insertStmt = db.prepare(`
      INSERT INTO bookings (
        booking_id, user_phone, carrier_name, client_name,
        pallet_count, vehicle_count, requested_date, requested_time,
        driver_name, license_plate, notes, status, created_at
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, 'Pending', datetime('now', 'localtime')
      )
    `);

    insertStmt.run(
      bookingId,
      user_phone.trim(),
      carrier_name.trim(),
      client_name.trim(),
      pallets,
      vehicles,
      requested_date,
      requested_time,
      driver_name?.trim() || null,
      license_plate?.trim() || null,
      notes?.trim() || null
    );

    const createdBooking = db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(bookingId) as Booking;

    return NextResponse.json({
      success: true,
      message: 'จองคิวสำเร็จ กรุณาบันทึกรหัสการจองหรือดาวน์โหลดบัตรคิว',
      booking: createdBooking,
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const id = searchParams.get('id');

    const db = getDb();

    if (id) {
      const booking = db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(id.trim().toUpperCase()) as Booking | undefined;
      if (!booking) {
        return NextResponse.json({ error: 'ไม่พบคิวการจองนี้ในระบบ' }, { status: 404 });
      }
      return NextResponse.json({ bookings: [booking] });
    }

    if (phone) {
      const cleanPhone = phone.trim().replace(/[- ]/g, '');
      const bookings = db.prepare(`
        SELECT * FROM bookings 
        WHERE REPLACE(REPLACE(user_phone, '-', ''), ' ', '') LIKE ?
        ORDER BY created_at DESC
      `).all(`%${cleanPhone}%`) as Booking[];

      return NextResponse.json({ bookings });
    }

    return NextResponse.json({ error: 'ต้องระบุ Booking ID หรือเบอร์โทรศัพท์' }, { status: 400 });
  } catch (error) {
    console.error('Error searching bookings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
