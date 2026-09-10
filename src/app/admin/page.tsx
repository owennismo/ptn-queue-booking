'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Database,
  Settings,
  FileText,
  BarChart3,
  Send,
  Tag,
  CalendarDays,
  RotateCcw,
} from 'lucide-react';
import AdminAnalytics from '@/components/AdminAnalytics';
import PalletTagModal from '@/components/PalletTagModal';
import ImageGalleryModal from '@/components/ImageGalleryModal';
import { Booking, TimeSlot, BlockedDate, DailyForecast, StaffUser, StaffRole, BookingStatus, SystemSettings, DEFAULT_SYSTEM_SETTINGS } from '@/lib/types';
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

const IDLE_TIMEOUT_SECONDS = 60 * 60; // 1 hour (3600 seconds)

function getBangkokToday(): string {
  const bangkokDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  const year = bangkokDate.getFullYear();
  const month = String(bangkokDate.getMonth() + 1).padStart(2, '0');
  const day = String(bangkokDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function AdminDashboardPage() {
  const router = useRouter();

  // Helper date in Thai Timezone (UTC+7)
  const getTodayStr = useCallback(() => {
    return getBangkokToday();
  }, []);

  const getTomorrowStr = useCallback(() => {
    const bangkokDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    bangkokDate.setDate(bangkokDate.getDate() + 1);
    const year = bangkokDate.getFullYear();
    const month = String(bangkokDate.getMonth() + 1).padStart(2, '0');
    const day = String(bangkokDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Helper to check if a booking is overdue (เลยเวลานัด)
  const isBookingOverdue = useCallback((b: Booking): boolean => {
    if (b.status === 'Completed' || b.status === 'Cancelled' || b.status === 'Rejected') {
      return false;
    }
    const bangkokDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const y = bangkokDate.getFullYear();
    const m = String(bangkokDate.getMonth() + 1).padStart(2, '0');
    const d = String(bangkokDate.getDate()).padStart(2, '0');
    const today = `${y}-${m}-${d}`;
    const hh = String(bangkokDate.getHours()).padStart(2, '0');
    const mm = String(bangkokDate.getMinutes()).padStart(2, '0');
    const currentTime = `${hh}:${mm}`;

    if (b.requested_date < today) return true;
    if (b.requested_date === today) {
      let targetEndTime = '17:00';
      if (b.requested_time) {
        const parts = b.requested_time.split('-');
        if (parts[1]) targetEndTime = parts[1].trim();
        else if (parts[0]) targetEndTime = parts[0].trim();
      }
      const toMinutes = (t: string) => {
        if (!t) return 0;
        const [h, min] = t.trim().replace('.', ':').split(':');
        return parseInt(h || '0', 10) * 60 + parseInt(min || '0', 10);
      };
      return toMinutes(currentTime) >= toMinutes(targetEndTime);
    }
    return false;
  }, []);

  // Auth & Token & Role
  const [token, setToken] = useState<string>('');
  const [operatorName, setOperatorName] = useState<string>('เจ้าหน้าที่คลังสินค้า');
  const [userRole, setUserRole] = useState<StaffRole>('warehouse_officer');
  const [userRoleName, setUserRoleName] = useState<string>('เจ้าหน้าที่คลังสินค้า');
  const [idleSecondsRemaining, setIdleSecondsRemaining] = useState<number>(IDLE_TIMEOUT_SECONDS);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'queues' | 'capacity' | 'blocking' | 'staff' | 'audit' | 'settings' | 'analytics'>('queues');

  // Queues state (Default to today's date in Bangkok time)
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [isRevalidating, setIsRevalidating] = useState(false);
  const bookingsRef = useRef<Booking[]>([]);
  const [filterDate, setFilterDate] = useState<string>(() => getBangkokToday());
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Forecast state
  const [forecast, setForecast] = useState<DailyForecast | null>(null);

  // Overdue bookings count
  const systemOverdueCount = useMemo(() => {
    if (typeof forecast?.overdue_count === 'number' && forecast.overdue_count >= 0) {
      return forecast.overdue_count;
    }
    return bookings.filter(isBookingOverdue).length;
  }, [forecast?.overdue_count, bookings, isBookingOverdue]);

  // Real-time KPI Stats from API
  const [kpiStats, setKpiStats] = useState<{
    total: number;
    pending: number;
    approved: number;
    overdue: number;
    receiving: number;
    completed: number;
  } | null>(null);

  const totalCount = kpiStats?.total ?? bookings.length;
  const pendingCount = kpiStats?.pending ?? bookings.filter((b) => b.status === 'Pending').length;
  const approvedCount = kpiStats?.approved ?? bookings.filter((b) => b.status === 'Approved').length;
  const overdueCount = kpiStats?.overdue ?? systemOverdueCount;
  const receivingCount = kpiStats?.receiving ?? bookings.filter((b) => b.status === 'Receiving' || b.status === 'CheckedIn').length;
  const completedCount = kpiStats?.completed ?? bookings.filter((b) => b.status === 'Completed').length;

  // Settings state (Capacity & Blocked dates)
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [dailyOverrides, setDailyOverrides] = useState<Record<string, TimeSlot[]>>({});
  const [capacityMode, setCapacityMode] = useState<'standard' | 'daily'>('standard');
  const [selectedDailyDate, setSelectedDailyDate] = useState<string>(() => getBangkokToday());
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [newBlockedDate, setNewBlockedDate] = useState('');
  const [newBlockedReason, setNewBlockedReason] = useState('');

  // Slots currently active for selectedDailyDate
  const currentDailySlots: TimeSlot[] = useMemo(() => {
    if (
      selectedDailyDate &&
      dailyOverrides[selectedDailyDate] &&
      Array.isArray(dailyOverrides[selectedDailyDate]) &&
      dailyOverrides[selectedDailyDate].length > 0
    ) {
      return dailyOverrides[selectedDailyDate];
    }
    return slots;
  }, [selectedDailyDate, dailyOverrides, slots]);

  const hasDailyOverride = useMemo(() => {
    return !!(
      selectedDailyDate &&
      dailyOverrides[selectedDailyDate] &&
      Array.isArray(dailyOverrides[selectedDailyDate]) &&
      dailyOverrides[selectedDailyDate].length > 0
    );
  }, [selectedDailyDate, dailyOverrides]);

  // System Settings state (Contact info & Announcements)
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('ptn_system_settings');
        if (cached) {
          const parsed = JSON.parse(cached);
          return { ...DEFAULT_SYSTEM_SETTINGS, ...parsed };
        }
      } catch (e) {}
    }
    return DEFAULT_SYSTEM_SETTINGS;
  });
  const [settingsLoaded, setSettingsLoaded] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('ptn_system_settings')) {
      return true;
    }
    return false;
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

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
  const [editRequestedDate, setEditRequestedDate] = useState<string>('');
  const [editRequestedTime, setEditRequestedTime] = useState<string>('');
  const [modalSlots, setModalSlots] = useState<any[]>([]);
  const [loadingModalSlots, setLoadingModalSlots] = useState<boolean>(false);
  const [modalDateBlocked, setModalDateBlocked] = useState<boolean>(false);
  const [modalDateBlockReason, setModalDateBlockReason] = useState<string | null>(null);

  // Complete Receiving & Goods Inspection Modal State
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [completingBooking, setCompletingBooking] = useState<Booking | null>(null);
  const [actualPalletInput, setActualPalletInput] = useState<number | string>('');
  const [receivingNotesInput, setReceivingNotesInput] = useState('');
  const [completeSubmitting, setCompleteSubmitting] = useState(false);
  interface ReceivingPhotoItem {
    file?: File;
    dataUrl: string;
    savedUrl?: string;
    stats?: { originalSize: number; compressedSize: number };
  }
  const [receivingPhotos, setReceivingPhotos] = useState<ReceivingPhotoItem[]>([]);
  const [compressingReceivingPhoto, setCompressingReceivingPhoto] = useState(false);

  // Pallet Tag Print Modal State
  const [palletTagBooking, setPalletTagBooking] = useState<Booking | null>(null);
  const [palletTagModalOpen, setPalletTagModalOpen] = useState<boolean>(false);

  // Photo Lightbox & Gallery Modal State
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState<number>(0);
  const [galleryTitle, setGalleryTitle] = useState<string>('รูปภาพเอกสาร');
  const [galleryOpen, setGalleryOpen] = useState<boolean>(false);

  // QR Scanner Modal State
  const [scannerOpen, setScannerOpen] = useState(false);

  // Super Admin Delete Queue Bookings (Single & Batch)
  const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([]);
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
  const [bookingsToDelete, setBookingsToDelete] = useState<Booking[]>([]);
  const [isDeletingBookings, setIsDeletingBookings] = useState(false);

  // Super Admin Full System Backup & Restore (JSON)
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreData, setRestoreData] = useState<any | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [restoreConfirmCode, setRestoreConfirmCode] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const restoreFileInputRef = useRef<HTMLInputElement | null>(null);

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

  // ── Browser Back-Button & Modal Trap Handler ─────────────────────
  // Tracks open modals via refs so closing via UI (X button / backdrop) never touches history,
  // while pressing the physical/browser Back button closes the topmost open modal without exiting /admin.
  const galleryOpenRef = useRef(galleryOpen);
  galleryOpenRef.current = galleryOpen;

  const lightboxImageRef = useRef(lightboxImage);
  lightboxImageRef.current = lightboxImage;

  const completeModalOpenRef = useRef(completeModalOpen);
  completeModalOpenRef.current = completeModalOpen;

  const editStatusModalOpenRef = useRef(editStatusModalOpen);
  editStatusModalOpenRef.current = editStatusModalOpen;

  const palletTagModalOpenRef = useRef(palletTagModalOpen);
  palletTagModalOpenRef.current = palletTagModalOpen;

  const cancelModalOpenRef = useRef(cancelModalOpen);
  cancelModalOpenRef.current = cancelModalOpen;

  const rejectModalOpenRef = useRef(rejectModalOpen);
  rejectModalOpenRef.current = rejectModalOpen;

  const deleteConfirmModalOpenRef = useRef(deleteConfirmModalOpen);
  deleteConfirmModalOpenRef.current = deleteConfirmModalOpen;

  const restoreModalOpenRef = useRef(restoreModalOpen);
  restoreModalOpenRef.current = restoreModalOpen;

  const staffModalOpenRef = useRef(staffModalOpen);
  staffModalOpenRef.current = staffModalOpen;

  const scannerOpenRef = useRef(scannerOpen);
  scannerOpenRef.current = scannerOpen;

  const selectedBookingRef = useRef(selectedBooking);
  selectedBookingRef.current = selectedBooking;

  // Global popstate event listener (Browser Back / Mobile Swipe Back)
  useEffect(() => {
    // Re-push a history trap entry so pressing Back is caught
    try {
      window.history.pushState(null, '', window.location.href);
    } catch (e) {}

    const handlePopState = () => {
      // Always re-push trap immediately so subsequent Back clicks are also caught
      try {
        window.history.pushState(null, '', window.location.href);
      } catch (e) {}

      // 1. Photo lightboxes
      if (galleryOpenRef.current) {
        setGalleryOpen(false);
        return;
      }
      if (lightboxImageRef.current) {
        setLightboxImage(null);
        return;
      }

      // 2. Action modals inside details
      if (completeModalOpenRef.current) {
        setCompleteModalOpen(false);
        return;
      }
      if (editStatusModalOpenRef.current) {
        setEditStatusModalOpen(false);
        return;
      }
      if (palletTagModalOpenRef.current) {
        setPalletTagModalOpen(false);
        return;
      }
      if (cancelModalOpenRef.current) {
        setCancelModalOpen(false);
        return;
      }
      if (rejectModalOpenRef.current) {
        setRejectModalOpen(false);
        return;
      }
      if (deleteConfirmModalOpenRef.current) {
        setDeleteConfirmModalOpen(false);
        return;
      }
      if (restoreModalOpenRef.current) {
        setRestoreModalOpen(false);
        return;
      }

      // 3. Other dialogs
      if (staffModalOpenRef.current) {
        setStaffModalOpen(false);
        return;
      }
      if (scannerOpenRef.current) {
        setScannerOpen(false);
        return;
      }

      // 4. Booking detail modal
      if (selectedBookingRef.current) {
        setSelectedBooking(null);
        return;
      }

      // 5. If no modals were open, user pressed Back on the main admin dashboard
      showToast('อยู่ในหน้าระบบจัดการคลังสินค้า (หากต้องการออกจากระบบให้กดปุ่ม "ออกจากระบบ")', 'success');
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

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
      router.replace('/admin/login?reason=idle_timeout');
    } else {
      router.replace('/admin/login?reason=logout');
    }
  }, [router]);

  // 1. Initial Authentication Check
  useEffect(() => {
    const savedToken = sessionStorage.getItem('ptn_admin_jwt') || localStorage.getItem('ptn_admin_jwt');
    const savedOperator = sessionStorage.getItem('ptn_admin_operator') || localStorage.getItem('ptn_admin_operator') || 'เจ้าหน้าที่คลังสินค้า';
    const savedRole = ((sessionStorage.getItem('ptn_admin_role') || localStorage.getItem('ptn_admin_role')) as StaffRole) || 'warehouse_officer';
    const savedRoleName = sessionStorage.getItem('ptn_admin_role_name') || localStorage.getItem('ptn_admin_role_name') || 'เจ้าหน้าที่';
    const savedLoginTime = sessionStorage.getItem('ptn_admin_login_time') || localStorage.getItem('ptn_admin_login_time');

    if (!savedToken) {
      router.replace('/admin/login');
      return;
    }

    // Check if session has exceeded 1 hour
    if (savedLoginTime) {
      const loginTime = parseInt(savedLoginTime, 10);
      if (Date.now() - loginTime > IDLE_TIMEOUT_SECONDS * 1000) {
        handleLogout('idle');
        return;
      }
    }

    setToken(savedToken);
    setOperatorName(savedOperator);
    setUserRole(savedRole);
    setUserRoleName(savedRoleName);
  }, [router, handleLogout]);

  // 2. Idle Timer (Auto-Logout after 1 hour of inactivity)
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

  // 3. Load Bookings (Silent Background Refresh / Stale-While-Revalidate)
  const fetchBookings = useCallback(async (isBackground = false) => {
    if (!token && !sessionStorage.getItem('ptn_admin_jwt')) return;
    if (!isBackground && bookingsRef.current.length === 0) {
      setLoadingBookings(true);
    } else {
      setIsRevalidating(true);
    }
    try {
      let url = `/api/admin/bookings?date=${filterDate}&status=${filterStatus}`;
      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }
      const res = await authFetch(url);
      const data = await res.json();
      const newBookings = data.bookings || [];
      bookingsRef.current = newBookings;
      setBookings(newBookings);
      if (data.stats) {
        setKpiStats(data.stats);
      }
      // Seamlessly sync currently opened modal detail in-place without closing or jump
      setSelectedBooking((prev) => {
        if (!prev) return null;
        const fresh = newBookings.find((b: Booking) => b.booking_id === prev.booking_id);
        return fresh || prev;
      });
    } catch (err: any) {
      if (!isBackground && err.message !== 'Unauthorized') {
        showToast('ไม่สามารถโหลดข้อมูลคิวได้', 'error');
      }
    } finally {
      setLoadingBookings(false);
      setIsRevalidating(false);
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
          fetchBookings(true);
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
      if (data.dailyOverrides) {
        setDailyOverrides(data.dailyOverrides);
      }
      if (data.settings) {
        setSystemSettings(data.settings);
        setSettingsLoaded(true);
        try {
          localStorage.setItem('ptn_system_settings', JSON.stringify(data.settings));
        } catch (e) {}
      }
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
    if (userRole && userRole !== 'super_admin') return;
    setLoadingAudit(true);
    try {
      const res = await authFetch('/api/admin/audit-logs');
      const data = await res.json();
      setAuditLogs(data.logs || []);
    } catch (err) {
    } finally {
      setLoadingAudit(false);
    }
  }, [authFetch, token, userRole]);

  useEffect(() => {
    if (token) {
      fetchBookings();
      fetchForecast();
      fetchSettings();

      // ⏱️ Auto-polling every 15s to catch new incoming bookings in real-time
      const interval = setInterval(() => {
        fetchForecast();
        fetchBookings(true);
      }, 15000);

      return () => clearInterval(interval);
    }
  }, [token, fetchBookings, fetchForecast, fetchSettings]);

  useEffect(() => {
    if (activeTab === 'staff' && token) {
      fetchStaff();
    }
    if (activeTab === 'audit' && token && userRole === 'super_admin') {
      fetchAuditLogs();
    }
    if (activeTab === 'settings' && token && userRole === 'super_admin') {
      fetchSettings();
    }
  }, [activeTab, token, userRole, fetchStaff, fetchAuditLogs, fetchSettings]);

  // Live QR Code Scanner Success Handler
  const handleQRScanned = useCallback(async (scannedId: string) => {
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
  }, []);

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
      bookingsRef.current = [];
      setBookings([]);
      fetchForecast();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการล้างข้อมูล', 'error');
    } finally {
      setClearingAllBookings(false);
    }
  };

  // Super Admin Delete Queue Bookings (Single & Batch)
  // Toggle single selection
  const handleToggleSelectBooking = (id: string) => {
    setSelectedBookingIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle select all currently visible bookings
  const handleToggleSelectAll = () => {
    if (bookings.length === 0) return;
    const allVisibleSelected = bookings.every((b) => selectedBookingIds.includes(b.booking_id));
    if (allVisibleSelected) {
      // Unselect all visible
      const visibleIds = bookings.map((b) => b.booking_id);
      setSelectedBookingIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      // Select all visible
      const visibleIds = bookings.map((b) => b.booking_id);
      setSelectedBookingIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  // Open single delete confirmation modal
  const openSingleDeleteModal = (booking: Booking) => {
    setBookingsToDelete([booking]);
    setDeleteConfirmModalOpen(true);
  };

  // Open batch delete confirmation modal
  const openBatchDeleteModal = () => {
    const toDelete = bookings.filter((b) => selectedBookingIds.includes(b.booking_id));
    if (toDelete.length === 0) return;
    setBookingsToDelete(toDelete);
    setDeleteConfirmModalOpen(true);
  };

  // Confirm delete handler
  const handleConfirmDelete = async () => {
    if (bookingsToDelete.length === 0) return;
    setIsDeletingBookings(true);
    try {
      if (bookingsToDelete.length === 1) {
        // Single delete
        const target = bookingsToDelete[0];
        const res = await authFetch(`/api/admin/bookings/${target.booking_id}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'ลบรายการจองคิวไม่สำเร็จ');
        showToast(data.message || `ลบรายการคิว ${target.booking_id} เรียบร้อยแล้ว`, 'success');
      } else {
        // Batch delete
        const ids = bookingsToDelete.map((b) => b.booking_id);
        const res = await authFetch('/api/admin/bookings', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'ลบรายการที่เลือกไม่สำเร็จ');
        showToast(data.message || `ลบรายการคิวที่เลือกจำนวน ${data.deleted_count} รายการเรียบร้อยแล้ว`, 'success');
      }

      const deletedIds = bookingsToDelete.map((b) => b.booking_id);
      setBookings((prev) => prev.filter((b) => !deletedIds.includes(b.booking_id)));
      setSelectedBookingIds((prev) => prev.filter((id) => !deletedIds.includes(id)));
      if (selectedBooking && deletedIds.includes(selectedBooking.booking_id)) {
        setSelectedBooking(null);
      }
      setDeleteConfirmModalOpen(false);
      setBookingsToDelete([]);
      fetchForecast();
      fetchAuditLogs();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการลบรายการจองคิว', 'error');
    } finally {
      setIsDeletingBookings(false);
    }
  };

  // Super Admin Full System Backup & Restore (JSON)
  // 1. Download Backup JSON
  const handleDownloadBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await authFetch('/api/admin/backup');
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'ดาวน์โหลดไฟล์สำรองไม่สำเร็จ');
      }
      const blob = await res.blob();
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      const filename = `ptn-backup-${dateStr}.json`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast('ดาวน์โหลดไฟล์สำรองข้อมูล (Backup JSON) สำเร็จ', 'success');
      fetchAuditLogs();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการสำรองข้อมูล', 'error');
    } finally {
      setIsBackingUp(false);
    }
  };

  // 2. Select file to restore
  const handleSelectRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const json = JSON.parse(content);
        if (!json || typeof json !== 'object' || !json.data) {
          throw new Error('โครงสร้างไฟล์ไม่ถูกต้อง (ต้องมี data section)');
        }
        setRestoreFile(file);
        setRestoreData(json);
        setRestoreMode('merge');
        setRestoreConfirmCode('');
        setRestoreModalOpen(true);
      } catch (err: any) {
        showToast(`ไฟล์ไม่ถูกต้อง: ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 3. Submit Restore
  const handleConfirmRestore = async () => {
    if (!restoreData) return;
    if (restoreMode === 'replace' && restoreConfirmCode.trim().toUpperCase() !== 'RESTORE') {
      showToast('กรุณากรอกรหัสยืนยัน "RESTORE" เพื่อดำเนินการแทนที่ทั้งหมด', 'error');
      return;
    }
    setIsRestoring(true);
    try {
      const res = await authFetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backup_data: restoreData,
          mode: restoreMode,
          confirm_code: restoreConfirmCode.trim().toUpperCase(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'กู้คืนข้อมูลไม่สำเร็จ');
      showToast(data.message || 'กู้คืนข้อมูลระบบสำเร็จ', 'success');
      setRestoreModalOpen(false);
      setRestoreFile(null);
      setRestoreData(null);
      fetchBookings();
      fetchForecast();
      fetchSettings();
      fetchStaff();
      fetchAuditLogs();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการกู้คืนข้อมูล', 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  // Fetch slots and availability for modal date picker
  const fetchModalSlots = useCallback(async (dateStr: string) => {
    if (!dateStr) return;
    setLoadingModalSlots(true);
    try {
      const res = await fetch(`/api/availability?date=${dateStr}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        setModalDateBlocked(false);
        setModalDateBlockReason(null);
        setModalSlots([]);
      } else {
        setModalDateBlocked(Boolean(data.is_blocked));
        setModalDateBlockReason(data.block_reason || null);
        const active = (data.slots || []).filter((s: any) => s.is_active !== 0);
        setModalSlots(active);
      }
    } catch (e) {
      console.error('Failed to load slots for modal:', e);
      setModalSlots([]);
    } finally {
      setLoadingModalSlots(false);
    }
  }, []);

  // Open Edit Queue Status Modal
  const openEditStatusModal = (booking: Booking) => {
    setEditingStatusBooking(booking);
    setTargetStatus(booking.status);
    setStatusChangeReason('');
    setEditActualPalletInput(booking.actual_pallet_count !== undefined && booking.actual_pallet_count !== null ? booking.actual_pallet_count : booking.pallet_count);
    setEditReceivingNotesInput(booking.receiving_notes || '');
    setEditRequestedDate(booking.requested_date);
    setEditRequestedTime(booking.requested_time);
    fetchModalSlots(booking.requested_date);
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

    if (!editRequestedDate) {
      showToast('กรุณาระบุวันที่เข้าส่งสินค้า', 'error');
      return;
    }

    if (!editRequestedTime) {
      showToast('กรุณาเลือกรอบเวลาเข้าส่งสินค้า', 'error');
      return;
    }

    setStatusSubmitting(true);
    try {
      const isDateChanged = editRequestedDate !== editingStatusBooking.requested_date;
      const isTimeChanged = editRequestedTime !== editingStatusBooking.requested_time;
      const isRescheduled = Boolean(isDateChanged || isTimeChanged);

      const payload: any = {
        status: targetStatus,
        admin_reason: statusChangeReason.trim() || `ปรับเปลี่ยนสถานะเป็น ${targetStatus} โดย ${operatorName}`,
        requested_date: editRequestedDate,
        requested_time: editRequestedTime,
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

      let successMsg = `แก้ไขสถานะคิว ${editingStatusBooking.booking_id} เป็น "${targetStatus}" เรียบร้อยแล้ว`;
      if (isRescheduled) {
        successMsg += ` พร้อมปรับเปลี่ยนนัดหมายเป็น ${formatThaiShortDate(editRequestedDate)} (${editRequestedTime}) และส่งแจ้งเตือนไปยังผู้จองแล้ว`;
      }
      showToast(successMsg);

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

  // Photo handler for receiving inspection photos (up to 5 photos)
  const handleReceivingPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (receivingPhotos.length + files.length > 5) {
      showToast('⚠️ สามารถแนบรูปภาพตรวจรับได้สูงสุดไม่เกิน 5 รูป', 'error');
      return;
    }

    try {
      setCompressingReceivingPhoto(true);
      const newItems: ReceivingPhotoItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressImage(files[i], 1600, 0.82);
        newItems.push({
          file: compressed.file,
          dataUrl: compressed.dataUrl,
          stats: {
            originalSize: compressed.originalSize,
            compressedSize: compressed.compressedSize,
          },
        });
      }
      setReceivingPhotos((prev) => [...prev, ...newItems]);
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการประมวลผลรูปภาพ', 'error');
    } finally {
      setCompressingReceivingPhoto(false);
      e.target.value = '';
    }
  };

  const removeReceivingPhoto = (index: number) => {
    setReceivingPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Open Complete Receiving & Inspect Goods Modal
  const openCompleteModal = (booking: Booking) => {
    setCompletingBooking(booking);
    setActualPalletInput(booking.actual_pallet_count !== undefined && booking.actual_pallet_count !== null ? booking.actual_pallet_count : booking.pallet_count);
    setReceivingNotesInput(booking.receiving_notes || '');
    const existing = (booking.receiving_photo_urls && booking.receiving_photo_urls.length > 0)
      ? booking.receiving_photo_urls
      : (booking.receiving_photo_url ? [booking.receiving_photo_url] : []);
    setReceivingPhotos(existing.map((url) => ({ dataUrl: url, savedUrl: url })));
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
      const finalReceivingPhotoUrls: string[] = [];

      // Upload newly added receiving photos to R2
      for (const item of receivingPhotos) {
        if (item.savedUrl) {
          finalReceivingPhotoUrls.push(item.savedUrl);
        } else if (item.file) {
          try {
            const uploadFormData = new FormData();
            uploadFormData.append('file', item.file);
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
              finalReceivingPhotoUrls.push(uploadData.url);
            } else {
              console.error('Failed to upload receiving photo:', uploadData);
              showToast(uploadData.error || '⚠️ ไม่สามารถอัปโหลดรูปภาพตรวจรับได้ กรุณาลองใหม่อีกครั้ง', 'error');
              setCompleteSubmitting(false);
              return;
            }
          } catch (uploadErr: any) {
            console.error('Failed to upload receiving photo:', uploadErr);
            showToast('⚠️ เกิดข้อผิดพลาดในการส่งรูปภาพตรวจรับสินค้า', 'error');
            setCompleteSubmitting(false);
            return;
          }
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
          receiving_photo_url: finalReceivingPhotoUrls[0] || null,
          receiving_photo_urls: finalReceivingPhotoUrls,
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
      setReceivingPhotos([]);
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

  // Daily slot capacity/active change with optimistic UI update
  const handleDailySlotChange = async (slotId: number, max_capacity: number, is_active: boolean) => {
    if (!selectedDailyDate) return;
    const nextSlots = currentDailySlots.map((s) =>
      s.id === slotId ? { ...s, max_capacity, is_active: is_active ? 1 : 0 } : { ...s }
    );
    setDailyOverrides((prev) => ({
      ...prev,
      [selectedDailyDate]: nextSlots,
    }));

    try {
      const res = await authFetch('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify({
          action: 'update_daily_slot',
          date: selectedDailyDate,
          id: slotId,
          max_capacity,
          is_active,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(data.message || `บันทึกการตั้งค่ารอบเวลาเฉพาะวันที่ ${formatThaiDate(selectedDailyDate)} สำเร็จ`);
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
      fetchSettings();
    }
  };

  // Reset daily slots override to default template
  const handleResetDailySlots = async (dateToReset: string) => {
    if (!confirm(`ต้องการคืนค่ารอบเวลาของวันที่ ${formatThaiDate(dateToReset)} กลับเป็นค่ามาตรฐานของระบบ ใช่หรือไม่?`)) {
      return;
    }
    setDailyOverrides((prev) => {
      const copy = { ...prev };
      delete copy[dateToReset];
      return copy;
    });

    try {
      const res = await authFetch('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify({
          action: 'reset_daily_slots',
          date: dateToReset,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(data.message || 'คืนค่ารอบเวลากลับเป็นค่ามาตรฐานเรียบร้อยแล้ว');
      fetchSettings();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการคืนค่า', 'error');
      fetchSettings();
    }
  };

  // Batch update capacity for selected daily date
  const handleBatchDailyCapacity = async () => {
    if (!selectedDailyDate) return;
    const val = prompt(`กรุณาระบุจำนวนความจุ (คิว) ที่ต้องการตั้งให้กับทุกรอบของวันที่ ${formatThaiDate(selectedDailyDate)}:`, '4');
    if (val && !isNaN(parseInt(val, 10)) && parseInt(val, 10) > 0) {
      const newCap = parseInt(val, 10);
      const nextSlots = currentDailySlots.map((s) => ({ ...s, max_capacity: newCap }));
      setDailyOverrides((prev) => ({
        ...prev,
        [selectedDailyDate]: nextSlots,
      }));

      try {
        const res = await authFetch('/api/admin/settings', {
          method: 'POST',
          body: JSON.stringify({
            action: 'batch_daily_capacity',
            date: selectedDailyDate,
            max_capacity: newCap,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        showToast(data.message || `ปรับความจุทุกรอบของวันที่ ${formatThaiDate(selectedDailyDate)} เรียบร้อย`);
      } catch (err: any) {
        showToast(err.message || 'เกิดข้อผิดพลาด', 'error');
        fetchSettings();
      }
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
      'จำนวนรูปเอกสาร',
      'จำนวนรูปตรวจรับ',
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
      b.photo_urls?.length || (b.photo_url ? 1 : 0),
      b.receiving_photo_urls?.length || (b.receiving_photo_url ? 1 : 0),
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

  // Format idle time display (HH:MM:SS or MM:SS)
  const formatIdleTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <span className="px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1.5 shadow-2xs"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> อนุมัติแล้ว</span>;
      case 'CheckedIn':
        return <span className="px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold bg-blue-100 text-blue-800 flex items-center gap-1.5 shadow-2xs"><Truck className="w-4 h-4 text-blue-600 shrink-0" /> เข้าพื้นที่แล้ว</span>;
      case 'Receiving':
        return <span className="px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold bg-indigo-100 text-indigo-800 flex items-center gap-1.5 shadow-2xs"><Package className="w-4 h-4 text-indigo-600 animate-pulse shrink-0" /> กำลังลงสินค้า</span>;
      case 'Completed':
        return <span className="px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold bg-teal-100 text-teal-950 flex items-center gap-1.5 shadow-2xs"><CheckCheck className="w-4 h-4 text-teal-700 shrink-0" /> เสร็จสิ้นสมบูรณ์</span>;
      case 'Rejected':
        return <span className="px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold bg-rose-100 text-rose-800 flex items-center gap-1.5 shadow-2xs"><XCircle className="w-4 h-4 text-rose-600 shrink-0" /> ไม่อนุมัติ</span>;
      case 'Cancelled':
        return <span className="px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold bg-slate-100 text-slate-700 flex items-center gap-1.5 shadow-2xs"><AlertCircle className="w-4 h-4 text-slate-500 shrink-0" /> ยกเลิกแล้ว</span>;
      default:
        return <span className="px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold bg-amber-100 text-amber-900 flex items-center gap-1.5 shadow-2xs"><Clock className="w-4 h-4 text-amber-600 animate-pulse shrink-0" /> รอการตรวจสอบ</span>;
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      showToast('เฉพาะ Super Admin เท่านั้นที่มีสิทธิ์แก้ไขข้อมูลระบบ', 'error');
      return;
    }
    setIsSavingSettings(true);
    try {
      const res = await authFetch('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(systemSettings),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSystemSettings(data.settings);
        try {
          localStorage.setItem('ptn_system_settings', JSON.stringify(data.settings));
        } catch (e) {}
        showToast('บันทึกข้อมูลติดต่อและประกาศสำเร็จ มีผลใช้งานทันที');
      } else {
        showToast(data.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
      }
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const getRoleBadge = (role: StaffRole) => {
    switch (role) {
      case 'super_admin':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-950 border border-amber-300 flex items-center gap-1">👑 Super Admin</span>;
      case 'warehouse_officer':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">📦 คลังสินค้า</span>;
      case 'security_gate':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300 flex items-center gap-1">🛡️ ตรวจสอบคิวส่ง</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">เจ้าหน้าที่</span>;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'APPROVE_QUEUE':
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800">อนุมัติคิว</span>;
      case 'REJECT_QUEUE':
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-100 text-rose-800">ปฏิเสธคิว</span>;
      case 'CANCEL_QUEUE':
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-200 text-slate-700">ยกเลิกคิว</span>;
      case 'LOGIN_SUCCESS':
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-800">เข้าสู่ระบบ</span>;
      case 'LOGIN_FAILED':
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-red-100 text-red-800">กรอกรหัสผิด</span>;
      case 'ADD_STAFF':
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-purple-100 text-purple-800">เพิ่มเจ้าหน้าที่</span>;
      case 'UPDATE_STAFF':
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-cyan-100 text-cyan-800">แก้ไขเจ้าหน้าที่</span>;
      case 'DELETE_STAFF':
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-100 text-rose-800">ลบเจ้าหน้าที่</span>;
      case 'DELETE_QUEUE':
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">ลบคิวถาวร</span>;
      case 'BACKUP_DATA':
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">สำรองข้อมูล</span>;
      case 'RESTORE_DATA':
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">กู้คืนระบบ</span>;
      case 'UPDATE_SETTINGS':
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200">แก้ไขข้อมูลระบบ/ติดต่อ</span>;
      default:
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700">{action}</span>;
    }
  };

  // Permission flags
  const isSuperAdmin = userRole === 'super_admin';
  const isSecurityOnly = userRole === 'security_gate';
  const canViewAnalytics = isSuperAdmin || userRole === 'warehouse_officer';
  const canManageSettings = isSuperAdmin;

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center font-bold shadow-md shadow-emerald-900/50 shrink-0">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight">ระบบจัดการคิวคลังสินค้า</h1>
              <p className="text-xs text-slate-400">บจก. พีทีเอ็น ฟาร์มาเซ็นเตอร์ (พัฒนาเภสัช)</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap justify-start md:justify-end">
            {/* Browser Web Push Notification Toggle */}
            <button
              onClick={handleRequestNotifPermission}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border shrink-0 ${
                notifPermission === 'granted'
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title={notifPermission === 'granted' ? 'เปิดการแจ้งเตือนบนเบราว์เซอร์แล้ว (คลิกเพื่อทดสอบ)' : 'คลิกเพื่อเปิดรับการแจ้งเตือนบนเบราว์เซอร์เมื่อมีคิวใหม่'}
            >
              <Bell className={`w-4 h-4 shrink-0 ${notifPermission === 'granted' ? 'text-emerald-400 animate-bounce' : ''}`} />
              <span>{notifPermission === 'granted' ? 'แจ้งเตือน: เปิด' : 'เปิดแจ้งเตือน'}</span>
            </button>

            {/* Audio Notification Toggle */}
            <button
              onClick={toggleSound}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border shrink-0 ${
                soundEnabled
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
              title="เปิด/ปิดเสียงแจ้งเตือนเมื่อมีคิวใหม่"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <VolumeX className="w-4 h-4 shrink-0" />}
              <span>{soundEnabled ? 'เสียง: เปิด' : 'เสียง: ปิด'}</span>
            </button>

            {/* Operator info with Role Badge */}
            <div className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs shrink-0">
              <User className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-200 truncate max-w-[120px] sm:max-w-none">{operatorName}</span>
                {getRoleBadge(userRole)}
              </div>
              <span className="text-slate-600 hidden sm:inline">|</span>
              <div className="hidden sm:flex items-center gap-1 text-slate-400 text-xs" title="เซสชันจะหมดอายุหากไม่มีการใช้งาน">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Auto-Logout: <strong className="text-amber-300 font-mono text-xs">{formatIdleTime(idleSecondsRemaining)}</strong></span>
              </div>
            </div>

            <button
              onClick={() => handleLogout('manual')}
              className="px-3 py-1.5 bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm shrink-0"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1.5 sm:gap-2 border-t border-slate-800 py-2 overflow-x-auto text-xs sm:text-sm">
          <button
            onClick={() => setActiveTab('queues')}
            className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
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
                className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  activeTab === 'capacity' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>ตั้งค่ารอบเวลาและความจุ</span>
              </button>

              <button
                onClick={() => setActiveTab('blocking')}
                className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
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
              className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeTab === 'staff' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4 text-amber-300" />
              <span>จัดการเจ้าหน้าที่</span>
            </button>
          )}

          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeTab === 'audit' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Audit Logs</span>
            </button>
          )}

          {canManageSettings && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeTab === 'settings'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Settings className="w-4 h-4 text-cyan-300" />
              <span>ข้อมูลติดต่อและประกาศ</span>
            </button>
          )}

          {canViewAnalytics && (
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeTab === 'analytics' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-purple-300" />
              <span>วิเคราะห์ข้อมูล (Analytics)</span>
            </button>
          )}

          {/* Direct Link to High-Res Poster / Standee Page */}
          <a
            href="/poster"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 bg-emerald-600/30 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-100 hover:text-white ml-auto shadow-sm"
            title="เปิดหน้าโปสเตอร์ QR Code (Standee) สำหรับพิมพ์ติดหน้างานหรือดาวน์โหลดรูปภาพ"
          >
            <QrCode className="w-4 h-4 text-emerald-300" />
            <span>พิมพ์โปสเตอร์ Standee</span>
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Admin Internal Announcement Banner (Large & Eye-catching) */}
        {settingsLoaded && systemSettings.admin_announcement_active && systemSettings.admin_announcement && (
          <div className="relative overflow-hidden bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-3xl p-5 sm:p-6 text-white shadow-xl shadow-amber-500/20 border-2 border-amber-300 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 no-print animate-in fade-in duration-300">
            <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-white/15 rounded-full blur-2xl pointer-events-none" />
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white text-amber-600 flex items-center justify-center shrink-0 shadow-lg shadow-black/10">
              <Bell className="w-7 h-7 sm:w-8 sm:h-8 text-amber-600 animate-bounce" />
            </div>
            <div className="flex-1 space-y-1.5 relative z-10">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 bg-white/20 border border-white/35 backdrop-blur-xs text-white text-xs sm:text-sm font-black px-3.5 py-1 rounded-full uppercase tracking-wider">
                  <AlertCircle className="w-4 h-4 text-amber-200 shrink-0" />
                  ประกาศภายในสำหรับเจ้าหน้าที่ (Internal Announcement)
                </span>
                <span className="bg-rose-500 text-white text-xs font-black px-3 py-1 rounded-full shadow-xs animate-pulse">
                  สำคัญ
                </span>
              </div>
              <p className="text-lg sm:text-2xl md:text-3xl font-black text-white leading-snug tracking-tight drop-shadow-sm whitespace-pre-line">
                {systemSettings.admin_announcement}
              </p>
            </div>
          </div>
        )}

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
          <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white p-6 rounded-3xl border border-emerald-700/50 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 no-print">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <Bell className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-emerald-300">
                  Advance Queue Forecast • สรุปยอดคิวล่วงหน้า
                </span>
                <h3 className="text-base sm:text-xl font-extrabold">{forecast.notification_message}</h3>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-center px-4 py-2.5 bg-white/10 rounded-2xl border border-white/10">
                <span className="text-xs text-slate-300 block font-medium">รอตรวจสอบทั้งหมด</span>
                <span className="text-xl font-black text-amber-400">{forecast.total_pending_all} คิว</span>
              </div>
              <div className="text-center px-4 py-2.5 bg-white/10 rounded-2xl border border-white/10">
                <span className="text-xs text-slate-300 block font-medium">คิววันพรุ่งนี้</span>
                <span className="text-xl font-black text-emerald-300">{forecast.tomorrow_total} คิว</span>
              </div>
            </div>
          </div>
        )}

        {/* 🌟 TAB 1: QUEUES MANAGEMENT */}
        {activeTab === 'queues' && (
          <div className="space-y-6">
            {/* Real-Time Operational KPI Metrics (Clickable Filter Cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 no-print">
              {/* Card 1: All / Total */}
              <button
                type="button"
                onClick={() => setFilterStatus('All')}
                className={`p-4 sm:p-5 rounded-3xl border text-left transition cursor-pointer active:scale-98 ${
                  filterStatus === 'All'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-800 ring-offset-2'
                    : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-900 shadow-xs hover:border-slate-300'
                }`}
                title="คลิกเพื่อดูรายการคิวทั้งหมด"
              >
                <div className="flex justify-between items-start">
                  <span className={`text-xs font-bold uppercase tracking-wider ${filterStatus === 'All' ? 'text-slate-300' : 'text-slate-500'}`}>
                    คิวในตัวกรองทั้งหมด
                  </span>
                  <span className={`px-2 py-0.5 rounded-lg font-bold text-2xs ${filterStatus === 'All' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
                    รวม
                  </span>
                </div>
                <div className="mt-2.5">
                  <span className={`text-2xl sm:text-3xl font-black font-mono ${filterStatus === 'All' ? 'text-white' : 'text-slate-900'}`}>
                    {totalCount}
                  </span>
                  <span className={`text-xs ml-1 ${filterStatus === 'All' ? 'text-slate-300' : 'text-slate-400'}`}>คิว</span>
                </div>
                <div className={`mt-1 text-2xs font-semibold ${filterStatus === 'All' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  {filterStatus === 'All' ? '● กำลังแสดงทุกสถานะ' : '● คลิกเพื่อดูทั้งหมด'}
                </div>
              </button>

              {/* Card 2: Pending Approval */}
              <button
                type="button"
                onClick={() => setFilterStatus(filterStatus === 'Pending' ? 'All' : 'Pending')}
                className={`p-4 sm:p-5 rounded-3xl border text-left transition cursor-pointer active:scale-98 ${
                  filterStatus === 'Pending'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-md ring-2 ring-amber-400 ring-offset-2'
                    : 'bg-white hover:bg-amber-50/60 border-slate-200/80 text-slate-900 shadow-xs hover:border-amber-300'
                }`}
                title="คลิกเพื่อดูเฉพาะคิวรอตรวจสอบ (Pending)"
              >
                <div className="flex justify-between items-start">
                  <span className={`text-xs font-bold uppercase tracking-wider ${filterStatus === 'Pending' ? 'text-amber-100' : 'text-slate-500'}`}>
                    รอตรวจสอบ (Pending)
                  </span>
                  <span className={`px-2 py-0.5 rounded-lg font-bold text-2xs ${filterStatus === 'Pending' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                    รออนุมัติ
                  </span>
                </div>
                <div className="mt-2.5">
                  <span className={`text-2xl sm:text-3xl font-black font-mono ${filterStatus === 'Pending' ? 'text-white' : 'text-amber-500'}`}>
                    {pendingCount}
                  </span>
                  <span className={`text-xs ml-1 ${filterStatus === 'Pending' ? 'text-amber-100' : 'text-slate-400'}`}>คิว</span>
                </div>
                <div className={`mt-1 text-2xs font-semibold ${filterStatus === 'Pending' ? 'text-amber-100' : 'text-amber-600'}`}>
                  {filterStatus === 'Pending' ? '● กำลังแสดงเฉพาะรอตรวจสอบ' : '● รอเจ้าหน้าที่กดรับรอง'}
                </div>
              </button>

              {/* Card 3: Approved */}
              <button
                type="button"
                onClick={() => setFilterStatus(filterStatus === 'Approved' ? 'All' : 'Approved')}
                className={`p-4 sm:p-5 rounded-3xl border text-left transition cursor-pointer active:scale-98 ${
                  filterStatus === 'Approved'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500 ring-offset-2'
                    : 'bg-white hover:bg-emerald-50/60 border-slate-200/80 text-slate-900 shadow-xs hover:border-emerald-300'
                }`}
                title="คลิกเพื่อดูเฉพาะคิวที่อนุมัติแล้ว (Approved)"
              >
                <div className="flex justify-between items-start">
                  <span className={`text-xs font-bold uppercase tracking-wider ${filterStatus === 'Approved' ? 'text-emerald-100' : 'text-slate-500'}`}>
                    อนุมัติแล้ว (Approved)
                  </span>
                  <span className={`px-2 py-0.5 rounded-lg font-bold text-2xs ${filterStatus === 'Approved' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                    พร้อมส่ง
                  </span>
                </div>
                <div className="mt-2.5">
                  <span className={`text-2xl sm:text-3xl font-black font-mono ${filterStatus === 'Approved' ? 'text-white' : 'text-emerald-600'}`}>
                    {approvedCount}
                  </span>
                  <span className={`text-xs ml-1 ${filterStatus === 'Approved' ? 'text-emerald-100' : 'text-slate-400'}`}>คิว</span>
                </div>
                <div className={`mt-1 text-2xs font-semibold ${filterStatus === 'Approved' ? 'text-emerald-100' : 'text-emerald-600'}`}>
                  {filterStatus === 'Approved' ? '● กำลังแสดงเฉพาะคิวที่อนุมัติแล้ว' : '● อนุมัติแล้ว รอเข้าพื้นที่'}
                </div>
              </button>

              {/* Card 4: Overdue */}
              <button
                type="button"
                onClick={() => setFilterStatus(filterStatus === 'Overdue' ? 'All' : 'Overdue')}
                className={`p-4 sm:p-5 rounded-3xl border text-left transition cursor-pointer active:scale-98 ${
                  filterStatus === 'Overdue'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-500 ring-offset-2'
                    : 'bg-white hover:bg-amber-50/60 border-slate-200/80 text-slate-900 shadow-xs hover:border-amber-300'
                }`}
                title="คลิกเพื่อดูเฉพาะรายการคิวที่เลยกำหนดเวลานัด (Overdue)"
              >
                <div className="flex justify-between items-start">
                  <span className={`text-xs font-bold uppercase tracking-wider ${filterStatus === 'Overdue' ? 'text-amber-100' : 'text-slate-500'}`}>
                    เลยเวลานัดหมาย
                  </span>
                  <span className={`px-2 py-0.5 rounded-lg font-bold text-2xs ${filterStatus === 'Overdue' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'}`}>
                    ค้างส่ง
                  </span>
                </div>
                <div className="mt-2.5">
                  <span className={`text-2xl sm:text-3xl font-black font-mono ${filterStatus === 'Overdue' ? 'text-white' : overdueCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                    {overdueCount}
                  </span>
                  <span className={`text-xs ml-1 ${filterStatus === 'Overdue' ? 'text-amber-100' : 'text-slate-400'}`}>คิว</span>
                </div>
                <div className={`mt-1 text-2xs font-semibold ${filterStatus === 'Overdue' ? 'text-amber-100' : 'text-amber-700'}`}>
                  {filterStatus === 'Overdue' ? '● กำลังแสดงเฉพาะคิวเลยเวลา' : '● ไม่ปฏิเสธคิวอัตโนมัติ'}
                </div>
              </button>

              {/* Card 5: Completed */}
              <button
                type="button"
                onClick={() => setFilterStatus(filterStatus === 'Completed' ? 'All' : 'Completed')}
                className={`p-4 sm:p-5 rounded-3xl border text-left transition cursor-pointer active:scale-98 ${
                  filterStatus === 'Completed'
                    ? 'bg-teal-600 text-white border-teal-600 shadow-md ring-2 ring-teal-500 ring-offset-2'
                    : 'bg-white hover:bg-teal-50/60 border-slate-200/80 text-slate-900 shadow-xs hover:border-teal-300'
                }`}
                title="คลิกเพื่อดูเฉพาะคิวที่ตรวจรับเสร็จสมบูรณ์ (Completed)"
              >
                <div className="flex justify-between items-start">
                  <span className={`text-xs font-bold uppercase tracking-wider ${filterStatus === 'Completed' ? 'text-teal-100' : 'text-slate-500'}`}>
                    ตรวจรับเสร็จสมบูรณ์
                  </span>
                  <span className={`px-2 py-0.5 rounded-lg font-bold text-2xs ${filterStatus === 'Completed' ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-800'}`}>
                    สำเร็จ
                  </span>
                </div>
                <div className="mt-2.5">
                  <span className={`text-2xl sm:text-3xl font-black font-mono ${filterStatus === 'Completed' ? 'text-white' : 'text-teal-600'}`}>
                    {completedCount}
                  </span>
                  <span className={`text-xs ml-1 ${filterStatus === 'Completed' ? 'text-teal-100' : 'text-slate-400'}`}>คิว</span>
                </div>
                <div className={`mt-1 text-2xs font-semibold ${filterStatus === 'Completed' ? 'text-teal-100' : 'text-teal-600'}`}>
                  {filterStatus === 'Completed' ? '● กำลังแสดงเฉพาะตรวจรับแล้ว' : '● ปิดงานเข้าคลังเรียบร้อย'}
                </div>
              </button>
            </div>

            {/* ⚠️ Overdue Queues Alert Banner */}
            {systemOverdueCount > 0 && (
              <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-0.5 rounded-3xl shadow-md no-print animate-in fade-in duration-200">
                <div className="bg-amber-50/95 backdrop-blur-sm rounded-[22px] p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-md text-2xs font-extrabold tracking-wide uppercase">
                          แจ้งเตือนด่วน
                        </span>
                        <span className="text-xs text-amber-900 font-bold">
                          คิวเลยกำหนดเวลา ({systemOverdueCount} คิว)
                        </span>
                      </div>
                      <h4 className="text-sm sm:text-base font-extrabold text-amber-950 mt-0.5">
                        มีรายการจองคิวที่เลยกำหนดเวลาส่งแล้ว แต่ยังไม่เสร็จสิ้น
                      </h4>
                      <p className="text-xs text-amber-800">
                        ระบบยังคงรักษาสถานะคิวไว้ตามเดิม (ไม่ปฏิเสธคิวอัตโนมัติ) เพื่อให้เจ้าหน้าที่ตรวจสอบหรือรับสินค้าได้ตามความเหมาะสม
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setFilterDate('All');
                        setFilterStatus('Overdue');
                      }}
                      className="w-full md:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-sm flex items-center justify-center gap-2"
                    >
                      <Filter className="w-4 h-4" />
                      <span>ดูคิวที่เลยเวลา ({systemOverdueCount})</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Filters & Actions Bar */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 sm:gap-4 no-print">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {/* Date Filter Quick Buttons & Picker */}
                <div className="flex flex-wrap items-center gap-1 bg-slate-50 border border-slate-200 p-1 sm:p-1.5 rounded-2xl w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setFilterDate('All')}
                    className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition flex-1 sm:flex-initial text-center ${
                      filterDate === 'All' || !filterDate
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📅 ทุกวัน
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterDate(getTodayStr())}
                    className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition flex-1 sm:flex-initial text-center ${
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
                    className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition flex-1 sm:flex-initial text-center ${
                      filterDate === getTomorrowStr()
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    พรุ่งนี้
                  </button>

                  <div className="w-full sm:w-44 border-t sm:border-t-0 sm:border-l border-slate-200 pt-1 sm:pt-0 sm:pl-1.5">
                    <ThaiDatePicker
                      value={filterDate === 'All' ? '' : filterDate}
                      onChange={(date) => setFilterDate(date || 'All')}
                      disableSundays={false}
                      placeholder="ระบุวัน (พ.ศ.)"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 sm:py-2.5 rounded-2xl w-full sm:w-auto">
                  <Filter className="w-4 h-4 text-slate-500 shrink-0" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-transparent text-xs sm:text-sm font-bold text-slate-800 focus:outline-none w-full"
                  >
                    <option value="All">ทุกสถานะ</option>
                    <option value="Overdue">⚠️ คิวเลยเวลานัด {systemOverdueCount > 0 ? `(${systemOverdueCount})` : ''}</option>
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
              <div className="flex items-center gap-2 w-full xl:w-auto">
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  className="px-3.5 sm:px-4 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 shadow-sm whitespace-nowrap shrink-0"
                  title="เปิดกล้องสแกน QR Code ตรวจคิว"
                >
                  <Camera className="w-4 h-4" />
                  <span>สแกน QR</span>
                </button>

                <div className="relative flex-1 xl:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ค้นหา ID, ขนส่ง, ผู้ส่ง, ทะเบียน..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  onClick={() => fetchBookings(false)}
                  disabled={loadingBookings && bookings.length === 0}
                  className="p-2 sm:p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition shrink-0"
                  title="รีเฟรชข้อมูล"
                >
                  <RefreshCw className={`w-4 h-4 ${(loadingBookings || isRevalidating) ? 'animate-spin text-emerald-600' : ''}`} />
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
                  <p className="text-xs text-slate-500 flex items-center gap-2">
                    <span>พบทั้งหมด {bookings.length} รายการ</span>
                    {isRevalidating && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        กำลังอัปเดตข้อมูล...
                      </span>
                    )}
                  </p>
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

                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={handleDownloadBackup}
                      disabled={isBackingUp}
                      className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                      title="สำรองข้อมูลระบบทั้งหมดเป็นไฟล์ JSON (เฉพาะ Super Admin)"
                    >
                      <Download className={`w-3.5 h-3.5 text-indigo-600 ${isBackingUp ? 'animate-bounce' : ''}`} />
                      <span>{isBackingUp ? 'กำลังสำรอง...' : 'สำรองข้อมูล'}</span>
                    </button>
                  )}

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

              {loadingBookings && bookings.length === 0 ? (
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
                <div className="space-y-3">
                  {/* Batch Action Bar for Super Admin */}
                  {isSuperAdmin && selectedBookingIds.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-2 duration-150 no-print">
                      <div className="flex items-center gap-2 text-amber-900 text-xs font-bold">
                        <span className="w-6 h-6 rounded-full bg-amber-200 text-amber-950 flex items-center justify-center font-mono text-xs font-extrabold">
                          {selectedBookingIds.length}
                        </span>
                        <span>เลือกรายการจองอยู่ {selectedBookingIds.length} รายการ</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedBookingIds([])}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition"
                        >
                          ยกเลิกการเลือก
                        </button>
                        <button
                          type="button"
                          onClick={openBatchDeleteModal}
                          className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>ลบรายการที่เลือก ({selectedBookingIds.length})</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm sm:text-base">
                      <thead>
                        <tr className="bg-slate-100/90 text-slate-800 font-bold border-b border-slate-200 text-xs sm:text-sm">
                          {isSuperAdmin && (
                            <th className="py-4 px-3 text-center w-10 no-print">
                              <input
                                type="checkbox"
                                checked={bookings.length > 0 && bookings.every((b) => selectedBookingIds.includes(b.booking_id))}
                                onChange={handleToggleSelectAll}
                                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                                title="เลือกทั้งหมด / ยกเลิกทั้งหมด"
                              />
                            </th>
                          )}
                          <th className="py-4 px-4">Booking ID</th>
                          <th className="py-4 px-4">วันที่ & รอบเวลานัดหมาย</th>
                          <th className="py-4 px-4">บริษัทขนส่ง</th>
                          <th className="py-4 px-4">เจ้าของสินค้า / ผู้ส่ง</th>
                          <th className="py-4 px-4 text-center">จำนวนลัง</th>
                          <th className="py-4 px-4">สถานะ</th>
                          <th className="py-4 px-4 text-center no-print">การจัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bookings.map((item) => (
                          <tr
                            key={item.booking_id}
                            onClick={() => setSelectedBooking(item)}
                            className={`cursor-pointer hover:bg-emerald-50/40 transition ${
                              selectedBookingIds.includes(item.booking_id) ? 'bg-amber-50/50' : ''
                            }`}
                          >
                            {isSuperAdmin && (
                              <td className="py-4 px-3 text-center no-print" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selectedBookingIds.includes(item.booking_id)}
                                  onChange={() => handleToggleSelectBooking(item.booking_id)}
                                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                                />
                              </td>
                            )}
                            <td className="py-4 px-4 font-mono font-extrabold text-slate-900 text-sm sm:text-base">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{item.booking_id}</span>
                              {(() => {
                                const allPhotos = [
                                  ...(item.photo_urls && item.photo_urls.length > 0 ? item.photo_urls : (item.photo_url ? [item.photo_url] : [])),
                                  ...(item.receiving_photo_urls && item.receiving_photo_urls.length > 0 ? item.receiving_photo_urls : (item.receiving_photo_url ? [item.receiving_photo_url] : []))
                                ];
                                if (allPhotos.length === 0) return null;
                                return (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setGalleryImages(allPhotos);
                                      setGalleryIndex(0);
                                      setGalleryTitle(`รูปภาพประกอบคิว - ${item.booking_id}`);
                                      setGalleryOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 text-xs font-sans font-bold transition"
                                    title="คลิกเพื่อเปิดดูรูปภาพแนบทั้งหมด"
                                  >
                                    <ImageIcon className="w-3.5 h-3.5 text-teal-600" />
                                    <span>รูปแนบ ({allPhotos.length})</span>
                                  </button>
                                );
                              })()}
                            </div>
                          </td>
                          <td className="py-4 px-4 font-semibold text-slate-800 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-slate-900 font-bold text-sm">
                              <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>{formatThaiShortDate(item.requested_date)}</span>
                            </div>
                            <div className="text-xs sm:text-sm text-slate-600 font-medium flex items-center gap-1.5 mt-0.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{item.requested_time}</span>
                            </div>
                            {item.created_at && (
                              <div className="text-[11px] text-slate-500 font-normal flex items-center gap-1 mt-1.5 pt-1 border-t border-slate-100">
                                <Send className="w-3 h-3 text-indigo-500 shrink-0" />
                                <span>จองเมื่อ: <strong className="font-mono text-slate-700 font-semibold">{formatThaiDateTime(item.created_at)}</strong></span>
                              </div>
                            )}
                            {isBookingOverdue(item) && (
                              <div className="mt-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-extrabold bg-amber-100 border border-amber-300 text-amber-900 animate-pulse">
                                  <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                  <span>เลยเวลานัด</span>
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <span className="font-bold text-slate-900 block text-sm sm:text-base">{item.carrier_name}</span>
                            <span className="text-xs text-slate-500 font-medium">{item.user_phone}</span>
                          </td>
                          <td className="py-4 px-4 font-bold text-slate-800 text-sm sm:text-base">
                            {item.client_name}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="font-extrabold text-slate-900 text-sm sm:text-base">
                              {item.pallet_count} ลัง <span className="text-xs font-normal text-slate-500">({item.vehicle_count} คัน)</span>
                            </div>
                            {item.actual_pallet_count !== undefined && item.actual_pallet_count !== null && (
                              <div className="mt-1 flex justify-center">
                                {item.actual_pallet_count < item.pallet_count ? (
                                  <span
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-300 text-amber-950 text-xs font-bold shadow-2xs cursor-help"
                                    title={item.receiving_notes ? `หมายเหตุ: ${item.receiving_notes}` : `สินค้ามาไม่ครบ (ขาด ${item.pallet_count - item.actual_pallet_count} ลัง)`}
                                  >
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>รับจริง {item.actual_pallet_count} ลัง (ขาด {item.pallet_count - item.actual_pallet_count})</span>
                                  </span>
                                ) : item.actual_pallet_count > item.pallet_count ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-100 border border-blue-300 text-blue-950 text-xs font-bold">
                                    <span>รับจริง {item.actual_pallet_count} ลัง (+{item.actual_pallet_count - item.pallet_count})</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-950 text-xs font-bold">
                                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>รับครบ {item.actual_pallet_count} ลัง</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap">
                            {getStatusBadge(item.status)}
                          </td>
                          <td className="py-3 px-3 text-center no-print" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {/* 1. If Pending: 1-Click Approve or Reject */}
                              {!isSecurityOnly && item.status === 'Pending' && (
                                <>
                                  <button
                                    onClick={() => handleApprove(item)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition shrink-0"
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
                                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition shrink-0"
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
                                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1 shrink-0"
                                    title="เริ่มตรวจนับและลงสินค้า"
                                  >
                                    <Package className="w-3.5 h-3.5" />
                                    <span>เริ่มลงของ</span>
                                  </button>
                                  <button
                                    onClick={() => openCompleteModal(item)}
                                    className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1 shrink-0"
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
                                  className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1 shrink-0"
                                  title="ตรวจนับสินค้าและบันทึกปิดงานเสร็จสิ้น"
                                >
                                  <CheckCheck className="w-3.5 h-3.5" />
                                  <span>ตรวจรับเสร็จสิ้น</span>
                                </button>
                              )}

                               {/* Delete Booking (Super Admin Only) */}
                              {isSuperAdmin && (
                                <button
                                  type="button"
                                  onClick={() => openSingleDeleteModal(item)}
                                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition shrink-0"
                                  title="ลบรายการจองคิวนี้ (เฉพาะ Super Admin)"
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
              </div>
            )}
          </div>
          </div>
        )}

        {/* 🌟 TAB 2: CAPACITY & TIME SLOTS */}
        {!isSecurityOnly && activeTab === 'capacity' && (
          <div className="space-y-6">
            {/* Mode Switcher Tabs */}
            <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/90 border border-slate-200/80 rounded-2xl w-fit">
              <button
                type="button"
                onClick={() => setCapacityMode('standard')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                  capacityMode === 'standard'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>🌐 รอบเวลามาตรฐาน (ใช้กับทุกวัน)</span>
              </button>

              <button
                type="button"
                onClick={() => setCapacityMode('daily')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                  capacityMode === 'daily'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                <span>📅 กำหนดเฉพาะวัน (รายวัน)</span>
                {Object.keys(dailyOverrides).length > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      capacityMode === 'daily' ? 'bg-white text-emerald-700' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {Object.keys(dailyOverrides).length} วันพิเศษ
                  </span>
                )}
              </button>
            </div>

            {/* MODE 1: STANDARD (GLOBAL) TEMPLATE */}
            {capacityMode === 'standard' && (
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
                {/* Real-time & Permanent Effect Rule Notice */}
                <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-start gap-3.5 text-xs text-emerald-900">
                  <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0 mt-0.5">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <strong className="block text-sm text-emerald-950 font-bold">
                      ⚡ รอบเวลามาตรฐานหลัก (มีผลกับทุกวันเปิดทำการทั่วไป)
                    </strong>
                    <p className="text-slate-600 leading-relaxed">
                      รอบเวลาและความจุที่กำหนดที่นี่ จะเป็นค่าเริ่มต้นของ <strong>ทุกวันเปิดทำการ (จันทร์-เสาร์)</strong> ในระบบการจอง หากต้องการเปิด-ปิดรอบหรือปรับความจุเจาะจงเฉพาะวันใดวันหนึ่ง ให้สลับไปที่แท็บ <strong>&ldquo;📅 กำหนดเฉพาะวัน (รายวัน)&rdquo;</strong> ด้านบน
                    </p>
                  </div>
                </div>

                {/* Header and Action Tools */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">ตั้งค่ารอบเวลามาตรฐานหลัก</h3>
                    <p className="text-xs text-slate-500">กำหนดช่วงเวลาและจำนวนคิวมาตรฐานสำหรับใช้งานในวันทำการทั่วไป</p>
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
                          <span>ความจุมาตรฐาน</span>
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

            {/* MODE 2: DAILY CUSTOM OVERRIDES */}
            {capacityMode === 'daily' && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
                  {/* Banner Notice */}
                  <div className="p-4 bg-teal-50/90 border border-teal-200 rounded-2xl flex items-start gap-3.5 text-xs text-teal-950">
                    <div className="p-2 bg-teal-600 text-white rounded-xl shrink-0 mt-0.5">
                      <CalendarDays className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <strong className="block text-sm text-teal-950 font-bold">
                        📅 กำหนดรอบเวลาและความจุเฉพาะวัน (Daily Custom Overrides)
                      </strong>
                      <p className="text-slate-600 leading-relaxed">
                        เลือกวันที่ต้องการเจาะจง เพื่อเปิด/ปิดรอบเวลา หรือปรับเพิ่ม/ลดจำนวนความจุสูงสุด (คิว) เฉพาะวันนั้นๆ โดย <strong>ไม่มีผลกระทบต่อวันอื่นๆ</strong> (หากไม่ได้ปรับแต่งเฉพาะวัน ระบบจะใช้รอบเวลามาตรฐานโดยอัตโนมัติ)
                      </p>
                    </div>
                  </div>

                  {/* Date Selector & Day Status Header */}
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">เลือกวันที่ต้องการตั้งค่า:</span>
                      <button
                        type="button"
                        onClick={() => setSelectedDailyDate(getTodayStr())}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                          selectedDailyDate === getTodayStr()
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        วันนี้
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedDailyDate(getTomorrowStr())}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                          selectedDailyDate === getTomorrowStr()
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        พรุ่งนี้
                      </button>
                      <div className="w-44">
                        <ThaiDatePicker
                          value={selectedDailyDate}
                          onChange={(d) => d && setSelectedDailyDate(d)}
                          disableSundays={false}
                          placeholder="เลือกวัน (พ.ศ.)"
                        />
                      </div>
                    </div>

                    {/* Status Badge & Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      {hasDailyOverride ? (
                        <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span>✨ มีการตั้งค่าพิเศษเฉพาะวันนี้</span>
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>🟢 ใช้อยู่: ค่ามาตรฐานทั่วไป</span>
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={handleBatchDailyCapacity}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                        title="ปรับความจุทุกรอบของวันนี้ให้เท่ากัน"
                      >
                        <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                        <span>ปรับความจุทุกรอบเท่ากัน</span>
                      </button>

                      {hasDailyOverride && (
                        <button
                          type="button"
                          onClick={() => handleResetDailySlots(selectedDailyDate)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                          title="ลบการตั้งค่าเฉพาะวัน คืนค่ากลับเป็นรอบเวลามาตรฐาน"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                          <span>คืนค่าเป็นมาตรฐาน</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Day Date Header Banner */}
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <div>
                      <h4 className="text-base font-bold text-slate-900">
                        รอบเวลาประจำ: <span className="text-emerald-700 font-extrabold">{formatThaiDate(selectedDailyDate)}</span>
                      </h4>
                      <p className="text-xs text-slate-500">
                        {hasDailyOverride
                          ? 'รอบเวลานี้ถูกปรับแต่งเฉพาะวัน หากแก้ไขจะมีผลเจาะจงเฉพาะวันที่เลือกนี้เท่านั้น'
                          : 'กำลังแสดงผลตามรอบเวลามาตรฐาน หากแก้ไขสวิตช์เปิด/ปิด หรือความจุ จะถูกบันทึกเป็นการตั้งค่าพิเศษของวันนี้ทันที'}
                      </p>
                    </div>
                  </div>

                  {/* Daily Time Slot Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {currentDailySlots.map((slot) => (
                      <div
                        key={`daily-${selectedDailyDate}-${slot.id}`}
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

                          <label className="flex items-center gap-1 text-xs font-bold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={slot.is_active === 1}
                              onChange={(e) => handleDailySlotChange(slot.id, slot.max_capacity, e.target.checked)}
                              className="w-4 h-4 text-emerald-600 rounded"
                            />
                            <span className={slot.is_active === 1 ? 'text-emerald-700' : 'text-slate-400'}>
                              {slot.is_active === 1 ? 'เปิด' : 'ปิด'}
                            </span>
                          </label>
                        </div>

                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                            <span>ความจุเฉพาะวันนี้</span>
                            <span className="text-emerald-700 font-bold">{slot.max_capacity} คิว/รอบ</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={slot.max_capacity <= 1}
                              onClick={() => handleDailySlotChange(slot.id, Math.max(1, slot.max_capacity - 1), slot.is_active === 1)}
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
                                  handleDailySlotChange(slot.id, val, slot.is_active === 1);
                                }
                              }}
                              className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-center text-slate-900 focus:ring-2 focus:ring-emerald-500 text-sm"
                            />

                            <button
                              type="button"
                              onClick={() => handleDailySlotChange(slot.id, slot.max_capacity + 1, slot.is_active === 1)}
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

                {/* Summary Card of All Configured Overrides */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        <span>รายการวันที่มีการตั้งค่ารอบเวลาพิเศษล่วงหน้า (Active Date Overrides)</span>
                      </h4>
                      <p className="text-xs text-slate-500">วันที่มีการปรับแต่งเฉพาะกิจ จะแสดงในรายการนี้ สามารถคลิกเพื่อดูหรือคืนค่าเป็นมาตรฐานได้</p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
                      {Object.keys(dailyOverrides).length} วัน
                    </span>
                  </div>

                  {Object.keys(dailyOverrides).length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      ยังไม่มีวันใดในระบบที่ถูกตั้งค่ารอบเวลาพิเศษ (ทุกวันเปิดทำการใช้รอบเวลามาตรฐานทั้งหมด)
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Object.entries(dailyOverrides)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([overrideDate, oSlots]) => {
                          const openSlotsCount = oSlots.filter((s) => s.is_active === 1).length;
                          const totalSlotsCount = oSlots.length;
                          const isSelected = selectedDailyDate === overrideDate;
                          return (
                            <div
                              key={overrideDate}
                              onClick={() => setSelectedDailyDate(overrideDate)}
                              className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                                isSelected
                                  ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-400/30'
                                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                              }`}
                            >
                              <div className="min-w-0">
                                <span className="block font-bold text-sm text-slate-900 truncate">
                                  {formatThaiDate(overrideDate)}
                                </span>
                                <span className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                                  <span className={openSlotsCount < totalSlotsCount ? 'text-amber-700 font-bold' : 'text-emerald-700'}>
                                    เปิด {openSlotsCount}/{totalSlotsCount} รอบ
                                  </span>
                                  <span>•</span>
                                  <span>{overrideDate}</span>
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleResetDailySlots(overrideDate);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                  title="คืนค่าเป็นมาตรฐาน"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            )}
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

        {/* 🌟 TAB 5: AUDIT LOGS (ประวัติความปลอดภัย - เฉพาะ Super Admin) */}
        {isSuperAdmin && activeTab === 'audit' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  บันทึกประวัติการกระทำและความปลอดภัย (Audit Trail)
                </h3>
                <p className="text-xs text-slate-500">บันทึกการเข้าสู่ระบบ, การอนุมัติคิว, ปฏิเสธคิว และการตั้งค่าระบบ</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="file"
                  ref={restoreFileInputRef}
                  accept=".json,application/json"
                  onChange={handleSelectRestoreFile}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => restoreFileInputRef.current?.click()}
                  className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                  title="นำเข้าไฟล์สำรองเพื่อกู้คืนระบบ (Restore JSON)"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-amber-700" />
                  <span>นำเข้ากู้คืนข้อมูล (Restore)</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  disabled={isBackingUp}
                  className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                  title="ดาวน์โหลดไฟล์สำรองข้อมูลระบบทั้งหมด (Backup JSON)"
                >
                  <Download className={`w-3.5 h-3.5 text-indigo-600 ${isBackingUp ? 'animate-bounce' : ''}`} />
                  <span>{isBackingUp ? 'กำลังสำรอง...' : 'สำรองข้อมูล (Backup JSON)'}</span>
                </button>
                <button
                  onClick={fetchAuditLogs}
                  disabled={loadingAudit}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingAudit ? 'animate-spin text-emerald-600' : ''}`} />
                  <span>รีเฟรชประวัติ</span>
                </button>
              </div>
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

        {/* 🌟 TAB 6: DYNAMIC SYSTEM SETTINGS & CONTACTS */}
        {canManageSettings && activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <Settings className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900">จัดการข้อมูลติดต่อและประกาศระบบ</h2>
                    <span className="px-2 py-0.5 rounded-full text-2xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                      👑 Super Admin เท่านั้น
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    แก้ไขหมายเลขโทรศัพท์, บัญชี LINE, ข้อความชี้แจงหน้าจองคิว, คำแนะนำบนบัตรคิว และแถบประกาศแจ้งเตือน โดยมีผลใช้งานทันทีทั่วทั้งระบบ
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                <button
                  type="button"
                  onClick={fetchSettings}
                  disabled={isSavingSettings}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>คืนค่าล่าสุด</span>
                </button>
              </div>
            </div>

            {/* Main Form */}
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* 1. ข้อความหัวเรื่องและแบรนด์หน้าแรก */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 text-slate-900">
                    <Sparkles className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h3 className="text-sm font-black">1. ข้อความหัวเรื่องและแบรนด์หน้าแรก (Hero Banner)</h3>
                      <p className="text-2xs text-slate-400">แก้ไขข้อความบนป้ายเขียวส่วนหัวของหน้าจองคิว</p>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">
                        ป้ายข้อความเล็กด้านบน (Badge)
                      </label>
                      <input
                        type="text"
                        value={systemSettings.hero_badge || ''}
                        onChange={(e) => setSystemSettings({ ...systemSettings, hero_badge: e.target.value })}
                        placeholder="เช่น ระบบจองคิวออนไลน์ Serverless • สะดวก รวดเร็ว"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">
                        หัวข้อหลักหน้าจองคิว (Title) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={systemSettings.hero_title || ''}
                        onChange={(e) => setSystemSettings({ ...systemSettings, hero_title: e.target.value })}
                        placeholder="เช่น จองคิวเข้าส่งสินค้า"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">
                        คำบรรยายใต้หัวข้อ / ชื่อบริษัท (Subtitle)
                      </label>
                      <input
                        type="text"
                        value={systemSettings.hero_subtitle || ''}
                        onChange={(e) => setSystemSettings({ ...systemSettings, hero_subtitle: e.target.value })}
                        placeholder="เช่น บริษัท พีทีเอ็น ฟาร์มาเซ็นเตอร์ จำกัด (พัฒนาเภสัช)"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. ข้อมูลการติดต่อหน้าบ้าน */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 text-slate-900">
                    <Phone className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h3 className="text-sm font-black">2. ข้อมูลการติดต่อหลัก (Public Contact)</h3>
                      <p className="text-2xs text-slate-400">แสดงบนแถบเมนูด้านบนและส่วนหัวของหน้าจองคิว</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-bold text-slate-700">
                        ป้ายกำกับเบอร์โทรหลัก <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={systemSettings.contact_phone_label}
                        onChange={(e) => setSystemSettings({ ...systemSettings, contact_phone_label: e.target.value })}
                        placeholder="เช่น ติดต่อคลังสินค้า / สอบถามคิว"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-bold text-slate-700">
                        เบอร์โทรศัพท์หลัก <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={systemSettings.contact_phone}
                        onChange={(e) => setSystemSettings({ ...systemSettings, contact_phone: e.target.value })}
                        placeholder="เช่น 02-123-4567 หรือ 081-234-5678"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">
                        ป้ายกำกับเบอร์สำรอง (ถ้ามี)
                      </label>
                      <input
                        type="text"
                        value={systemSettings.contact_phone_sub_label || ''}
                        onChange={(e) => setSystemSettings({ ...systemSettings, contact_phone_sub_label: e.target.value })}
                        placeholder="เช่น สอบถามคิวเร่งด่วน"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">
                        เบอร์โทรศัพท์สำรอง (ถ้ามี)
                      </label>
                      <input
                        type="text"
                        value={systemSettings.contact_phone_sub || ''}
                        onChange={(e) => setSystemSettings({ ...systemSettings, contact_phone_sub: e.target.value })}
                        placeholder="เช่น 089-999-8888"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">
                        LINE Official ID <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={systemSettings.contact_line_id}
                        onChange={(e) => setSystemSettings({ ...systemSettings, contact_line_id: e.target.value })}
                        placeholder="เช่น @ptnpharma"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">
                        ลิงก์ LINE (Add Friend URL) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="url"
                        required
                        value={systemSettings.contact_line_url}
                        onChange={(e) => setSystemSettings({ ...systemSettings, contact_line_url: e.target.value })}
                        placeholder="เช่น https://line.me/R/ti/p/@ptnpharma"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-700 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. ประกาศและข้อความชี้แจงหน้าจองคิว */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 text-slate-900">
                    <Bell className="w-5 h-5 text-amber-500" />
                    <div>
                      <h3 className="text-sm font-black">3. ประกาศและข้อตกลงหน้าจองคิว (Booking Page)</h3>
                      <p className="text-2xs text-slate-400">ควบคุมแถบประกาศด่วนสีส้มและข้อกำหนดขั้นตอนที่ 1</p>
                    </div>
                  </div>

                  {/* แถบประกาศด่วน */}
                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <label className="text-xs font-extrabold text-amber-950">
                          แถบประกาศด่วน / ฉุกเฉิน หน้าจองคิว
                        </label>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={systemSettings.booking_announcement_active}
                          onChange={(e) => setSystemSettings({ ...systemSettings, booking_announcement_active: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                        <span className="ml-2 text-2xs font-bold text-amber-900">
                          {systemSettings.booking_announcement_active ? 'เปิดแสดงผล' : 'ปิดการแสดง'}
                        </span>
                      </label>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-2xs text-amber-800 font-medium">
                        ข้อความนี้จะแสดงเป็นแถบประกาศขนาดใหญ่พิเศษและสะดุดตาบนหน้าจองคิวสำหรับผู้มาติดต่อทุกคน
                      </p>
                      <textarea
                        rows={3}
                        value={systemSettings.booking_announcement || ''}
                        onChange={(e) => setSystemSettings({ ...systemSettings, booking_announcement: e.target.value })}
                        placeholder="ตัวอย่าง: รบกวนถ่ายรูปบิลส่งของ หรือสินค้า เข้ามาด้วยนะครับ"
                        className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-sm sm:text-base font-bold text-amber-950 focus:ring-2 focus:ring-amber-500 shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* ข้อกำหนดและเงื่อนไขหน้าจองคิว */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">
                      ข้อกำหนด/เงื่อนไขการส่งสินค้า (แสดงขั้นตอนที่ 1) <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={systemSettings.booking_notice_text}
                      onChange={(e) => setSystemSettings({ ...systemSettings, booking_notice_text: e.target.value })}
                      placeholder="เช่น กรุณามาถึงก่อนเวลา 15 นาที และเตรียมเอกสารใบส่งของให้พร้อม..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* 4. ข้อมูลบัตรคิวและที่ตั้งคลังสินค้า */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 text-slate-900">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h3 className="text-sm font-black">4. บัตรคิวและข้อมูลคลังสินค้า (Ticket & Warehouse)</h3>
                      <p className="text-2xs text-slate-400">แสดงบนบัตรคิวของผู้ขับรถและเอกสารสรุป</p>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">
                        ชื่อบริษัท / สถานที่ <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={systemSettings.company_name}
                        onChange={(e) => setSystemSettings({ ...systemSettings, company_name: e.target.value })}
                        placeholder="เช่น บริษัท พีทีเอ็น ฟาร์มาเซ็นเตอร์ จำกัด"
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">
                        คำแนะนำสำหรับคนขับรถบนบัตรคิว (Ticket Instructions)
                      </label>
                      <textarea
                        rows={2}
                        value={systemSettings.ticket_instruction || ''}
                        onChange={(e) => setSystemSettings({ ...systemSettings, ticket_instruction: e.target.value })}
                        placeholder="เช่น กรุณาแสดง QR Code นี้แก่เจ้าหน้าที่ตรวจสอบคิวส่ง ณ จุดคัดกรองหน้าประตูทางเข้า"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">
                        ที่อยู่คลังสินค้า
                      </label>
                      <textarea
                        rows={2}
                        value={systemSettings.warehouse_address}
                        onChange={(e) => setSystemSettings({ ...systemSettings, warehouse_address: e.target.value })}
                        placeholder="เช่น คลังสินค้า บจก. พีทีเอ็น ฟาร์มาเซ็นเตอร์..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. ประกาศภายในสำหรับเจ้าหน้าที่ */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 text-slate-900">
                    <ShieldCheck className="w-5 h-5 text-cyan-600" />
                    <div>
                      <h3 className="text-sm font-black">5. ประกาศภายในสำหรับเจ้าหน้าที่ (Admin Dashboard)</h3>
                      <p className="text-2xs text-slate-400">แสดงแถบเตือนสีส้มด้านบนของหน้า Admin นี้ ให้เจ้าหน้าที่ทุกคนเห็น</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-cyan-50/60 border border-cyan-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-cyan-700" />
                        <label className="text-xs font-extrabold text-cyan-950">
                          แถบประกาศภายในสำหรับทีมงานคลัง
                        </label>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={systemSettings.admin_announcement_active}
                          onChange={(e) => setSystemSettings({ ...systemSettings, admin_announcement_active: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600"></div>
                        <span className="ml-2 text-2xs font-bold text-cyan-900">
                          {systemSettings.admin_announcement_active ? 'เปิดแสดงผล' : 'ปิดการแสดง'}
                        </span>
                      </label>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-2xs text-cyan-900 font-medium">
                        ข้อความนี้จะแสดงเป็นแถบประกาศขนาดใหญ่พิเศษและสะดุดตาบนหน้า Admin Dashboard ให้เจ้าหน้าที่ทุกคนเห็น
                      </p>
                      <textarea
                        rows={3}
                        value={systemSettings.admin_announcement || ''}
                        onChange={(e) => setSystemSettings({ ...systemSettings, admin_announcement: e.target.value })}
                        placeholder="ตัวอย่าง: รับสินค้าเสร็จแล้ว ถ่ายรูปสินค้า หรือ บิล แนบมาให้ด้วยนะครับ"
                        className="w-full px-3.5 py-2.5 bg-white border border-cyan-300 rounded-xl text-sm sm:text-base font-bold text-cyan-950 focus:ring-2 focus:ring-cyan-500 shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* 7. LIVE PREVIEW PANEL */}
              <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-md space-y-4">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Sparkles className="w-5 h-5" />
                  <h3 className="text-sm font-extrabold tracking-wide">ตัวอย่างการแสดงผลจริง (Real-Time Live Preview)</h3>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Hero Banner Live Preview */}
                  <div>
                    <span className="text-2xs text-slate-400 block mb-1.5 font-bold">ตัวอย่างส่วนหัวของหน้าจองคิว (Hero Banner Preview):</span>
                    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-800 to-slate-900 rounded-2xl p-5 text-white shadow-md border border-emerald-600/40">
                      <div className="relative z-10 space-y-3">
                        <div className="inline-flex items-center gap-1.5 bg-emerald-500/30 border border-emerald-400/40 rounded-full px-3 py-0.5 text-xs font-semibold text-emerald-100 backdrop-blur">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                          <span>{systemSettings.hero_badge || 'ระบบจองคิวออนไลน์ Serverless • สะดวก รวดเร็ว'}</span>
                        </div>
                        <div>
                          <h4 className="text-lg sm:text-xl font-extrabold tracking-tight">
                            {systemSettings.hero_title || 'จองคิวเข้าส่งสินค้า'}
                          </h4>
                          <p className="text-emerald-100/90 text-xs mt-0.5 font-normal">
                            {systemSettings.hero_subtitle || systemSettings.company_name || 'บริษัท พีทีเอ็น ฟาร์มาเซ็นเตอร์ จำกัด (พัฒนาเภสัช)'}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-emerald-200/90">
                          <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> ไม่ต้องสมัครสมาชิก</span>
                          <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> ตรวจสอบสล็อตว่าง Real-time</span>
                          <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-emerald-400" /> รับบัตรคิวพร้อม QR Code ทันที</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Emergency Banner Preview */}
                  {systemSettings.booking_announcement_active && systemSettings.booking_announcement && (
                    <div>
                      <span className="text-2xs text-slate-400 block mb-1 font-bold">ตัวอย่างแถบประกาศบนหน้าจองคิว (Public Banner Preview):</span>
                      <div className="relative overflow-hidden bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-2xl p-4 text-white shadow-md border border-amber-300">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white text-amber-600 flex items-center justify-center shrink-0 shadow-sm">
                            <Bell className="w-5 h-5 text-amber-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold uppercase">
                                ประกาศสำคัญจากคลังสินค้า
                              </span>
                              <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                                แจ้งเตือน
                              </span>
                            </div>
                            <p className="text-sm sm:text-base font-black text-white leading-snug truncate">
                              {systemSettings.booking_announcement}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Public Contact Strip Preview */}
                  <div>
                    <span className="text-2xs text-slate-400 block mb-1">ตัวอย่างแถบข้อมูลติดต่อในหน้าจองคิว (Hero Contact Strip):</span>
                    <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/80 flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2 bg-slate-700/60 px-3 py-1.5 rounded-xl border border-slate-600/60 text-slate-200">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{systemSettings.contact_phone_label}: <strong className="text-white font-mono">{systemSettings.contact_phone}</strong></span>
                      </div>
                      {systemSettings.contact_phone_sub && (
                        <div className="flex items-center gap-2 bg-slate-700/60 px-3 py-1.5 rounded-xl border border-slate-600/60 text-slate-200">
                          <Phone className="w-3.5 h-3.5 text-amber-400" />
                          <span>{systemSettings.contact_phone_sub_label || 'เบอร์สำรอง'}: <strong className="text-white font-mono">{systemSettings.contact_phone_sub}</strong></span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 bg-[#06C755]/20 text-[#06C755] px-3 py-1.5 rounded-xl border border-[#06C755]/30 font-bold">
                        <span>LINE: {systemSettings.contact_line_id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Admin Banner Preview */}
                  {systemSettings.admin_announcement_active && systemSettings.admin_announcement && (
                    <div>
                      <span className="text-2xs text-slate-400 block mb-1 font-bold">ตัวอย่างแถบประกาศภายในสำหรับเจ้าหน้าที่ (Admin Banner Preview):</span>
                      <div className="relative overflow-hidden bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-2xl p-4 text-white shadow-md border border-amber-300">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white text-amber-600 flex items-center justify-center shrink-0 shadow-sm">
                            <Bell className="w-5 h-5 text-amber-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold uppercase">
                                ประกาศภายในสำหรับเจ้าหน้าที่
                              </span>
                              <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                                สำคัญ
                              </span>
                            </div>
                            <p className="text-sm sm:text-base font-black text-white leading-snug truncate">
                              {systemSettings.admin_announcement}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Bar */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-500">
                  ⚠️ เมื่อคลิกบันทึก ข้อมูลจะถูกอัปเดตลงระบบและบันทึกประวัติการเปลี่ยนแปลงลงใน <strong className="text-slate-700">Audit Logs</strong>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={fetchSettings}
                    disabled={isSavingSettings}
                    className="flex-1 sm:flex-none px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                  >
                    ยกเลิกการแก้ไข
                  </button>

                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="flex-1 sm:flex-none px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {isSavingSettings ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>กำลังบันทึกข้อมูล...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>บันทึกการเปลี่ยนแปลงทั้งหมด</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* 🌟 TAB 7: LOGISTICS & WAREHOUSE ANALYTICS */}
        {canViewAnalytics && activeTab === 'analytics' && token && (
          <AdminAnalytics token={token} />
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
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
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
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
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

            {/* 📅 RESCHEDULE: Change Date & Time Slot */}
            <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  <span>กำหนดวันและรอบเวลาเข้าส่งใหม่</span>
                </label>
                {(editRequestedDate !== editingStatusBooking.requested_date || editRequestedTime !== editingStatusBooking.requested_time) && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 flex items-center gap-1 animate-pulse">
                    <Sparkles className="w-3 h-3 text-amber-700" /> มีการปรับเปลี่ยนนัดหมาย
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Date Picker */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    วันที่เข้าส่งสินค้า <span className="text-rose-500">*</span>
                  </label>
                  <ThaiDatePicker
                    value={editRequestedDate}
                    onChange={(newDate) => {
                      setEditRequestedDate(newDate);
                      fetchModalSlots(newDate);
                    }}
                    disableSundays={false}
                    placeholder="เลือกวันที่นัดหมาย"
                    className="py-2 px-3 text-xs bg-white rounded-xl"
                  />
                  {modalDateBlocked && (
                    <p className="text-[10px] text-rose-600 font-medium mt-0.5 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                      <span>{modalDateBlockReason || 'วันที่นี้ถูกปิดรับจองหรือเป็นวันหยุด'}</span>
                    </p>
                  )}
                </div>

                {/* Time Slot Picker */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                    <span>รอบเวลาเข้าส่ง <span className="text-rose-500">*</span></span>
                    {loadingModalSlots && <span className="text-[10px] text-slate-400 animate-pulse">กำลังโหลดรอบ...</span>}
                  </label>
                  <select
                    value={editRequestedTime}
                    onChange={(e) => setEditRequestedTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    {/* If current time is not in standard slots, include it as an option */}
                    {editRequestedTime && !modalSlots.some((s: any) => s.slot_name === editRequestedTime) && (
                      <option value={editRequestedTime}>
                        {editRequestedTime} (รอบเดิมของคิวนี้)
                      </option>
                    )}
                    {modalSlots.length > 0 ? (
                      modalSlots.map((s: any) => (
                        <option key={s.id || s.slot_name} value={s.slot_name}>
                          {s.slot_name} {s.booked_count !== undefined ? `(จองแล้ว ${s.booked_count}/${s.max_capacity || 4} คิว)` : ''}
                        </option>
                      ))
                    ) : (
                      slots.filter((s: any) => s.is_active !== 0).map((s: any) => (
                        <option key={s.id || s.slot_name} value={s.slot_name}>
                          {s.slot_name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Reschedule Comparison Box */}
              {(editRequestedDate !== editingStatusBooking.requested_date || editRequestedTime !== editingStatusBooking.requested_time) && (
                <div className="p-3 rounded-xl bg-amber-100/80 border border-amber-300 text-[11px] text-amber-950 space-y-1.5">
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-slate-500 line-through">
                        เดิม: {formatThaiShortDate(editingStatusBooking.requested_date)} ({editingStatusBooking.requested_time})
                      </div>
                      <div className="font-bold text-amber-950 text-xs">
                        ➔ ใหม่: {formatThaiShortDate(editRequestedDate)} ({editRequestedTime})
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-amber-800 flex items-center gap-1.5 pt-1 border-t border-amber-200 font-medium">
                    <Bell className="w-3.5 h-3.5 text-amber-700 shrink-0 animate-bounce" />
                    <span>ระบบจะส่งแจ้งเตือน Web Push ไปยังเครื่องผู้จองคิวทันทีที่บันทึกข้อมูล</span>
                  </div>
                </div>
              )}
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
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <form
            onSubmit={handleCompleteSubmit}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl sm:max-w-3xl w-full shadow-2xl space-y-6 border border-slate-200 max-h-[92vh] overflow-y-auto my-auto animate-in fade-in duration-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3 text-slate-900">
                <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold shrink-0">
                  <CheckCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg sm:text-2xl text-slate-900 tracking-tight">บันทึกตรวจรับสินค้าเสร็จสิ้น</h3>
                  <p className="text-xs sm:text-sm text-slate-500 font-mono mt-0.5">
                    Booking ID: <span className="text-teal-800 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">{completingBooking.booking_id}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCompleteModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
                title="ปิดหน้าต่าง"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Shipment Summary */}
            <div className="p-4 sm:p-5 bg-slate-50/90 rounded-2xl border border-slate-200/90 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-black text-slate-900 text-base sm:text-lg">{completingBooking.carrier_name}</span>
                <span className="px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-indigo-100 text-indigo-800">
                  กำลังลงสินค้า
                </span>
              </div>
              <div className="text-slate-600 text-xs sm:text-sm flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>ผู้ส่ง: <strong className="text-slate-800">{completingBooking.client_name}</strong></span>
                <span className="text-slate-300">|</span>
                <span>ประเภทสินค้า: <strong className="text-slate-800">{completingBooking.cargo_type || 'ยาและเวชภัณฑ์'}</strong></span>
              </div>
              <div className="text-slate-700 font-semibold text-sm sm:text-base pt-1 flex items-baseline gap-2">
                <span>ยอดที่แจ้งจองไว้:</span>
                <strong className="text-teal-700 text-lg sm:text-xl font-black">{completingBooking.pallet_count} ลัง</strong>
                <span className="text-xs sm:text-sm text-slate-500 font-normal">({completingBooking.vehicle_count} คัน)</span>
              </div>
            </div>

            {/* Actual Count Input & Quick Calculation */}
            <div className="space-y-2.5">
              <label className="text-sm sm:text-base font-bold text-slate-900 block">
                จำนวนลังที่ตรวจรับจริง (Actual Received Quantity) <span className="text-rose-500">*</span>
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <input
                  type="number"
                  min="0"
                  required
                  value={actualPalletInput}
                  onChange={(e) => setActualPalletInput(e.target.value)}
                  placeholder={`ระบุจำนวนลัง เช่น ${completingBooking.pallet_count}`}
                  className="flex-1 px-4 sm:px-5 py-3 sm:py-3.5 bg-slate-50 border-2 border-slate-300 rounded-2xl font-black font-mono text-slate-900 text-xl sm:text-2xl focus:border-teal-600 focus:bg-white focus:outline-none transition shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setActualPalletInput(completingBooking.pallet_count)}
                  className="px-5 py-3 sm:py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-sm sm:text-base font-bold transition shadow-sm hover:shadow flex items-center justify-center gap-2 whitespace-nowrap active:scale-[0.98]"
                  title="ตั้งค่าเท่ากับยอดจอง"
                >
                  <CheckCheck className="w-5 h-5" />
                  <span>รับครบ {completingBooking.pallet_count} ลัง</span>
                </button>
              </div>

              {/* Discrepancy Status Indicator */}
              {actualPalletInput !== '' && !isNaN(parseInt(String(actualPalletInput), 10)) && (
                <div className="pt-1">
                  {parseInt(String(actualPalletInput), 10) < completingBooking.pallet_count ? (
                    <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-start gap-3 text-amber-900 text-sm sm:text-base">
                      <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-bold text-amber-950 text-sm sm:text-base">⚠️ สินค้ามาไม่ครบ (Partial Delivery)</strong>
                        <span className="mt-0.5 block text-xs sm:text-sm">
                          ขาดส่งจำนวน{' '}
                          <strong className="text-rose-700 font-black text-base sm:text-lg">
                            {completingBooking.pallet_count - parseInt(String(actualPalletInput), 10)} ลัง
                          </strong>{' '}
                          (กรุณาระบุหมายเหตุการขาดส่งด้านล่าง)
                        </span>
                      </div>
                    </div>
                  ) : parseInt(String(actualPalletInput), 10) > completingBooking.pallet_count ? (
                    <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-2xl flex items-start gap-3 text-blue-900 text-sm sm:text-base">
                      <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-bold text-blue-950 text-sm sm:text-base">ℹ️ สินค้ามาเกินจำนวนที่จอง</strong>
                        <span className="mt-0.5 block text-xs sm:text-sm">
                          เกินจำนวน{' '}
                          <strong className="text-blue-800 font-black text-base sm:text-lg">
                            +{parseInt(String(actualPalletInput), 10) - completingBooking.pallet_count} ลัง
                          </strong>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex items-center gap-3 text-emerald-900 text-sm sm:text-base">
                      <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 shrink-0" />
                      <div>
                        <strong className="block font-bold text-emerald-950 text-sm sm:text-base">✅ ตรวจรับสินค้าครบถ้วนสมบูรณ์ 100%</strong>
                        <span className="text-xs sm:text-sm">ยอดรับจริงตรงตามที่แจ้งจองไว้ ({actualPalletInput} ลัง)</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Receiving Notes / Discrepancy Reason */}
            <div className="space-y-2">
              <label className="text-sm sm:text-base font-bold text-slate-900 flex items-center justify-between">
                <span>
                  หมายเหตุการตรวจรับสินค้า{' '}
                  {actualPalletInput !== '' &&
                    parseInt(String(actualPalletInput), 10) < completingBooking.pallet_count && (
                      <span className="text-rose-600 font-bold">* (จำเป็นต้องระบุสาเหตุ/เลข DO)</span>
                    )}
                </span>
                <span className="text-xs text-slate-400">บันทึกลงระบบ & รายงาน</span>
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
                className="w-full p-3.5 sm:p-4 bg-slate-50 border border-slate-300 rounded-2xl text-sm sm:text-base text-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none placeholder:text-slate-400 transition"
              />
            </div>

            {/* Warehouse Receiving Photo Attachment (up to 5 photos) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-teal-600" />
                  ถ่ายรูปสินค้าหน้างาน / เอกสารตรวจรับ (ถ้ามี)
                </label>
                <span className="text-xs sm:text-sm text-teal-700 font-bold bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                  {receivingPhotos.length}/5 รูป
                </span>
              </div>

              {/* Photo thumbnails grid */}
              {receivingPhotos.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 p-3 bg-teal-50/50 border border-teal-200 rounded-2xl">
                  {receivingPhotos.map((photo, idx) => (
                    <div
                      key={`rec-preview-${idx}`}
                      className="relative aspect-square rounded-xl overflow-hidden border-2 border-teal-300 group bg-slate-100 shadow-sm"
                    >
                      <img
                        src={photo.dataUrl}
                        alt={`ตรวจรับ ${idx + 1}`}
                        className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition"
                        onClick={() => {
                          setGalleryImages(receivingPhotos.map((p) => p.dataUrl));
                          setGalleryIndex(idx);
                          setGalleryTitle(`รูปถ่ายตรวจรับสินค้า (${idx + 1}/${receivingPhotos.length})`);
                          setGalleryOpen(true);
                        }}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeReceivingPhoto(idx);
                        }}
                        className="absolute top-1.5 right-1.5 p-1.5 bg-rose-600 text-white rounded-full hover:bg-rose-700 shadow transition"
                        title="ลบรูปนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <div className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[10px] text-center py-0.5 font-mono">
                        {photo.stats ? formatFileSize(photo.stats.compressedSize) : `รูปที่ ${idx + 1}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add photo buttons when < 5 */}
              {receivingPhotos.length < 5 && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-2xl bg-slate-50 hover:bg-teal-50/50 cursor-pointer transition text-center group">
                    <Camera className="w-6 h-6 text-slate-400 group-hover:text-teal-600 mb-1.5" />
                    <span className="text-sm sm:text-base font-bold text-slate-800 group-hover:text-teal-700">ถ่ายรูปทันที</span>
                    <span className="text-xs text-slate-400 mt-0.5">เปิดกล้องมือถือ</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleReceivingPhotoChange}
                      disabled={compressingReceivingPhoto}
                      className="hidden"
                    />
                  </label>
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-2xl bg-slate-50 hover:bg-teal-50/50 cursor-pointer transition text-center group">
                    <ImageIcon className="w-6 h-6 text-slate-400 group-hover:text-teal-600 mb-1.5" />
                    <span className="text-sm sm:text-base font-bold text-slate-800 group-hover:text-teal-700">เลือกจากคลังภาพ</span>
                    <span className="text-xs text-slate-400 mt-0.5">เลือกได้หลายรูป (สูงสุด 5)</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleReceivingPhotoChange}
                      disabled={compressingReceivingPhoto}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
              {compressingReceivingPhoto && (
                <p className="text-xs sm:text-sm text-teal-600 animate-pulse flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 animate-spin" /> กำลังประมวลผลและบีบอัดรูปภาพ...
                </p>
              )}
            </div>

            {/* Inspector info */}
            <div className="text-xs sm:text-sm text-slate-600 bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
              <span>ผู้ตรวจรับสินค้า: <strong className="text-slate-900 font-bold">{operatorName}</strong></span>
              <span className="text-teal-700 font-bold bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">ปิดงาน & สำเร็จคิว</span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCompleteModalOpen(false)}
                className="px-6 py-3 sm:py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-sm sm:text-base font-bold transition"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={completeSubmitting}
                className="px-7 py-3 sm:py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-sm sm:text-base font-bold transition disabled:opacity-50 shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <CheckCheck className="w-5 h-5" />
                <span>{completeSubmitting ? 'กำลังบันทึก...' : 'ยืนยันปิดงานตรวจรับ'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 📄 BOOKING DETAIL DRAWER / MODAL */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-6 border border-slate-200 max-h-[92vh] overflow-y-auto my-auto animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 gap-4">
              <div>
                <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                  <span className="text-xs font-bold text-emerald-800 uppercase bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                    รายละเอียดคิวจอง
                  </span>
                  {getStatusBadge(selectedBooking.status)}
                </div>
                <h3 className="text-2xl sm:text-3xl font-mono font-black text-slate-900 tracking-tight">
                  {selectedBooking.booking_id}
                </h3>
                {selectedBooking.created_at && (
                  <span className="text-xs sm:text-sm text-slate-500 font-normal flex items-center gap-1.5 mt-1.5">
                    <Send className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>จองเมื่อ: <strong className="font-mono text-slate-700 font-semibold">{formatThaiDateTime(selectedBooking.created_at)}</strong></span>
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-2xl transition shrink-0"
                title="ปิดหน้าต่าง"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Overdue Alert */}
            {isBookingOverdue(selectedBooking) && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3.5 text-sm text-amber-900">
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold block text-base text-amber-950">⚠️ รายการนี้เลยกำหนดเวลานัดหมายแล้ว</span>
                  <span className="text-xs sm:text-sm text-amber-800 leading-relaxed">
                    ระบบยังคงรักษาสถานะคิวไว้ตามเดิม (ไม่ปฏิเสธคิวอัตโนมัติ) เพื่อให้เจ้าหน้าที่ตรวจสอบและรับสินค้าได้ตามความเหมาะสม
                  </span>
                </div>
              </div>
            )}

            {/* Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm sm:text-base">
              <div className="p-4 bg-slate-50/90 border border-slate-200/70 rounded-2xl space-y-1">
                <span className="text-xs sm:text-sm font-semibold text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  วันที่เข้าส่งสินค้า (พ.ศ.)
                </span>
                <span className="text-lg sm:text-xl font-black text-slate-900 block">
                  {formatThaiDate(selectedBooking.requested_date)}
                </span>
              </div>

              <div className="p-4 bg-slate-50/90 border border-slate-200/70 rounded-2xl space-y-1">
                <span className="text-xs sm:text-sm font-semibold text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  รอบเวลานัดหมาย
                </span>
                <span className="text-lg sm:text-xl font-black text-slate-900 block">
                  {selectedBooking.requested_time}
                </span>
              </div>

              <div className="p-4 bg-slate-50/90 border border-slate-200/70 rounded-2xl space-y-1">
                <span className="text-xs sm:text-sm font-semibold text-slate-500 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-slate-500" />
                  บริษัทเจ้าของสินค้า / ผู้ส่ง
                </span>
                <span className="text-base sm:text-lg font-bold text-slate-900 block">
                  {selectedBooking.client_name}
                </span>
              </div>

              <div className="p-4 bg-slate-50/90 border border-slate-200/70 rounded-2xl space-y-1">
                <span className="text-xs sm:text-sm font-semibold text-slate-500 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-slate-500" />
                  ประเภทสินค้า
                </span>
                <div>
                  <span className={`font-bold inline-block px-3 py-1 rounded-xl text-sm sm:text-base ${
                    selectedBooking.cargo_type?.includes('ยาเย็น')
                      ? 'bg-cyan-100 text-cyan-900 border border-cyan-300'
                      : 'bg-slate-200/80 text-slate-800'
                  }`}>
                    {selectedBooking.cargo_type || 'ยาและเวชภัณฑ์ทั่วไป'}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-50/90 border border-slate-200/70 rounded-2xl space-y-1">
                <span className="text-xs sm:text-sm font-semibold text-slate-500 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-slate-500" />
                  บริษัทขนส่ง
                </span>
                <span className="text-base sm:text-lg font-bold text-slate-900 block">
                  {selectedBooking.carrier_name}
                </span>
              </div>

              <div className="p-4 bg-slate-50/90 border border-slate-200/70 rounded-2xl space-y-1">
                <span className="text-xs sm:text-sm font-semibold text-slate-500 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  เบอร์โทรศัพท์ผู้จอง
                </span>
                <div>
                  <a
                    href={`tel:${selectedBooking.user_phone}`}
                    className="text-base sm:text-lg font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                  >
                    {selectedBooking.user_phone}
                  </a>
                </div>
              </div>

              <div className="p-4 bg-slate-50/90 border border-slate-200/70 rounded-2xl space-y-1">
                <span className="text-xs sm:text-sm font-semibold text-slate-500 flex items-center gap-1.5">
                  <Car className="w-4 h-4 text-slate-500" />
                  ประเภทรถและทะเบียน
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base sm:text-lg font-bold text-slate-900">
                    {selectedBooking.vehicle_type || 'รถกระบะ 4 ล้อ'}
                  </span>
                  {selectedBooking.license_plate && (
                    <span className="px-2.5 py-0.5 bg-slate-200 text-slate-800 rounded-lg text-sm font-mono font-bold">
                      {selectedBooking.license_plate}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-50/90 border border-slate-200/70 rounded-2xl space-y-1">
                <span className="text-xs sm:text-sm font-semibold text-slate-500 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-emerald-600" />
                  จำนวนสินค้าที่จองเข้าส่ง
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl sm:text-2xl font-black text-emerald-700">
                    {selectedBooking.pallet_count} ลัง
                  </span>
                  <span className="text-sm font-semibold text-slate-600">
                    ({selectedBooking.vehicle_count} คัน)
                  </span>
                </div>
              </div>

              {selectedBooking.driver_name && (
                <div className="p-4 bg-slate-50/90 border border-slate-200/70 rounded-2xl md:col-span-2 space-y-1">
                  <span className="text-xs sm:text-sm font-semibold text-slate-500 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-slate-500" />
                    ชื่อพนักงานขับรถ / ผู้ส่งมอบสินค้า
                  </span>
                  <span className="text-base sm:text-lg font-bold text-slate-900 block">
                    {selectedBooking.driver_name}
                  </span>
                </div>
              )}

              {/* Photos (Delivery Note & Inspection) */}
              {(() => {
                const userPhotos = (selectedBooking.photo_urls && selectedBooking.photo_urls.length > 0)
                  ? selectedBooking.photo_urls
                  : (selectedBooking.photo_url ? [selectedBooking.photo_url] : []);
                const recPhotos = (selectedBooking.receiving_photo_urls && selectedBooking.receiving_photo_urls.length > 0)
                  ? selectedBooking.receiving_photo_urls
                  : (selectedBooking.receiving_photo_url ? [selectedBooking.receiving_photo_url] : []);

                if (userPhotos.length === 0 && recPhotos.length === 0) return null;

                return (
                  <div className="p-5 bg-slate-50/90 border border-slate-200/80 rounded-2xl md:col-span-2 space-y-4">
                    <span className="text-slate-800 font-bold block text-sm sm:text-base flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-teal-600" />
                        รูปภาพและเอกสารแนบประกอบคิว ({userPhotos.length + recPhotos.length} รูป)
                      </span>
                    </span>

                    {userPhotos.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs sm:text-sm font-bold text-slate-600 flex items-center gap-1.5">
                          📄 เอกสารแนบจากผู้จอง / ใบส่งสินค้า ({userPhotos.length} รูป)
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                          {userPhotos.map((url, idx) => (
                            <div
                              key={`user-photo-${idx}`}
                              onClick={() => {
                                setGalleryImages(userPhotos);
                                setGalleryIndex(idx);
                                setGalleryTitle(`เอกสารผู้จอง - ${selectedBooking.booking_id}`);
                                setGalleryOpen(true);
                              }}
                              className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer group hover:opacity-95 transition shadow-2xs"
                            >
                              <img
                                src={url}
                                alt={`เอกสารแนบ ${idx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold">
                                <Maximize2 className="w-5 h-5" />
                              </div>
                              <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-mono font-medium">
                                {idx + 1}/{userPhotos.length}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {recPhotos.length > 0 && (
                      <div className="space-y-2 pt-3 border-t border-slate-200">
                        <span className="text-xs sm:text-sm font-bold text-teal-700 flex items-center gap-1.5">
                          🔍 รูปถ่ายตรวจรับสินค้าหน้างานจากคลังสินค้า ({recPhotos.length} รูป)
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                          {recPhotos.map((url, idx) => (
                            <div
                              key={`rec-photo-${idx}`}
                              onClick={() => {
                                setGalleryImages(recPhotos);
                                setGalleryIndex(idx);
                                setGalleryTitle(`รูปตรวจรับสินค้า - ${selectedBooking.booking_id}`);
                                setGalleryOpen(true);
                              }}
                              className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-teal-200 cursor-pointer group hover:opacity-95 transition shadow-2xs"
                            >
                              <img
                                src={url}
                                alt={`รูปตรวจรับ ${idx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold">
                                <Maximize2 className="w-5 h-5" />
                              </div>
                              <span className="absolute bottom-1 right-1 bg-teal-800/80 text-white text-[10px] px-1.5 py-0.5 rounded font-mono font-medium">
                                {idx + 1}/{recPhotos.length}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Actual Received Inspection Result */}
              {selectedBooking.actual_pallet_count !== undefined && selectedBooking.actual_pallet_count !== null && (
                <div className={`p-5 rounded-2xl md:col-span-2 border ${
                  selectedBooking.actual_pallet_count < selectedBooking.pallet_count
                    ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                    : selectedBooking.actual_pallet_count > selectedBooking.pallet_count
                    ? 'bg-blue-50/90 border-blue-300 text-blue-950'
                    : 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="font-black text-base sm:text-lg flex items-center gap-2">
                      <PackageCheck className="w-6 h-6 text-emerald-700 shrink-0" />
                      ผลการตรวจรับสินค้าจริงหน้างาน:
                    </span>
                    <span className="font-mono font-black text-lg sm:text-xl">
                      {selectedBooking.actual_pallet_count} / {selectedBooking.pallet_count} ลัง
                    </span>
                  </div>
                  <div className="text-sm sm:text-base font-bold mt-2">
                    {selectedBooking.actual_pallet_count < selectedBooking.pallet_count ? (
                      <span className="text-amber-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        ⚠️ สินค้ามาไม่ครบ (ขาดส่ง {selectedBooking.pallet_count - selectedBooking.actual_pallet_count} ลัง)
                      </span>
                    ) : selectedBooking.actual_pallet_count > selectedBooking.pallet_count ? (
                      <span className="text-blue-900 flex items-center gap-1.5">
                        <Info className="w-4 h-4 text-blue-600 shrink-0" />
                        ℹ️ สินค้ามาเกิน (+{selectedBooking.actual_pallet_count - selectedBooking.pallet_count} ลัง)
                      </span>
                    ) : (
                      <span className="text-emerald-900 flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        ✅ ตรวจรับครบถ้วนสมบูรณ์ 100%
                      </span>
                    )}
                  </div>
                  {selectedBooking.receiving_notes && (
                    <div className="text-sm sm:text-base mt-2.5 pt-2.5 border-t border-slate-200/80 text-slate-800">
                      <strong>หมายเหตุการตรวจรับ:</strong> {selectedBooking.receiving_notes}
                    </div>
                  )}
                  {selectedBooking.received_by && (
                    <div className="text-xs sm:text-sm text-slate-600 mt-1.5">
                      ผู้ตรวจรับ: <span className="font-semibold text-slate-800">{selectedBooking.received_by}</span>
                      {selectedBooking.receiving_completed_at && ` (${selectedBooking.receiving_completed_at})`}
                    </div>
                  )}
                </div>
              )}

              {selectedBooking.notes && (
                <div className="p-4 bg-slate-50/90 border border-slate-200/70 rounded-2xl md:col-span-2 space-y-1">
                  <span className="text-xs sm:text-sm font-semibold text-slate-500 block">หมายเหตุเพิ่มเติมจากผู้จอง</span>
                  <span className="text-slate-800 text-sm sm:text-base leading-relaxed block">{selectedBooking.notes}</span>
                </div>
              )}

              {selectedBooking.admin_reason && (
                <div className="p-4 bg-rose-50/90 border border-rose-200 rounded-2xl md:col-span-2 text-rose-900 space-y-1">
                  <span className="font-bold text-sm sm:text-base block">บันทึกเหตุผลจากเจ้าหน้าที่:</span>
                  <span className="text-sm sm:text-base leading-relaxed block">{selectedBooking.admin_reason}</span>
                  {selectedBooking.admin_action_date && (
                    <span className="text-xs text-rose-600 block pt-1">
                      ({formatThaiDateTime(selectedBooking.admin_action_date)} โดย {selectedBooking.admin_action_by})
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="pt-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* 1. Print Pallet Tag */}
                {!isSecurityOnly && (selectedBooking.status === 'Approved' || selectedBooking.status === 'CheckedIn' || selectedBooking.status === 'Receiving' || selectedBooking.status === 'Completed') && (
                  <button
                    type="button"
                    onClick={() => {
                      setPalletTagBooking(selectedBooking);
                      setPalletTagModalOpen(true);
                    }}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm sm:text-base font-bold transition flex items-center justify-center gap-2 shadow-sm hover:shadow"
                    title="พิมพ์ป้ายปะหน้าพาเลทสินค้า (Pallet Tag)"
                  >
                    <Tag className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>ป้ายพาเลท</span>
                  </button>
                )}

                {/* 2. Edit Status */}
                {!isSecurityOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      openEditStatusModal(selectedBooking);
                    }}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-sm sm:text-base font-bold transition flex items-center justify-center gap-2 shadow-sm hover:shadow"
                    title="แก้ไขหรือเปลี่ยนสถานะการอนุมัติคิวนี้"
                  >
                    <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>แก้ไขสถานะ</span>
                  </button>
                )}

                {/* 3. Multi-Step Cancel */}
                {!isSecurityOnly && (selectedBooking.status === 'Approved' || selectedBooking.status === 'CheckedIn' || selectedBooking.status === 'Receiving') && (
                  <button
                    type="button"
                    onClick={() => {
                      setCancellingBooking(selectedBooking);
                      setCancelReason('');
                      setConfirmCodeInput('');
                      setCancelStep(1);
                      setCancelError(null);
                      setCancelModalOpen(true);
                    }}
                    className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl text-sm sm:text-base font-bold transition flex items-center justify-center gap-2"
                    title="ยกเลิกคิว (ระบบป้องกัน)"
                  >
                    <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" />
                    <span>ยกเลิกคิว</span>
                  </button>
                )}

                {/* 4. Delete Booking (Super Admin Only) */}
                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => openSingleDeleteModal(selectedBooking)}
                    className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-800 border border-rose-200 rounded-2xl text-sm sm:text-base font-bold transition flex items-center justify-center gap-1.5"
                    title="ลบรายการจองนี้ออกจากระบบ (เฉพาะ Super Admin)"
                  >
                    <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>ลบคิว</span>
                  </button>
                )}
              </div>

              {/* Close Modal Button */}
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-sm sm:text-base font-bold transition shadow-sm text-center"
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

      {/* 🗑️ DELETE QUEUE CONFIRMATION MODAL (Super Admin) */}
      {deleteConfirmModalOpen && bookingsToDelete.length > 0 && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-rose-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-rose-600">
                <div className="p-2 bg-rose-100 rounded-2xl">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">ยืนยันการลบรายการจองคิว</h3>
                  <span className="text-[11px] text-rose-600 font-semibold">เฉพาะสิทธิ์ Super Admin เท่านั้น</span>
                </div>
              </div>
              <button
                disabled={isDeletingBookings}
                onClick={() => setDeleteConfirmModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                คุณแน่ใจหรือไม่ว่าต้องการลบรายการจองคิวจำนวน <strong className="text-rose-600 font-bold font-mono">{bookingsToDelete.length}</strong> รายการนี้ออกจากระบบอย่างถาวร?
                การกระทำนี้จะลบข้อมูลออกจากฐานข้อมูลและไม่สามารถกู้คืนได้
              </p>

              {/* List of items to delete (up to 5 previews) */}
              <div className="bg-slate-50 rounded-2xl p-3 max-h-48 overflow-y-auto space-y-2 border border-slate-200/80">
                {bookingsToDelete.slice(0, 5).map((b) => (
                  <div key={b.booking_id} className="p-2 bg-white rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-slate-900 block">{b.booking_id}</span>
                      <span className="text-[10px] text-slate-500">
                        {b.carrier_name} • {formatThaiDate(b.requested_date)} ({b.requested_time})
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">
                      {b.status}
                    </span>
                  </div>
                ))}
                {bookingsToDelete.length > 5 && (
                  <p className="text-[11px] text-center text-slate-400 pt-1 font-medium">
                    ...และอีก {bookingsToDelete.length - 5} รายการ
                  </p>
                )}
              </div>

              <div className="p-3 bg-rose-50/70 border border-rose-200/80 rounded-2xl text-[11px] text-rose-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-rose-600" />
                  <span>บันทึกความปลอดภัย (Audit Log)</span>
                </div>
                <p className="text-slate-600">
                  ระบบจะบันทึกประวัติการลบคิวนี้ใน Audit Log พร้อมชื่อผู้ดำเนินการ ({operatorName}) ไว้อย่างชัดเจน
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeletingBookings}
                onClick={() => setDeleteConfirmModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isDeletingBookings}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {isDeletingBookings ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>กำลังลบข้อมูล...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>ยืนยันลบถาวร ({bookingsToDelete.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📥 RESTORE BACKUP MODAL (Super Admin) */}
      {restoreModalOpen && restoreData && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-amber-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-amber-600">
                <div className="p-2 bg-amber-100 rounded-2xl">
                  <Database className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">นำเข้าและกู้คืนข้อมูลระบบ (System Restore)</h3>
                  <span className="text-[11px] text-amber-700 font-semibold">ไฟล์: {restoreFile?.name}</span>
                </div>
              </div>
              <button
                disabled={isRestoring}
                onClick={() => setRestoreModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary Preview Box */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2.5 text-xs">
              <span className="font-bold text-slate-700 block">📊 สรุปข้อมูลที่พบในไฟล์สำรอง:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">คิวจอง</span>
                  <strong className="text-sm font-bold text-slate-900 font-mono">
                    {restoreData.data?.bookings?.length || 0}
                  </strong>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">รอบเวลา</span>
                  <strong className="text-sm font-bold text-slate-900 font-mono">
                    {restoreData.data?.time_slots?.length || 0}
                  </strong>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">วันปิดรับ</span>
                  <strong className="text-sm font-bold text-slate-900 font-mono">
                    {restoreData.data?.blocked_dates?.length || 0}
                  </strong>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">เจ้าหน้าที่</span>
                  <strong className="text-sm font-bold text-slate-900 font-mono">
                    {restoreData.data?.staff_users?.length || 0}
                  </strong>
                </div>
              </div>
              {restoreData.exported_at && (
                <p className="text-[10px] text-slate-400 pt-1">
                  สำรองไว้เมื่อ: {formatThaiDateTime(restoreData.exported_at)} โดย {restoreData.exported_by || 'Super Admin'}
                </p>
              )}
            </div>

            {/* Mode Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 block">เลือกรูปแบบการกู้คืนข้อมูล:</label>
              <div className="grid grid-cols-1 gap-2.5">
                <label
                  className={`p-3 rounded-2xl border-2 transition cursor-pointer flex items-start gap-3 ${
                    restoreMode === 'merge'
                      ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="restoreMode"
                    value="merge"
                    checked={restoreMode === 'merge'}
                    onChange={() => setRestoreMode('merge')}
                    className="mt-1 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <strong className="text-xs font-bold text-slate-900 block">แบบที่ 1: ผสานข้อมูล (Merge Data - ปลอดภัย แนะนำ)</strong>
                    <span className="text-[11px] text-slate-500 leading-relaxed block mt-0.5">
                      อัปเดตและเพิ่มรายการที่ยังไม่มีในระบบ โดยไม่ลบรายการคิวหรือการตั้งค่าที่มีอยู่เดิม
                    </span>
                  </div>
                </label>

                <label
                  className={`p-3 rounded-2xl border-2 transition cursor-pointer flex items-start gap-3 ${
                    restoreMode === 'replace'
                      ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-500/20'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="restoreMode"
                    value="replace"
                    checked={restoreMode === 'replace'}
                    onChange={() => setRestoreMode('replace')}
                    className="mt-1 text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <strong className="text-xs font-bold text-rose-900 block">แบบที่ 2: แทนที่ทั้งหมด (Full Replace / Overwrite)</strong>
                    <span className="text-[11px] text-rose-700 leading-relaxed block mt-0.5">
                      ล้างข้อมูลคิวจองในระบบเดิมทั้งหมด และแทนที่ด้วยข้อมูลจากไฟล์ Backup 100%
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* If Replace mode is selected: Double Confirmation Input */}
            {restoreMode === 'replace' && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>มาตรการป้องกันความปลอดภัย (Safety Check)</span>
                </div>
                <p className="text-[11px] text-rose-700">
                  กรุณากรอกคำว่า <strong className="font-mono underline font-bold">RESTORE</strong> ลงในช่องด้านล่างเพื่อยืนยันการแทนที่ข้อมูลทั้งหมด:
                </p>
                <input
                  type="text"
                  value={restoreConfirmCode}
                  onChange={(e) => setRestoreConfirmCode(e.target.value)}
                  placeholder="พิมพ์ RESTORE"
                  className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl text-xs font-bold font-mono text-rose-900 tracking-wider focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isRestoring}
                onClick={() => setRestoreModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isRestoring || (restoreMode === 'replace' && restoreConfirmCode.trim().toUpperCase() !== 'RESTORE')}
                onClick={handleConfirmRestore}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 text-white ${
                  restoreMode === 'replace' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isRestoring ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>กำลังกู้คืนข้อมูล...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    <span>ยืนยันกู้คืนระบบ ({restoreMode === 'replace' ? 'แทนที่ทั้งหมด' : 'ผสานข้อมูล'})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📷 Live Camera QR Scanner Modal */}
      <QRScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={handleQRScanned}
      />

      {/* 🏷️ Pallet Tag Print Modal */}
      <PalletTagModal
        booking={palletTagBooking}
        isOpen={palletTagModalOpen}
        onClose={() => setPalletTagModalOpen(false)}
      />

      {/* 🖼️ Multi-Photo Lightbox Gallery Modal */}
      <ImageGalleryModal
        images={galleryImages}
        initialIndex={galleryIndex}
        title={galleryTitle}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
      />
    </div>
  );
}
