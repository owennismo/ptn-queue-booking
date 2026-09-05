'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Clock,
  Package,
  CheckCircle2,
  AlertTriangle,
  Download,
  RotateCcw,
  Calendar,
  Truck,
  Building2,
  ThermometerSnowflake,
  ShieldCheck,
  Flame,
  Award,
  Layers,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { formatThaiDate, formatThaiShortDate } from '@/lib/dateUtils';

interface AnalyticsData {
  meta: {
    range: string;
    start_date: string;
    end_date: string;
    generated_at: string;
  };
  kpi: {
    total_bookings: number;
    completed_bookings: number;
    cancelled_bookings: number;
    rejected_bookings: number;
    overdue_bookings: number;
    on_time_rate: number;
    avg_dwell_minutes: number;
    total_pallets: number;
    total_vehicles: number;
    cold_chain_count: number;
    cold_chain_share: number;
  };
  peak_slots: Array<{
    slot: string;
    bookings: number;
    pallets: number;
    vehicles: number;
  }>;
  carrier_scorecard: Array<{
    carrier: string;
    total_bookings: number;
    completed_bookings: number;
    on_time_rate: number;
    total_pallets: number;
    avg_dwell_minutes: number;
  }>;
  client_leaderboard: Array<{
    client: string;
    total_bookings: number;
    total_pallets: number;
  }>;
  cargo_breakdown: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  vehicle_breakdown: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  daily_trend: Array<{
    date: string;
    bookings: number;
    completed: number;
    pallets: number;
    overdue: number;
  }>;
}

interface AdminAnalyticsProps {
  token: string;
}

export default function AdminAnalytics({ token }: AdminAnalyticsProps) {
  const [range, setRange] = useState<string>('7d');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = `/api/admin/analytics?range=${range}`;
      if (range === 'custom') {
        if (customStart) query += `&start_date=${customStart}`;
        if (customEnd) query += `&end_date=${customEnd}`;
      }

      const res = await fetch(query, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'ไม่สามารถโหลดข้อมูลวิเคราะห์ได้');
      }

      setData(resData);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAnalytics();
    }
  }, [token, range]);

  const handleApplyCustomDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStart || !customEnd) return;
    setRange('custom');
    fetchAnalytics();
  };

  // Export CSV Report with UTF-8 BOM for Thai Excel compatibility
  const handleExportCSV = () => {
    if (!data) return;

    let csv = '\uFEFF'; // UTF-8 BOM
    csv += 'รายงานสรุปการวิเคราะห์สถิติคลังสินค้าและการขนส่ง (PTN Queue Analytics)\n';
    csv += `ช่วงเวลาที่วิเคราะห์: ${data.meta.start_date} ถึง ${data.meta.end_date} (สร้างเมื่อ: ${new Date().toLocaleString('th-TH')})\n\n`;

    // 1. KPI Summary
    csv += '--- ตัวชี้วัดสำคัญ (KPI Summary) ---\n';
    csv += `จำนวนคิวทั้งหมด,${data.kpi.total_bookings},คิว\n`;
    csv += `ตรวจรับสำเร็จ,${data.kpi.completed_bookings},คิว\n`;
    csv += `อัตรามาตรงเวลา (On-Time Rate),${data.kpi.on_time_rate},%\n`;
    csv += `เวลาเฉลี่ยในพื้นที่คลัง (Turnaround Dwell Time),${data.kpi.avg_dwell_minutes},นาที\n`;
    csv += `จำนวนลัง/พาเลทรวม,${data.kpi.total_pallets},ลัง\n`;
    csv += `จำนวนรถขนส่งรวม,${data.kpi.total_vehicles},คัน\n`;
    csv += `คิวเลยเวลานัด (Overdue),${data.kpi.overdue_bookings},คิว\n`;
    csv += `คิวยกเลิก/ปฏิเสธ,${data.kpi.cancelled_bookings + data.kpi.rejected_bookings},คิว\n`;
    csv += `สินค้าควบคุมอุณหภูมิ (Cold Chain 2-8°C),${data.kpi.cold_chain_count},คิว (${data.kpi.cold_chain_share}%)\n\n`;

    // 2. Carrier Scorecard
    csv += '--- ตารางประเมินผลบริษัทขนส่ง (Carrier Scorecard) ---\n';
    csv += 'บริษัทขนส่ง,จำนวนคิวทั้งหมด,ตรวจรับสำเร็จ,อัตราตรงเวลา (%),จำนวนลังรวม,เวลาเฉลี่ยในคลัง (นาที)\n';
    data.carrier_scorecard.forEach((c) => {
      csv += `"${c.carrier}",${c.total_bookings},${c.completed_bookings},${c.on_time_rate}%,${c.total_pallets},${c.avg_dwell_minutes}\n`;
    });
    csv += '\n';

    // 3. Peak Slot Analysis
    csv += '--- การกระจายตัวตามรอบเวลา (Peak Hours / Time Slots) ---\n';
    csv += 'รอบเวลา,จำนวนคิว (คัน),จำนวนลังรวม (ลัง),จำนวนรถ (คัน)\n';
    data.peak_slots.forEach((s) => {
      csv += `"${s.slot}",${s.bookings},${s.pallets},${s.vehicles}\n`;
    });
    csv += '\n';

    // 4. Daily Trend
    csv += '--- แนวโน้มสถิติรายวัน (Daily Trend) ---\n';
    csv += 'วันที่,จำนวนคิว,สำเร็จ,จำนวนลัง,เลยเวลา\n';
    data.daily_trend.forEach((d) => {
      csv += `"${d.date}",${d.bookings},${d.completed},${d.pallets},${d.overdue}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `PTN_Logistics_Analytics_${data.meta.start_date}_to_${data.meta.end_date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Analytics Control Bar */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Super Admin Exclusive</span>
            </span>
            <span className="text-xs text-slate-400">Warehouse & Logistics BI</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            แดชบอร์ดวิเคราะห์ข้อมูลคลังสินค้า
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            วิเคราะห์ประสิทธิภาพการตรวจรับ คอขวดเวลา และจัดอันดับผู้ให้บริการขนส่ง
          </p>
        </div>

        {/* Action Buttons & Filters */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 text-xs font-bold border border-slate-200">
            <button
              type="button"
              onClick={() => setRange('today')}
              className={`px-3 py-1.5 rounded-xl transition ${
                range === 'today' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              วันนี้
            </button>
            <button
              type="button"
              onClick={() => setRange('7d')}
              className={`px-3 py-1.5 rounded-xl transition ${
                range === '7d' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 วันล่าสุด
            </button>
            <button
              type="button"
              onClick={() => setRange('30d')}
              className={`px-3 py-1.5 rounded-xl transition ${
                range === '30d' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 วันล่าสุด
            </button>
            <button
              type="button"
              onClick={() => setRange('this_month')}
              className={`px-3 py-1.5 rounded-xl transition ${
                range === 'this_month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              เดือนนี้
            </button>
            <button
              type="button"
              onClick={() => setRange('all')}
              className={`px-3 py-1.5 rounded-xl transition ${
                range === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ทั้งหมด
            </button>
          </div>

          <button
            type="button"
            onClick={fetchAnalytics}
            disabled={loading}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-2xl text-slate-700 transition"
            title="รีเฟรชข้อมูล"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={!data || loading}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-emerald-200 active:scale-95 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>ส่งออก CSV (Excel)</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !data && (
        <div className="py-20 text-center space-y-3">
          <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-500">กำลังประมวลผลสถิติและตัวชี้วัดคลังสินค้า...</p>
        </div>
      )}

      {/* Main Dashboard Content */}
      {data && (
        <>
          {/* Section 1: Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: On-Time Rate */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">On-Time Rate</span>
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
                  data.kpi.on_time_rate >= 90 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-black ${
                    data.kpi.on_time_rate >= 90 ? 'text-emerald-600' : data.kpi.on_time_rate >= 75 ? 'text-amber-600' : 'text-rose-600'
                  }`}>
                    {data.kpi.on_time_rate}%
                  </span>
                  <span className="text-xs text-slate-500 font-medium">มาตรงตามนัด</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  จากคิวทั้งหมด {data.kpi.total_bookings} คิว (เลยเวลานัด {data.kpi.overdue_bookings} คิว)
                </p>
              </div>
              <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    data.kpi.on_time_rate >= 90 ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.min(100, data.kpi.on_time_rate)}%` }}
                />
              </div>
            </div>

            {/* KPI 2: Turnaround Dwell Time */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg. Turnaround</span>
                <div className="w-9 h-9 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-blue-600">
                    {data.kpi.avg_dwell_minutes}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">นาที / คัน</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  เวลาเฉลี่ยตั้งแต่เข้าพื้นที่จนตรวจรับเสร็จสิ้น
                </p>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl font-medium w-fit">
                <span>เป้าหมายมาตรฐาน: &le; 45 นาที</span>
              </div>
            </div>

            {/* KPI 3: Total Pallet/Carton Volume */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Volume Received</span>
                <div className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-purple-600">
                    {data.kpi.total_pallets.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">ลัง / พาเลท</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  จากรถขนส่งทั้งหมด {data.kpi.total_vehicles} คัน
                </p>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-purple-700 bg-purple-50 px-2.5 py-1 rounded-xl font-medium w-fit">
                <ThermometerSnowflake className="w-3.5 h-3.5 text-sky-500" />
                <span>ยาเย็น 2-8°C: {data.kpi.cold_chain_count} คิว ({data.kpi.cold_chain_share}%)</span>
              </div>
            </div>

            {/* KPI 4: Operations Completed */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completion Rate</span>
                <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">
                    {data.kpi.completed_bookings}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">/ {data.kpi.total_bookings} คิวสำเร็จ</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  ยกเลิก {data.kpi.cancelled_bookings} • ปฏิเสธ {data.kpi.rejected_bookings}
                </p>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl font-medium w-fit">
                <span>สำเร็จ {data.kpi.total_bookings > 0 ? Math.round((data.kpi.completed_bookings / data.kpi.total_bookings) * 100) : 0}%</span>
              </div>
            </div>
          </div>

          {/* Section 2: Peak Hours & Slot Bottleneck Analysis */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">ความหนาแน่นตามรอบเวลา (Peak Time Slot Analysis)</h3>
                  <p className="text-xs text-slate-500">วิเคราะห์ปริมาณรถและจำนวนลัง เพื่อระบุช่วงเวลาที่คลังมีความหนาแน่นสูงสุด</p>
                </div>
              </div>
            </div>

            {data.peak_slots.length === 0 ? (
              <p className="text-center py-8 text-sm text-slate-400">ไม่มีข้อมูลรอบเวลาในช่วงที่เลือก</p>
            ) : (
              <div className="space-y-3 pt-2">
                {(() => {
                  const maxBookings = Math.max(...data.peak_slots.map((s) => s.bookings), 1);
                  return data.peak_slots.map((slotItem, idx) => {
                    const isTopPeak = idx === 0 && slotItem.bookings > 0;
                    const percent = Math.round((slotItem.bookings / maxBookings) * 100);
                    return (
                      <div key={slotItem.slot} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{slotItem.slot}</span>
                            {isTopPeak && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 border border-rose-200">
                                🔥 หนาแน่นสูงสุด
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-600">
                            <span><strong>{slotItem.bookings}</strong> คิว ({slotItem.vehicles} คัน)</span>
                            <span className="text-slate-300">|</span>
                            <span><strong>{slotItem.pallets.toLocaleString()}</strong> ลัง</span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isTopPeak ? 'bg-gradient-to-r from-orange-500 to-rose-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.max(4, percent)}%` }}
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>

          {/* Section 3: Carrier Performance Scorecard */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">ตารางประเมินผลบริษัทขนส่ง (Carrier Scorecard)</h3>
                  <p className="text-xs text-slate-500">จัดอันดับผู้ให้บริการขนส่ง วัดผลความตรงต่อเวลา และเวลาเฉลี่ยในคลัง</p>
                </div>
              </div>
              <span className="text-xs text-slate-400">เรียงตามจำนวนรอบการส่ง</span>
            </div>

            {data.carrier_scorecard.length === 0 ? (
              <p className="text-center py-8 text-sm text-slate-400">ไม่พบบันทึกการขนส่งในช่วงเวลานี้</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 bg-slate-50/70">
                      <th className="py-3 px-4 rounded-l-xl">อันดับ & บริษัทขนส่ง</th>
                      <th className="py-3 px-3 text-center">คิวทั้งหมด</th>
                      <th className="py-3 px-3 text-center">สำเร็จ</th>
                      <th className="py-3 px-3 text-center">อัตราตรงเวลา</th>
                      <th className="py-3 px-3 text-right">จำนวนลังรวม</th>
                      <th className="py-3 px-4 text-right rounded-r-xl">เวลาเฉลี่ยในคลัง</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                    {data.carrier_scorecard.map((carrier, index) => (
                      <tr key={carrier.carrier} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2.5">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            index === 0 ? 'bg-amber-100 text-amber-800' : index === 1 ? 'bg-slate-200 text-slate-700' : index === 2 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {index + 1}
                          </span>
                          <span className="truncate">{carrier.carrier}</span>
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-slate-700">{carrier.total_bookings}</td>
                        <td className="py-3 px-3 text-center text-slate-600">{carrier.completed_bookings}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-block ${
                            carrier.on_time_rate >= 90
                              ? 'bg-emerald-100 text-emerald-800'
                              : carrier.on_time_rate >= 75
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {carrier.on_time_rate}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-800">{carrier.total_pallets.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-slate-600">
                          {carrier.avg_dwell_minutes} นาที
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 4: Cargo Breakdown & Vehicle Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cargo Category Breakdown */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">สัดส่วนประเภทสินค้า (Cargo Categories)</h3>
                  <p className="text-xs text-slate-500">แบ่งตามประเภทยาและข้อกำหนดอุณหภูมิ</p>
                </div>
              </div>

              <div className="space-y-3">
                {data.cargo_breakdown.map((item) => (
                  <div key={item.type} className="space-y-1">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="font-semibold text-slate-800 truncate pr-2">{item.type}</span>
                      <span className="text-slate-600 font-bold shrink-0">{item.count} คิว ({item.percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(5, item.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Vehicle Type Breakdown */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">สัดส่วนประเภทรถขนส่ง (Vehicle Types)</h3>
                  <p className="text-xs text-slate-500">เพื่อวางแผนการบริหารพื้นที่และช่องโหลดสินค้า (Loading Bays)</p>
                </div>
              </div>

              <div className="space-y-3">
                {data.vehicle_breakdown.map((item) => (
                  <div key={item.type} className="space-y-1">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="font-semibold text-slate-800 truncate pr-2">{item.type}</span>
                      <span className="text-slate-600 font-bold shrink-0">{item.count} คัน ({item.percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-sky-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(5, item.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 5: Top Clients & Suppliers */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">บริษัทเจ้าของสินค้า / ซัพพลายเออร์หลัก (Top Suppliers)</h3>
                <p className="text-xs text-slate-500">เรียงตามปริมาณลังและรอบการเข้าส่ง</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.client_leaderboard.map((c, i) => (
                <div key={c.client} className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 font-semibold">อันดับ {i + 1}</p>
                    <p className="text-sm font-bold text-slate-900 truncate">{c.client}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-emerald-700">{c.total_pallets.toLocaleString()} ลัง</p>
                    <p className="text-xs text-slate-500">{c.total_bookings} คิว</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
