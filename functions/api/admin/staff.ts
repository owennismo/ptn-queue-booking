import { DataStore } from '../_store';
import { checkAuthHeader } from '../_jwt';

export async function onRequestGet(context: { request: Request; env: any }) {
  try {
    const { request, env } = context;

    // 1. Verify JWT Token
    const auth = await checkAuthHeader(request);
    if (!auth.authorized) {
      return auth.errorResponse!;
    }

    // 2. Super Admin Check
    const role = auth.payload?.role;
    if (role !== 'super_admin' && role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'ปฏิเสธการเข้าถึง: ฟังก์ชันจัดการเจ้าหน้าที่สงวนสิทธิ์เฉพาะ Super Admin เท่านั้น' }),
        { status: 403, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const store = new DataStore(env);
    const staffList = await store.getAllStaff();

    return new Response(JSON.stringify({ staff: staffList }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error occurred' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}

export async function onRequestPost(context: { request: Request; env: any }) {
  try {
    const { request, env } = context;

    // 1. Verify JWT Token
    const auth = await checkAuthHeader(request);
    if (!auth.authorized) {
      return auth.errorResponse!;
    }

    // 2. Super Admin Check
    const role = auth.payload?.role;
    if (role !== 'super_admin' && role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'ปฏิเสธการเข้าถึง: ฟังก์ชันจัดการเจ้าหน้าที่สงวนสิทธิ์เฉพาะ Super Admin เท่านั้น' }),
        { status: 403, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const body: any = await request.json();
    const { action } = body;
    const store = new DataStore(env);
    const operatorName = auth.payload?.operator || 'Super Admin';
    const clientIp = request.headers.get('CF-Connecting-IP') || '127.0.0.1';

    // CREATE STAFF
    if (action === 'create') {
      const { username, full_name, pin, role: staffRole } = body;
      if (!username || !full_name || !pin || !staffRole) {
        return new Response(JSON.stringify({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน (ชื่อผู้ใช้, ชื่อ-นามสกุล, รหัส PIN, และบทบาท)' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      const created = await store.createStaff({ username, full_name, pin, role: staffRole }, operatorName, clientIp);
      return new Response(JSON.stringify({ success: true, message: `เพิ่มเจ้าหน้าที่ "${full_name}" สำเร็จ`, staff: created }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // UPDATE STAFF
    if (action === 'update') {
      const { id, full_name, role: staffRole, is_active, pin } = body;
      if (!id) {
        return new Response(JSON.stringify({ error: 'Missing staff ID' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      const updated = await store.updateStaff(id, { full_name, role: staffRole, is_active, pin }, operatorName, clientIp);
      return new Response(JSON.stringify({ success: true, message: 'บันทึกการแก้ไขข้อมูลสำเร็จ', staff: updated }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // DELETE STAFF
    if (action === 'delete') {
      const { id } = body;
      if (!id) {
        return new Response(JSON.stringify({ error: 'Missing staff ID' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      await store.deleteStaff(id, operatorName, clientIp);
      return new Response(JSON.stringify({ success: true, message: 'ลบบัญชีเจ้าหน้าที่เรียบร้อยแล้ว' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // RESET PIN
    if (action === 'reset_pin') {
      const { id, new_pin } = body;
      if (!id || !new_pin) {
        return new Response(JSON.stringify({ error: 'กรุณาระบุรหัส PIN ใหม่' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      await store.resetStaffPin(id, new_pin, operatorName, clientIp);
      return new Response(JSON.stringify({ success: true, message: 'รีเซ็ตรหัส PIN ใหม่สำเร็จ' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error occurred' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
