import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Booking } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const db = getDb();

    let query = 'SELECT * FROM bookings WHERE 1=1';
    const params: any[] = [];

    if (date) {
      query += ' AND requested_date = ?';
      params.push(date);
    }

    if (status && status !== 'All') {
      query += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (booking_id LIKE ? OR carrier_name LIKE ? OR client_name LIKE ? OR user_phone LIKE ? OR driver_name LIKE ? OR license_plate LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s, s, s);
    }

    query += ' ORDER BY requested_date DESC, requested_time ASC, created_at DESC';

    const bookings = db.prepare(query).all(...params) as Booking[];

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('Error in admin bookings API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
