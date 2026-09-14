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

    // Build supplier breakdown
    const supplierMap = new Map<string, {
      name: string;
      carrier?: string | null;
      phone?: string | null;
      pending_count: number;
      returned_count: number;
      total: number;
    }>();

    allReturns.forEach((r) => {
      const name = (r.supplier_name || 'ไม่ระบุซัพพลายเออร์').trim();
      const key = name.toLowerCase();
      const existing = supplierMap.get(key) || {
        name,
        carrier: r.carrier_name,
        phone: r.contact_phone,
        pending_count: 0,
        returned_count: 0,
        total: 0,
      };
      if (r.status === 'Pending_Pickup') existing.pending_count++;
      if (r.status === 'Returned') existing.returned_count++;
      existing.total++;
      if (!existing.phone && r.contact_phone) existing.phone = r.contact_phone;
      if (!existing.carrier && r.carrier_name) existing.carrier = r.carrier_name;
      supplierMap.set(key, existing);
    });

    const supplierList = Array.from(supplierMap.values()).sort(
      (a, b) => b.pending_count - a.pending_count || b.total - a.total
    );

    const pendingSuppliersCount = supplierList.filter((s) => s.pending_count > 0).length;

    const stats = {
      total: allReturns.length,
      pending_pickup: pendingPickupCount,
      returned: returnedCount,
      unique_suppliers: pendingSuppliersCount > 0 ? pendingSuppliersCount : supplierList.length,
    };

    return new Response(JSON.stringify({ returns: filteredReturns, stats, suppliers: supplierList }), {
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
      invoice_or_po_no,
      notes,
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
        invoice_or_po_no: invoice_or_po_no || null,
        notes: notes || null,
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
