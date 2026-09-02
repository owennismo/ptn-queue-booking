'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Bell,
  Sliders,
  CalendarOff,
  Download,
  Printer,
  ChevronRight,
  ShieldCheck,
  Building2,
  Truck,
  Phone,
  Package,
  Car,
  LogOut,
  Info,
  Plus,
  Trash2,
  X,
  User,
} from 'lucide-react';
import { Booking, TimeSlot, BlockedDate, DailyForecast } from '@/lib/types';

export default function AdminDashboardPage() {
  const router = useRouter();

  // Authentication check
  useEffect(() => {
    const token = localStorage.getItem('ptn_admin_token');
    if (!token) {
      router.push('/admin/login');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('ptn_admin_token');
    router.push('/admin/login');
  };

  // Helper date
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Active Tab
  const [activeTab, setActiveTab] = useState<'queues' | 'capacity' | 'blocking'>('queues');

  // Queues state
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [filterDate, setFilterDate] = useState<string>(getTodayStr());
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Forecast state
  const [forecast, setForecast] = useState<DailyForecast | null>(null);

  // Settings state (Capacity & Blocked dates)
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [newBlockedDate, setNewBlockedDate] = useState('');
  const [newBlockedReason, setNewBlockedReason] = useState('');

  // Selected Booking for Detailed View
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Reject Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingBooking, setRejectingBooking] = useState<Booking | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  // Multi-Step Cancellation Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelStep, setCancelStep] = useState<1 | 2>(1);
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [confirmCodeInput, setConfirmCodeInput] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Notification Toast message
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Fetch Bookings
  const fetchBookings = async () => {
    setLoadingBookings(true);
    try {
      let url = `/api/admin/bookings?status=${filterStatus}`;
      if (filterDate) url += `&date=${filterDate}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

      const res = await fetch(url);
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      showToast('ไม่สามารถโหลดข้อมูลคิวได้', 'error');
    } finally {
      setLoadingBookings(false);
    }
  };

  // Fetch Forecast
  const fetchForecast = async () => {
    try {
      const res = await fetch('/api/admin/forecast');
      const data = await res.json();
      setForecast(data);
    } catch (err) {
      console.error('Error fetching forecast:', err);
    }
  };

  // Fetch Settings (Slots & Blocked Dates)
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      setSlots(data.slots || []);
      setBlockedDates(data.blockedDates || []);
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchForecast();
    fetchSettings();
  }, [filterDate, filterStatus]);

  // Action: Approve
  const handleApprove = async (booking: Booking) => {
    try {
      const res = await fetch(`/api/admin/bookings/${booking.booking_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Approved',
          admin_action_by: 'Staff Admin',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ไม่สามารถอนุมัติคิวได้');

      showToast(`อนุมัติคิว ${booking.booking_id} เรียบร้อยแล้ว`);
      fetchBookings();
      fetchForecast();
      if (selectedBooking?.booking_id === booking.booking_id) {
        setSelectedBooking(data.booking);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Action: Reject (Open Modal)
  const openRejectModal = (booking: Booking) => {
    setRejectingBooking(booking);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const submitReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingBooking || !rejectReason.trim()) return;

    setRejectSubmitting(true);
    try {
      const res = await fetch(`/api/admin/bookings/${rejectingBooking.booking_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Rejected',
          admin_reason: rejectReason.trim(),
          admin_action_by: 'Staff Admin',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ไม่สามารถปฏิเสธคิวได้');

      showToast(`ปฏิเสธคิว ${rejectingBooking.booking_id} แล้ว`);
      setRejectModalOpen(false);
      fetchBookings();
      fetchForecast();
      if (selectedBooking?.booking_id === rejectingBooking.booking_id) {
        setSelectedBooking(data.booking);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setRejectSubmitting(false);
    }
  };

  // Action: Multi-step Cancellation
  const openCancelModal = (booking: Booking) => {
    setCancellingBooking(booking);
    setCancelStep(1);
    setCancelReason('');
    setConfirmCodeInput('');
    setCancelError(null);
    setCancelModalOpen(true);
  };

  const handleCancelNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      setCancelError('กรุณากรอกเหตุผลในการยกเลิกคิว');
      return;
    }
    setCancelError(null);
    setCancelStep(2);
  };

  const submitCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingBooking) return;

    if (confirmCodeInput.trim().toUpperCase() !== cancellingBooking.booking_id.toUpperCase() &&
        confirmCodeInput.trim().toUpperCase() !== 'CONFIRM') {
      setCancelError(`รหัสยืนยันไม่ถูกต้อง (กรุณากรอก '${cancellingBooking.booking_id}' หรือ 'CONFIRM')`);
      return;
    }

    setCancelSubmitting(true);
    setCancelError(null);

    try {
      const res = await fetch(`/api/admin/bookings/${cancellingBooking.booking_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cancellation_reason: cancelReason.trim(),
          confirm_code: confirmCodeInput.trim(),
          admin_action_by: 'Staff Admin',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ไม่สามารถยกเลิกคิวได้');

      showToast(`ยกเลิกคิว ${cancellingBooking.booking_id} เรียบร้อยแล้ว`);
      setCancelModalOpen(false);
      fetchBookings();
      fetchForecast();
      if (selectedBooking?.booking_id === cancellingBooking.booking_id) {
        setSelectedBooking(data.booking);
      }
    } catch (err: any) {
      setCancelError(err.message);
    } finally {
      setCancelSubmitting(false);
    }
  };

  // Update Time Slot Capacity
  const handleUpdateSlot = async (slotId: number, newCapacity: number, isActive: boolean) => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_slot',
          id: slotId,
          max_capacity: newCapacity,
          is_active: isActive,
        }),
      });
      if (!res.ok) throw new Error('ไม่สามารถบันทึกได้');
      showToast('อัปเดตการตั้งค่ารอบเวลาสำเร็จ');
      fetchSettings();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Add Blocked Date
  const handleAddBlockedDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockedDate || !newBlockedReason.trim()) return;

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_blocked_date',
          blocked_date: newBlockedDate,
          reason: newBlockedReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ไม่สามารถปิดรับจองได้');

      showToast(`ปิดรับจองวันที่ ${newBlockedDate} สำเร็จ`);
      setNewBlockedDate('');
      setNewBlockedReason('');
      fetchSettings();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Remove Blocked Date
  const handleRemoveBlockedDate = async (id: number) => {
    if (!confirm('ต้องการยกเลิกการปิดรับจองวันนี้หรือไม่?')) return;
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove_blocked_date',
          id,
        }),
      });
      if (!res.ok) throw new Error('ไม่สามารถยกเลิกได้');
      showToast('ยกเลิกการปิดรับจองสำเร็จ');
      fetchSettings();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (bookings.length === 0) {
      showToast('ไม่มีข้อมูลสำหรับส่งออก', 'error');
      return;
    }

    const headers = ['Booking ID', 'วันที่', 'เวลา', 'บริษัทขนส่ง', 'เจ้าของสินค้า', 'เบอร์โทร', 'ลัง/พาเลท', 'รถ', 'คนขับ', 'ทะเบียน', 'สถานะ', 'หมายเหตุ'];
    const rows = bookings.map((b) => [
      b.booking_id,
      b.requested_date,
      `"${b.requested_time}"`,
      `"${b.carrier_name}"`,
      `"${b.client_name}"`,
      `"${b.user_phone}"`,
      b.pallet_count,
      b.vehicle_count,
      `"${b.driver_name || ''}"`,
      `"${b.license_plate || ''}"`,
      b.status,
      `"${b.notes || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `PTN_Queues_${filterDate || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 pb-16">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl border text-sm font-bold flex items-center gap-2 animate-bounce ${
            toastMsg.type === 'success'
              ? 'bg-emerald-800 text-white border-emerald-600'
              : 'bg-rose-800 text-white border-rose-600'
          }`}
        >
          {toastMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-slate-900 text-white border-b border-slate-800 sticky top-16 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h1 className="text-xl font-black tracking-tight">Admin & Warehouse Dashboard</h1>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">บริษัท พีทีเอ็น ฟาร์มาเซ็นเตอร์ จำกัด (พัฒนาเภสัช)</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  fetchBookings();
                  fetchForecast();
                }}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition text-xs flex items-center gap-1.5"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>รีเฟรช</span>
              </button>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 bg-rose-900/60 hover:bg-rose-900 text-rose-200 border border-rose-700/60 rounded-xl transition text-xs font-semibold flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>ออกจากระบบ</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 border-t border-slate-800 pt-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('queues')}
              className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-t-xl transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'queues'
                  ? 'bg-slate-800 text-emerald-400 border-emerald-400'
                  : 'text-slate-400 hover:text-slate-200 border-transparent'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>รายการจองคิว</span>
              {forecast?.total_pending_all ? (
                <span className="bg-amber-500 text-slate-900 font-extrabold text-[10px] px-1.5 py-0.2 rounded-full">
                  {forecast.total_pending_all}
                </span>
              ) : null}
            </button>

            <button
              onClick={() => setActiveTab('capacity')}
              className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-t-xl transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'capacity'
                  ? 'bg-slate-800 text-emerald-400 border-emerald-400'
                  : 'text-slate-400 hover:text-slate-200 border-transparent'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>บริหารความจุรอบเวลา</span>
            </button>

            <button
              onClick={() => setActiveTab('blocking')}
              className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-t-xl transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'blocking'
                  ? 'bg-slate-800 text-emerald-400 border-emerald-400'
                  : 'text-slate-400 hover:text-slate-200 border-transparent'
              }`}
            >
              <CalendarOff className="w-4 h-4" />
              <span>ปิดรับจองเฉพาะวัน / วันหยุด</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Scheduler Forecast Alert Banner */}
        {forecast && (
          <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border border-emerald-800/60 rounded-3xl p-4 sm:p-5 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-emerald-300 animate-bounce" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                  <span>Scheduler Advance Alert • สรุปคิวล่วงหน้า</span>
                </div>
                <p className="text-sm font-bold text-slate-100 mt-0.5">
                  พรุ่งนี้ ({forecast.tomorrow_date}) มีคิวที่ต้องรับการจัดการทั้งหมด {forecast.tomorrow_total} รายการ
                </p>
                <p className="text-xs text-slate-400">
                  (อนุมัติแล้ว {forecast.tomorrow_approved} รายการ, รอตรวจสอบ {forecast.tomorrow_pending} รายการ)
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setFilterDate(forecast.tomorrow_date);
                setFilterStatus('All');
                setActiveTab('queues');
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm shrink-0 flex items-center gap-1"
            >
              <span>ดูคิววันพรุ่งนี้</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab 1: Queues Management */}
        {activeTab === 'queues' && (
          <div className="space-y-6">
            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-sm">
                <span className="text-xs font-semibold text-slate-500">คิวทั้งหมดตามที่เลือก</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900">{bookings.length}</span>
                  <span className="text-xs text-slate-400">รายการ</span>
                </div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-3xl border border-amber-200 bg-amber-50/30 shadow-sm">
                <span className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> รอตรวจสอบ (Pending)
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-amber-700">
                    {bookings.filter((b) => b.status === 'Pending').length}
                  </span>
                  <span className="text-xs text-amber-600">รายการ</span>
                </div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-3xl border border-emerald-200 bg-emerald-50/30 shadow-sm">
                <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> อนุมัติแล้ว (Approved)
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-700">
                    {bookings.filter((b) => b.status === 'Approved').length}
                  </span>
                  <span className="text-xs text-emerald-600">รายการ</span>
                </div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-sm">
                <span className="text-xs font-semibold text-slate-500">ยอดรวมพาเลท / รถ</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-xl sm:text-2xl font-black text-slate-800">
                    {bookings.reduce((sum, b) => sum + (b.pallet_count || 0), 0)}
                  </span>
                  <span className="text-xs text-slate-500">ลัง /</span>
                  <span className="text-xl sm:text-2xl font-black text-slate-800">
                    {bookings.reduce((sum, b) => sum + (b.vehicle_count || 0), 0)}
                  </span>
                  <span className="text-xs text-slate-500">คัน</span>
                </div>
              </div>
            </div>

            {/* Filters and Search Toolbar */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                {/* Date Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">วันที่:</span>
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                  <button
                    onClick={() => setFilterDate(getTodayStr())}
                    className={`px-3 py-2 text-xs font-bold rounded-xl transition ${
                      filterDate === getTodayStr()
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    วันนี้
                  </button>
                  <button
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      setFilterDate(d.toISOString().split('T')[0]);
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                  >
                    พรุ่งนี้
                  </button>
                  <button
                    onClick={() => setFilterDate('')}
                    className={`px-3 py-2 text-xs font-bold rounded-xl transition ${
                      filterDate === ''
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    ดูทั้งหมด
                  </button>
                </div>

                {/* Status Filter Buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {['All', 'Pending', 'Approved', 'Rejected', 'Cancelled'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setFilterStatus(st)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        filterStatus === st
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {st === 'All' && 'สถานะทั้งหมด'}
                      {st === 'Pending' && 'รอตรวจสอบ'}
                      {st === 'Approved' && 'อนุมัติแล้ว'}
                      {st === 'Rejected' && 'ไม่อนุมัติ'}
                      {st === 'Cancelled' && 'ยกเลิกแล้ว'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search & Export Line */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ค้นหา (ID, ขนส่ง, เบอร์, ทะเบียน)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchBookings()}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={handleExportCSV}
                    className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ส่งออก CSV</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>พิมพ์รายงาน</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bookings Table / Cards */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
              {loadingBookings ? (
                <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium">กำลังโหลดรายการคิว...</span>
                </div>
              ) : bookings.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700">ไม่พบรายการจองคิวในช่วงที่เลือก</p>
                  <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนวันที่หรือตัวกรองค้นหา</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200/80">
                      <tr>
                        <th className="py-3.5 px-4">Booking ID</th>
                        <th className="py-3.5 px-4">วัน / เวลานัดหมาย</th>
                        <th className="py-3.5 px-4">บริษัทขนส่ง / เจ้าของสินค้า</th>
                        <th className="py-3.5 px-4 text-center">ลัง / รถ</th>
                        <th className="py-3.5 px-4">สถานะ</th>
                        <th className="py-3.5 px-4 text-right">การจัดการ (Actions)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bookings.map((b) => (
                        <tr key={b.booking_id} className="hover:bg-slate-50/80 transition">
                          {/* ID & Phone */}
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => setSelectedBooking(b)}
                              className="font-mono font-bold text-emerald-700 hover:underline block text-left"
                            >
                              {b.booking_id}
                            </button>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-slate-400" /> {b.user_phone}
                            </span>
                          </td>

                          {/* Date & Time */}
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-900 block">{b.requested_date}</span>
                            <span className="text-[11px] text-emerald-700 font-medium">{b.requested_time}</span>
                          </td>

                          {/* Carrier & Client */}
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-800 block truncate max-w-[200px]">{b.carrier_name}</span>
                            <span className="text-[11px] text-slate-500 truncate block max-w-[200px]">{b.client_name}</span>
                          </td>

                          {/* Cargo Counts */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-bold text-slate-800">{b.pallet_count} ลัง</span>
                            <span className="text-[11px] text-slate-400 block">{b.vehicle_count} คัน</span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            {b.status === 'Approved' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3" /> อนุมัติแล้ว
                              </span>
                            )}
                            {b.status === 'Pending' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 animate-pulse">
                                <Clock className="w-3 h-3" /> รอตรวจสอบ
                              </span>
                            )}
                            {b.status === 'Rejected' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                                <XCircle className="w-3 h-3" /> ไม่อนุมัติ
                              </span>
                            )}
                            {b.status === 'Cancelled' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700">
                                <AlertCircle className="w-3 h-3" /> ยกเลิกแล้ว
                              </span>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {b.status === 'Pending' && (
                                <>
                                  <button
                                    onClick={() => handleApprove(b)}
                                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition"
                                  >
                                    อนุมัติ
                                  </button>
                                  <button
                                    onClick={() => openRejectModal(b)}
                                    className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-sm transition"
                                  >
                                    ปฏิเสธ
                                  </button>
                                </>
                              )}

                              {b.status === 'Approved' && (
                                <button
                                  onClick={() => openCancelModal(b)}
                                  className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition"
                                >
                                  ยกเลิกคิว
                                </button>
                              )}

                              <button
                                onClick={() => setSelectedBooking(b)}
                                className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                                title="ดูรายละเอียดเต็ม"
                              >
                                <Info className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Capacity Management */}
        {activeTab === 'capacity' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">บริหารความจุช่วงเวลาทำการ (Operating Hours & Capacity)</h2>
                <p className="text-xs text-slate-500">กำหนดจำนวนคิวสูงสุดที่สามารถรับได้ในแต่ละรอบเวลา</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {slots.map((slot) => (
                <div
                  key={slot.id}
                  className={`p-5 rounded-2xl border transition ${
                    slot.is_active ? 'bg-slate-50 border-slate-200' : 'bg-slate-100 border-slate-300 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
                    <span className="font-bold text-base text-slate-900">{slot.slot_name}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(slot.is_active)}
                        onChange={(e) => handleUpdateSlot(slot.id, slot.max_capacity, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  <div className="pt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600 font-semibold">จำนวนคิวสูงสุดต่อรอบ:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateSlot(slot.id, Math.max(1, slot.max_capacity - 1), Boolean(slot.is_active))}
                          className="w-7 h-7 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="font-extrabold text-base text-emerald-700 w-6 text-center">
                          {slot.max_capacity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateSlot(slot.id, slot.max_capacity + 1, Boolean(slot.is_active))}
                          className="w-7 h-7 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Date Blocking */}
        {activeTab === 'blocking' && (
          <div className="space-y-6">
            {/* Add Date Block Form */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-4">
              <h2 className="text-lg font-bold text-slate-900">กำหนดวันปิดรับจองคิว / วันหยุด (Date Blocking)</h2>
              <p className="text-xs text-slate-500">
                เมื่อตั้งค่าปิดรับจอง ผู้ส่งสินค้าจะไม่สามารถเลือกจองคิวในวันดังกล่าวได้ (เช่น วันหยุดนักขัตฤกษ์ หรือวันตรวจนับสต็อก)
              </p>

              <form onSubmit={handleAddBlockedDate} className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">วันที่ต้องการปิดรับจอง</label>
                  <input
                    type="date"
                    required
                    value={newBlockedDate}
                    onChange={(e) => setNewBlockedDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">เหตุผลการปิดรับจอง</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="เช่น ปิดตรวจนับสต็อกประจำปี, วันหยุดปีใหม่..."
                      value={newBlockedReason}
                      onChange={(e) => setNewBlockedReason(e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>บันทึกวันปิดจอง</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Blocked Dates List */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-4">
              <h3 className="font-bold text-sm text-slate-900">รายการวันที่ปิดรับจองทั้งหมด</h3>
              {blockedDates.length === 0 ? (
                <p className="text-xs text-slate-400 py-4">ยังไม่มีการตั้งค่าวันปิดรับจอง</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {blockedDates.map((item) => (
                    <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <span className="font-bold text-sm text-slate-900">{item.blocked_date}</span>
                        <span className="text-xs text-slate-500 ml-3">เหตุผล: {item.reason}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveBlockedDate(item.id)}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition"
                        title="ลบวันปิดจอง"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* Reject Modal */}
      {/* ========================================================================= */}
      {rejectModalOpen && rejectingBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600">
                <XCircle className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900">ระบุเหตุผลในการปฏิเสธคิว</h3>
              </div>
              <button onClick={() => setRejectModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              กำลังปฏิเสธคิว <span className="font-mono font-bold text-slate-900">{rejectingBooking.booking_id}</span> ({rejectingBooking.carrier_name})
            </p>

            <form onSubmit={submitReject} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  <span className="text-rose-500">*</span> เหตุผลในการปฏิเสธ (จะแสดงให้ผู้จองเห็น):
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="เช่น สินค้าเกินความจุที่ระบุ, ข้อมูลบริษัทไม่ตรง, เอกสารไม่ครบถ้วน..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={rejectSubmitting || !rejectReason.trim()}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
                >
                  {rejectSubmitting ? 'กำลังบันทึก...' : 'ยืนยันการปฏิเสธคิว'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Multi-Step Cancellation Modal (2-Step Verification) */}
      {/* ========================================================================= */}
      {cancelModalOpen && cancellingBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900">
                  {cancelStep === 1 ? 'ขั้นตอนที่ 1/2: ระบุเหตุผลการยกเลิก' : 'ขั้นตอนที่ 2/2: ยืนยันความปลอดภัย'}
                </h3>
              </div>
              <button onClick={() => setCancelModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {cancelError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{cancelError}</span>
              </div>
            )}

            {/* Step 1: Provide Cancellation Reason */}
            {cancelStep === 1 && (
              <form onSubmit={handleCancelNextStep} className="space-y-4">
                <p className="text-xs text-slate-600">
                  ระบบต้องการเหตุผลที่ชัดเจนในการยกเลิกคิวที่ได้รับอนุมัติแล้ว เพื่อเก็บเป็น Audit Log
                </p>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    <span className="text-rose-500">*</span> ระบุเหตุผลในการยกเลิก:
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="เช่น ผู้ส่งแจ้งเลื่อนวันส่ง, รถเสียกลางทาง, แจ้งยกเลิกทางโทรศัพท์..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCancelModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                  >
                    ปิด
                  </button>
                  <button
                    type="submit"
                    disabled={!cancelReason.trim()}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-1"
                  >
                    <span>ถัดไป</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Confirmation Verification Code */}
            {cancelStep === 2 && (
              <form onSubmit={submitCancel} className="space-y-4">
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
                  <p className="font-bold">⚠️ ยืนยันการยกเลิกครั้งที่ 2</p>
                  <p>คิวนี้ได้รับการอนุมัติแล้ว เมื่อยกเลิกแล้วสถานะจะไม่สามารถย้อนกลับได้อัตโนมัติ</p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    กรุณากรอกรหัส <span className="font-mono font-bold text-rose-600">{cancellingBooking.booking_id}</span> หรือคำว่า <span className="font-bold text-slate-900">CONFIRM</span> เพื่อยืนยัน:
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder={`พิมพ์ '${cancellingBooking.booking_id}'`}
                    value={confirmCodeInput}
                    onChange={(e) => setConfirmCodeInput(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none text-center"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCancelStep(1)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                  >
                    ย้อนกลับ
                  </button>
                  <button
                    type="submit"
                    disabled={cancelSubmitting || !confirmCodeInput.trim()}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
                  >
                    {cancelSubmitting ? 'กำลังยกเลิก...' : 'ยืนยันการยกเลิกคิว (Final Step)'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Booking Detail Modal Drawer */}
      {/* ========================================================================= */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-700">รายละเอียดคิว</span>
                <h3 className="font-mono font-bold text-lg text-slate-900">{selectedBooking.booking_id}</h3>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 block text-[11px]">วันที่เข้าส่ง</span>
                <span className="font-bold text-slate-800">{selectedBooking.requested_date}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 block text-[11px]">ช่วงเวลา</span>
                <span className="font-bold text-slate-800">{selectedBooking.requested_time}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 block text-[11px]">บริษัทขนส่ง</span>
                <span className="font-bold text-slate-800">{selectedBooking.carrier_name}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 block text-[11px]">เบอร์โทรติดต่อ</span>
                <span className="font-bold text-slate-800">{selectedBooking.user_phone}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 col-span-2">
                <span className="text-slate-400 block text-[11px]">บริษัทเจ้าของสินค้า</span>
                <span className="font-bold text-slate-800">{selectedBooking.client_name}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 block text-[11px]">จำนวนลัง/พาเลท</span>
                <span className="font-bold text-slate-800">{selectedBooking.pallet_count} รายการ</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 block text-[11px]">จำนวนรถ</span>
                <span className="font-bold text-slate-800">{selectedBooking.vehicle_count} คัน</span>
              </div>
              {(selectedBooking.driver_name || selectedBooking.license_plate) && (
                <div className="p-3 rounded-xl bg-slate-50 col-span-2">
                  <span className="text-slate-400 block text-[11px]">คนขับ / ทะเบียนรถ</span>
                  <span className="font-bold text-slate-800">
                    {selectedBooking.driver_name || '-'} (ทะเบียน {selectedBooking.license_plate || '-'})
                  </span>
                </div>
              )}
              {selectedBooking.notes && (
                <div className="p-3 rounded-xl bg-slate-50 col-span-2">
                  <span className="text-slate-400 block text-[11px]">หมายเหตุ</span>
                  <span className="text-slate-700">{selectedBooking.notes}</span>
                </div>
              )}
            </div>

            {/* Admin Audit Information */}
            {selectedBooking.admin_reason && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 space-y-1">
                <span className="font-bold block">บันทึกเหตุผลจาก Admin:</span>
                <p>{selectedBooking.admin_reason}</p>
                {selectedBooking.admin_action_date && (
                  <span className="text-[10px] text-rose-600 block mt-1">
                    ดำเนินการเมื่อ: {selectedBooking.admin_action_date} โดย {selectedBooking.admin_action_by || 'Admin'}
                  </span>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <a
                href={`/booking/${selectedBooking.booking_id}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
              >
                <span>เปิดดูบัตรคิวดิจิทัล</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </a>

              <div className="flex gap-2">
                {selectedBooking.status === 'Pending' && (
                  <>
                    <button
                      onClick={() => handleApprove(selectedBooking)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
                    >
                      อนุมัติคิว
                    </button>
                    <button
                      onClick={() => openRejectModal(selectedBooking)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
                    >
                      ปฏิเสธคิว
                    </button>
                  </>
                )}
                {selectedBooking.status === 'Approved' && (
                  <button
                    onClick={() => openCancelModal(selectedBooking)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition"
                  >
                    ยกเลิกคิว (Multi-Step)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
