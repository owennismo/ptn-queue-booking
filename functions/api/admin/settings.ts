import { DataStore } from '../_store';

export async function onRequestGet(context: { env: any }) {
  try {
    const { env } = context;
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
    const body: any = await request.json();
    const { action } = body;
    const store = new DataStore(env);

    if (action === 'update_slot') {
      const { id, max_capacity, is_active } = body;
      await store.updateSlot(id, parseInt(max_capacity, 10), !!is_active);
      return new Response(JSON.stringify({ success: true, message: 'บันทึกการตั้งค่ารอบเวลาสำเร็จ' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    if (action === 'add_blocked_date') {
      const { blocked_date, reason } = body;
      await store.addBlockedDate(blocked_date, reason.trim());
      return new Response(JSON.stringify({ success: true, message: `ปิดรับจองวันที่ ${blocked_date} สำเร็จ` }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    if (action === 'remove_blocked_date') {
      const { id, blocked_date } = body;
      await store.removeBlockedDate(id || blocked_date);
      return new Response(JSON.stringify({ success: true, message: 'ยกเลิกการปิดรับจองสำเร็จ' }), {
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
