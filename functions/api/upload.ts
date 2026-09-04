import { DataStore } from './_store';

export async function onRequestPost(context: { request: Request; env: any }) {
  try {
    const { request, env } = context;
    const contentType = request.headers.get('content-type') || '';

    let fileBuffer: ArrayBuffer | null = null;
    let mimeType = 'image/webp';
    let originalName = 'photo.webp';
    let bookingId = 'doc';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      bookingId = (formData.get('booking_id') as string) || 'doc';

      if (!file) {
        return new Response(JSON.stringify({ error: 'ไม่พบไฟล์รูปภาพที่ต้องการอัปโหลด' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      fileBuffer = await file.arrayBuffer();
      mimeType = file.type || 'image/webp';
      originalName = file.name || 'photo.webp';
    } else if (contentType.includes('application/json')) {
      const body: any = await request.json();
      const { dataUrl, filename, booking_id } = body;

      if (!dataUrl) {
        return new Response(JSON.stringify({ error: 'ไม่พบข้อมูล dataUrl ของรูปภาพ' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      bookingId = booking_id || 'doc';
      originalName = filename || 'photo.webp';

      // Parse Data URL: data:image/webp;base64,.....
      const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        mimeType = matches[1];
        const binaryStr = atob(matches[2]);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        fileBuffer = bytes.buffer;
      } else {
        return new Response(JSON.stringify({ error: 'รูปแบบ dataUrl ไม่ถูกต้อง' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    } else {
      return new Response(JSON.stringify({ error: 'Content-Type ต้องเป็น multipart/form-data หรือ application/json' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    if (!fileBuffer || fileBuffer.byteLength === 0) {
      return new Response(JSON.stringify({ error: 'ไฟล์รูปภาพว่างเปล่า' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Generate unique storage key: photos/YYYY-MM/PTN-XXX-timestamp-random.webp
    const d = new Date();
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'webp';
    const cleanBookingId = bookingId.replace(/[^a-zA-Z0-9_-]/g, '');
    const key = `photos/${yearMonth}/${cleanBookingId}-${timestamp}-${randomStr}.${ext}`;

    const store = new DataStore(env);
    const uploadResult = await store.savePhoto(key, fileBuffer, mimeType, {
      uploadedAt: d.toISOString(),
      originalName,
      bookingId: cleanBookingId,
      size: fileBuffer.byteLength,
    });

    return new Response(
      JSON.stringify({
        success: true,
        url: uploadResult.url,
        key: uploadResult.key,
        size: fileBuffer.byteLength,
        uploaded_at: d.toISOString(),
      }),
      {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  } catch (err: any) {
    console.error('Upload photo error:', err);
    return new Response(JSON.stringify({ error: err.message || 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
