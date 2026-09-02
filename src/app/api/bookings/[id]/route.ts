import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Booking } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing booking ID' }, { status: 400 });
    }

    const db = getDb();
    const booking = db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(id.trim().toUpperCase()) as Booking | undefined;

    if (!booking) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลการจอง' }, { status: 404 });
    }

    return NextResponse.json({ booking });
  } catch (error) {
    console.error('Error fetching booking by ID:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
