import { DataStore } from '../_store';
import { checkAuthHeader } from '../_jwt';

export async function onRequestGet(context: { request: Request; env: any }) {
  try {
    const { request, env } = context;

    // Verify JWT Token
    const auth = await checkAuthHeader(request);
    if (!auth.authorized) {
      return auth.errorResponse!;
    }

    // Strict Authorization: ONLY Super Admin can backup data
    const userRole = auth.payload?.role;
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'คุณไม่มีสิทธิ์ในการสำรองข้อมูลระบบ (สงวนสิทธิ์เฉพาะ Super Admin เท่านั้น)' }),
        { status: 403, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const operatorName = auth.payload?.operator || auth.payload?.full_name || 'Super Admin';
    const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';

    const store = new DataStore(env);
    const backupData = await store.getSystemBackupData(operatorName, clientIp);

    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const filename = `ptn-backup-${dateStr}.json`;

    return new Response(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error creating backup' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}

export async function onRequestPost(context: { request: Request; env: any }) {
  try {
    const { request, env } = context;

    // Verify JWT Token
    const auth = await checkAuthHeader(request);
    if (!auth.authorized) {
      return auth.errorResponse!;
    }

    // Strict Authorization: ONLY Super Admin can restore data
    const userRole = auth.payload?.role;
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'คุณไม่มีสิทธิ์ในการกู้คืนข้อมูลระบบ (สงวนสิทธิ์เฉพาะ Super Admin เท่านั้น)' }),
        { status: 403, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const body: any = await request.json();
    const { backup_data, mode = 'merge', confirm_code } = body;

    if (!backup_data) {
      return new Response(JSON.stringify({ error: 'ไม่พบข้อมูลไฟล์สำรอง (backup_data is required)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    if (mode === 'replace') {
      if (!confirm_code || confirm_code.trim().toUpperCase() !== 'RESTORE') {
        return new Response(
          JSON.stringify({ error: 'กรณีแทนที่ข้อมูลทั้งหมด (Full Replace) จำเป็นต้องพิมพ์ยืนยันคำว่า "RESTORE"' }),
          { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }
    }

    const operatorName = auth.payload?.operator || auth.payload?.full_name || 'Super Admin';
    const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';

    const store = new DataStore(env);
    const result = await store.restoreSystemData(backup_data, mode, operatorName, clientIp);

    return new Response(
      JSON.stringify({
        success: true,
        message: `กู้คืนข้อมูลระบบแบบ ${mode === 'replace' ? 'แทนที่ทั้งหมด' : 'ผสานข้อมูล'} สำเร็จเรียบร้อยแล้ว`,
        restored: result.restored,
      }),
      {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error restoring backup' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
