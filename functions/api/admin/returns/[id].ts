import { DataStore } from '../../_store';
import { checkAuthHeader } from '../../_jwt';

export async function onRequestPatch(context: { params: any; request: Request; env: any }) {
  try {
    const { params, request, env } = context;

    // Verify JWT Token
    const auth = await checkAuthHeader(request);
    if (!auth.authorized) {
      return auth.errorResponse!;
    }

    const id = params.id;
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing return ticket ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const body: any = await request.json();
    const {
      status,
      driver_name,
      driver_license_plate,
      handover_notes,
      pod_photo_urls,
      photos,
      items_detail,
      quantity,
      reason,
      storage_location,
      supplier_name,
      carrier_name,
      contact_phone,
      invoice_or_po_no,
      notes,
    } = body;

    const store = new DataStore(env);
    const existing = await store.getReturnTicketById(id);
    if (!existing) {
      return new Response(JSON.stringify({ error: 'ไม่พบรายการสินค้าตีคืนนี้' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const operatorName = auth.payload?.operator || auth.payload?.full_name || 'Admin';
    const clientIp = request.headers.get('CF-Connecting-IP') || '127.0.0.1';

    const updates: any = {};
    if (status !== undefined) updates.status = status;
    if (driver_name !== undefined) updates.driver_name = driver_name;
    if (driver_license_plate !== undefined) updates.driver_license_plate = driver_license_plate;
    if (handover_notes !== undefined) updates.handover_notes = handover_notes;
    if (pod_photo_urls !== undefined) updates.pod_photo_urls = Array.isArray(pod_photo_urls) ? pod_photo_urls : [];
    if (photos !== undefined) updates.photos = Array.isArray(photos) ? photos : [];
    if (items_detail !== undefined) updates.items_detail = items_detail;
    if (quantity !== undefined) updates.quantity = quantity;
    if (reason !== undefined) updates.reason = reason;
    if (storage_location !== undefined) updates.storage_location = storage_location;
    if (supplier_name !== undefined) updates.supplier_name = supplier_name;
    if (carrier_name !== undefined) updates.carrier_name = carrier_name;
    if (contact_phone !== undefined) updates.contact_phone = contact_phone;
    if (invoice_or_po_no !== undefined) updates.invoice_or_po_no = invoice_or_po_no;
    if (notes !== undefined) updates.notes = notes;

    const updated = await store.updateReturnTicket(id, updates, operatorName, clientIp);

    return new Response(JSON.stringify({ success: true, return_ticket: updated }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error occurred' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}

export async function onRequestDelete(context: { params: any; request: Request; env: any }) {
  try {
    const { params, request, env } = context;

    // Verify JWT Token
    const auth = await checkAuthHeader(request);
    if (!auth.authorized) {
      return auth.errorResponse!;
    }

    const id = params.id;
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing return ticket ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const operatorName = auth.payload?.operator || auth.payload?.full_name || 'Admin';
    const clientIp = request.headers.get('CF-Connecting-IP') || '127.0.0.1';

    const store = new DataStore(env);
    const deleted = await store.deleteReturnTicket(id, operatorName, clientIp);
    if (!deleted) {
      return new Response(JSON.stringify({ error: 'ไม่พบรายการสินค้าตีคืนที่ต้องการลบ' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error occurred' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
