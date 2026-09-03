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

    const store = new DataStore(env);
    const settingsData = await store.getSettings();

    return new Response(JSON.stringify(settingsData), {
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

    // Verify JWT Token
    const auth = await checkAuthHeader(request);
    if (!auth.authorized) {
      return auth.errorResponse!;
    }

    const body: any = await request.json();
    const { action } = body;
    const store = new DataStore(env);
    const operatorName = auth.payload?.operator || 'Admin';
    const clientIp = request.headers.get('CF-Connecting-IP') || '127.0.0.1';

    // 1. UPDATE SINGLE SLOT
    if (action === 'update_slot') {
      const { id, max_capacity, is_active } = body;
      await store.updateSlot(id, parseInt(max_capacity, 10), !!is_active, operatorName, clientIp);
      return new Response(JSON.stringify({ success: true, message: 'บันทึกการตั้งค่ารอบเวลาสำเร็จ (มีผลทันทีทุกวัน)' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // 2. ADD NEW TIME SLOT
    if (action === 'add_slot') {
      const { slot_name, start_time, end_time, max_capacity } = body;
      if (!slot_name || !start_time || !end_time) {
        return new Response(JSON.stringify({ error: 'กรุณากรอกข้อมูลรอบเวลาให้ครบถ้วน' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      const newSlot = await store.addSlot({ slot_name, start_time, end_time, max_capacity: parseInt(max_capacity, 10) || 3 }, operatorName, clientIp);
      return new Response(JSON.stringify({ success: true, message: `เพิ่มรอบเวลา ${newSlot.slot_name} สำเร็จ (มีผลทันทีทุกวัน)`, slot: newSlot }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // 3. DELETE TIME SLOT
    if (action === 'delete_slot') {
      const { id } = body;
      await store.deleteSlot(parseInt(id, 10), operatorName, clientIp);
      return new Response(JSON.stringify({ success: true, message: 'ลบรอบเวลาเรียบร้อยแล้ว (มีผลทันทีทุกวัน)' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // 4. BATCH UPDATE ALL SLOTS CAPACITY
    if (action === 'batch_update_capacity') {
      const { max_capacity } = body;
      const cap = parseInt(max_capacity, 10);
      if (isNaN(cap) || cap < 1) {
        return new Response(JSON.stringify({ error: 'จำนวนความจุต้องเป็นตัวเลขมากกว่า 0' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      await store.batchUpdateSlots(cap, operatorName, clientIp);
      return new Response(JSON.stringify({ success: true, message: `ปรับความจุทุกรอบเวลาเป็น ${cap} คิวเรียบร้อยแล้ว (มีผลทันทีทุกวัน)` }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // 4.1 REORDER TIME SLOTS
    if (action === 'reorder_slots') {
      const { slots } = body;
      if (!Array.isArray(slots)) {
        return new Response(JSON.stringify({ error: 'ข้อมูลรอบเวลาไม่ถูกต้อง' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      const updated = await store.reorderTimeSlots(slots, operatorName, clientIp);
      return new Response(JSON.stringify({ success: true, message: 'บันทึกลำดับการแสดงผลของรอบเวลาเรียบร้อยแล้ว', slots: updated }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // 4.2 AUTO SORT TIME SLOTS CHRONOLOGICALLY
    if (action === 'auto_sort_slots') {
      const updated = await store.autoSortTimeSlots(operatorName, clientIp);
      return new Response(JSON.stringify({ success: true, message: 'จัดเรียงรอบเวลาตามเวลาเริ่มต้นเรียบร้อยแล้ว (08:00 -> 17:00)', slots: updated }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // 5. ADD BLOCKED DATE
    if (action === 'add_blocked_date') {
      const { blocked_date, reason } = body;
      await store.addBlockedDate(blocked_date, reason.trim(), operatorName, clientIp);
      return new Response(JSON.stringify({ success: true, message: `ปิดรับจองวันที่ ${blocked_date} สำเร็จ (มีผลทันที)` }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // 6. REMOVE BLOCKED DATE
    if (action === 'remove_blocked_date') {
      const { id, blocked_date } = body;
      await store.removeBlockedDate(id || blocked_date, operatorName, clientIp);
      return new Response(JSON.stringify({ success: true, message: 'ยกเลิกการปิดรับจองสำเร็จ (เปิดรับคิวตามปกติทันที)' }), {
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
