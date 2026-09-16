import { DataStore, Booking, ReturnTicket } from '../_store';
import { checkAuthHeader } from '../_jwt';

function getBangkokToday(): { todayStr: string; year: number; month: number; day: number } {
  const bangkokDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  const year = bangkokDate.getFullYear();
  const month = bangkokDate.getMonth() + 1;
  const day = bangkokDate.getDate();
  const todayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { todayStr, year, month, day };
}

function formatDateShift(daysAgo: number): string {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  now.setDate(now.getDate() - daysAgo);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function onRequestGet(context: { request: Request; env: any }) {
  try {
    const { request, env } = context;

    // 1. Authenticate Bearer JWT
    const auth = await checkAuthHeader(request);
    if (!auth.authorized) {
      return auth.errorResponse!;
    }

    // 2. Role Check: Super Admin, Admin, Supervisor, and Warehouse Officer
    const role = auth.payload?.role;
    if (role !== 'super_admin' && role !== 'admin' && role !== 'supervisor' && role !== 'warehouse_officer') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'ปฏิเสธการเข้าถึง: ฟังก์ชันวิเคราะห์ข้อมูลเชิงลึกสงวนสิทธิ์เฉพาะ Super Admin, Supervisor และเจ้าหน้าที่คลังสินค้าเท่านั้น',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    const url = new URL(request.url);
    const range = url.searchParams.get('range') || '7d';
    const customStart = url.searchParams.get('start_date');
    const customEnd = url.searchParams.get('end_date');

    const { todayStr, year, month } = getBangkokToday();

    let startDate = formatDateShift(7);
    let endDate = todayStr;

    if (range === 'today') {
      startDate = todayStr;
      endDate = todayStr;
    } else if (range === '7d') {
      startDate = formatDateShift(6);
      endDate = todayStr;
    } else if (range === '30d') {
      startDate = formatDateShift(29);
      endDate = todayStr;
    } else if (range === 'this_month') {
      startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      endDate = todayStr;
    } else if (range === 'all') {
      startDate = '2020-01-01';
      endDate = '2030-12-31';
    } else if (range === 'custom') {
      if (customStart) startDate = customStart;
      if (customEnd) endDate = customEnd;
    }

    const store = new DataStore(env);
    const allBookings = await store.getAllBookings();

    // Filter bookings within date range
    const filtered = allBookings.filter((b: Booking) => {
      if (!b.requested_date) return false;
      return b.requested_date >= startDate && b.requested_date <= endDate;
    });

    // 3. Compute Summary KPIs
    const totalBookings = filtered.length;
    let completedCount = 0;
    let cancelledCount = 0;
    let rejectedCount = 0;
    let overdueCount = 0;
    let onTimeCount = 0;
    let totalPallets = 0;
    let totalVehicles = 0;
    let coldChainCount = 0;

    let totalDwellMinutes = 0;
    let dwellCount = 0;

    // Slot distribution map
    const slotMap = new Map<string, { count: number; pallets: number; vehicles: number }>();
    // Carrier scorecard map
    const carrierMap = new Map<
      string,
      { total: number; completed: number; onTime: number; pallets: number; dwellMinutes: number; dwellCount: number }
    >();
    // Client leaderboard map
    const clientMap = new Map<string, { total: number; pallets: number }>();
    // Cargo type map
    const cargoMap = new Map<string, number>();
    // Vehicle type map
    const vehicleMap = new Map<string, number>();
    // Daily trend map
    const dailyMap = new Map<string, { total: number; completed: number; pallets: number; overdue: number }>();

    filtered.forEach((b: Booking) => {
      const isCompleted = b.status === 'Completed';
      const isCancelled = b.status === 'Cancelled';
      const isRejected = b.status === 'Rejected';

      if (isCompleted) completedCount++;
      if (isCancelled) cancelledCount++;
      if (isRejected) rejectedCount++;

      const pCount = Number(b.pallet_count) || 1;
      const vCount = Number(b.vehicle_count) || 1;
      totalPallets += pCount;
      totalVehicles += vCount;

      // Cold chain detection
      const cargo = b.cargo_type || 'ยาและเวชภัณฑ์ทั่วไป (Room Temp 15-30°C)';
      const isCold = cargo.includes('2-8°C') || cargo.includes('Chilled') || cargo.includes('ชีววัตถุ') || cargo.includes('วัคซีน');
      if (isCold) coldChainCount++;

      // On-time check
      let isOverdue = false;
      if (!isCompleted && !isCancelled && !isRejected) {
        if (b.requested_date < todayStr) {
          isOverdue = true;
          overdueCount++;
        }
      }

      const isOnTime = !isOverdue && !isCancelled && !isRejected;
      if (isOnTime) onTimeCount++;

      // Estimate turnaround / dwell time (minutes)
      let dwell = 30; // default baseline average 30 mins
      if (b.admin_action_date && b.created_at) {
        try {
          const startMs = new Date(b.created_at).getTime();
          const endMs = new Date(b.admin_action_date).getTime();
          const diffMin = Math.round((endMs - startMs) / (1000 * 60));
          if (diffMin > 5 && diffMin < 300) {
            dwell = diffMin;
          }
        } catch (e) {}
      }
      if (isCompleted) {
        totalDwellMinutes += dwell;
        dwellCount++;
      }

      // Slot Map
      const slotKey = b.requested_time || 'ไม่ระบุรอบเวลา';
      const slotItem = slotMap.get(slotKey) || { count: 0, pallets: 0, vehicles: 0 };
      slotItem.count++;
      slotItem.pallets += pCount;
      slotItem.vehicles += vCount;
      slotMap.set(slotKey, slotItem);

      // Carrier Map
      const carrierKey = (b.carrier_name || 'ไม่ระบุขนส่ง').trim();
      const carrierItem = carrierMap.get(carrierKey) || {
        total: 0,
        completed: 0,
        onTime: 0,
        pallets: 0,
        dwellMinutes: 0,
        dwellCount: 0,
      };
      carrierItem.total++;
      if (isCompleted) carrierItem.completed++;
      if (isOnTime) carrierItem.onTime++;
      carrierItem.pallets += pCount;
      if (isCompleted) {
        carrierItem.dwellMinutes += dwell;
        carrierItem.dwellCount++;
      }
      carrierMap.set(carrierKey, carrierItem);

      // Client Map
      const clientKey = (b.client_name || 'ไม่ระบุเจ้าของสินค้า').trim();
      const clientItem = clientMap.get(clientKey) || { total: 0, pallets: 0 };
      clientItem.total++;
      clientItem.pallets += pCount;
      clientMap.set(clientKey, clientItem);

      // Cargo Map
      cargoMap.set(cargo, (cargoMap.get(cargo) || 0) + 1);

      // Vehicle Map
      const vehicleKey = b.vehicle_type || 'รถกระบะ 4 ล้อ (ตู้ทึบ/คอก)';
      vehicleMap.set(vehicleKey, (vehicleMap.get(vehicleKey) || 0) + 1);

      // Daily Map
      const dateKey = b.requested_date;
      const dailyItem = dailyMap.get(dateKey) || { total: 0, completed: 0, pallets: 0, overdue: 0 };
      dailyItem.total++;
      if (isCompleted) dailyItem.completed++;
      dailyItem.pallets += pCount;
      if (isOverdue) dailyItem.overdue++;
      dailyMap.set(dateKey, dailyItem);
    });

    const onTimeRate = totalBookings > 0 ? Math.round((onTimeCount / totalBookings) * 100) : 100;
    const avgDwellMinutes = dwellCount > 0 ? Math.round(totalDwellMinutes / dwellCount) : 30;
    const coldChainShare = totalBookings > 0 ? Math.round((coldChainCount / totalBookings) * 100) : 0;

    // Format Slot Distribution
    const peakSlots = Array.from(slotMap.entries())
      .map(([slot, data]) => ({
        slot,
        bookings: data.count,
        pallets: data.pallets,
        vehicles: data.vehicles,
      }))
      .sort((a, b) => b.bookings - a.bookings);

    // Format Carrier Scorecard
    const carrierScorecard = Array.from(carrierMap.entries())
      .map(([carrier, data]) => ({
        carrier,
        total_bookings: data.total,
        completed_bookings: data.completed,
        on_time_rate: data.total > 0 ? Math.round((data.onTime / data.total) * 100) : 100,
        total_pallets: data.pallets,
        avg_dwell_minutes: data.dwellCount > 0 ? Math.round(data.dwellMinutes / data.dwellCount) : 30,
      }))
      .sort((a, b) => b.total_bookings - a.total_bookings);

    // Format Client Leaderboard
    const clientLeaderboard = Array.from(clientMap.entries())
      .map(([client, data]) => ({
        client,
        total_bookings: data.total,
        total_pallets: data.pallets,
      }))
      .sort((a, b) => b.total_pallets - a.total_pallets)
      .slice(0, 10);

    // Format Cargo Breakdown
    const cargoBreakdown = Array.from(cargoMap.entries())
      .map(([type, count]) => ({
        type,
        count,
        percentage: totalBookings > 0 ? Math.round((count / totalBookings) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Format Vehicle Breakdown
    const vehicleBreakdown = Array.from(vehicleMap.entries())
      .map(([type, count]) => ({
        type,
        count,
        percentage: totalBookings > 0 ? Math.round((count / totalBookings) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Format Daily Trend (sorted ascending by date)
    const dailyTrend = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        bookings: data.total,
        completed: data.completed,
        pallets: data.pallets,
        overdue: data.overdue,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 4. Return to Vendor (RTV) Analytics
    const allReturns: ReturnTicket[] = await store.getAllReturnTickets();
    const nowMs = new Date().getTime();

    let pendingRtvCount = 0;
    let returnedRtvCount = 0;
    let totalRtvAgingDays = 0;
    let rtvAgingCount = 0;
    let agingUnder7 = 0;
    let aging7to14 = 0;
    let aging15to30 = 0;
    let agingOver30 = 0;

    const rtvSupplierMap = new Map<string, { total: number; pending: number }>();
    const rtvReasonMap = new Map<string, number>();

    allReturns.forEach((rt) => {
      const isPending = rt.status === 'Pending_Pickup';
      if (isPending) pendingRtvCount++;
      else returnedRtvCount++;

      let ticketAgeDays = 0;
      if (rt.created_at) {
        const createdMs = new Date(rt.created_at).getTime();
        const endMs = rt.handover_at ? new Date(rt.handover_at).getTime() : nowMs;
        ticketAgeDays = Math.max(0, Math.floor((endMs - createdMs) / (1000 * 60 * 60 * 24)));
      }

      if (isPending) {
        totalRtvAgingDays += ticketAgeDays;
        rtvAgingCount++;

        if (ticketAgeDays <= 7) agingUnder7++;
        else if (ticketAgeDays <= 14) aging7to14++;
        else if (ticketAgeDays <= 30) aging15to30++;
        else agingOver30++;
      }

      const supp = (rt.supplier_name || 'ไม่ระบุซัพพลายเออร์').trim();
      const sItem = rtvSupplierMap.get(supp) || { total: 0, pending: 0 };
      sItem.total++;
      if (isPending) sItem.pending++;
      rtvSupplierMap.set(supp, sItem);

      const reason = (rt.reason || 'ไม่ระบุสาเหตุ').trim();
      rtvReasonMap.set(reason, (rtvReasonMap.get(reason) || 0) + 1);
    });

    const avgRtvAgingDays = rtvAgingCount > 0 ? Math.round(totalRtvAgingDays / rtvAgingCount) : 0;
    const topRtvSuppliers = Array.from(rtvSupplierMap.entries())
      .map(([supplier, data]) => ({ supplier, total: data.total, pending: data.pending }))
      .sort((a, b) => b.pending - a.pending)
      .slice(0, 10);
    const topRtvReasons = Array.from(rtvReasonMap.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    const rtvSummary = {
      total_tickets: allReturns.length,
      pending_count: pendingRtvCount,
      returned_count: returnedRtvCount,
      avg_aging_days: avgRtvAgingDays,
      aging_brackets: {
        under_7d: agingUnder7,
        between_7_and_14d: aging7to14,
        between_15_and_30d: aging15to30,
        over_30d: agingOver30,
      },
      top_suppliers: topRtvSuppliers,
      top_reasons: topRtvReasons,
    };

    // 5. Smart Diagnostics & Actionable Recommendations (SUPER ADMIN ONLY)
    const isSuperAdmin = role === 'super_admin';
    let smartDiagnostics = null;

    if (isSuperAdmin) {
      const topPeakSlot = peakSlots[0] || null;
      const topPeakPercentage = totalBookings > 0 && topPeakSlot ? Math.round((topPeakSlot.bookings / totalBookings) * 100) : 0;

      let executiveSummary = `ภาพรวมคลังสินค้ามีคิวเข้าตรวจรับทั้งหมด ${totalBookings} คิว (${totalPallets.toLocaleString()} ลัง) อัตราการมาตรงเวลาอยู่ที่ ${onTimeRate}% `;
      if (topPeakSlot && topPeakPercentage >= 35) {
        executiveSummary += `พบการกระจุกตัวของรถหนาแน่นสูงสุดในรอบ ${topPeakSlot.slot} (${topPeakPercentage}% ของคิวทั้งหมด) `;
      }
      if (pendingRtvCount > 0) {
        executiveSummary += `ในส่วนสินค้าตีคืน (RTV) มีรายการรอเคลียร์สะสม ${pendingRtvCount} รายการ โดยตกค้างในคลังเฉลี่ย ${avgRtvAgingDays} วัน `;
        if (avgRtvAgingDays > 7) {
          executiveSummary += `ซึ่งเกินเกณฑ์มาตรฐาน 7 วัน `;
        }
      }
      if (coldChainCount > 0) {
        executiveSummary += `การตรวจรับสินค้าควบคุมอุณหภูมิ (ยาเย็น 2-8°C) มีจำนวน ${coldChainCount} คิว (${coldChainShare}%) ปฏิบัติตามมาตรฐาน GSDP อย่างต่อเนื่อง`;
      }

      smartDiagnostics = {
        executive_summary: executiveSummary,
        diagnostics: [
          {
            id: 'on_time',
            title: 'อัตราการมาตรงเวลา (On-Time Delivery Rate)',
            metric: `${onTimeRate}%`,
            status: onTimeRate >= 90 ? 'good' : onTimeRate >= 75 ? 'warning' : 'critical',
            status_label: onTimeRate >= 90 ? '✅ ดีเยี่ยม (เป็นไปตามเป้าหมาย ≥ 90%)' : onTimeRate >= 75 ? '⚠️ ต้องปรับปรุง (ต่ำกว่าเป้า 90%)' : '🚨 วิกฤต (ต่ำกว่าเกณฑ์มาก)',
            subtitle: `จากคิวทั้งหมด ${totalBookings} คิว • ตรงเวลา ${onTimeCount} คิว • เลยเวลานัด ${overdueCount} คิว`,
            target_label: 'เป้าหมายมาตรฐาน: ≥ 90%',
            good_points: [
              `รถขนส่งที่มาตรงเวลา (${onTimeRate}%) ช่วยให้ฝ่ายคลังเริ่มกระบวนการตรวจสอบและจัดเก็บเข้าชั้นวางได้ตามรอบเวลาที่กำหนด`,
              `ช่วยลดความแออัดของยานพาหนะบริเวณลานจอดและช่องเทียบสินค้า (Loading Bays)`,
            ],
            root_causes: onTimeRate >= 90
              ? [`การบริหารจัดการคิวและการประสานงานกับผู้ขนส่งมีประสิทธิภาพสูง`]
              : [
                  `บริษัทขนส่งจัดส่งสินค้าพ่วงหลายจุดในย่านใกล้เคียงก่อนเข้า PTN ทำให้เกิดเวลาล่าช้าสะสม`,
                  `สภาพการจราจรติดขัดในเส้นทางหลักช่วงเวลาเร่งด่วน`,
                  `ผู้จองคิวไม่ได้ส่งต่อบัตรคิวหรือแจ้งเวลานัดหมายที่แน่นอนให้แก่คนขับรถทราบล่วงหน้า`,
                ],
            recommendations: [
              `ประสานงานแจ้งเตือนคนขับรถล่วงหน้า 2 ชั่วโมงผ่านระบบแจ้งเตือนก่อนถึงเวลานัดหมาย`,
              `กำหนดเกณฑ์ Grace Period ชัดเจน: หากมาล่าช้าเกิน 30 นาที ต้องรอแทรกในรอบคิวว่างถัดไป เพื่อไม่ให้กระทบคิวที่มาตรงเวลา`,
              `นำรายงาน Carrier Scorecard ไปประสานกับบริษัทขนส่งที่มีอัตราตรงเวลาต่ำ เพื่อปรับปรุงแผนการเดินทางร่วมกัน`,
            ],
          },
          {
            id: 'peak_slots',
            title: 'การกระจุกตัวของรถตามรอบเวลา (Peak Hours Bottleneck)',
            metric: topPeakSlot ? `${topPeakSlot.slot} (${topPeakSlot.bookings} คิว)` : 'กระจายตัวสม่ำเสมอ',
            status: topPeakPercentage > 40 ? 'critical' : topPeakPercentage > 25 ? 'warning' : 'good',
            status_label: topPeakPercentage > 40 ? '🚨 คอขวดรุนแรง (กระจุกตัวหนาแน่น)' : topPeakPercentage > 25 ? '⚠️ เริ่มมีความหนาแน่นสูง' : '✅ กระจายตัวสม่ำเสมอดี',
            subtitle: topPeakSlot ? `รอบ ${topPeakSlot.slot} มีรถเข้าเทียบสูงสุด ${topPeakSlot.bookings} คิว (${topPeakSlot.pallets} ลัง)` : 'ปริมาณงานกระจายตัวได้ดี',
            target_label: 'เป้าหมายมาตรฐาน: กระจายงานสมดุลทุกรอบเวลา',
            good_points: [
              `ช่วงที่มีรถเข้าส่งหนาแน่น เจ้าหน้าที่ตรวจรับพร้อมปฏิบัติงานเต็มกำลัง สามารถตรวจรับสินค้าล็อตใหญ่ได้รวดเร็ว`,
              `สามารถบันทึกและส่งต่อเอกสารบิลรับสินค้าเข้าสู่ระบบ ERP ได้ทันในรอบบ่าย`,
            ],
            root_causes: [
              `พฤติกรรมของบริษัทขนส่งต้องการส่งสินค้าให้เสร็จสิ้นก่อนช่วงพักเที่ยง เพื่อนำรถไปวิ่งรอบบ่ายอื่นต่อ`,
              `ระบบยังไม่ได้กำหนดเพดานจำกัดจำนวนพาเลทรวมต่อรอบเวลาอย่างเข้มงวด`,
              `รอบช่วงบ่าย (13:30 - 15:30 น.) ยังมีการจองใช้งานน้อย ทำให้เกิดกำลังรองรับส่วนเกิน (Idle capacity)`,
            ],
            recommendations: [
              `กำหนดเพดานจำกัดพาเลทรวมต่อรอบเวลา เช่น ไม่เกิน 50-60 พาเลทต่อ 1 ชั่วโมง เพื่อป้องกันคอขวดสะสม`,
              `สร้างแรงจูงใจในการจองรอบบ่าย (Incentive) เช่น สิทธิ์ Fast-Track ตรวจรับเสร็จสิ้นภายใน 20-30 นาทีสำหรับคิวรอบบ่าย`,
              `จัดสรรตารางการทำงานของเจ้าหน้าที่ตรวจรับสำรองให้พร้อมขึ้นหนุนในช่วงเวลาพีค`,
            ],
          },
          {
            id: 'rtv_aging',
            title: 'ระยะเวลาตกค้างของสินค้าตีคืน (RTV Warehouse Aging)',
            metric: `${avgRtvAgingDays} วัน`,
            status: avgRtvAgingDays > 14 ? 'critical' : avgRtvAgingDays > 7 ? 'warning' : 'good',
            status_label: avgRtvAgingDays > 14 ? '🚨 ตกค้างนานเกินเกณฑ์ (เปลืองพื้นที่คลัง)' : avgRtvAgingDays > 7 ? '⚠️ ใกล้เกินเกณฑ์มาตรฐาน' : '✅ คล่องตัว (เคลียร์เร็วตามเกณฑ์ ≤ 7 วัน)',
            subtitle: `สินค้าตีคืนรอเคลียร์สะสม ${pendingRtvCount} รายการ • ค้างเกิน 14 วัน ${aging15to30 + agingOver30} รายการ`,
            target_label: 'เป้าหมายมาตรฐาน: ซัพพลายเออร์มารับคืนภายใน ≤ 7 วัน',
            good_points: [
              `สินค้าตีคืนทุกรายการมีการติดป้าย Pallet Tag พร้อมรูปถ่ายและระบุเหตุผลการตีคืนชัดเจนในระบบ`,
              `จัดเก็บแยกโซนกักกัน (Quarantine Area) เป็นสัดส่วน ไม่ปะปนกับสินค้าพร้อมขายตามมาตรฐาน GMP/GSDP`,
            ],
            root_causes: [
              `ซัพพลายเออร์มักรอรอบมารับสินค้าคืนพร้อมกับวันที่มีเที่ยวรถมาส่งสินค้าล็อตใหม่ เพื่อประหยัดเที่ยวรถ`,
              `ฝ่ายประสานงานหรือเซลส์ของคู่ค้ายังไม่ทราบสถานะว่าคลังจัดเตรียมสินค้าตีคืนพร้อมให้เข้ารับแล้ว`,
              `ขั้นตอนการรออนุมัติใบลดหนี้ (Credit Note) ทางบัญชีของคู่ค้าใช้เวลานาน`,
            ],
            recommendations: [
              `เปิดระบบส่งข้อความแจ้งเตือนอัตโนมัติไปยังผู้ประสานงานซัพพลายเออร์ทันทีที่สถานะเปลี่ยนเป็น "พร้อมรับคืน"`,
              `พ่วงเงื่อนไขการส่งสินค้าใหม่: หากซัพพลายเออร์มีสินค้าตีคืนค้างเกิน 7 วัน ให้แจ้งเตือนในระบบจองคิวเพื่อให้นำรถมารับกลับไปด้วย`,
              `ส่งออกรายงาน Aging รายสัปดาห์ให้ฝ่ายจัดซื้อ/ผู้บริหาร เพื่อใช้ติดตามและเร่งรัดคู่ค้าอย่างเป็นระบบ`,
            ],
          },
          {
            id: 'cold_chain',
            title: 'การตรวจรับยาควบคุมอุณหภูมิ (Cold Chain 2-8°C Compliance)',
            metric: `${coldChainCount} คิว (${coldChainShare}%)`,
            status: 'good',
            status_label: '✅ ควบคุมคุณภาพเข้มงวด (ตามมาตรฐาน GSDP)',
            subtitle: `สินค้ากลุ่มยาเย็น/ชีววัตถุ 2-8°C คิดเป็นสัดส่วน ${coldChainShare}% ของการรับสินค้าทั้งหมด`,
            target_label: 'เป้าหมายมาตรฐาน: Fast-Track ตรวจรับเข้าคลังเย็น ≤ 20 นาที',
            good_points: [
              `รักษาคุณภาพของตัวยาและผลิตภัณฑ์ชีววัตถุได้อย่างสมบูรณ์ ปราศจากความเสี่ยงเรื่อง Temperature Excursion`,
              `เจ้าหน้าที่คลังให้ความสำคัญและปฏิบัติตามมาตรฐานการจัดลำดับความสำคัญ (Priority Fast-Track) แก่ยาเย็น`,
            ],
            root_causes: [
              `จุดเสี่ยงสำคัญคือกรณีที่มีรถขนส่งยาเย็นจองคิวซ้อนกันในรอบเวลาเดียวกัน อาจทำให้คันถัดไปต้องรอนอกห้องเย็นนานขึ้น`,
              `บางบริษัทขนส่งไม่มีเอกสาร Temperature Log Sheet ติดตัวมา ต้องเสียเวลารอเอกสารส่งทางอิเล็กทรอนิกส์`,
            ],
            recommendations: [
              `ระบบจองคิวอัตโนมัติควรจำกัดรถขนส่งยาเย็นไม่เกิน 1 คันต่อรอบเวลา 30 นาที เพื่อป้องกันรถชนกัน`,
              `เพิ่มช่องให้ผู้จองคิวอัปโหลดผลตรวจสอบอุณหภูมิของรถขนส่ง (Data Logger / Temp Slip) ตั้งแต่ขั้นตอนจองคิว`,
              `เก็บบันทึกเวลาการตรวจรับยาเย็นอย่างต่อเนื่อง เพื่อใช้เป็นหลักฐานยืนยันความสอดคล้องกับมาตรฐาน GSDP ในการตรวจประเมิน (Audit)`,
            ],
          },
        ],
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        meta: {
          range,
          start_date: startDate,
          end_date: endDate,
          generated_at: new Date().toISOString(),
          is_super_admin: isSuperAdmin,
        },
        kpi: {
          total_bookings: totalBookings,
          completed_bookings: completedCount,
          cancelled_bookings: cancelledCount,
          rejected_bookings: rejectedCount,
          overdue_bookings: overdueCount,
          on_time_rate: onTimeRate,
          avg_dwell_minutes: avgDwellMinutes,
          total_pallets: totalPallets,
          total_vehicles: totalVehicles,
          cold_chain_count: coldChainCount,
          cold_chain_share: coldChainShare,
        },
        peak_slots: peakSlots,
        carrier_scorecard: carrierScorecard,
        client_leaderboard: clientLeaderboard,
        cargo_breakdown: cargoBreakdown,
        vehicle_breakdown: vehicleBreakdown,
        daily_trend: dailyTrend,
        rtv_summary: rtvSummary,
        smart_diagnostics: smartDiagnostics,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Error occurred' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }
}
