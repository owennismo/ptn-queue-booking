'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  History,
  Lock,
  Eye,
  Activity,
  Users,
  UserPlus,
  Edit,
  KeyRound,
  Shield,
} from 'lucide-react';
import { Booking, TimeSlot, BlockedDate, DailyForecast, StaffUser, StaffRole } from '@/lib/types';

interface AuditLog {
  id: number;
  action: string;
  details: string;
  operator: string;
  ip_address: string;
  created_at: string;
}

const IDLE_TIMEOUT_SECONDS = 15 * 60; // 15 minutes

export default function AdminDashboardPage() {
  const router = useRouter();

  // Helper date
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Auth & Token & Role
  const [token, setToken] = useState<string>('');
  const [operatorName, setOperatorName] = useState<string>('เจ้าหน้าที่คลังสินค้า');
  const [userRole, setUserRole] = useState<StaffRole>('warehouse_officer');
  const [userRoleName, setUserRoleName] = useState<string>('เจ้าหน้าที่คลังสินค้า');
  const [idleSecondsRemaining, setIdleSecondsRemaining] = useState<number>(IDLE_TIMEOUT_SECONDS);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'queues' | 'capacity' | 'blocking' | 'staff' | 'audit'>('queues');

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

  // Staff Management state
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [staffFormUsername, setStaffFormUsername] = useState('');
  const [staffFormFullName, setStaffFormFullName] = useState('');
  const [staffFormPin, setStaffFormPin] = useState('');
  const [staffFormRole, setStaffFormRole] = useState<StaffRole>('warehouse_officer');
  const [staffFormActive, setStaffFormActive] = useState<number>(1);
  const [staffSubmitting, setStaffSubmitting] = useState(false);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

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
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleLogout = useCallback((reason = 'manual') => {
    sessionStorage.removeItem('ptn_admin_jwt');
    sessionStorage.removeItem('ptn_admin_staff');
    sessionStorage.removeItem('ptn_admin_operator');
    sessionStorage.removeItem('ptn_admin_role');
    sessionStorage.removeItem('ptn_admin_role_name');
    sessionStorage.removeItem('ptn_admin_login_time');
    localStorage.removeItem('ptn_admin_token');
    
    if (reason === 'idle') {
      router.push('/admin/login?reason=idle_timeout');
    } else {
      router.push('/admin/login');
    }
  }, [router]);

  // 1. Initial Authentication Check
  useEffect(() => {
    const savedToken = sessionStorage.getItem('ptn_admin_jwt') || localStorage.getItem('ptn_admin_token');
    const savedOperator = sessionStorage.getItem('ptn_admin_operator') || 'เจ้าหน้าที่คลังสินค้า';
    const savedRole = (sessionStorage.getItem('ptn_admin_role') as StaffRole) || 'warehouse_officer';
    const savedRoleName = sessionStorage.getItem('ptn_admin_role_name') || 'เจ้าหน้าที่';

    if (!savedToken) {
      router.push('/admin/login');
      return;
    }

    setToken(savedToken);
    setOperatorName(savedOperator);
    setUserRole(savedRole);
    setUserRoleName(savedRoleName);
  }, [router]);

  // 2. Idle Timer (Auto-Logout after 15 minutes of inactivity)
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
      setIdleSecondsRemaining(IDLE_TIMEOUT_SECONDS);
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((ev) => window.addEventListener(ev, handleUserActivity));

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const remaining = Math.max(0, IDLE_TIMEOUT_SECONDS - elapsed);
      setIdleSecondsRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        handleLogout('idle');
      }
    }, 1000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
      clearInterval(interval);
    };
  }, [handleLogout]);

  // Helper fetch with JWT Auth header
  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const currentToken = token || sessionStorage.getItem('ptn_admin_jwt') || localStorage.getItem('ptn_admin_token');
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentToken}`,
        ...(options.headers || {}),
      };

      const res = await fetch(url, { ...options, headers });
      if (res.status === 401) {
        showToast('เซสชันความปลอดภัยหมดอายุ กรุณาเข้าสู่ระบบใหม่', 'error');
        handleLogout('expired');
        throw new Error('Unauthorized');
      }
      return res;
    },
    [token, handleLogout]
  );

  // 3. Load Bookings
  const fetchBookings = useCallback(async () => {
    if (!token && !sessionStorage.getItem('ptn_admin_jwt')) return;
    setLoadingBookings(true);
    try {
      let url = `/api/admin/bookings?date=${filterDate}&status=${filterStatus}`;
      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }
      const res = await authFetch(url);
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch (err: any) {
      if (err.message !== 'Unauthorized') {
        showToast('ไม่สามารถโหลดข้อมูลคิวได้', 'error');
      }
    } finally {
      setLoadingBookings(false);
    }
  }, [authFetch, filterDate, filterStatus, searchQuery, token]);

  // 4. Load Forecast
  const fetchForecast = useCallback(async () => {
    if (!token && !sessionStorage.getItem('ptn_admin_jwt')) return;
    try {
      const res = await authFetch('/api/admin/forecast');
      const data = await res.json();
      setForecast(data);
    } catch (err) {}
  }, [authFetch, token]);

  // 5. Load Settings
  const fetchSettings = useCallback(async () => {
    if (!token && !sessionStorage.getItem('ptn_admin_jwt')) return;
    try {
      const res = await authFetch('/api/admin/settings');
      const data = await res.json();
      setSlots(data.slots || []);
      setBlockedDates(data.blockedDates || []);
    } catch (err) {}
  }, [authFetch, token]);

  // 6. Load Staff List
  const fetchStaff = useCallback(async () => {
    if (!token && !sessionStorage.getItem('ptn_admin_jwt')) return;
    setLoadingStaff(true);
    try {
      const res = await authFetch('/api/admin/staff');
      const data = await res.json();
      if (res.ok) {
        setStaffList(data.staff || []);
      }
    } catch (err) {
    } finally {
      setLoadingStaff(false);
    }
  }, [authFetch, token]);

  // 7. Load Audit Logs
  const fetchAuditLogs = useCallback(async () => {
    if (!token && !sessionStorage.getItem('ptn_admin_jwt')) return;
    setLoadingAudit(true);
    try {
      const res = await authFetch('/api/admin/audit-logs');
      const data = await res.json();
      setAuditLogs(data.logs || []);
    } catch (err) {
    } finally {
      setLoadingAudit(false);
    }
  }, [authFetch, token]);

  useEffect(() => {
    if (token) {
      fetchBookings();
      fetchForecast();
      fetchSettings();
    }
  }, [token, fetchBookings, fetchForecast, fetchSettings]);

  useEffect(() => {
    if (activeTab === 'staff' && token) {
      fetchStaff();
    }
    if (activeTab === 'audit' && token) {
      fetchAuditLogs();
    }
  }, [activeTab, token, fetchStaff, fetchAuditLogs]);

  // 1-Click Approve Action
  const handleApprove = async (booking: Booking) => {
    try {
      const res = await authFetch(`/api/admin/bookings/${booking.booking_id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'Approved',
          admin_reason: `อนุมัติโดย ${operatorName}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`อนุมัติคิว ${booking.booking_id} เรียบร้อยแล้ว`);
      fetchBookings();
      fetchForecast();
      if (selectedBooking?.booking_id === booking.booking_id) {
        setSelectedBooking(data.booking);
      }
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการอนุมัติคิว', 'error');
    }
  };

  // Reject Submit
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingBooking || !rejectReason.trim()) return;

    setRejectSubmitting(true);
    try {
      const res = await authFetch(`/api/admin/bookings/${rejectingBooking.booking_id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'Rejected',
          admin_reason: rejectReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`ปฏิเสธคิว ${rejectingBooking.booking_id} แล้ว`);
      setRejectModalOpen(false);
      setRejectingBooking(null);
      setRejectReason('');
      fetchBookings();
      fetchForecast();
      if (selectedBooking?.booking_id === rejectingBooking.booking_id) {
        setSelectedBooking(data.booking);
      }
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการปฏิเสธคิว', 'error');
    } finally {
      setRejectSubmitting(false);
    }
  };

  // Multi-step Cancel Submit
  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingBooking) return;

    if (cancelStep === 1) {
      if (!cancelReason.trim()) {
        setCancelError('กรุณาระบุเหตุผลในการยกเลิกคิว');
        return;
      }
      setCancelError(null);
      setCancelStep(2);
      return;
    }

    if (confirmCodeInput.trim().toUpperCase() !== cancellingBooking.booking_id.toUpperCase() && confirmCodeInput.trim().toUpperCase() !== 'CONFIRM') {
      setCancelError(`รหัสยืนยันไม่ถูกต้อง กรุณากรอก "${cancellingBooking.booking_id}" หรือ "CONFIRM"`);
      return;
    }

    setCancelSubmitting(true);
    setCancelError(null);

    try {
      const res = await authFetch(`/api/admin/bookings/${cancellingBooking.booking_id}`, {
        method: 'POST',
        body: JSON.stringify({
          cancellation_reason: cancelReason.trim(),
          confirm_code: confirmCodeInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`ยกเลิกคิว ${cancellingBooking.booking_id} เรียบร้อยแล้ว`);
      setCancelModalOpen(false);
      setCancellingBooking(null);
      setCancelReason('');
      setConfirmCodeInput('');
      setCancelStep(1);
      fetchBookings();
      fetchForecast();
      if (selectedBooking?.booking_id === cancellingBooking.booking_id) {
        setSelectedBooking(data.booking);
      }
    } catch (err: any) {
      setCancelError(err.message || 'เกิดข้อผิดพลาดในการยกเลิกคิว');
    } finally {
      setCancelSubmitting(false);
    }
  };

  // Slot capacity change
  const handleSlotCapacityChange = async (id: number, max_capacity: number, is_active: boolean) => {
    try {
      const res = await authFetch('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify({
          action: 'update_slot',
          id,
          max_capacity,
          is_active,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('บันทึกการตั้งค่ารอบเวลาสำเร็จ');
      fetchSettings();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาด', 'error');
    }
  };

  // Add Blocked date
  const handleAddBlockedDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockedDate || !newBlockedReason.trim()) return;

    try {
      const res = await authFetch('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify({
          action: 'add_blocked_date',
          blocked_date: newBlockedDate,
          reason: newBlockedReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`ปิดรับจองวันที่ ${newBlockedDate} สำเร็จ`);
      setNewBlockedDate('');
      setNewBlockedReason('');
      fetchSettings();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาด', 'error');
    }
  };

  // Remove Blocked date
  const handleRemoveBlockedDate = async (blocked_date: string) => {
    if (!confirm(`ต้องการยกเลิกการปิดรับจองวันที่ ${blocked_date} ใช่หรือไม่?`)) return;

    try {
      const res = await authFetch('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify({
          action: 'remove_blocked_date',
          blocked_date,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`ยกเลิกการปิดรับจองวันที่ ${blocked_date} สำเร็จ`);
      fetchSettings();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาด', 'error');
    }
  };

  // Staff Management Actions
  const handleOpenAddStaff = () => {
    setEditingStaff(null);
    setStaffFormUsername('');
    setStaffFormFullName('');
    setStaffFormPin('');
    setStaffFormRole('warehouse_officer');
    setStaffFormActive(1);
    setStaffModalOpen(true);
  };

  const handleOpenEditStaff = (staff: StaffUser) => {
    setEditingStaff(staff);
    setStaffFormUsername(staff.username);
    setStaffFormFullName(staff.full_name);
    setStaffFormPin('');
    setStaffFormRole(staff.role);
    setStaffFormActive(staff.is_active);
    setStaffModalOpen(true);
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffSubmitting(true);
    try {
      if (editingStaff) {
        // Update staff
        const res = await authFetch('/api/admin/staff', {
          method: 'POST',
          body: JSON.stringify({
            action: 'update',
            id: editingStaff.id,
            full_name: staffFormFullName,
            role: staffFormRole,
            is_active: staffFormActive,
            pin: staffFormPin.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        showToast('แก้ไขข้อมูลเจ้าหน้าที่สำเร็จ');
      } else {
        // Create new staff
        if (!staffFormPin.trim()) {
          throw new Error('กรุณาระบุรหัส PIN');
        }
        const res = await authFetch('/api/admin/staff', {
          method: 'POST',
          body: JSON.stringify({
            action: 'create',
            username: staffFormUsername,
            full_name: staffFormFullName,
            pin: staffFormPin,
            role: staffFormRole,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        showToast('เพิ่มเจ้าหน้าที่ใหม่สำเร็จ');
      }

      setStaffModalOpen(false);
      fetchStaff();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาด', 'error');
    } finally {
      setStaffSubmitting(false);
    }
  };

  const handleDeleteStaff = async (staff: StaffUser) => {
    if (!confirm(`ยืนยันการลบบัญชีเจ้าหน้าที่ "${staff.full_name}" (@${staff.username}) ใช่หรือไม่?`)) return;

    try {
      const res = await authFetch('/api/admin/staff', {
        method: 'POST',
        body: JSON.stringify({
          action: 'delete',
          id: staff.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('ลบบัญชีเจ้าหน้าที่เรียบร้อยแล้ว');
      fetchStaff();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาด', 'error');
    }
  };

  // Format idle time display (MM:SS)
  const formatIdleTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> อนุมัติแล้ว</span>;
      case 'Rejected':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5 text-rose-600" /> ไม่อนุมัติ</span>;
      case 'Cancelled':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 text-slate-500" /> ยกเลิกแล้ว</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" /> รอการตรวจสอบ</span>;
    }
  };

  const getRoleBadge = (role: StaffRole) => {
    switch (role) {
      case 'super_admin':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">👑 Super Admin</span>;
      case 'warehouse_officer':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">📦 คลังสินค้า</span>;
      case 'security_gate':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1">🛡️ รปภ. ประตู</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">เจ้าหน้าที่</span>;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'APPROVE_QUEUE':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">อนุมัติคิว</span>;
      case 'REJECT_QUEUE':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">ปฏิเสธคิว</span>;
      case 'CANCEL_QUEUE':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-200 text-slate-700">ยกเลิกคิว</span>;
      case 'LOGIN_SUCCESS':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800">เข้าสู่ระบบ</span>;
      case 'LOGIN_FAILED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800">กรอกรหัสผิด</span>;
      case 'ADD_STAFF':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800">เพิ่มเจ้าหน้าที่</span>;
      case 'UPDATE_STAFF':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-100 text-cyan-800">แก้ไขเจ้าหน้าที่</span>;
      case 'DELETE_STAFF':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">ลบเจ้าหน้าที่</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">{action}</span>;
    }
  };

  // Permission flags
  const isSuperAdmin = userRole === 'super_admin';
  const isSecurityOnly = userRole === 'security_gate';

  return (
    <div className="min-h-screen bg-slate-100/70 pb-16">
      {/* Toast Notification */}
      {toastMsg && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl shadow-xl border text-sm font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200 ${
          toastMsg.type === 'success' ? 'bg-emerald-800 text-white border-emerald-600' : 'bg-rose-800 text-white border-rose-600'
        }`}>
          {toastMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-300" /> : <AlertTriangle className="w-5 h-5 text-rose-300" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Top Header & Security Bar */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center font-bold shadow-md shadow-emerald-900/50">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">ระบบจัดการคิวคลังสินค้า</h1>
              <p className="text-[11px] text-slate-400">บจก. พีทีเอ็น ฟาร์มาเซ็นเตอร์ (พัฒนาเภสัช)</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Operator info with Role Badge */}
            <div className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl flex items-center gap-2.5 text-xs">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-200">{operatorName}</span>
                {getRoleBadge(userRole)}
              </div>
              <span className="text-slate-600">|</span>
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400 text-[11px]" title="เซสชันจะหมดอายุหากไม่มีการใช้งาน">
                Auto-Logout: <strong className="text-amber-300 font-mono">{formatIdleTime(idleSecondsRemaining)}</strong>
              </span>
            </div>

            <button
              onClick={() => handleLogout('manual')}
              className="px-3 py-1.5 bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-2 border-t border-slate-800 pt-2 pb-2 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('queues')}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'queues' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>รายการจองคิวส่งของ</span>
          </button>

          {!isSecurityOnly && (
            <>
              <button
                onClick={() => setActiveTab('capacity')}
                className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'capacity' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>ตั้งค่ารอบเวลาและความจุ</span>
              </button>

              <button
                onClick={() => setActiveTab('blocking')}
                className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'blocking' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <CalendarOff className="w-4 h-4" />
                <span>จัดการวันปิดรับจอง</span>
              </button>
            </>
          )}

          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('staff')}
              className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'staff' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4 text-amber-300" />
              <span>จัดการเจ้าหน้าที่และพนักงาน</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'audit' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>ประวัติความปลอดภัย (Audit Logs)</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Security role notice if logged as Security */}
        {isSecurityOnly && (
          <div className="bg-blue-50 border border-blue-200 text-blue-900 px-4 py-3 rounded-2xl flex items-center gap-3 text-xs">
            <Shield className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <strong className="block">เข้าสู่ระบบในโหมด รปภ. / จุดตรวจหน้าประตู (View-Only Mode)</strong>
              สามารถตรวจสอบรายการคิว สแกน QR Code และพิมพ์บัตรคิวได้ (ฟังก์ชันแก้ไขและอนุมัติคิวถูกปิดการใช้งาน)
            </div>
          </div>
        )}

        {/* 🌟 1. Tomorrow / Advance Forecast Banner */}
        {forecast && (
          <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white p-5 rounded-3xl border border-emerald-700/50 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <Bell className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-300">
                  Advance Queue Forecast • สรุปยอดคิวล่วงหน้า
                </span>
                <h3 className="text-base sm:text-lg font-extrabold">{forecast.notification_message}</h3>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-center px-3.5 py-2 bg-white/10 rounded-2xl border border-white/10">
                <span className="text-[10px] text-slate-300 block">รอตรวจสอบทั้งหมด</span>
                <span className="text-lg font-black text-amber-400">{forecast.total_pending_all} คิว</span>
              </div>
              <div className="text-center px-3.5 py-2 bg-white/10 rounded-2xl border border-white/10">
                <span className="text-[10px] text-slate-300 block">คิววันพรุ่งนี้</span>
                <span className="text-lg font-black text-emerald-300">{forecast.tomorrow_total} คิว</span>
              </div>
            </div>
          </div>
        )}

        {/* 🌟 TAB 1: QUEUES MANAGEMENT */}
        {activeTab === 'queues' && (
          <div className="space-y-6">
            {/* Filters & Actions Bar */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Date Filter */}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-2xl">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                  />
                  <button
                    onClick={() => setFilterDate(getTodayStr())}
                    className="text-[10px] font-bold text-emerald-700 hover:underline ml-1"
                  >
                    วันนี้
                  </button>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-2xl">
                  <Filter className="w-4 h-4 text-slate-500" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                  >
                    <option value="All">ทุกสถานะ</option>
                    <option value="Pending">รอตรวจสอบ (Pending)</option>
                    <option value="Approved">อนุมัติแล้ว (Approved)</option>
                    <option value="Rejected">ไม่อนุมัติ (Rejected)</option>
                    <option value="Cancelled">ยกเลิกแล้ว (Cancelled)</option>
                  </select>
                </div>
              </div>

              {/* Search Box */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 md:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ค้นหา ID, ขนส่ง, ผู้ส่ง..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  onClick={fetchBookings}
                  disabled={loadingBookings}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition"
                  title="รีเฟรชข้อมูล"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingBookings ? 'animate-spin text-emerald-600' : ''}`} />
                </button>
              </div>
            </div>

            {/* Bookings List Table */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    รายการจองคิวประจำวันที่ {filterDate}
                  </h3>
                  <p className="text-xs text-slate-500">พบทั้งหมด {bookings.length} รายการ</p>
                </div>
              </div>

              {loadingBookings ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs">กำลังโหลดข้อมูลคิว...</p>
                </div>
              ) : bookings.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <Calendar className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">ไม่พบคิวการจองในวันที่เลือก</p>
                  <p className="text-xs text-slate-400">สามารถเปลี่ยนวันที่ หรือเลือกดูทุกสถานะได้ที่แถบตัวกรอง</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <th className="py-3.5 px-4">Booking ID</th>
                        <th className="py-3.5 px-4">รอบเวลา</th>
                        <th className="py-3.5 px-4">บริษัทขนส่ง</th>
                        <th className="py-3.5 px-4">เจ้าของสินค้า / ผู้ส่ง</th>
                        <th className="py-3.5 px-4 text-center">ลัง/พาเลท</th>
                        <th className="py-3.5 px-4">สถานะ</th>
                        <th className="py-3.5 px-4 text-center">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bookings.map((item) => (
                        <tr key={item.booking_id} className="hover:bg-slate-50/70 transition">
                          <td className="py-4 px-4 font-mono font-bold text-slate-900">
                            {item.booking_id}
                          </td>
                          <td className="py-4 px-4 font-semibold text-slate-700 whitespace-nowrap">
                            <Clock className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
                            {item.requested_time}
                          </td>
                          <td className="py-4 px-4">
                            <span className="font-bold text-slate-900 block">{item.carrier_name}</span>
                            <span className="text-[11px] text-slate-400">{item.user_phone}</span>
                          </td>
                          <td className="py-4 px-4 font-medium text-slate-800">
                            {item.client_name}
                          </td>
                          <td className="py-4 px-4 text-center font-bold text-slate-800">
                            {item.pallet_count} ลัง <span className="text-[11px] font-normal text-slate-400">({item.vehicle_count} คัน)</span>
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap">
                            {getStatusBadge(item.status)}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {/* 1-Click Approve (Hidden for Security Gate) */}
                              {!isSecurityOnly && item.status === 'Pending' && (
                                <button
                                  onClick={() => handleApprove(item)}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                                  title="อนุมัติคิวทันที"
                                >
                                  อนุมัติ
                                </button>
                              )}

                              {/* Reject with Reason (Hidden for Security Gate) */}
                              {!isSecurityOnly && item.status === 'Pending' && (
                                <button
                                  onClick={() => {
                                    setRejectingBooking(item);
                                    setRejectReason('');
                                    setRejectModalOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition"
                                  title="ปฏิเสธคิวพร้อมระบุเหตุผล"
                                >
                                  ปฏิเสธ
                                </button>
                              )}

                              {/* Multi-Step Cancel (Hidden for Security Gate) */}
                              {!isSecurityOnly && item.status === 'Approved' && (
                                <button
                                  onClick={() => {
                                    setCancellingBooking(item);
                                    setCancelReason('');
                                    setConfirmCodeInput('');
                                    setCancelStep(1);
                                    setCancelError(null);
                                    setCancelModalOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                                  title="ยกเลิกคิว (ระบบป้องกัน)"
                                >
                                  ยกเลิก
                                </button>
                              )}

                              {/* View Details */}
                              <button
                                onClick={() => setSelectedBooking(item)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition"
                                title="ดูรายละเอียดบัตรคิว"
                              >
                                <Eye className="w-4 h-4" />
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

        {/* 🌟 TAB 2: CAPACITY & TIME SLOTS */}
        {!isSecurityOnly && activeTab === 'capacity' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">จัดการรอบเวลาและความจุสูงสุดต่อรอบ (Capacity)</h3>
              <p className="text-xs text-slate-500">ปรับเปลี่ยนจำนวนคิวที่รองรับได้ในแต่ละช่วงเวลา</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {slots.map((slot) => (
                <div key={slot.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{slot.slot_name}</span>
                    <input
                      type="checkbox"
                      checked={slot.is_active === 1}
                      onChange={(e) => handleSlotCapacityChange(slot.id, slot.max_capacity, e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">ความจุสูงสุด (คิว)</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={slot.max_capacity}
                      onChange={(e) => handleSlotCapacityChange(slot.id, parseInt(e.target.value, 10) || 1, slot.is_active === 1)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-center text-slate-900"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🌟 TAB 3: BLOCK DATES */}
        {!isSecurityOnly && activeTab === 'blocking' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Form to add blocked date */}
            <form onSubmit={handleAddBlockedDate} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4 md:col-span-1">
              <h3 className="font-bold text-slate-900 text-base">ปิดรับจองคิวชั่วคราว</h3>
              <p className="text-xs text-slate-500">กำหนดวันหยุดทำการ หรือวันที่คลังสินค้าปิดปรับปรุง</p>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">เลือกวันที่ต้องการปิด</label>
                <input
                  type="date"
                  required
                  value={newBlockedDate}
                  onChange={(e) => setNewBlockedDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">เหตุผลที่ปิดรับจอง</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ตรวจนับสต็อกประจำปี, วันหยุดนักขัตฤกษ์"
                  value={newBlockedReason}
                  onChange={(e) => setNewBlockedReason(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>บันทึกวันปิดรับจอง</span>
              </button>
            </form>

            {/* Blocked Dates List */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4 md:col-span-2">
              <h3 className="font-bold text-slate-900 text-base">รายการวันที่ปิดรับจองทั้งหมด</h3>
              {blockedDates.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">ไม่มีวันที่ถูกปิดรับจองในระบบ</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {blockedDates.map((item) => (
                    <div key={item.blocked_date} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <span className="font-bold text-slate-900 text-sm block">{item.blocked_date}</span>
                        <span className="text-xs text-rose-600">{item.reason}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveBlockedDate(item.blocked_date)}
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                        title="ยกเลิกการปิด"
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

        {/* 🌟 TAB 4: STAFF MANAGEMENT (Super Admin Only) */}
        {isSuperAdmin && activeTab === 'staff' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                  จัดการรายชื่อเจ้าหน้าที่และพนักงาน (Staff & Permissions)
                </h3>
                <p className="text-xs text-slate-500">
                  กำหนดสิทธิ์การใช้งาน, สร้างบัญชีผู้ใช้ และตั้งค่ารหัส PIN ประจำตัว
                </p>
              </div>

              <button
                onClick={handleOpenAddStaff}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-sm self-start sm:self-auto"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ เพิ่มเจ้าหน้าที่ใหม่</span>
              </button>
            </div>

            {loadingStaff ? (
              <div className="py-16 text-center text-slate-400">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs mt-2">กำลังโหลดรายชื่อเจ้าหน้าที่...</p>
              </div>
            ) : staffList.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">ไม่พบข้อมูลเจ้าหน้าที่</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <th className="py-3 px-4">ชื่อผู้ใช้ (Username)</th>
                      <th className="py-3 px-4">ชื่อ-นามสกุล</th>
                      <th className="py-3 px-4">ระดับสิทธิ์ (Role)</th>
                      <th className="py-3 px-4 text-center">สถานะ</th>
                      <th className="py-3 px-4">เข้าสู่ระบบล่าสุด</th>
                      <th className="py-3 px-4 text-center">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staffList.map((staff) => (
                      <tr key={staff.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          @{staff.username}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          {staff.full_name}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getRoleBadge(staff.role)}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {staff.is_active === 1 ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                              ใช้งานอยู่
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                              ระงับการใช้งาน
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono text-xs whitespace-nowrap">
                          {staff.last_login || 'ยังไม่เคยเข้าใช้'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditStaff(staff)}
                              className="p-1.5 text-slate-600 hover:text-emerald-700 rounded-lg hover:bg-slate-100 transition"
                              title="แก้ไขข้อมูล / รีเซ็ต PIN"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {staff.username !== 'admin' && (
                              <button
                                onClick={() => handleDeleteStaff(staff)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                                title="ลบบัญชี"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 🌟 TAB 5: AUDIT LOGS (ประวัติความปลอดภัย) */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  บันทึกประวัติการกระทำและความปลอดภัย (Audit Trail)
                </h3>
                <p className="text-xs text-slate-500">บันทึกการเข้าสู่ระบบ, การอนุมัติคิว, ปฏิเสธคิว และการตั้งค่าระบบ</p>
              </div>

              <button
                onClick={fetchAuditLogs}
                disabled={loadingAudit}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingAudit ? 'animate-spin text-emerald-600' : ''}`} />
                <span>รีเฟรชประวัติ</span>
              </button>
            </div>

            {loadingAudit ? (
              <div className="py-16 text-center text-slate-400">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs mt-2">กำลังโหลดประวัติ...</p>
              </div>
            ) : auditLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">ยังไม่มีประวัติการกระทำในรอบนี้</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <th className="py-3 px-3">เวลาที่บันทึก</th>
                      <th className="py-3 px-3">ประเภทกิจกรรม</th>
                      <th className="py-3 px-3">รายละเอียด</th>
                      <th className="py-3 px-3">ผู้ดำเนินการ</th>
                      <th className="py-3 px-3">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">{log.created_at}</td>
                        <td className="py-3 px-3 whitespace-nowrap">{getActionBadge(log.action)}</td>
                        <td className="py-3 px-3 font-medium text-slate-800">{log.details}</td>
                        <td className="py-3 px-3 font-semibold text-slate-700 whitespace-nowrap">{log.operator}</td>
                        <td className="py-3 px-3 font-mono text-slate-400 whitespace-nowrap">{log.ip_address}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 👥 ADD / EDIT STAFF MODAL */}
      {staffModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleStaffSubmit} className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base">
                  {editingStaff ? `แก้ไขข้อมูลเจ้าหน้าที่ (${editingStaff.full_name})` : 'เพิ่มเจ้าหน้าที่ใหม่'}
                </h3>
              </div>
              <button type="button" onClick={() => setStaffModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  ชื่อผู้ใช้ / รหัสพนักงาน (Username) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingStaff}
                  placeholder="เช่น emp01, wh_kornsak"
                  value={staffFormUsername}
                  onChange={(e) => setStaffFormUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  ชื่อ-นามสกุลจริง <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น นายกรศักดิ์ คลังสินค้า"
                  value={staffFormFullName}
                  onChange={(e) => setStaffFormFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  ระดับสิทธิ์การใช้งาน (Role) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={staffFormRole}
                  onChange={(e) => setStaffFormRole(e.target.value as StaffRole)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="warehouse_officer">📦 เจ้าหน้าที่คลังสินค้า (อนุมัติ / ปฏิเสธคิว)</option>
                  <option value="security_gate">🛡️ รปภ. จุดตรวจหน้าประตู (ตรวจสอบคิวอย่างเดียว)</option>
                  <option value="super_admin">👑 Super Admin (ผู้ดูแลระบบสูงสุด)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  {editingStaff ? 'เปลี่ยนรหัส PIN ใหม่ (เว้นว่างไว้หากไม่เปลี่ยน)' : 'รหัส PIN เข้าใช้งาน *'}
                </label>
                <input
                  type="password"
                  placeholder={editingStaff ? 'กรอก PIN ใหม่หากต้องการเปลี่ยน' : 'เช่น 1234, 9999'}
                  value={staffFormPin}
                  onChange={(e) => setStaffFormPin(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-center tracking-widest text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {editingStaff && editingStaff.username !== 'admin' && (
                <div className="space-y-1 pt-1">
                  <label className="text-xs font-bold text-slate-700 block">สถานะบัญชี</label>
                  <div className="flex items-center gap-4 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="staff_active"
                        checked={staffFormActive === 1}
                        onChange={() => setStaffFormActive(1)}
                        className="text-emerald-600"
                      />
                      <span>เปิดใช้งานปกติ</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-rose-600">
                      <input
                        type="radio"
                        name="staff_active"
                        checked={staffFormActive === 0}
                        onChange={() => setStaffFormActive(0)}
                        className="text-rose-600"
                      />
                      <span>ระงับการใช้งาน</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setStaffModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={staffSubmitting}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                {staffSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 🔴 REJECT MODAL */}
      {rejectModalOpen && rejectingBooking && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleRejectSubmit} className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600">
                <XCircle className="w-5 h-5" />
                <h3 className="font-bold text-base">ปฏิเสธคิว ({rejectingBooking.booking_id})</h3>
              </div>
              <button type="button" onClick={() => setRejectModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              กรุณาระบุเหตุผลในการปฏิเสธ เพื่อให้ผู้ส่งสินค้าและคนขับรถสามารถตรวจสอบได้บนบัตรคิว
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">เหตุผลในการปฏิเสธ <span className="text-rose-500">*</span></label>
              <textarea
                required
                rows={3}
                placeholder="เช่น เอกสารใบส่งของไม่ครบถ้วน, สินค้าไม่ตรงรอบเวลา, ฯลฯ"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
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
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                {rejectSubmitting ? 'กำลังบันทึก...' : 'ยืนยันการปฏิเสธ'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ⚠️ MULTI-STEP CANCELLATION MODAL */}
      {cancelModalOpen && cancellingBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCancelSubmit} className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-base">
                  {cancelStep === 1 ? 'ขั้นตอนที่ 1: ระบุเหตุผลการยกเลิก' : 'ขั้นตอนที่ 2: ยืนยันรหัสความปลอดภัย'}
                </h3>
              </div>
              <button type="button" onClick={() => setCancelModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {cancelStep === 1 ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  คิวนี้ได้รับการอนุมัติแล้ว การยกเลิกจะมีผลทันทีและผู้ส่งสินค้าจะไม่สามารถนำรถเข้าได้
                </p>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">เหตุผลที่ขอยกเลิกคิว <span className="text-rose-500">*</span></label>
                  <textarea
                    required
                    rows={3}
                    placeholder="เช่น ขนส่งแจ้งขอเลื่อนเวลา, รถเกิดอุบัติเหตุ, สินค้าชำรุด"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800">
                  กรุณาพิมพ์รหัส Booking ID: <strong className="font-mono text-slate-900 select-all">{cancellingBooking.booking_id}</strong> หรือคำว่า <strong className="font-mono">CONFIRM</strong> เพื่อยืนยัน
                </div>
                <div className="space-y-1.5">
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder={`พิมพ์ "${cancellingBooking.booking_id}"`}
                    value={confirmCodeInput}
                    onChange={(e) => setConfirmCodeInput(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-center text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {cancelError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                {cancelError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={cancelSubmitting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                {cancelStep === 1 ? 'ถัดไป' : cancelSubmitting ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิกคิวถาวร'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 📄 BOOKING DETAIL DRAWER / MODAL */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold text-emerald-700 uppercase">รายละเอียดคิว</span>
                <h3 className="text-lg font-mono font-bold text-slate-900">{selectedBooking.booking_id}</h3>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block">วันที่เข้าส่ง</span>
                <span className="font-bold text-slate-800">{selectedBooking.requested_date}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block">ช่วงเวลา</span>
                <span className="font-bold text-slate-800">{selectedBooking.requested_time}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl col-span-2">
                <span className="text-slate-400 block">บริษัทเจ้าของสินค้า / ผู้ส่ง</span>
                <span className="font-bold text-slate-800">{selectedBooking.client_name}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block">บริษัทขนส่ง</span>
                <span className="font-bold text-slate-800">{selectedBooking.carrier_name}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block">เบอร์โทรศัพท์</span>
                <span className="font-bold text-slate-800">{selectedBooking.user_phone}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block">จำนวนลัง / พาเลท</span>
                <span className="font-bold text-slate-800">{selectedBooking.pallet_count} รายการ</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block">จำนวนรถ</span>
                <span className="font-bold text-slate-800">{selectedBooking.vehicle_count} คัน</span>
              </div>
              {(selectedBooking.driver_name || selectedBooking.license_plate) && (
                <div className="p-3 bg-slate-50 rounded-xl col-span-2">
                  <span className="text-slate-400 block">ข้อมูลคนขับและทะเบียน</span>
                  <span className="font-bold text-slate-800">
                    {selectedBooking.driver_name ? `คนขับ: ${selectedBooking.driver_name} ` : ''}
                    {selectedBooking.license_plate ? `| ทะเบียน: ${selectedBooking.license_plate}` : ''}
                  </span>
                </div>
              )}
              {selectedBooking.notes && (
                <div className="p-3 bg-slate-50 rounded-xl col-span-2">
                  <span className="text-slate-400 block">หมายเหตุเพิ่มเติม</span>
                  <span className="text-slate-700">{selectedBooking.notes}</span>
                </div>
              )}
              {selectedBooking.admin_reason && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl col-span-2 text-rose-900">
                  <span className="font-bold block">บันทึกเหตุผลจากเจ้าหน้าที่:</span>
                  <span>{selectedBooking.admin_reason}</span>
                  {selectedBooking.admin_action_date && (
                    <span className="text-[10px] text-rose-600 block mt-1">({selectedBooking.admin_action_date} โดย {selectedBooking.admin_action_by})</span>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedBooking(null)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
