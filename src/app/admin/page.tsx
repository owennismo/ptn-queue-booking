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
  Camera,
  Minus,
  Volume2,
  VolumeX,
  ArrowUp,
  ArrowDown,
  Sparkles,
  CheckCheck,
  Check,
  FileSpreadsheet,
  QrCode,
  PackageCheck,
  Image as ImageIcon,
  Maximize2,
  UploadCloud,
} from 'lucide-react';
import { Booking, TimeSlot, BlockedDate, DailyForecast, StaffUser, StaffRole, BookingStatus } from '@/lib/types';
import QRScannerModal from '@/components/QRScannerModal';
import ThaiDatePicker from '@/components/ThaiDatePicker';
import { formatThaiDate, formatThaiShortDate, formatThaiNumericDate, formatThaiDateTime } from '@/lib/dateUtils';
import { sendQueueNotification, getNotificationPermission, requestNotificationPermission } from '@/lib/pushNotifications';
import { compressImage, formatFileSize } from '@/lib/imageCompressor';

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

  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
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

  // Queues state (Default to 'All' to show all incoming bookings)
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [filterDate, setFilterDate] = useState<string>('All');
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

  // Edit Queue Status & Approval Modal State
  const [editStatusModalOpen, setEditStatusModalOpen] = useState(false);
  const [editingStatusBooking, setEditingStatusBooking] = useState<Booking | null>(null);
  const [targetStatus, setTargetStatus] = useState<BookingStatus>('Approved');
  const [statusChangeReason, setStatusChangeReason] = useState('');
  const [editActualPalletInput, setEditActualPalletInput] = useState<number | string>('');
  const [editReceivingNotesInput, setEditReceivingNotesInput] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  // Complete Receiving & Goods Inspection Modal State
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [completingBooking, setCompletingBooking] = useState<Booking | null>(null);
  const [actualPalletInput, setActualPalletInput] = useState<number | string>('');
  const [receivingNotesInput, setReceivingNotesInput] = useState('');
  const [completeSubmitting, setCompleteSubmitting] = useState(false);
  const [receivingPhotoFile, setReceivingPhotoFile] = useState<File | null>(null);
  const [receivingPhotoPreview, setReceivingPhotoPreview] = useState<string | null>(null);
  const [receivingPhotoSavedUrl, setReceivingPhotoSavedUrl] = useState<string | null>(null);
  const [receivingPhotoStats, setReceivingPhotoStats] = useState<{ originalSize: number; compressedSize: number } | null>(null);
  const [compressingReceivingPhoto, setCompressingReceivingPhoto] = useState(false);

  // Photo Lightbox State
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState<string | null>(null);

  // QR Scanner Modal State
  const [scannerOpen, setScannerOpen] = useState(false);

  // Audio Notification Alert State
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ptn_sound_enabled') !== 'false';
    }
    return true;
  });
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const prevPendingCountRef = useRef<number | null>(null);

  useEffect(() => {
    setNotifPermission(getNotificationPermission());
  }, []);

  const handleRequestNotifPermission = async () => {
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
    if (perm === 'granted') {
      showToast('🔔 เปิดรับการแจ้งเตือนบนเบราว์เซอร์สำเร็จ');
      sendQueueNotification({
        title: '🔔 ระบบแจ้งเตือน PTN Admin',
        body: 'การแจ้งเตือนคิวส่งสินค้าใหม่บนเบราว์เซอร์เปิดใช้งานแล้ว',
        url: '/admin',
      });
    } else if (perm === 'denied') {
      showToast('⚠️ คุณได้ปิดกั้นการแจ้งเตือนในเบราว์เซอร์ กรุณาปลดล็อกที่ตั้งค่าเบราว์เซอร์', 'error');
    }
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ptn_sound_enabled', String(next));
    }
    showToast(next ? '🔔 เปิดเสียงแจ้งเตือนคิวใหม่แล้ว' : '🔕 ปิดเสียงแจ้งเตือนแล้ว');
  };

  const playAlertSound = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc1.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
      osc2.frequency.setValueAtTime(880, ctx.currentTime);
      osc2.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.35);
      osc2.stop(ctx.currentTime + 0.35);
    } catch (e) {}
  }, []);

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

    localStorage.removeItem('ptn_admin_jwt');
    localStorage.removeItem('ptn_admin_staff');
    localStorage.removeItem('ptn_admin_operator');
    localStorage.removeItem('ptn_admin_role');
    localStorage.removeItem('ptn_admin_role_name');
    localStorage.removeItem('ptn_admin_login_time');
    localStorage.removeItem('ptn_admin_token');
    
    if (reason === 'idle') {
      router.push('/admin/login?reason=idle_timeout');
    } else {
      router.push('/admin/login');
    }
  }, [router]);

  // 1. Initial Authentication Check
  useEffect(() => {
    const savedToken = sessionStorage.getItem('ptn_admin_jwt') || localStorage.getItem('ptn_admin_jwt');
    const savedOperator = sessionStorage.getItem('ptn_admin_operator') || localStorage.getItem('ptn_admin_operator') || 'เจ้าหน้าที่คลังสินค้า';
    const savedRole = ((sessionStorage.getItem('ptn_admin_role') || localStorage.getItem('ptn_admin_role')) as StaffRole) || 'warehouse_officer';
    const savedRoleName = sessionStorage.getItem('ptn_admin_role_name') || localStorage.getItem('ptn_admin_role_name') || 'เจ้าหน้าที่';

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

  // 4. Load Forecast & Check for new pending queues sound alert & Web Push
  const fetchForecast = useCallback(async () => {
    if (!token && !sessionStorage.getItem('ptn_admin_jwt')) return;
    try {
      const res = await authFetch('/api/admin/forecast');
      const data: DailyForecast = await res.json();
      setForecast(data);

      // Notification trigger when new pending queue arrives
      if (data && typeof data.total_pending_all === 'number') {
        if (
          prevPendingCountRef.current !== null &&
          data.total_pending_all > prevPendingCountRef.current
        ) {
          if (soundEnabled) {
            playAlertSound();
          }
          showToast(`🔔 มีคิวส่งสินค้าใหม่เข้ามา! (รอตรวจสอบ ${data.total_pending_all} คิว)`);
          sendQueueNotification({
            title: '🔔 มีคิวส่งสินค้าใหม่เข้ามา!',
            body: `มีคิวใหม่รอตรวจสอบอนุมัติทั้งหมด ${data.total_pending_all} คิว`,
            url: '/admin',
          });
          fetchBookings();
        }
        prevPendingCountRef.current = data.total_pending_all;
      }
    } catch (err) {}
  }, [authFetch, token, soundEnabled, fetchBookings, playAlertSound]);

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

      // ⏱️ Auto-polling every 15s to catch new incoming bookings in real-time
      const interval = setInterval(() => {
        fetchForecast();
        fetchBookings();
      }, 15000);

      return () => clearInterval(interval);
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

  // Live QR Code Scanner Success Handler
  const handleQRScanned = async (scannedId: string) => {
    setScannerOpen(false);
    setSearchQuery(scannedId);
    try {
      const res = await fetch(`/api/bookings/${scannedId}`);
      const data = await res.json();
      if (res.ok && data.booking) {
        setSelectedBooking(data.booking);
        showToast(`สแกนสำเร็จ: พบข้อมูลคิว ${scannedId}`);
      } else {
        showToast(`ไม่พบข้อมูลคิวรหัส ${scannedId}`, 'error');
      }
    } catch (e) {
      showToast(`ค้นหาคิว ${scannedId}`);
    }
  };

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

  // Clear all bookings (Super Admin)
  const [clearingAllBookings, setClearingAllBookings] = useState(false);

  const handleClearAllBookings = async () => {
    if (!window.confirm('⚠️ คุณแน่ใจหรือไม่ว่าต้องการ "ล้างข้อมูลคิวจองทั้งหมด" ในระบบ?\nข้อมูลคิวการจองจะถูกลบออกทั้งหมดอย่างถาวร')) {
      return;
    }
    setClearingAllBookings(true);
    try {
      const res = await authFetch('/api/admin/bookings', {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ล้างข้อมูลไม่สำเร็จ');
      showToast(data.message || 'ล้างข้อมูลคิวจองทั้งหมดสำเร็จ', 'success');
      setBookings([]);
      fetchForecast();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการล้างข้อมูล', 'error');
    } finally {
      setClearingAllBookings(false);
    }
  };

  // Open Edit Queue Status Modal
  const openEditStatusModal = (booking: Booking) => {
    setEditingStatusBooking(booking);
    setTargetStatus(booking.status);
    setStatusChangeReason('');
    setEditActualPalletInput(booking.actual_pallet_count !== undefined && booking.actual_pallet_count !== null ? booking.actual_pallet_count : booking.pallet_count);
    setEditReceivingNotesInput(booking.receiving_notes || '');
    setEditStatusModalOpen(true);
  };

  // Handle Edit Queue Status Form Submit
  const handleEditStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStatusBooking) return;

    if (targetStatus === 'Rejected' && !statusChangeReason.trim()) {
      showToast('กรณีปฏิเสธคิว (Rejected) จำเป็นต้องระบุเหตุผล', 'error');
      return;
    }

    setStatusSubmitting(true);
    try {
      const payload: any = {
        status: targetStatus,
        admin_reason: statusChangeReason.trim() || `ปรับเปลี่ยนสถานะเป็น ${targetStatus} โดย ${operatorName}`,
      };

      if (targetStatus === 'Completed' || targetStatus === 'Receiving') {
        const actualCount = parseInt(String(editActualPalletInput), 10);
        if (!isNaN(actualCount)) {
          payload.actual_pallet_count = actualCount;
        }
        if (editReceivingNotesInput.trim()) {
          payload.receiving_notes = editReceivingNotesInput.trim();
        }
      }

      const res = await authFetch(`/api/admin/bookings/${editingStatusBooking.booking_id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`แก้ไขสถานะคิว ${editingStatusBooking.booking_id} เป็น "${targetStatus}" เรียบร้อยแล้ว`);
      setEditStatusModalOpen(false);
      setEditingStatusBooking(null);
      setStatusChangeReason('');
      fetchBookings();
      fetchForecast();
      if (selectedBooking?.booking_id === editingStatusBooking.booking_id) {
        setSelectedBooking(data.booking);
      }
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการแก้ไขสถานะคิว', 'error');
    } finally {
      setStatusSubmitting(false);
    }
  };

  // Photo handler for receiving inspection photo
  const handleReceivingPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setCompressingReceivingPhoto(true);
      const compressed = await compressImage(file, 1600, 0.82);
      setReceivingPhotoFile(compressed.file);
      setReceivingPhotoPreview(compressed.dataUrl);
      setReceivingPhotoStats({
        originalSize: compressed.originalSize,
        compressedSize: compressed.compressedSize,
      });
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการประมวลผลรูปภาพ', 'error');
    } finally {
      setCompressingReceivingPhoto(false);
    }
  };

  const removeReceivingPhoto = () => {
    setReceivingPhotoFile(null);
    setReceivingPhotoPreview(null);
    setReceivingPhotoSavedUrl(null);
    setReceivingPhotoStats(null);
  };

  // Open Complete Receiving & Inspect Goods Modal
  const openCompleteModal = (booking: Booking) => {
    setCompletingBooking(booking);
    setActualPalletInput(booking.actual_pallet_count !== undefined && booking.actual_pallet_count !== null ? booking.actual_pallet_count : booking.pallet_count);
    setReceivingNotesInput(booking.receiving_notes || '');
    setReceivingPhotoFile(null);
    setReceivingPhotoPreview(booking.receiving_photo_url || null);
    setReceivingPhotoSavedUrl(booking.receiving_photo_url || null);
    setReceivingPhotoStats(null);
    setCompleteModalOpen(true);
  };

  // Handle Complete Receiving Form Submit
  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingBooking) return;

    const actual = parseInt(String(actualPalletInput), 10);
    if (isNaN(actual) || actual < 0) {
      showToast('กรุณาระบุจำนวนลังที่รับจริงเป็นตัวเลขที่ถูกต้อง', 'error');
      return;
    }

    if (actual < completingBooking.pallet_count && !receivingNotesInput.trim()) {
      showToast('กรณีสินค้ามาไม่ครบ กรุณาระบุหมายเหตุการตรวจรับ (เช่น เอกสาร DO/PO หรือสาเหตุที่ขาดส่ง)', 'error');
      return;
    }

    setCompleteSubmitting(true);
    try {
      let finalReceivingPhotoUrl = receivingPhotoSavedUrl;

      // Upload receiving photo to R2 if selected
      if (receivingPhotoFile) {
        try {
          const uploadFormData = new FormData();
          uploadFormData.append('file', receivingPhotoFile);
          uploadFormData.append('booking_id', completingBooking.booking_id);
          uploadFormData.append('type', 'receiving');

          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: uploadFormData,
          });
          const uploadData = await uploadRes.json();
          if (uploadRes.ok && uploadData.url) {
            finalReceivingPhotoUrl = uploadData.url;
          }
        } catch (uploadErr) {
          console.error('Failed to upload receiving photo:', uploadErr);
        }
      }

      const isPartial = actual < completingBooking.pallet_count;
      const isOver = actual > completingBooking.pallet_count;
      const resultLabel = isPartial
        ? `รับไม่ครบ (รับจริง ${actual}/${completingBooking.pallet_count} ลัง ขาด ${completingBooking.pallet_count - actual} ลัง)`
        : isOver
        ? `รับเกิน (รับจริง ${actual}/${completingBooking.pallet_count} ลัง)`
        : `รับครบถ้วน (${actual} ลัง)`;

      const res = await authFetch(`/api/admin/bookings/${completingBooking.booking_id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'Completed',
          actual_pallet_count: actual,
          receiving_notes: receivingNotesInput.trim() || null,
          receiving_photo_url: finalReceivingPhotoUrl || null,
          admin_reason: `ตรวจรับเสร็จสิ้น: ${resultLabel} โดย ${operatorName}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`ตรวจรับคิว ${completingBooking.booking_id} เสร็จสมบูรณ์แล้ว (${resultLabel})`);
      setCompleteModalOpen(false);
      setCompletingBooking(null);
      setActualPalletInput('');
      setReceivingNotesInput('');
      removeReceivingPhoto();
      fetchBookings();
      fetchForecast();
      if (selectedBooking?.booking_id === completingBooking.booking_id) {
        setSelectedBooking(data.booking);
      }
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึกตรวจรับสินค้า', 'error');
    } finally {
      setCompleteSubmitting(false);
    }
  };

  // Slot capacity change with optimistic UI update
  const handleSlotCapacityChange = async (id: number, max_capacity: number, is_active: boolean) => {
    // Optimistic UI update
    setSlots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, max_capacity, is_active: is_active ? 1 : 0 } : s))
    );

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
      showToast('บันทึกการตั้งค่ารอบเวลาสำเร็จ (มีผลทันทีทุกวัน)');
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
      fetchSettings();
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

  // Workflow Quick Action (CheckedIn, Receiving, Completed)
  const handleWorkflowAction = async (booking: Booking, newStatus: BookingStatus, label: string) => {
    try {
      const res = await authFetch(`/api/admin/bookings/${booking.booking_id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`อัปเดตสถานะคิว ${booking.booking_id} เป็น "${label}" สำเร็จ`);
      fetchBookings();
      fetchForecast();
      if (selectedBooking?.booking_id === booking.booking_id) {
        setSelectedBooking(data.booking);
      }
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการอัปเดตสถานะ', 'error');
    }
  };

  // Reorder slots (Move Up / Down)
  const handleMoveSlot = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= slots.length) return;

    const newSlots = [...slots];
    const temp = newSlots[index];
    newSlots[index] = newSlots[targetIndex];
    newSlots[targetIndex] = temp;

    const orderedWithIndex = newSlots.map((s, idx) => ({ ...s, order_index: idx + 1 }));

    // Optimistic UI update immediately
    setSlots(orderedWithIndex);

    try {
      const res = await authFetch('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify({
          action: 'reorder_slots',
          slots: orderedWithIndex,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('บันทึกลำดับรอบเวลาเรียบร้อยแล้ว (มีผลทันทีทุกวัน)');
      if (data.slots && Array.isArray(data.slots)) {
        setSlots(data.slots);
      }
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึกลำดับ', 'error');
      fetchSettings();
    }
  };

  // Auto sort slots chronologically (08:00 -> 17:00)
  const handleAutoSortSlots = async () => {
    const sorted = [...slots].sort((a, b) => a.start_time.localeCompare(b.start_time));
    const sortedWithIndex = sorted.map((s, idx) => ({ ...s, order_index: idx + 1 }));

    // Instant UI update immediately
    setSlots(sortedWithIndex);

    try {
      const res = await authFetch('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify({
          action: 'reorder_slots',
          slots: sortedWithIndex,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('จัดเรียงรอบเวลาตามเวลาเริ่มต้นเรียบร้อยแล้ว (08:00 -> 17:00)');
      if (data.slots && Array.isArray(data.slots)) {
        setSlots(data.slots);
      }
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาด', 'error');
      fetchSettings();
    }
  };

  // Export Filtered Bookings to Excel / CSV with UTF-8 BOM
  const handleExportCSV = () => {
    if (bookings.length === 0) {
      showToast('ไม่มีข้อมูลคิวสำหรับส่งออก', 'error');
      return;
    }
    const headers = [
      'Booking ID',
      'วันที่เข้าส่ง',
      'รอบเวลานัดหมาย',
      'บริษัทขนส่ง',
      'เบอร์โทรติดต่อ',
      'บริษัทเจ้าของสินค้า/ผู้ส่ง',
      'ประเภทสินค้า',
      'ประเภทรถ',
      'จำนวนลังที่จอง',
      'จำนวนลังที่รับจริง',
      'ผลการตรวจรับ',
      'หมายเหตุการตรวจรับสินค้า',
      'ผู้ตรวจรับสินค้า',
      'จำนวนรถ (คัน)',
      'ชื่อผู้ส่งสินค้า',
      'ทะเบียนรถ',
      'สถานะคิว',
      'หมายเหตุ',
      'บันทึกเจ้าหน้าที่',
      'วันที่สร้างคิว',
    ];
    const rows = bookings.map((b) => [
      b.booking_id,
      formatThaiNumericDate(b.requested_date),
      b.requested_time,
      b.carrier_name,
      b.user_phone,
      b.client_name,
      b.cargo_type || 'ยาและเวชภัณฑ์ทั่วไป',
      b.vehicle_type || 'รถกระบะ 4 ล้อ',
      b.pallet_count,
      b.actual_pallet_count !== undefined && b.actual_pallet_count !== null ? b.actual_pallet_count : '-',
      b.actual_pallet_count !== undefined && b.actual_pallet_count !== null
        ? b.actual_pallet_count < b.pallet_count
          ? `ไม่ครบ (ขาด ${b.pallet_count - b.actual_pallet_count} ลัง)`
          : b.actual_pallet_count > b.pallet_count
          ? `เกิน (+${b.actual_pallet_count - b.pallet_count} ลัง)`
          : 'ครบถ้วน'
        : '-',
      b.receiving_notes || '-',
      b.received_by || '-',
      b.vehicle_count,
      b.driver_name || '-',
      b.license_plate || '-',
      b.status,
      b.notes || '-',
      b.admin_reason || '-',
      formatThaiDateTime(b.created_at),
    ]);
    const csvContent =
      '\uFEFF' +
      [
        headers.join(','),
        ...rows.map((r) =>
          r
            .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
            .join(',')
        ),
      ].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PTN_Queue_Report_${filterDate}_${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('ส่งออกไฟล์ Excel/CSV เรียบร้อยแล้ว');
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
      case 'CheckedIn':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-blue-600" /> เข้าพื้นที่แล้ว</span>;
      case 'Receiving':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-indigo-600 animate-pulse" /> กำลังลงสินค้า</span>;
      case 'Completed':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-900 flex items-center gap-1.5"><CheckCheck className="w-3.5 h-3.5 text-teal-700" /> เสร็จสิ้นสมบูรณ์</span>;
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
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1">🛡️ ตรวจสอบคิวส่ง</span>;
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

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-white">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 pb-16">
      {/* Toast Notification */}
      {toastMsg && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl shadow-xl border text-sm font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200 no-print ${
          toastMsg.type === 'success' ? 'bg-emerald-800 text-white border-emerald-600' : 'bg-rose-800 text-white border-rose-600'
        }`}>
          {toastMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-300" /> : <AlertTriangle className="w-5 h-5 text-rose-300" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Top Header & Security Bar */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md no-print">
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
            {/* Browser Web Push Notification Toggle */}
            <button
              onClick={handleRequestNotifPermission}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                notifPermission === 'granted'
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title={notifPermission === 'granted' ? 'เปิดการแจ้งเตือนบนเบราว์เซอร์แล้ว (คลิกเพื่อทดสอบ)' : 'คลิกเพื่อเปิดรับการแจ้งเตือนบนเบราว์เซอร์เมื่อมีคิวใหม่'}
            >
              <Bell className={`w-3.5 h-3.5 ${notifPermission === 'granted' ? 'text-emerald-400 animate-bounce' : ''}`} />
              <span>{notifPermission === 'granted' ? 'แจ้งเตือนเบราว์เซอร์: เปิด' : 'เปิดแจ้งเตือนเบราว์เซอร์'}</span>
            </button>

            {/* Audio Notification Toggle */}
            <button
              onClick={toggleSound}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                soundEnabled
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
              title="เปิด/ปิดเสียงแจ้งเตือนเมื่อมีคิวใหม่"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>{soundEnabled ? 'เสียงเตือน: เปิด' : 'เสียงเตือน: ปิด'}</span>
            </button>

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

          {/* Direct Link to High-Res Poster / Standee Page */}
          <a
            href="/poster"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap bg-emerald-600/30 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-100 hover:text-white text-xs ml-auto shadow-sm"
            title="เปิดหน้าโปสเตอร์ QR Code (Standee) สำหรับพิมพ์ติดหน้างานหรือดาวน์โหลดรูปภาพ"
          >
            <QrCode className="w-4 h-4 text-emerald-300" />
            <span>พิมพ์โปสเตอร์ QR Code (Standee)</span>
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Inspection Officer Notice */}
        {isSecurityOnly && (
          <div className="bg-blue-50 border border-blue-200 text-blue-900 px-4 py-3 rounded-2xl flex items-center gap-3 text-xs no-print">
            <Shield className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <strong className="block">เข้าสู่ระบบในโหมด: เจ้าหน้าที่ตรวจสอบคิวส่ง (Verification Mode)</strong>
              สามารถตรวจสอบรายการคิว, สแกน QR Code ตรวจสอบรถเข้าพื้นที่, และพิมพ์ใบสรุปรายการคิวได้
            </div>
          </div>
        )}

        {/* 🌟 1. Tomorrow / Advance Forecast Banner */}
        {forecast && (
          <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white p-5 rounded-3xl border border-emerald-700/50 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 no-print">
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
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 no-print">
              <div className="flex flex-wrap items-center gap-3">
                {/* Date Filter Quick Buttons & Picker */}
                <div className="flex flex-wrap items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setFilterDate('All')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      filterDate === 'All' || !filterDate
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📅 ทุกวันที่ ({bookings.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterDate(getTodayStr())}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      filterDate === getTodayStr()
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    วันนี้
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterDate(getTomorrowStr())}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      filterDate === getTomorrowStr()
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    พรุ่งนี้
                  </button>

                  <div className="w-36 sm:w-44 border-l border-slate-200 pl-1">
                    <ThaiDatePicker
                      value={filterDate === 'All' ? '' : filterDate}
                      onChange={(date) => setFilterDate(date || 'All')}
                      disableSundays={false}
                      placeholder="ระบุวัน (พ.ศ.)"
                    />
                  </div>
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
                    <option value="Pending">⏳ รอตรวจสอบ (Pending)</option>
                    <option value="Approved">✅ อนุมัติแล้ว (Approved)</option>
                    <option value="Receiving">📦 กำลังลงสินค้า (Receiving)</option>
                    <option value="Completed">✨ เสร็จสิ้นสมบูรณ์ (Completed)</option>
                    <option value="Partial">⚠️ เฉพาะสินค้ามาไม่ครบ (Partial Delivery)</option>
                    <option value="Rejected">❌ ไม่อนุมัติ (Rejected)</option>
                    <option value="Cancelled">🚫 ยกเลิกแล้ว (Cancelled)</option>
                  </select>
                </div>
              </div>

              {/* Search Box & Camera QR Scanner */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm whitespace-nowrap"
                  title="เปิดกล้องสแกน QR Code ตรวจคิว"
                >
                  <Camera className="w-4 h-4" />
                  <span>สแกน QR</span>
                </button>

                <div className="relative flex-1 md:w-56">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ค้นหา ID, ขนส่ง, ผู้ส่ง, ทะเบียน..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  onClick={fetchBookings}
                  disabled={loadingBookings}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition"
                  title="รีเฟรชข้อมูล"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingBookings ? 'animate-spin text-emerald-600' : ''}`} />
                </button>
              </div>
            </div>

            {/* Bookings List Table Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
              {/* 🖨️ Official Print-Only Header */}
              <div className="hidden print:block p-6 border-b border-slate-300 text-center space-y-1.5">
                <h2 className="text-xl font-extrabold text-slate-900">
                  บริษัท พีทีเอ็น ฟาร์มาเซ็นเตอร์ จำกัด (พัฒนาเภสัช)
                </h2>
                <h3 className="text-base font-bold text-slate-800">
                  ใบสรุปรายงานคิวส่งสินค้าเข้าคลัง (Daily Receiving Queue Sheet)
                </h3>
                <p className="text-xs text-slate-600">
                  ข้อมูลประจำวันที่: <strong className="text-slate-900">{filterDate === 'All' || !filterDate ? 'ทุกวันที่ในระบบ' : formatThaiDate(filterDate)}</strong>
                  {' '}| สถานะ: <strong className="text-slate-900">{filterStatus === 'All' ? 'ทุกสถานะ' : filterStatus}</strong>
                  {' '}| จำนวนรวม: <strong className="text-slate-900">{bookings.length} รายการ</strong>
                </p>
              </div>

              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {filterDate === 'All' || !filterDate
                      ? 'รายการจองคิวทั้งหมด (ทุกวันที่)'
                      : `รายการจองคิวประจำ${formatThaiDate(filterDate)}`}
                  </h3>
                  <p className="text-xs text-slate-500">พบทั้งหมด {bookings.length} รายการ</p>
                </div>

                {/* Export & Print Toolbar */}
                <div className="flex items-center gap-2 no-print">
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    title="ส่งออกรายการที่กรองเป็นไฟล์ Excel / CSV"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Export Excel/CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    title="พิมพ์ใบสรุปคิว A4"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>พิมพ์ใบสรุป</span>
                  </button>

                  {isSuperAdmin && bookings.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllBookings}
                      disabled={clearingAllBookings}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                      title="ล้างข้อมูลคิวจองทั้งหมดในระบบ (เฉพาะ Super Admin)"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>{clearingAllBookings ? 'กำลังล้าง...' : 'ล้างคิวทั้งหมด'}</span>
                    </button>
                  )}
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
                  <p className="text-sm font-semibold text-slate-600">ไม่พบคิวการจองในเงื่อนไขที่เลือก</p>
                  <p className="text-xs text-slate-400">สามารถคลิกปุ่ม &quot;📅 ทุกวันที่&quot; หรือเลือกดูทุกสถานะได้ที่แถบตัวกรอง</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <th className="py-3.5 px-4">Booking ID</th>
                        <th className="py-3.5 px-4">วันที่ & รอบเวลานัดหมาย</th>
                        <th className="py-3.5 px-4">บริษัทขนส่ง</th>
                        <th className="py-3.5 px-4">เจ้าของสินค้า / ผู้ส่ง</th>
                        <th className="py-3.5 px-4 text-center">จำนวนลัง</th>
                        <th className="py-3.5 px-4">สถานะ</th>
                        <th className="py-3.5 px-4 text-center no-print">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bookings.map((item) => (
                        <tr key={item.booking_id} className="hover:bg-slate-50/70 transition">
                          <td className="py-4 px-4 font-mono font-bold text-slate-900">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{item.booking_id}</span>
                              {(item.photo_url || item.receiving_photo_url) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const img = item.receiving_photo_url || item.photo_url;
                                    const title = item.receiving_photo_url ? `รูปตรวจรับสินค้า - ${item.booking_id}` : `ใบส่งของ - ${item.booking_id}`;
                                    if (img) {
                                      setLightboxImage(img);
                                      setLightboxTitle(title);
                                    }
                                  }}
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 text-[10px] font-sans font-semibold transition"
                                  title="คลิกเพื่อดูรูปภาพแนบ"
                                >
                                  <ImageIcon className="w-3 h-3 text-teal-600" />
                                  <span>รูปแนบ</span>
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4 font-semibold text-slate-700 whitespace-nowrap">
                            <div className="flex items-center gap-1 text-slate-900 font-bold text-xs">
                              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{formatThaiShortDate(item.requested_date)}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{item.requested_time}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="font-bold text-slate-900 block">{item.carrier_name}</span>
                            <span className="text-[11px] text-slate-400">{item.user_phone}</span>
                          </td>
                          <td className="py-4 px-4 font-medium text-slate-800">
                            {item.client_name}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="font-bold text-slate-900">
                              {item.pallet_count} ลัง <span className="text-[11px] font-normal text-slate-400">({item.vehicle_count} คัน)</span>
                            </div>
                            {item.actual_pallet_count !== undefined && item.actual_pallet_count !== null && (
                              <div className="mt-1 flex justify-center">
                                {item.actual_pallet_count < item.pallet_count ? (
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-bold shadow-2xs cursor-help"
                                    title={item.receiving_notes ? `หมายเหตุ: ${item.receiving_notes}` : `สินค้ามาไม่ครบ (ขาด ${item.pallet_count - item.actual_pallet_count} ลัง)`}
                                  >
                                    <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                    <span>รับจริง {item.actual_pallet_count} ลัง (ขาด {item.pallet_count - item.actual_pallet_count})</span>
                                  </span>
                                ) : item.actual_pallet_count > item.pallet_count ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-100 border border-blue-300 text-blue-900 text-[10px] font-bold">
                                    <span>รับจริง {item.actual_pallet_count} ลัง (+{item.actual_pallet_count - item.pallet_count})</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 text-[10px] font-bold">
                                    <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                                    <span>รับครบ {item.actual_pallet_count} ลัง</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap">
                            {getStatusBadge(item.status)}
                          </td>
                          <td className="py-4 px-4 text-center no-print">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {/* 1. If Pending: 1-Click Approve or Reject */}
                              {!isSecurityOnly && item.status === 'Pending' && (
                                <>
                                  <button
                                    onClick={() => handleApprove(item)}
                                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                                    title="อนุมัติคิวทันที"
                                  >
                                    อนุมัติ
                                  </button>
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
                                </>
                              )}

                              {/* 2. If Approved or CheckedIn: Start Receiving or Complete Receiving (for Warehouse) */}
                              {!isSecurityOnly && (item.status === 'Approved' || item.status === 'CheckedIn') && (
                                <>
                                  <button
                                    onClick={() => handleWorkflowAction(item, 'Receiving', 'กำลังลงสินค้า')}
                                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1"
                                    title="เริ่มตรวจนับและลงสินค้า"
                                  >
                                    <Package className="w-3.5 h-3.5" />
                                    <span>เริ่มลงของ</span>
                                  </button>
                                  <button
                                    onClick={() => openCompleteModal(item)}
                                    className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1"
                                    title="ตรวจนับสินค้าและบันทึกปิดงานเสร็จสิ้น"
                                  >
                                    <CheckCheck className="w-3.5 h-3.5" />
                                    <span>ตรวจรับเสร็จสิ้น</span>
                                  </button>
                                </>
                              )}

                              {/* 3. If Receiving: Complete Receiving with Inspection (for Warehouse) */}
                              {!isSecurityOnly && item.status === 'Receiving' && (
                                <button
                                  onClick={() => openCompleteModal(item)}
                                  className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1"
                                  title="ตรวจนับสินค้าและบันทึกปิดงานเสร็จสิ้น"
                                >
                                  <CheckCheck className="w-3.5 h-3.5" />
                                  <span>ตรวจรับเสร็จสิ้น</span>
                                </button>
                              )}

                              {/* 5. Master Edit / Override Status (for Super Admin & Warehouse Officer) */}
                              {!isSecurityOnly && (
                                <button
                                  type="button"
                                  onClick={() => openEditStatusModal(item)}
                                  className="px-2 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs rounded-xl transition flex items-center gap-1 shadow-xs"
                                  title="แก้ไขหรือเปลี่ยนสถานะการอนุมัติคิวนี้"
                                >
                                  <Edit className="w-3.5 h-3.5 text-amber-700" />
                                  <span>แก้ไขสถานะ</span>
                                </button>
                              )}

                              {/* Multi-Step Cancel (Hidden for Security Gate) */}
                              {!isSecurityOnly && (item.status === 'Approved' || item.status === 'CheckedIn' || item.status === 'Receiving') && (
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
            {/* Real-time & Permanent Effect Rule Notice */}
            <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-start gap-3.5 text-xs text-emerald-900">
              <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0 mt-0.5">
                <Clock className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <strong className="block text-sm text-emerald-950 font-bold">
                  ⚡ มีผลบังคับใช้ทันทีกับทุกวันในระบบ (Real-Time & Permanent Setting)
                </strong>
                <p className="text-slate-600 leading-relaxed">
                  เมื่อมีการปรับเปลี่ยนรอบเวลา หรือแก้ไขจำนวนความจุสูงสุด (คิว) ระบบจะบันทึกและมีผลทันทีกับ <strong>ทุกวันเปิดทำการ (จันทร์-เสาร์)</strong> ในระบบการจองของผู้ส่งสินค้า และจะคงอยู่ตลอดไปจนกว่าเจ้าหน้าที่จะเข้ามาแก้ไขใหม่อีกครั้ง
                </p>
              </div>
            </div>

            {/* Header and Action Tools */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">ตั้งค่ารอบเวลาและความจุสูงสุดต่อรอบ</h3>
                <p className="text-xs text-slate-500">กำหนดจำนวนรถขนส่งที่สามารถเข้าส่งสินค้าได้พร้อมกันในแต่ละช่วงเวลา</p>
              </div>

              {/* Batch Capacity Tool, Auto Sort & Add Slot Button */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutoSortSlots}
                  className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  title="จัดเรียงรอบเวลาทั้งหมดตามลำดับเวลาเริ่มต้น (08:00 -> 17:00)"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>จัดเรียงตามเวลาอัตโนมัติ</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const val = prompt('กรุณาระบุจำนวนความจุที่ต้องการตั้งค่าให้กับทุกรอบเวลา (เช่น 4):', '4');
                    if (val && !isNaN(parseInt(val, 10)) && parseInt(val, 10) > 0) {
                      const newCap = parseInt(val, 10);
                      // Optimistic UI update
                      setSlots((prev) => prev.map((s) => ({ ...s, max_capacity: newCap })));
                      authFetch('/api/admin/settings', {
                        method: 'POST',
                        body: JSON.stringify({
                          action: 'batch_update_capacity',
                          max_capacity: newCap,
                        }),
                      })
                        .then((res) => res.json())
                        .then((data) => {
                          if (data.error) throw new Error(data.error);
                          showToast(data.message || 'บันทึกความจุทุกรอบเวลาสำเร็จ (มีผลทันทีทุกวัน)');
                        })
                        .catch((err) => {
                          showToast(err.message || 'เกิดข้อผิดพลาด', 'error');
                          fetchSettings();
                        });
                    }
                  }}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  title="เปลี่ยนความจุทุกรอบเวลาให้เท่ากันในคลิกเดียว"
                >
                  <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ปรับทุกรอบเท่ากัน</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const start = prompt('กรุณาระบุเวลาเริ่ม (เช่น 07:30):', '07:30');
                    if (!start) return;
                    const end = prompt('กรุณาระบุเวลาสิ้นสุด (เช่น 08:30):', '08:30');
                    if (!end) return;
                    const cap = prompt('ความจุสูงสุด (คิว):', '3');
                    const slotName = `${start} - ${end}`;

                    authFetch('/api/admin/settings', {
                      method: 'POST',
                      body: JSON.stringify({
                        action: 'add_slot',
                        slot_name: slotName,
                        start_time: start,
                        end_time: end,
                        max_capacity: parseInt(cap || '3', 10) || 3,
                      }),
                    })
                      .then((res) => res.json())
                      .then((data) => {
                        if (data.error) throw new Error(data.error);
                        showToast(data.message || 'เพิ่มรอบเวลาสำเร็จ (มีผลทันทีทุกวัน)');
                        fetchSettings();
                      })
                      .catch((err) => showToast(err.message || 'เกิดข้อผิดพลาด', 'error'));
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ เพิ่มรอบเวลาใหม่</span>
                </button>
              </div>
            </div>

            {/* Time Slot Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {slots.map((slot, index) => (
                <div
                  key={slot.id}
                  className={`p-4 rounded-2xl border transition ${
                    slot.is_active === 1
                      ? 'border-emerald-200 bg-emerald-50/30'
                      : 'border-slate-200 bg-slate-50 opacity-60'
                  } space-y-3 relative group`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-slate-900 text-sm">{slot.slot_name}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Reorder Stepper */}
                      <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveSlot(index, 'up')}
                          className="p-1 text-slate-400 hover:text-emerald-700 disabled:opacity-20 disabled:hover:text-slate-400 rounded hover:bg-slate-100 transition"
                          title="ขยับรอบนี้ขึ้นก่อน"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={index === slots.length - 1}
                          onClick={() => handleMoveSlot(index, 'down')}
                          className="p-1 text-slate-400 hover:text-emerald-700 disabled:opacity-20 disabled:hover:text-slate-400 rounded hover:bg-slate-100 transition"
                          title="ขยับรอบนี้ลงหลัง"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>

                      <label className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={slot.is_active === 1}
                          onChange={(e) => handleSlotCapacityChange(slot.id, slot.max_capacity, e.target.checked)}
                          className="w-4 h-4 text-emerald-600 rounded"
                        />
                        <span>{slot.is_active === 1 ? 'เปิด' : 'ปิด'}</span>
                      </label>

                      {slots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`ต้องการลบรอบเวลา "${slot.slot_name}" ใช่หรือไม่?`)) {
                              setSlots((prev) => prev.filter((s) => s.id !== slot.id));
                              authFetch('/api/admin/settings', {
                                method: 'POST',
                                body: JSON.stringify({
                                  action: 'delete_slot',
                                  id: slot.id,
                                }),
                              })
                                .then((res) => res.json())
                                .then((data) => {
                                  if (data.error) throw new Error(data.error);
                                  showToast('ลบรอบเวลาเรียบร้อยแล้ว (มีผลทันทีทุกวัน)');
                                  fetchSettings();
                                })
                                .catch((err) => {
                                  showToast(err.message || 'เกิดข้อผิดพลาด', 'error');
                                  fetchSettings();
                                });
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition"
                          title="ลบรอบเวลานี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                      <span>ความจุสูงสุดต่อวัน</span>
                      <span className="text-emerald-700 font-bold">{slot.max_capacity} คิว/รอบ</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={slot.max_capacity <= 1}
                        onClick={() => handleSlotCapacityChange(slot.id, Math.max(1, slot.max_capacity - 1), slot.is_active === 1)}
                        className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition disabled:opacity-40 shrink-0"
                        title="ลดความจุลง 1"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={slot.max_capacity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val >= 1) {
                            handleSlotCapacityChange(slot.id, val, slot.is_active === 1);
                          }
                        }}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-center text-slate-900 focus:ring-2 focus:ring-emerald-500 text-sm"
                      />

                      <button
                        type="button"
                        onClick={() => handleSlotCapacityChange(slot.id, slot.max_capacity + 1, slot.is_active === 1)}
                        className="w-8 h-8 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold flex items-center justify-center transition shrink-0"
                        title="เพิ่มความจุขึ้น 1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🌟 TAB 3: BLOCK DATES */}
        {!isSecurityOnly && activeTab === 'blocking' && (
          <div className="space-y-4">
            {/* Default Sunday Blocking Banner */}
            <div className="p-4 bg-rose-50/90 border border-rose-200 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-rose-950 text-xs shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                  อา.
                </div>
                <div>
                  <strong className="block font-bold text-sm text-rose-900">คลังสินค้าปิดทำการทุกวันอาทิตย์ (Default Closed)</strong>
                  <span className="text-rose-700 text-xs">
                    ระบบตั้งค่าปิดรับการจองคิวทุกวันอาทิตย์เป็นค่าเริ่มต้นอัตโนมัติ ผู้จองจะไม่สามารถเลือกวันอาทิตย์ในปฏิทินได้
                  </span>
                </div>
              </div>
              <span className="px-3 py-1.5 bg-rose-100 text-rose-800 rounded-full font-bold text-xs shrink-0 border border-rose-200">
                🔒 ปิดรับจองอัตโนมัติทุกสัปดาห์
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Form to add blocked date */}
              <form onSubmit={handleAddBlockedDate} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4 md:col-span-1">
                <h3 className="font-bold text-slate-900 text-base">ปิดรับจองคิวชั่วคราว (วันหยุดพิเศษ)</h3>
                <p className="text-xs text-slate-500">กำหนดวันหยุดนักขัตฤกษ์ หรือวันที่คลังสินค้าปิดตรวจนับสต็อก</p>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">เลือกวันที่ต้องการปิด (พ.ศ.)</label>
                  <ThaiDatePicker
                    value={newBlockedDate}
                    onChange={(date) => setNewBlockedDate(date)}
                    disableSundays={false}
                    placeholder="เลือกวันที่ต้องการปิด (พ.ศ.)"
                    required
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
                        <span className="font-bold text-slate-900 text-sm block">{formatThaiNumericDate(item.blocked_date)}</span>
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
                          {staff.last_login ? formatThaiDateTime(staff.last_login) : 'ยังไม่เคยเข้าใช้'}
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
                        <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">{formatThaiDateTime(log.created_at)}</td>
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
                  <option value="warehouse_officer">📦 เจ้าหน้าที่คลังสินค้า (อนุมัติ / ปฏิเสธ / รับสินค้า)</option>
                  <option value="security_gate">🛡️ เจ้าหน้าที่ตรวจสอบคิวส่ง (ตรวจสอบคิว & เช็คอินรับรถ)</option>
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

      {/* 🛠️ EDIT / OVERRIDE QUEUE STATUS MODAL */}
      {editStatusModalOpen && editingStatusBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleEditStatusSubmit}
            className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 border border-slate-200 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">แก้ไขสถานะ / การอนุมัติคิว</h3>
                  <span className="text-[11px] font-mono text-slate-500">{editingStatusBooking.booking_id}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditStatusModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Booking Summary Card */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm">{editingStatusBooking.carrier_name}</span>
                <div>{getStatusBadge(editingStatusBooking.status)}</div>
              </div>
              <div className="text-slate-600 text-[11px]">
                ผู้ส่ง: <strong>{editingStatusBooking.client_name}</strong> | วันที่: <strong>{formatThaiShortDate(editingStatusBooking.requested_date)}</strong> ({editingStatusBooking.requested_time})
              </div>
            </div>

            {/* Choose Target Status */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                เลือกสถานะใหม่ที่ต้องการเปลี่ยน <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  {
                    status: 'Pending' as BookingStatus,
                    label: 'รอการอนุมัติ (Pending)',
                    desc: 'รอการตรวจสอบจากเจ้าหน้าที่',
                    color: 'border-amber-300 bg-amber-50/60 text-amber-900',
                    dot: 'bg-amber-500',
                  },
                  {
                    status: 'Approved' as BookingStatus,
                    label: 'อนุมัติแล้ว (Approved)',
                    desc: 'ยืนยันคิวแล้ว พร้อมเข้าส่งสินค้า',
                    color: 'border-emerald-300 bg-emerald-50/60 text-emerald-900',
                    dot: 'bg-emerald-500',
                  },
                  {
                    status: 'Receiving' as BookingStatus,
                    label: 'กำลังลงสินค้า (Receiving)',
                    desc: 'กำลังตรวจนับและจัดเก็บสินค้า',
                    color: 'border-indigo-300 bg-indigo-50/60 text-indigo-900',
                    dot: 'bg-indigo-500',
                  },
                  {
                    status: 'Completed' as BookingStatus,
                    label: 'เสร็จสิ้นสมบูรณ์ (Completed)',
                    desc: 'ตรวจรับครบถ้วนและปิดงาน',
                    color: 'border-teal-300 bg-teal-50/60 text-teal-900',
                    dot: 'bg-teal-500',
                  },
                  {
                    status: 'Rejected' as BookingStatus,
                    label: 'ปฏิเสธคิว (Rejected)',
                    desc: 'ไม่อนุมัติให้เข้าส่ง (ต้องระบุเหตุผล)',
                    color: 'border-rose-300 bg-rose-50/60 text-rose-900',
                    dot: 'bg-rose-500',
                  },
                  {
                    status: 'Cancelled' as BookingStatus,
                    label: 'ยกเลิกคิว (Cancelled)',
                    desc: 'ยกเลิกการนัดหมาย',
                    color: 'border-slate-300 bg-slate-100 text-slate-700',
                    dot: 'bg-slate-500',
                  },
                ].map((item) => (
                  <label
                    key={item.status}
                    className={`p-3 rounded-2xl border-2 transition cursor-pointer flex items-start gap-2.5 ${
                      targetStatus === item.status
                        ? `${item.color} ring-2 ring-emerald-500 shadow-xs font-bold`
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="target_status"
                      value={item.status}
                      checked={targetStatus === item.status}
                      onChange={() => setTargetStatus(item.status)}
                      className="mt-1 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${item.dot}`} />
                        <span className="text-xs font-bold leading-tight block">{item.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">{item.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* If Target Status is Completed or Receiving, show actual pallet count & notes */}
            {(targetStatus === 'Completed' || targetStatus === 'Receiving') && (
              <div className="p-4 bg-teal-50/60 rounded-2xl border border-teal-200/80 space-y-3">
                <div className="flex items-center gap-2 text-teal-900 font-bold text-xs">
                  <PackageCheck className="w-4 h-4 text-teal-600" />
                  <span>บันทึกผลการตรวจนับสินค้าจริง (Goods Inspection)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">
                      จำนวนลังที่รับจริง (ยอดจอง {editingStatusBooking.pallet_count} ลัง)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editActualPalletInput}
                      onChange={(e) => setEditActualPalletInput(e.target.value)}
                      placeholder={`เช่น ${editingStatusBooking.pallet_count}`}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">
                      หมายเหตุการตรวจรับ (ระบุ DO / สาเหตุหากไม่ครบ)
                    </label>
                    <input
                      type="text"
                      value={editReceivingNotesInput}
                      onChange={(e) => setEditReceivingNotesInput(e.target.value)}
                      placeholder="เช่น ขาด 5 ลัง ตาม DO#123..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Reason / Admin Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>
                  เหตุผล / บันทึกการแก้ไขสถานะ {targetStatus === 'Rejected' && <span className="text-rose-500">* (จำเป็น)</span>}
                </span>
                <span className="text-[10px] text-slate-400 font-normal">บันทึกใน Audit Log</span>
              </label>
              <textarea
                rows={2}
                required={targetStatus === 'Rejected'}
                placeholder="เช่น เปลี่ยนจากปฏิเสธเป็นอนุมัติเนื่องจากยืนยันเอกสารครบถ้วน, ปรับสถานะเป็นกำลังลงสินค้า..."
                value={statusChangeReason}
                onChange={(e) => setStatusChangeReason(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
              />
            </div>

            {/* Operator info */}
            <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl flex items-center justify-between">
              <span>ผู้แก้ไข: <strong className="text-slate-800">{operatorName}</strong></span>
              <span>บันทึกการแก้ไขอัตโนมัติ</span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditStatusModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={statusSubmitting}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-sm"
              >
                {statusSubmitting ? 'กำลังบันทึก...' : '💾 บันทึกสถานะใหม่'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 📦 COMPLETE RECEIVING & GOODS INSPECTION MODAL */}
      {completeModalOpen && completingBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCompleteSubmit}
            className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 border border-slate-200 max-h-[90vh] overflow-y-auto animate-in fade-in duration-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-slate-900">
                <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                  <CheckCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">บันทึกตรวจรับสินค้าเสร็จสิ้น</h3>
                  <p className="text-[11px] text-slate-500 font-mono">Booking ID: {completingBooking.booking_id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCompleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Shipment Summary */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm">{completingBooking.carrier_name}</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800">
                  กำลังลงสินค้า
                </span>
              </div>
              <div className="text-slate-600 text-[11px]">
                ผู้ส่ง: <strong>{completingBooking.client_name}</strong> | ประเภท: <strong>{completingBooking.cargo_type || 'ยาและเวชภัณฑ์'}</strong>
              </div>
              <div className="text-slate-700 font-semibold text-xs pt-1">
                ยอดที่แจ้งจองไว้: <strong className="text-emerald-700 text-sm">{completingBooking.pallet_count} ลัง</strong> ({completingBooking.vehicle_count} คัน)
              </div>
            </div>

            {/* Actual Count Input & Quick Calculation */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 block">
                จำนวนลังที่ตรวจรับจริง (Actual Received Quantity) <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  required
                  value={actualPalletInput}
                  onChange={(e) => setActualPalletInput(e.target.value)}
                  placeholder={`ระบุจำนวนลัง เช่น ${completingBooking.pallet_count}`}
                  className="flex-1 px-4 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-xl font-bold text-slate-900 text-base focus:border-teal-600 focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setActualPalletInput(completingBooking.pallet_count)}
                  className="px-3.5 py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold transition whitespace-nowrap"
                  title="ตั้งค่าเท่ากับยอดจอง"
                >
                  รับครบ {completingBooking.pallet_count} ลัง
                </button>
              </div>

              {/* Discrepancy Status Indicator */}
              {actualPalletInput !== '' && !isNaN(parseInt(String(actualPalletInput), 10)) && (
                <div className="pt-1">
                  {parseInt(String(actualPalletInput), 10) < completingBooking.pallet_count ? (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-2 text-amber-900 text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-bold">⚠️ สินค้ามาไม่ครบ (Partial Delivery)</strong>
                        <span>
                          ขาดส่งจำนวน{' '}
                          <strong className="text-rose-700 font-extrabold text-sm">
                            {completingBooking.pallet_count - parseInt(String(actualPalletInput), 10)} ลัง
                          </strong>{' '}
                          (กรุณาระบุหมายเหตุการขาดส่งด้านล่าง)
                        </span>
                      </div>
                    </div>
                  ) : parseInt(String(actualPalletInput), 10) > completingBooking.pallet_count ? (
                    <div className="p-3 bg-blue-50 border border-blue-300 rounded-2xl flex items-start gap-2 text-blue-900 text-xs">
                      <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-bold">ℹ️ สินค้ามาเกินจำนวนที่จอง</strong>
                        <span>
                          เกินจำนวน{' '}
                          <strong className="text-blue-800 font-extrabold text-sm">
                            +{parseInt(String(actualPalletInput), 10) - completingBooking.pallet_count} ลัง
                          </strong>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-2 text-emerald-900 text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <strong className="block font-bold">✅ ตรวจรับสินค้าครบถ้วนสมบูรณ์ 100%</strong>
                        <span>ยอดรับจริงตรงตามที่แจ้งจองไว้ ({actualPalletInput} ลัง)</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Receiving Notes / Discrepancy Reason */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>
                  หมายเหตุการตรวจรับสินค้า{' '}
                  {actualPalletInput !== '' &&
                    parseInt(String(actualPalletInput), 10) < completingBooking.pallet_count && (
                      <span className="text-rose-600 font-bold">* (จำเป็นต้องระบุสาเหตุ/เลข DO)</span>
                    )}
                </span>
                <span className="text-[10px] text-slate-400">บันทึกลงระบบ & รายงาน</span>
              </label>
              <textarea
                rows={3}
                required={
                  actualPalletInput !== '' &&
                  parseInt(String(actualPalletInput), 10) < completingBooking.pallet_count
                }
                value={receivingNotesInput}
                onChange={(e) => setReceivingNotesInput(e.target.value)}
                placeholder="เช่น สินค้าขาดส่ง 5 ลัง เนื่องจากรอบการผลิตไม่ทัน ตามเอกสาร DO #DO-2026-0901, สภาพกล่องสมบูรณ์..."
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none"
              />
            </div>

            {/* Warehouse Receiving Photo Attachment */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-teal-600" />
                  ถ่ายรูปสินค้าหน้างาน / เอกสารตรวจรับ (ถ้ามี)
                </span>
                <span className="text-[10px] text-teal-600 font-normal">บีบอัดอัตโนมัติ (R2 Storage)</span>
              </label>

              {receivingPhotoPreview ? (
                <div className="relative p-2.5 bg-teal-50/60 border border-teal-200 rounded-xl flex items-center gap-3">
                  <img
                    src={receivingPhotoPreview}
                    alt="Receiving Photo Preview"
                    onClick={() => {
                      setLightboxImage(receivingPhotoPreview);
                      setLightboxTitle('รูปตรวจรับสินค้าหน้างาน');
                    }}
                    className="w-16 h-16 object-cover rounded-lg border border-teal-300 shrink-0 cursor-pointer hover:opacity-90 transition"
                  />
                  <div className="flex-1 min-w-0 text-xs">
                    <p className="font-bold text-slate-800 truncate">รูปตรวจรับสินค้าพร้อมบันทึก</p>
                    {receivingPhotoStats && (
                      <p className="text-[11px] text-teal-700 mt-0.5">
                        ลดขนาด: {formatFileSize(receivingPhotoStats.originalSize)} ➔{' '}
                        <strong className="font-bold">{formatFileSize(receivingPhotoStats.compressedSize)}</strong>
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={removeReceivingPhoto}
                      className="mt-1 text-[11px] text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> ลบรูปถ่ายนี้
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-xl bg-slate-50 hover:bg-teal-50/50 cursor-pointer transition text-center group">
                    <Camera className="w-5 h-5 text-slate-400 group-hover:text-teal-600 mb-1" />
                    <span className="text-xs font-bold text-slate-700 group-hover:text-teal-700">ถ่ายรูปทันที</span>
                    <span className="text-[10px] text-slate-400">เปิดกล้องมือถือ</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleReceivingPhotoChange}
                      disabled={compressingReceivingPhoto}
                      className="hidden"
                    />
                  </label>
                  <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-xl bg-slate-50 hover:bg-teal-50/50 cursor-pointer transition text-center group">
                    <ImageIcon className="w-5 h-5 text-slate-400 group-hover:text-teal-600 mb-1" />
                    <span className="text-xs font-bold text-slate-700 group-hover:text-teal-700">เลือกจากคลังภาพ</span>
                    <span className="text-[10px] text-slate-400">JPG, PNG, WEBP</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReceivingPhotoChange}
                      disabled={compressingReceivingPhoto}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
              {compressingReceivingPhoto && (
                <p className="text-[11px] text-teal-600 animate-pulse flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> กำลังประมวลผลและบีบอัดรูปภาพ...
                </p>
              )}
            </div>

            {/* Inspector info */}
            <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl flex items-center justify-between">
              <span>ผู้ตรวจรับสินค้า: <strong className="text-slate-800">{operatorName}</strong></span>
              <span className="text-teal-700 font-semibold">ปิดงาน & สำเร็จคิว</span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCompleteModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={completeSubmitting}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-sm flex items-center gap-1.5"
              >
                <CheckCheck className="w-4 h-4" />
                <span>{completeSubmitting ? 'กำลังบันทึก...' : 'ยืนยันปิดงานตรวจรับ'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 📄 BOOKING DETAIL DRAWER / MODAL */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-200 max-h-[90vh] overflow-y-auto">
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
                <span className="text-slate-400 block">วันที่เข้าส่ง (พ.ศ.)</span>
                <span className="font-bold text-slate-800">
                  {formatThaiDate(selectedBooking.requested_date)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block">ช่วงเวลานัดหมาย</span>
                <span className="font-bold text-slate-800">{selectedBooking.requested_time}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl col-span-2">
                <span className="text-slate-400 block">บริษัทเจ้าของสินค้า / ผู้ส่ง</span>
                <span className="font-bold text-slate-800">{selectedBooking.client_name}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl col-span-2">
                <span className="text-slate-400 block">ประเภทสินค้า</span>
                <span className={`font-bold inline-block mt-0.5 px-2.5 py-0.5 rounded-lg ${
                  selectedBooking.cargo_type?.includes('ยาเย็น')
                    ? 'bg-cyan-100 text-cyan-800 border border-cyan-200'
                    : 'text-slate-800'
                }`}>
                  {selectedBooking.cargo_type || 'ยาและเวชภัณฑ์ทั่วไป'}
                </span>
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
                <span className="text-slate-400 block">ประเภทรถ</span>
                <span className="font-bold text-slate-800">{selectedBooking.vehicle_type || 'รถกระบะ 4 ล้อ'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block">จำนวนลังที่จอง / รถ</span>
                <span className="font-bold text-slate-800">{selectedBooking.pallet_count} ลัง ({selectedBooking.vehicle_count} คัน)</span>
              </div>

              {/* Attached Photos (Delivery Note & Warehouse Inspection) */}
              {(selectedBooking.photo_url || selectedBooking.receiving_photo_url) && (
                <div className="p-3 bg-slate-50 rounded-xl col-span-2 space-y-2 border border-slate-200/80">
                  <span className="text-slate-500 font-bold block text-xs flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-teal-600" />
                    รูปภาพและเอกสารแนบประกอบคิว
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {selectedBooking.photo_url && (
                      <div className="bg-white p-2 rounded-xl border border-slate-200 flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold text-slate-600 truncate">
                          📄 ใบส่งสินค้า (Delivery Note / ผู้จอง)
                        </span>
                        <div 
                          onClick={() => {
                            setLightboxImage(selectedBooking.photo_url || null);
                            setLightboxTitle(`ใบส่งของ/เอกสารแนบ - ${selectedBooking.booking_id}`);
                          }}
                          className="relative aspect-video rounded-lg overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer group hover:opacity-95 transition"
                        >
                          <img 
                            src={selectedBooking.photo_url} 
                            alt="ใบส่งของ"
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1">
                            <Maximize2 className="w-4 h-4" />
                            <span>ดูภาพขยาย</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedBooking.receiving_photo_url && (
                      <div className="bg-white p-2 rounded-xl border border-slate-200 flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold text-teal-700 truncate">
                          🔍 รูปตรวจรับสินค้าหน้างาน (คลังสินค้า)
                        </span>
                        <div 
                          onClick={() => {
                            setLightboxImage(selectedBooking.receiving_photo_url || null);
                            setLightboxTitle(`รูปถ่ายตรวจรับสินค้า - ${selectedBooking.booking_id}`);
                          }}
                          className="relative aspect-video rounded-lg overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer group hover:opacity-95 transition"
                        >
                          <img 
                            src={selectedBooking.receiving_photo_url} 
                            alt="รูปตรวจรับสินค้า"
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1">
                            <Maximize2 className="w-4 h-4" />
                            <span>ดูภาพขยาย</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actual Received pallet count & inspection results */}
              {selectedBooking.actual_pallet_count !== undefined && selectedBooking.actual_pallet_count !== null && (
                <div className={`p-3 rounded-xl col-span-2 border ${
                  selectedBooking.actual_pallet_count < selectedBooking.pallet_count
                    ? 'bg-amber-50 border-amber-200 text-amber-950'
                    : selectedBooking.actual_pallet_count > selectedBooking.pallet_count
                    ? 'bg-blue-50 border-blue-200 text-blue-950'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1">
                      <PackageCheck className="w-4 h-4 text-emerald-700" />
                      ผลการตรวจรับสินค้าจริง:
                    </span>
                    <span className="font-extrabold text-sm">
                      {selectedBooking.actual_pallet_count} / {selectedBooking.pallet_count} ลัง
                    </span>
                  </div>
                  <div className="text-[11px] mt-1">
                    {selectedBooking.actual_pallet_count < selectedBooking.pallet_count ? (
                      <span className="text-amber-800 font-bold">
                        ⚠️ สินค้ามาไม่ครบ (ขาดส่ง {selectedBooking.pallet_count - selectedBooking.actual_pallet_count} ลัง)
                      </span>
                    ) : selectedBooking.actual_pallet_count > selectedBooking.pallet_count ? (
                      <span className="text-blue-800 font-bold">
                        ℹ️ สินค้ามาเกิน (+{selectedBooking.actual_pallet_count - selectedBooking.pallet_count} ลัง)
                      </span>
                    ) : (
                      <span className="text-emerald-800 font-bold">
                        ✅ ตรวจรับครบถ้วนสมบูรณ์ 100%
                      </span>
                    )}
                  </div>
                  {selectedBooking.receiving_notes && (
                    <div className="text-[11px] mt-1.5 pt-1.5 border-t border-slate-200 text-slate-700">
                      <strong>หมายเหตุการตรวจรับ:</strong> {selectedBooking.receiving_notes}
                    </div>
                  )}
                  {selectedBooking.received_by && (
                    <div className="text-[10px] text-slate-500 mt-1">
                      ผู้ตรวจรับ: {selectedBooking.received_by}
                      {selectedBooking.receiving_completed_at && ` (${selectedBooking.receiving_completed_at})`}
                    </div>
                  )}
                </div>
              )}

              {(selectedBooking.driver_name || selectedBooking.license_plate) && (
                <div className="p-3 bg-slate-50 rounded-xl col-span-2">
                  <span className="text-slate-400 block">ข้อมูลผู้ส่งสินค้าและทะเบียน</span>
                  <span className="font-bold text-slate-800">
                    {selectedBooking.driver_name ? `ผู้ส่ง: ${selectedBooking.driver_name} ` : ''}
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
                    <span className="text-[10px] text-rose-600 block mt-1">({formatThaiDateTime(selectedBooking.admin_action_date)} โดย {selectedBooking.admin_action_by})</span>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center gap-2">
              {!isSecurityOnly && (
                <button
                  type="button"
                  onClick={() => {
                    openEditStatusModal(selectedBooking);
                  }}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Edit className="w-4 h-4" />
                  <span>แก้ไขสถานะคิวนี้</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🖼️ Fullscreen Photo Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
            {lightboxTitle && (
              <span className="text-xs text-white/80 bg-black/40 px-3 py-1.5 rounded-full border border-white/20 hidden sm:inline-block">
                {lightboxTitle}
              </span>
            )}
            <a
              href={lightboxImage}
              target="_blank"
              rel="noopener noreferrer"
              download
              onClick={(e) => e.stopPropagation()}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>ดาวน์โหลด</span>
            </a>
            <button
              onClick={() => setLightboxImage(null)}
              className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div
            className="max-w-4xl max-h-[85vh] w-full h-full flex items-center justify-center p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImage}
              alt={lightboxTitle || 'รูปภาพขยาย'}
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}

      {/* 📷 Live Camera QR Scanner Modal */}
      <QRScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={handleQRScanned}
      />
    </div>
  );
}
