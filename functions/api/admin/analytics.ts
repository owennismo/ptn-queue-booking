import { DataStore, Booking } from '../_store';
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

    // 2. Strict Super Admin Check
    const role = auth.payload?.role;
    if (role !== 'super_admin' && role !== 'admin') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'ปฏิเสธการเข้าถึง: ฟังก์ชันวิเคราะห์ข้อมูลเชิงลึกสงวนสิทธิ์เฉพาะ Super Admin เท่านั้น',
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

    return new Response(
      JSON.stringify({
        success: true,
        meta: {
          range,
          start_date: startDate,
          end_date: endDate,
          generated_at: new Date().toISOString(),
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
