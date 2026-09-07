import { DataStore, Booking, TimeSlot } from './_store';

function getBangkokDateTime(): { todayStr: string; tomorrowStr: string; timeStr: string } {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const ty = tomorrow.getFullYear();
  const tm = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const td = String(tomorrow.getDate()).padStart(2, '0');

  return {
    todayStr: `${y}-${m}-${d}`,
    tomorrowStr: `${ty}-${tm}-${td}`,
    timeStr: `${hh}:${mm}`,
  };
}

export async function onRequestPost(context: { request: Request; env: any }) {
  try {
    const { request, env } = context;
    const body: any = await request.json();
    const userMessage: string = (body.message || '').trim();
    const history: Array<{ role: 'user' | 'model'; text: string }> = Array.isArray(body.history) ? body.history : [];

    if (!userMessage) {
      return new Response(JSON.stringify({ success: false, error: 'กรุณากรอกข้อความ' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const store = new DataStore(env);
    const settings = await store.getPublicSettings();
    const { todayStr, tomorrowStr, timeStr } = getBangkokDateTime();

    // 1. Gather Real-Time Context
    const [todayAvail, tomorrowAvail, allBookings] = await Promise.all([
      store.getAvailability(todayStr),
      store.getAvailability(tomorrowStr),
      store.getAllBookings(),
    ]);

    // 2. Search for Relevant Bookings (by Booking ID, Phone, License Plate, Driver, Client)
    const cleanQuery = userMessage.toLowerCase().replace(/[-\s]/g, '');
    const phoneDigits = userMessage.replace(/\D/g, '');

    const matchedBookings: Booking[] = allBookings
      .filter((b) => {
        const idMatch = b.booking_id && userMessage.toUpperCase().includes(b.booking_id.toUpperCase());
        const phoneMatch = phoneDigits.length >= 8 && b.user_phone && b.user_phone.replace(/\D/g, '').includes(phoneDigits);
        const plateMatch = b.license_plate && userMessage.replace(/\s/g, '').includes(b.license_plate.replace(/\s/g, ''));
        const driverMatch = b.driver_name && b.driver_name.length > 2 && userMessage.includes(b.driver_name);
        const clientMatch = b.client_name && b.client_name.length > 2 && userMessage.includes(b.client_name);
        return idMatch || phoneMatch || plateMatch || driverMatch || clientMatch;
      })
      .slice(0, 3); // Take top 3 most relevant

    // 3. Check for Gemini API Key (from Cloudflare Env or System Settings)
    const geminiApiKey = (env.GEMINI_API_KEY || settings.gemini_api_key || '').trim();

    // 4. Try Gemini 1.5 Flash if API Key is available
    if (geminiApiKey) {
      try {
        const geminiReply = await callGeminiFlash(geminiApiKey, {
          userMessage,
          history,
          todayStr,
          tomorrowStr,
          timeStr,
          settings,
          todayAvail,
          tomorrowAvail,
          matchedBookings,
        });

        if (geminiReply) {
          return new Response(
            JSON.stringify({
              success: true,
              reply: geminiReply,
              source: 'gemini',
              matchedBookings: matchedBookings.map(sanitizeBookingForClient),
            }),
            {
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            }
          );
        }
      } catch (geminiError: any) {
        console.warn('Gemini 1.5 Flash call failed, falling back to rule-based engine:', geminiError);
      }
    }

    // 5. Intelligent Rule-Based Fallback Engine
    const fallbackReply = generateFallbackReply({
      userMessage,
      todayStr,
      tomorrowStr,
      settings,
      todayAvail,
      tomorrowAvail,
      matchedBookings,
    });

    return new Response(
      JSON.stringify({
        success: true,
        reply: fallbackReply,
        source: 'system',
        matchedBookings: matchedBookings.map(sanitizeBookingForClient),
      }),
      {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Error processing chat message',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
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

function sanitizeBookingForClient(b: Booking) {
  return {
    booking_id: b.booking_id,
    requested_date: b.requested_date,
    requested_time: b.requested_time,
    carrier_name: b.carrier_name,
    client_name: b.client_name,
    pallet_count: b.pallet_count,
    driver_name: b.driver_name,
    license_plate: b.license_plate,
    cargo_type: b.cargo_type,
    status: b.status,
    admin_reason: b.admin_reason,
  };
}

// Gemini 1.5 Flash API Caller
async function callGeminiFlash(
  apiKey: string,
  context: {
    userMessage: string;
    history: Array<{ role: 'user' | 'model'; text: string }>;
    todayStr: string;
    tomorrowStr: string;
    timeStr: string;
    settings: any;
    todayAvail: any;
    tomorrowAvail: any;
    matchedBookings: Booking[];
  }
): Promise<string | null> {
  const { userMessage, history, todayStr, tomorrowStr, timeStr, settings, todayAvail, tomorrowAvail, matchedBookings } = context;

  const systemInstruction = `
คุณคือ "น้องฟาร์มา (PTN AI Assistant)" ผู้ช่วยอัจฉริยะประจำคลังสินค้าของ ${settings.company_name} (พัฒนาเภสัช)
บุคลิกภาพ: สุภาพ น่ารัก เป็นมิตร ให้บริการด้วยความกระตือรือร้น ใช้สรรพนามแทนตัวเองว่า "น้องฟาร์มา" หรือ "ทีมงาน" และลงท้ายด้วย ครับ/ค่ะ อย่างเหมาะสม
หน้าที่ของคุณ:
1. ช่วยเหลือผู้ขับขี่และบริษัทขนส่ง เช็คสถานะการจองคิวส่งของ
2. ตอบรอบเวลาว่างและแนะนำการจองคิว
3. ให้ข้อมูลเวลาทำการ ที่ตั้งคลัง เบอร์ติดต่อ และระเบียบการส่งของ

[ข้อมูลคลังสินค้าปัจจุบัน]
- วันที่และเวลาปัจจุบัน: ${todayStr} เวลา ${timeStr} น.
- วันพรุ่งนี้: ${tomorrowStr}
- เวลาทำการคลังสินค้า: วันจันทร์ - วันเสาร์ เวลา 08:30 - 17:30 น. (ปิดทำการทุกวันอาทิตย์)
- รอบเวลามาตรฐาน: รอบเช้า 09:30 - 12:30 น. และ รอบบ่าย 14:00 - 17:00 น.
- เบอร์โทรศัพท์ติดต่อแผนกรับสินค้า: ${settings.contact_phone || '099-378-7463'}
- LINE Official: ${settings.contact_line_id || '@ptnexpress'} (${settings.contact_line_url || ''})
- ที่อยู่คลัง: ${settings.warehouse_address || 'บริษัท พีทีเอ็น ฟาร์มาเซ็นเตอร์ จำกัด'}
- ข้อปฏิบัติ: ขอให้ผู้ส่งเดินทางมาถึงก่อนเวลานัดหมาย 15-30 นาที และเตรียมเปิด QR Code จากบัตรคิวดิจิทัลแสดงต่อเจ้าหน้าที่หน้าประตู

[ข้อมูลความจุรอบเวลาส่งของ]
- วันนี้ (${todayStr}): ${
    todayAvail.is_blocked
      ? `ปิดรับจอง (${todayAvail.block_reason})`
      : todayAvail.slots.map((s: any) => `${s.slot_name}: ว่าง ${s.available_slots}/${s.max_capacity} คิว`).join(', ')
  }
- วันพรุ่งนี้ (${tomorrowStr}): ${
    tomorrowAvail.is_blocked
      ? `ปิดรับจอง (${tomorrowAvail.block_reason})`
      : tomorrowAvail.slots.map((s: any) => `${s.slot_name}: ว่าง ${s.available_slots}/${s.max_capacity} คิว`).join(', ')
  }

[ข้อมูลคิวที่ตรวจพบล่าสุดในระบบ (${matchedBookings.length} รายการ)]
${
  matchedBookings.length > 0
    ? matchedBookings
        .map(
          (b) =>
            `- รหัส: ${b.booking_id} | วันที่: ${b.requested_date} | รอบเวลา: ${b.requested_time} | ขนส่ง: ${b.carrier_name} | คู่ค้า: ${b.client_name} | ทะเบียน: ${b.license_plate || '-'} | สินค้า: ${b.cargo_type} (${b.pallet_count} ลัง) | สถานะ: ${b.status} ${b.admin_reason ? `(เหตุผล: ${b.admin_reason})` : ''}`
        )
        .join('\n')
    : 'ไม่พบรายการคิวที่ตรงกับคำค้นหาโดยตรง (หากผู้ใช้ถามหาสถานะคิว ให้แนะนำให้พิมพ์รหัสจอง เช่น PTN-... หรือเบอร์โทรศัพท์ 10 หลัก)'
}

คำแนะนำในการตอบ:
- ตอบด้วยข้อความกระชับ อ่านง่ายบนหน้าจอมือถือ ใช้เครื่องหมาย bullet หรือ emoji ช่วยให้อ่านสบายตา
- หากพบคิวของผู้ใช้ ให้สรุป วันที่, รอบเวลา, ทะเบียนรถ และสถานะ (เช่น อนุมัติแล้ว ให้เตรียม QR Code มาแสดง)
- หากคิวอยู่ในสถานะ "รอตรวจสอบ" ให้แจ้งว่าเจ้าหน้าที่กำลังตรวจสอบ จะทราบผลล่วงหน้า
- หากสถานะ "ไม่อนุมัติ (Rejected)" ให้อธิบายเหตุผลของแอดมินอย่างสุภาพ
- หากถามเรื่องจองคิว ให้แนะนำลิงก์หน้าแรก / เพื่อทำการกดจองได้เลย
`.trim();

  // Prepare messages payload for Gemini 1.5 Flash
  const contents = [];
  for (const h of history.slice(-4)) {
    if (h.text && (h.role === 'user' || h.role === 'model')) {
      contents.push({
        role: h.role,
        parts: [{ text: h.text }],
      });
    }
  }

  contents.push({
    role: 'user',
    parts: [{ text: userMessage }],
  });

  const candidateModels = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];
  let lastError = null;

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 800,
          },
        }),
      });

      if (resp.ok) {
        const data: any = await resp.json();
        const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidate) return candidate;
      } else {
        const errorText = await resp.text();
        lastError = new Error(`Model ${model} returned HTTP ${resp.status}: ${errorText}`);
      }
    } catch (e: any) {
      lastError = e;
    }
  }

  if (lastError) throw lastError;
  return null;
}

// Rule-Based Smart Fallback Engine
function generateFallbackReply(context: {
  userMessage: string;
  todayStr: string;
  tomorrowStr: string;
  settings: any;
  todayAvail: any;
  tomorrowAvail: any;
  matchedBookings: Booking[];
}): string {
  const { userMessage, todayStr, tomorrowStr, settings, todayAvail, tomorrowAvail, matchedBookings } = context;
  const msg = userMessage.toLowerCase();

  // 1. If matched specific bookings
  if (matchedBookings.length > 0) {
    const b = matchedBookings[0];
    const statusMap: Record<string, string> = {
      Pending: '🟡 รอตรวจสอบ (Pending)',
      Approved: '🟢 อนุมัติแล้ว (Approved)',
      CheckedIn: '🔵 เข้าเทียบท่าแล้ว (Checked-in)',
      Receiving: '🔵 กำลังลงสินค้า (Receiving)',
      Completed: '🟣 เสร็จสิ้นแล้ว (Completed)',
      Rejected: '🔴 ไม่อนุมัติ (Rejected)',
      Cancelled: '⚫ ยกเลิกแล้ว (Cancelled)',
    };

    let reply = `📦 **ผลการตรวจสอบคิวของคุณ**\n\n`;
    reply += `• **รหัสการจอง**: \`${b.booking_id}\`\n`;
    reply += `• **สถานะปัจจุบัน**: ${statusMap[b.status] || b.status}\n`;
    reply += `• **วัน-เวลานัดหมาย**: ${b.requested_date} (${b.requested_time})\n`;
    reply += `• **บริษัทขนส่ง**: ${b.carrier_name || '-'}\n`;
    if (b.license_plate) reply += `• **ทะเบียนรถ**: ${b.license_plate}\n`;
    reply += `• **จำนวนสินค้า**: ${b.pallet_count} ลัง (${b.cargo_type || 'ยาทั่วไป'})\n`;

    if (b.status === 'Approved') {
      reply += `\n✅ **คิวได้รับการอนุมัติเรียบร้อยแล้วค่ะ**\nกรุณาเดินทางมาถึงก่อนเวลานัด 15-30 นาที และนำ **QR Code บัตรคิว** แสดงต่อเจ้าหน้าที่หน้าประตูนะคะ 📱`;
    } else if (b.status === 'Pending') {
      reply += `\n⏳ **อยู่ระหว่างรอเจ้าหน้าที่คลังตรวจสอบ**\nเจ้าหน้าที่จะดำเนินการพิจารณาโดยเร็วค่ะ สามารถนำรหัสคิวมาเช็คสถานะอัปเดตได้ตลอดเวลานะคะ`;
    } else if (b.status === 'Rejected') {
      reply += `\n⚠️ **คิวไม่ผ่านการอนุมัติ**\nเหตุผล: ${b.admin_reason || 'ข้อมูลไม่ตรงหรือรอบเวลาเต็ม'}\nกรุณาติดต่อแผนกรับสินค้า หรือทำการจองคิวรอบเวลาใหม่ค่ะ`;
    }

    return reply;
  }

  // 2. Questions about Availability / Slots
  if (msg.includes('รอบ') || msg.includes('ว่าง') || msg.includes('กี่โมง') || msg.includes('จอง') || msg.includes('พรุ่งนี้') || msg.includes('วันนี้')) {
    let reply = `🕒 **สรุปรอบเวลาว่างสำหรับเข้าส่งสินค้า**\n\n`;

    reply += `📅 **วันนี้ (${todayStr})**:\n`;
    if (todayAvail.is_blocked) {
      reply += `• ปิดรับจอง: ${todayAvail.block_reason}\n`;
    } else {
      todayAvail.slots.forEach((s: any) => {
        reply += `• รอบ ${s.slot_name}: ว่าง **${s.available_slots}** คิว (เต็ม ${s.max_capacity})\n`;
      });
    }

    reply += `\n📅 **วันพรุ่งนี้ (${tomorrowStr})**:\n`;
    if (tomorrowAvail.is_blocked) {
      reply += `• ปิดรับจอง: ${tomorrowAvail.block_reason}\n`;
    } else {
      tomorrowAvail.slots.forEach((s: any) => {
        reply += `• รอบ ${s.slot_name}: ว่าง **${s.available_slots}** คิว (เต็ม ${s.max_capacity})\n`;
      });
    }

    reply += `\n👉 สามารถกดจองคิวออนไลน์ได้ทันทีที่หน้าแรกของระบบนะคะ`;
    return reply;
  }

  // 3. Questions about Contact / Phone / Address / Hours
  if (msg.includes('ติดต่อ') || msg.includes('เบอร์') || msg.includes('โทร') || msg.includes('แผนที่') || msg.includes('ที่อยู่') || msg.includes('พิกัด') || msg.includes('เปิด') || msg.includes('ปิด')) {
    return `🏢 **ข้อมูลติดต่อและเวลาทำการคลังสินค้า**\n\n` +
      `• **บริษัท**: ${settings.company_name}\n` +
      `• **เวลาทำการ**: วันจันทร์ - เสาร์ 08:30 - 17:30 น. (ปิดวันอาทิตย์)\n` +
      `• **เบอร์โทรแผนกรับสินค้า**: 📞 [${settings.contact_phone || '099-378-7463'}](tel:${(settings.contact_phone || '0993787463').replace(/-/g, '')})\n` +
      `• **LINE Official**: [${settings.contact_line_id || '@ptnexpress'}](${settings.contact_line_url || 'https://line.me/ti/p/~ptnexpress'})\n` +
      `• **ที่อยู่**: ${settings.warehouse_address || 'บริษัท พีทีเอ็น ฟาร์มาเซ็นเตอร์ จำกัด (พัฒนาเภสัช)'}\n\n` +
      `💡 *ข้อแนะนำ: กรุณาเดินทางมาถึงก่อนรอบเวลานัดหมาย 15-30 นาทีนะคะ*`;
  }

  // 4. Questions about rules / cold chain
  if (msg.includes('เย็น') || msg.includes('cold') || msg.includes('ยา') || msg.includes('เอกสาร') || msg.includes('กฎ')) {
    return `💊 **ข้อปฏิบัติในการเข้าส่งยาและเวชภัณฑ์**\n\n` +
      `1. **สินค้าควบคุมอุณหภูมิ (Cold Chain 2-8°C)**: คลังมีช่องเทียบท่าและห้องจัดเก็บยาเย็นโดยเฉพาะ กรุณาระบุประเภทสินค้าเป็นยาควบคุมอุณหภูมิตอนจองคิว\n` +
      `2. **การเตรียมเอกสาร**: เตรียมใบส่งของ (Delivery Order / Invoice) ตัวจริงเพื่อส่งมอบให้ฝ่ายตรวจรับ\n` +
      `3. **การเข้าเทียบท่า**: แสดง QR Code จากบัตรคิวดิจิทัลให้เจ้าหน้าที่สแกนเมื่อถึงประตูทางเข้า\n` +
      `4. **การแต่งกาย**: สวมรองเท้าหุ้มส้นและเสื้อผ้าสุภาพเพื่อความปลอดภัยในพื้นที่คลังสินค้าค่ะ`;
  }

  // 5. Default Greeting / General Assistant
  return `สวัสดีค่ะ! น้องฟาร์มา (PTN AI Assistant) ยินดีให้บริการค่ะ 🚚✨\n\n` +
    `สามารถสอบถามน้องฟาร์มาได้เลยนะคะ เช่น:\n` +
    `• **เช็คสถานะคิว**: พิมพ์รหัสจอง (เช่น \`PTN-...\`), เบอร์โทร หรือ ทะเบียนรถ\n` +
    `• **สอบถามรอบว่าง**: พิมพ์ *"พรุ่งนี้เช้ามีคิวว่างไหม"*\n` +
    `• **ติดต่อคลัง**: พิมพ์ *"ขอเบอร์โทรคลัง"* หรือ *"เวลาทำการ"*\n\n` +
    `ต้องการให้น้องฟาร์มาช่วยเหลือเรื่องใดแจ้งได้เลยค่ะ! 😊`;
}
