import { DataStore } from '../../_store';
import { checkAuthHeader } from '../../_jwt';

export async function onRequestGet(context: { request: Request; env: any }) {
  try {
    const { request, env } = context;

    // Verify JWT Token
    const auth = await checkAuthHeader(request);
    if (!auth.authorized) {
      return auth.errorResponse!;
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');

    const store = new DataStore(env);
    const allReturns = await store.getAllReturnTickets();
    const filteredReturns = await store.getReturnTickets(status, search);

    const pendingPickupCount = allReturns.filter((r) => r.status === 'Pending_Pickup').length;
    const returnedCount = allReturns.filter((r) => r.status === 'Returned').length;
    const uniqueSuppliers = new Set(allReturns.map((r) => (r.supplier_name || '').trim().toLowerCase()).filter(Boolean)).size;

    const stats = {
      total: allReturns.length,
      pending_pickup: pendingPickupCount,
      returned: returnedCount,
      unique_suppliers: uniqueSuppliers,
    };

    return new Response(JSON.stringify({ returns: filteredReturns, stats }), {
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
    const {
      booking_id,
      supplier_name,
      carrier_name,
      contact_phone,
      items_detail,
      quantity,
      reason,
      storage_location,
      photos,
    } = body;

    if (!items_detail || !items_detail.trim()) {
      return new Response(JSON.stringify({ error: 'กรุณาระบุรายการสินค้าที่ต้องการตีคืน' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const operatorName = auth.payload?.operator || auth.payload?.full_name || 'Admin';
    const clientIp = request.headers.get('CF-Connecting-IP') || '127.0.0.1';

    const store = new DataStore(env);
    const newTicket = await store.createReturnTicket(
      {
        booking_id: booking_id || null,
        supplier_name: supplier_name || 'ไม่ระบุซัพพลายเออร์',
        carrier_name: carrier_name || null,
        contact_phone: contact_phone || null,
        items_detail: items_detail.trim(),
        quantity: quantity || '1 รายการ',
        reason: reason || 'ส่งผิดสเปก / สินค้าชำรุด',
        storage_location: storage_location || 'โซนพักสินค้าตีคืน (RTV)',
        photos: Array.isArray(photos) ? photos : [],
        created_by: operatorName,
      },
      operatorName,
      clientIp
    );

    return new Response(JSON.stringify({ success: true, return_ticket: newTicket }), {
      status: 201,
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
