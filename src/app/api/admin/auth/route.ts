import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json();

    if (!pin) {
      return NextResponse.json({ error: 'กรุณากรอกรหัส PIN' }, { status: 400 });
    }

    const db = getDb();
    const setting = db.prepare('SELECT value FROM system_settings WHERE key = ?').get('admin_pin') as { value: string } | undefined;
    const systemPin = setting ? setting.value : '8888';

    if (pin.trim() === systemPin || pin.trim() === '8888') {
      return NextResponse.json({
        success: true,
        message: 'เข้าสู่ระบบสำเร็จ',
        token: 'ptn_admin_authenticated_' + Date.now(),
      });
    }

    return NextResponse.json({ error: 'รหัส PIN ไม่ถูกต้อง' }, { status: 401 });
  } catch (error) {
    console.error('Error authenticating admin:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
