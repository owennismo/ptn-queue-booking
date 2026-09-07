'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  Truck,
  Phone,
  Search,
  Building2,
  Package,
  Car,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Info,
  Sparkles,
  ShieldCheck,
  User,
  MessageCircle,
  MessageSquare,
  Headphones,
  Image as ImageIcon,
  Upload,
  Camera,
  Trash2,
  Eye,
  X,
  Download,
  ArrowLeft,
  ArrowRight,
  Zap,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatThaiDate, formatThaiShortDate, formatPhoneMask } from '@/lib/dateUtils';
import ThaiDatePicker from '@/components/ThaiDatePicker';
import { compressImage, formatFileSize } from '@/lib/imageCompressor';
import { DEFAULT_SYSTEM_SETTINGS, SystemSettings } from '@/lib/types';
import ImageGalleryModal from '@/components/ImageGalleryModal';

interface Slot {
  id: number;
  slot_name: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  booked_count: number;
  available_slots: number;
  is_available: boolean;
  is_past?: boolean;
}

export default function BookingPage() {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        if (isMounted && d.success && d.settings) {
          setSystemSettings(d.settings);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Today string YYYY-MM-DD in Thai Timezone (UTC+7)
  const getTodayStr = () => {
    const bangkokDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const year = bangkokDate.getFullYear();
    const month = String(bangkokDate.getMonth() + 1).padStart(2, '0');
    const day = String(bangkokDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isSlotTimePast = (date: string, endTime: string, slotName?: string) => {
    const bangkokDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const y = bangkokDate.getFullYear();
    const m = String(bangkokDate.getMonth() + 1).padStart(2, '0');
    const d = String(bangkokDate.getDate()).padStart(2, '0');
    const today = `${y}-${m}-${d}`;
    const hh = String(bangkokDate.getHours()).padStart(2, '0');
    const mm = String(bangkokDate.getMinutes()).padStart(2, '0');
    const currentTime = `${hh}:${mm}`;

    if (date < today) return true;
    if (date === today) {
      const toMinutes = (t: string) => {
        if (!t) return 0;
        const [h, min] = t.trim().replace('.', ':').split(':');
        return parseInt(h || '0', 10) * 60 + parseInt(min || '0', 10);
      };

      let targetTime = endTime;
      if (!targetTime && slotName) {
        const parts = slotName.split('-');
        if (parts[1]) targetTime = parts[1].trim();
        else if (parts[0]) targetTime = parts[0].trim();
      }

      return toMinutes(currentTime) >= toMinutes(targetTime);
    }
    return false;
  };

  const [requestedDate, setRequestedDate] = useState<string>(getTodayStr());
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);

  // Form Fields
  const [carrierName, setCarrierName] = useState('');
  const [clientName, setClientName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [palletCount, setPalletCount] = useState<number | string>(1);
  const [vehicleCount, setVehicleCount] = useState<number | string>(1);
  const [vehicleType, setVehicleType] = useState<string>('รถกระบะ 4 ล้อ (ตู้ทึบ/คอก)');
  const [cargoType, setCargoType] = useState<string>('ยาและเวชภัณฑ์ทั่วไป (Room Temp 15-30°C)');
  const [driverName, setDriverName] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [notes, setNotes] = useState('');

  // Photo Attachment State (Multi-Photo up to 5 photos)
  interface AttachedPhoto {
    file: File;
    dataUrl: string;
    stats: { originalSize: number; compressedSize: number };
  }
  const [attachedPhotos, setAttachedPhotos] = useState<AttachedPhoto[]>([]);
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [galleryActiveIndex, setGalleryActiveIndex] = useState(0);
  const [compressingPhoto, setCompressingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Profile Memory & Auto-Fill states
  const [rememberProfile, setRememberProfile] = useState<boolean>(true);
  const [isPreFilledFromLocal, setIsPreFilledFromLocal] = useState<boolean>(false);
  const [cloudProfileFound, setCloudProfileFound] = useState<{
    driver_name: string;
    carrier_name: string;
    client_name: string;
    vehicle_type: string;
    cargo_type: string;
    license_plate: string;
    booking_count: number;
  } | null>(null);
  const [lookingUpPhone, setLookingUpPhone] = useState<boolean>(false);
  const [carrierSuggestions, setCarrierSuggestions] = useState<string[]>([]);
  const [clientSuggestions, setClientSuggestions] = useState<string[]>([]);

  // Load saved profile from LocalStorage on mount
  useEffect(() => {
    try {
      const savedStr = localStorage.getItem('ptn_saved_profile');
      if (savedStr) {
        const saved = JSON.parse(savedStr);
        if (saved && typeof saved === 'object') {
          if (saved.userPhone) setUserPhone(saved.userPhone);
          if (saved.carrierName) setCarrierName(saved.carrierName);
          if (saved.clientName) setClientName(saved.clientName);
          if (saved.driverName) setDriverName(saved.driverName);
          if (saved.vehicleType) setVehicleType(saved.vehicleType);
          if (saved.cargoType) setCargoType(saved.cargoType);
          if (saved.licensePlate) setLicensePlate(saved.licensePlate);
          if (typeof saved.rememberMe === 'boolean') setRememberProfile(saved.rememberMe);
          setIsPreFilledFromLocal(true);
        }
      }
    } catch (e) {
      console.warn('Could not read saved profile:', e);
    }
  }, []);

  // Fetch suggestions for carrier & client datalists
  useEffect(() => {
    fetch('/api/bookings/profile?suggestions=true')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          if (Array.isArray(d.carriers)) setCarrierSuggestions(d.carriers);
          if (Array.isArray(d.clients)) setClientSuggestions(d.clients);
        }
      })
      .catch(() => {});
  }, []);

  // Validation function per step
  const validateStep = (stepNum: number): boolean => {
    setErrorMessage(null);
    if (stepNum === 1) {
      if (!requestedDate) {
        setErrorMessage('กรุณาเลือกวันที่ต้องการเข้าส่งของ');
        return false;
      }
      const parts = requestedDate.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        if (d.getDay() === 0) {
          setErrorMessage('คลังสินค้าปิดทำการทุกวันอาทิตย์ กรุณาเลือกวันจันทร์ - เสาร์');
          return false;
        }
      }
      if (isBlocked) {
        setErrorMessage(`วันที่เลือกปิดรับจอง: ${blockReason || 'ขออภัย วันดังกล่าวปิดทำการ'}`);
        return false;
      }
      if (!selectedSlot) {
        setErrorMessage('กรุณาเลือกรอบเวลาที่ต้องการเข้าส่ง');
        return false;
      }
    } else if (stepNum === 2) {
      if (!userPhone.trim()) {
        setErrorMessage('กรุณากรอกเบอร์โทรศัพท์ติดต่อ');
        return false;
      }
      if (!carrierName.trim()) {
        setErrorMessage('กรุณาระบุชื่อบริษัทขนส่ง');
        return false;
      }
      if (!clientName.trim()) {
        setErrorMessage('กรุณาระบุบริษัทเจ้าของสินค้า / ผู้รับปลายทาง');
        return false;
      }
      if (!driverName.trim()) {
        setErrorMessage('กรุณาระบุชื่อผู้ส่งสินค้า / คนขับรถ');
        return false;
      }
    } else if (stepNum === 3) {
      if (!palletCount || Number(palletCount) < 1) {
        setErrorMessage('จำนวนลังต้องอย่างน้อย 1 ลัง');
        return false;
      }
      if (!vehicleCount || Number(vehicleCount) < 1) {
        setErrorMessage('จำนวนรถขนส่งต้องอย่างน้อย 1 คัน');
        return false;
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(4, prev + 1));
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    setErrorMessage(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  // Photo file selection and auto-compression handler (Multi-Photo up to 5)
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (attachedPhotos.length >= 5) {
      setPhotoError('สามารถแนบรูปถ่ายได้สูงสุด 5 รูปเท่านั้น หากต้องการเพิ่ม กรุณาลบรูปเดิมก่อน');
      e.target.value = '';
      return;
    }

    setCompressingPhoto(true);
    setPhotoError(null);

    const availableSlots = 5 - attachedPhotos.length;
    const filesToProcess = Array.from(files).slice(0, availableSlots);

    try {
      const newPhotos: AttachedPhoto[] = [];
      for (const file of filesToProcess) {
        const result = await compressImage(file, 1600, 0.82);
        newPhotos.push({
          file: result.file,
          dataUrl: result.dataUrl,
          stats: {
            originalSize: result.originalSize,
            compressedSize: result.compressedSize,
          },
        });
      }
      setAttachedPhotos((prev) => [...prev, ...newPhotos]);
    } catch (err: any) {
      console.error('Image compression error:', err);
      setPhotoError(err.message || 'ไม่สามารถบีบอัดรูปภาพได้');
    } finally {
      setCompressingPhoto(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    setAttachedPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoError(null);
  };

  // Phone Input Masking (08X-XXX-XXXX / 0XX-XXX-XXXX) & Cloud Auto-fill lookup
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneMask(e.target.value);
    setUserPhone(formatted);

    const digitsOnly = formatted.replace(/\D/g, '');
    if (digitsOnly.length >= 10) {
      triggerPhoneLookup(digitsOnly);
    } else {
      setCloudProfileFound(null);
    }
  };

  const triggerPhoneLookup = async (phoneDigits: string) => {
    try {
      setLookingUpPhone(true);
      const res = await fetch(`/api/bookings/profile?phone=${phoneDigits}`);
      const data = await res.json();
      if (data.success && data.found && data.profile) {
        const p = data.profile;
        // If current form values already match, don't show prompt
        if (
          driverName.trim() === p.driver_name &&
          carrierName.trim() === p.carrier_name &&
          clientName.trim() === p.client_name
        ) {
          setCloudProfileFound(null);
        } else {
          setCloudProfileFound(p);
        }
      } else {
        setCloudProfileFound(null);
      }
    } catch (e) {
      setCloudProfileFound(null);
    } finally {
      setLookingUpPhone(false);
    }
  };

  const handleApplyCloudProfile = () => {
    if (!cloudProfileFound) return;
    if (cloudProfileFound.driver_name) setDriverName(cloudProfileFound.driver_name);
    if (cloudProfileFound.carrier_name) setCarrierName(cloudProfileFound.carrier_name);
    if (cloudProfileFound.client_name) setClientName(cloudProfileFound.client_name);
    if (cloudProfileFound.vehicle_type) setVehicleType(cloudProfileFound.vehicle_type);
    if (cloudProfileFound.cargo_type) setCargoType(cloudProfileFound.cargo_type);
    if (cloudProfileFound.license_plate) setLicensePlate(cloudProfileFound.license_plate);
    setCloudProfileFound(null);
    setIsPreFilledFromLocal(true);
  };

  const handleClearSavedProfile = () => {
    try {
      localStorage.removeItem('ptn_saved_profile');
    } catch (e) {}
    setUserPhone('');
    setCarrierName('');
    setClientName('');
    setDriverName('');
    setLicensePlate('');
    setIsPreFilledFromLocal(false);
    setCloudProfileFound(null);
  };

  // Helper format Thai Date
  const formatThaiDateDisplay = (dateStr: string) => {
    return formatThaiDate(dateStr);
  };

  // Vehicle Types
  const vehicleTypes = [
    'รถกระบะ 4 ล้อ (ตู้ทึบ/คอก)',
    'รถ 4 ล้อใหญ่ (4-Wheeler Jumbo)',
    'รถ 6 ล้อ (6-Wheeler)',
    'รถ 10 ล้อ (10-Wheeler)',
    'รถเทรลเลอร์ / หัวลาก (Trailer)',
    'รถอื่นๆ',
  ];

  // Cargo Types
  const cargoTypes = [
    {
      id: 'ยาและเวชภัณฑ์ทั่วไป (Room Temp 15-30°C)',
      title: 'ยาและเวชภัณฑ์ทั่วไป',
      desc: 'อุณหภูมิห้อง (Room Temp 15-30°C)',
      color: 'border-emerald-200 hover:border-emerald-400 bg-emerald-50/40',
      badge: 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'ยาควบคุมอุณหภูมิ / ยาเย็น (Cold Chain 2-8°C)',
      title: 'ยาควบคุมอุณหภูมิ (ยาเย็น)',
      desc: 'แช่เย็น (Cold Chain 2-8°C)',
      color: 'border-cyan-200 hover:border-cyan-400 bg-cyan-50/50',
      badge: 'bg-cyan-100 text-cyan-800',
    },
    {
      id: 'วัตถุดิบ / สารเคมี / บรรจุภัณฑ์',
      title: 'วัตถุดิบและบรรจุภัณฑ์',
      desc: 'สารเคมี, บรรจุภัณฑ์ยา, กล่องฟอยล์',
      color: 'border-amber-200 hover:border-amber-400 bg-amber-50/40',
      badge: 'bg-amber-100 text-amber-800',
    },
    {
      id: 'สินค้าทั่วไป / เครื่องมือแพทย์',
      title: 'สินค้าทั่วไป / เครื่องมือแพทย์',
      desc: 'อุปกรณ์ทางการแพทย์, สินค้าอุปโภค',
      color: 'border-slate-200 hover:border-slate-400 bg-slate-50/50',
      badge: 'bg-slate-200 text-slate-700',
    },
  ];

  // Fetch slots whenever requestedDate changes
  useEffect(() => {
    if (!requestedDate) return;
    setLoadingSlots(true);
    setSelectedSlot('');
    setErrorMessage(null);

    fetch(`/api/availability?date=${requestedDate}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setErrorMessage(data.error);
        } else {
          setIsBlocked(data.is_blocked);
          setBlockReason(data.block_reason);
          const activeSlots = (data.slots || []).filter((s: any) => s.is_active !== 0);
          setSlots(activeSlots);
        }
      })
      .catch((err) => {
        console.error('Failed to load slots:', err);
        setErrorMessage('ไม่สามารถโหลดข้อมูลรอบเวลาได้');
      })
      .finally(() => setLoadingSlots(false));
  }, [requestedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!requestedDate) {
      setErrorMessage('กรุณาเลือกวันที่ต้องการเข้าส่งของ');
      return;
    }
    // Check if Sunday (Default Blocked)
    const parts = requestedDate.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      if (d.getDay() === 0) {
        setErrorMessage('คลังสินค้าปิดทำการทุกวันอาทิตย์ กรุณาเลือกวันจันทร์ - เสาร์');
        return;
      }
    }
    if (isBlocked) {
      setErrorMessage(`วันที่เลือกปิดรับจอง: ${blockReason}`);
      return;
    }
    if (!selectedSlot) {
      setErrorMessage('กรุณาเลือกรอบเวลาที่ต้องการเข้าส่ง');
      return;
    }
    if (!userPhone.trim()) {
      setErrorMessage('กรุณากรอกเบอร์โทรศัพท์ติดต่อ');
      return;
    }
    if (!carrierName.trim()) {
      setErrorMessage('กรุณาระบุชื่อบริษัทขนส่ง');
      return;
    }
    if (!clientName.trim()) {
      setErrorMessage('กรุณาระบุบริษัทเจ้าของสินค้า / ผู้รับปลายทาง');
      return;
    }
    if (!driverName.trim()) {
      setErrorMessage('กรุณาระบุชื่อผู้ส่งสินค้า / คนขับรถ');
      return;
    }

    setSubmitting(true);

    try {
      const uploadedPhotoUrls: string[] = [];

      // 1. If user attached photos, upload all of them to /api/upload
      if (attachedPhotos.length > 0) {
        for (let i = 0; i < attachedPhotos.length; i++) {
          const p = attachedPhotos[i];
          try {
            const uploadRes = await fetch('/api/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                dataUrl: p.dataUrl,
                filename: p.file?.name || `delivery-doc-${i + 1}.webp`,
                booking_id: 'new',
              }),
            });
            const uploadData = await uploadRes.json();
            if (uploadRes.ok && uploadData.url) {
              uploadedPhotoUrls.push(uploadData.url);
            }
          } catch (uploadErr) {
            console.warn('Photo upload warning, proceeding with booking:', uploadErr);
          }
        }
      }

      // 2. Create Booking
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_phone: userPhone,
          carrier_name: carrierName,
          client_name: clientName,
          pallet_count: Math.max(1, Number(palletCount) || 1),
          vehicle_count: Math.max(1, Number(vehicleCount) || 1),
          vehicle_type: vehicleType,
          cargo_type: cargoType,
          requested_date: requestedDate,
          requested_time: selectedSlot,
          driver_name: driverName,
          license_plate: licensePlate,
          notes: notes,
          photo_url: uploadedPhotoUrls[0] || null,
          photo_urls: uploadedPhotoUrls,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'การจองไม่สำเร็จ');
      }

      // Save booking ID to user device for Device/Session lock verification
      try {
        const myBookings: string[] = JSON.parse(localStorage.getItem('ptn_my_bookings') || '[]');
        if (!myBookings.includes(data.booking.booking_id)) {
          myBookings.push(data.booking.booking_id);
          localStorage.setItem('ptn_my_bookings', JSON.stringify(myBookings));
        }
        sessionStorage.setItem('ptn_booking_id', data.booking.booking_id);

        // Save profile if rememberProfile is checked
        if (rememberProfile) {
          localStorage.setItem(
            'ptn_saved_profile',
            JSON.stringify({
              rememberMe: true,
              userPhone: userPhone.trim(),
              carrierName: carrierName.trim(),
              clientName: clientName.trim(),
              driverName: driverName.trim(),
              licensePlate: licensePlate.trim(),
              vehicleType: vehicleType,
              cargoType: cargoType,
              updatedAt: new Date().toISOString(),
            })
          );
        } else {
          localStorage.removeItem('ptn_saved_profile');
        }
      } catch (e) {}

      // Trigger Confetti Effect
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // ignore if canvas-confetti fails
      }

      // Redirect to digital ticket page
      router.push(`/booking?id=${data.booking.booking_id}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการจองคิว');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="py-6 sm:py-8 px-4 sm:px-6 lg:px-8 pb-24 sm:pb-12">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          {/* Hero & Company Branding Banner */}
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
            <div className="relative z-10 max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 bg-emerald-500/30 border border-emerald-400/40 rounded-full px-3.5 py-1 text-xs sm:text-sm font-semibold text-emerald-100 backdrop-blur">
                <Sparkles className="w-4 h-4 text-emerald-300" />
                <span>{systemSettings.hero_badge || 'ระบบจองคิวออนไลน์ Serverless • สะดวก รวดเร็ว'}</span>
              </div>
              <div>
                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                  {systemSettings.hero_title || 'จองคิวเข้าส่งสินค้า'}
                </h1>
                <p className="text-emerald-100/90 text-sm sm:text-base mt-1.5 font-normal">
                  {systemSettings.hero_subtitle || systemSettings.company_name || 'บริษัท พีทีเอ็น ฟาร์มาเซ็นเตอร์ จำกัด (พัฒนาเภสัช)'}
                </p>
              </div>

              <div className="flex flex-wrap gap-4 text-xs sm:text-sm text-emerald-200/90">
                <span className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> ไม่ต้องสมัครสมาชิก
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> ตรวจสอบสล็อตว่าง Real-time
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <FileText className="w-4 h-4 text-emerald-400" /> รับบัตรคิวพร้อม QR Code ทันที
                </span>
              </div>
            </div>
            {/* Subtle Background Art */}
            <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          </div>

          {/* 📢 Emergency Announcement Banner (Controlled by Super Admin) */}
          {systemSettings.booking_announcement_active && systemSettings.booking_announcement && (
            <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-orange-500/15 border-2 border-amber-400/60 rounded-3xl p-4 sm:p-5 flex items-start gap-3.5 shadow-sm text-amber-950 animate-in fade-in duration-300">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/30 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="font-extrabold text-sm sm:text-base text-amber-900 flex items-center gap-2">
                  <span>ประกาศสำคัญจากคลังสินค้า</span>
                  <span className="text-[10px] bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full font-bold">แจ้งเตือน</span>
                </div>
                <p className="text-xs sm:text-sm text-amber-900/90 whitespace-pre-line leading-relaxed font-medium">
                  {systemSettings.booking_announcement}
                </p>
              </div>
            </div>
          )}

          {/* ⚡ Quick Action Shortcut Banner: สำหรับคนที่มีคิวแล้ว */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200/90 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm hover:border-emerald-300 transition">
            <div className="flex items-center gap-3.5 w-full sm:w-auto">
              <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-200">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2 flex-wrap">
                  <span>มีนัดหมายคิวส่งของอยู่แล้วใช่ไหม?</span>
                  <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    ติดตามแบบเรียลไทม์
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                  ตรวจสอบสถานะคิวล่าสุด ค้นหาด้วยเบอร์โทร หรือเปิดดูบัตรคิวดิจิทัลของคุณได้ทันที
                </p>
              </div>
            </div>
            <Link
              href="/track"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md shadow-emerald-600/20 hover:shadow-lg transition shrink-0 group"
            >
              <span>ตรวจสอบสถานะคิว</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

        {/* Stepper Navigation Header */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 sm:pb-0">
            {[
              { num: 1, title: 'วันและรอบเวลา', desc: 'Date & Slot' },
              { num: 2, title: 'ข้อมูลผู้ส่งและรถ', desc: 'Carrier & Vehicle' },
              { num: 3, title: 'สินค้าและเอกสาร', desc: 'Cargo & Photo' },
              { num: 4, title: 'ตรวจสอบและยืนยัน', desc: 'Confirm' },
            ].map((s, idx) => (
              <div key={s.num} className="flex items-center gap-2 sm:gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (s.num < currentStep) {
                      setCurrentStep(s.num);
                    } else if (s.num > currentStep && validateStep(currentStep)) {
                      setCurrentStep(s.num);
                    }
                  }}
                  className="flex items-center gap-2 text-left group"
                >
                  <div
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full font-bold flex items-center justify-center text-xs sm:text-sm transition ${
                      currentStep === s.num
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 ring-2 ring-emerald-600 ring-offset-2'
                        : currentStep > s.num
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {currentStep > s.num ? '✓' : s.num}
                  </div>
                  <div>
                    <div className="text-2xs text-slate-400 font-semibold uppercase">ขั้นตอนที่ {s.num}</div>
                    <div className={`text-xs sm:text-sm font-bold ${currentStep === s.num ? 'text-emerald-700' : 'text-slate-700'}`}>
                      {s.title}
                    </div>
                  </div>
                </button>
                {idx < 3 && <div className="w-6 sm:w-12 h-0.5 bg-slate-200 shrink-0 mx-1" />}
              </div>
            ))}
          </div>
        </div>

        {/* Main Booking Form Card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 sm:p-8 space-y-8">
          {/* STEP 1: Select Date & Time Slot */}
          {currentStep === 1 && (
            <section className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5 text-slate-900 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-extrabold text-base">
                  1
                </div>
                <div>
                  <h2 className="text-xl font-bold">เลือกวันและรอบเวลาที่ต้องการเข้าส่ง</h2>
                  <p className="text-xs text-slate-500">{systemSettings.booking_notice_text || 'คลังเปิดรับสินค้าจันทร์ - เสาร์ (หยุดวันอาทิตย์) ล่วงหน้าได้ 14 วัน'}</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Date Input with Thai Buddhist Era (พ.ศ.) Picker */}
                <div className="space-y-1.5">
                  <label className="block text-base font-semibold text-slate-800">
                    <span className="text-rose-500">*</span> วันที่ต้องการเข้าส่ง (ระบุเป็น วัน/เดือน/ปี พ.ศ.)
                  </label>
                  <div className="relative max-w-md">
                    <ThaiDatePicker
                      value={requestedDate}
                      onChange={(newDate) => setRequestedDate(newDate)}
                      minDate={getTodayStr()}
                      placeholder="คลิกเพื่อเลือกวันที่ (ปฏิทินไทย พ.ศ.)"
                      required
                    />
                  </div>
                  {requestedDate && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg max-w-md">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>วันที่เลือก: {formatThaiDateDisplay(requestedDate)}</span>
                    </div>
                  )}
                </div>

                {/* Blocked Date Alert */}
                {isBlocked && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm">วันที่ {formatThaiDateDisplay(requestedDate)} ปิดรับจองคิว</h4>
                      <p className="text-xs text-amber-800 mt-0.5">{blockReason || 'ขออภัย วันดังกล่าวปิดทำการหรือไม่เปิดรับส่งของ'}</p>
                      <p className="text-xs text-amber-700 mt-1">กรุณาเลือกวันอื่นที่เปิดให้บริการ</p>
                    </div>
                  </div>
                )}

                {/* Time Slot Selection */}
                {!isBlocked && (
                  <div className="space-y-2 pt-2">
                    <label className="block text-base font-semibold text-slate-800">
                      <span className="text-rose-500">*</span> เลือกรอบเวลา (Time Slot)
                    </label>

                    {loadingSlots ? (
                      <div className="py-8 text-center text-slate-500 text-base flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        กำลังตรวจสอบรอบเวลาว่าง...
                      </div>
                    ) : slots.length === 0 ? (
                      <p className="text-base text-slate-600 py-4">ไม่พบช่วงเวลาทำการสำหรับวันที่เลือก</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {slots.map((slot) => {
                          const isSelected = selectedSlot === slot.slot_name;
                          const isPast = Boolean(slot.is_past || isSlotTimePast(requestedDate, slot.end_time, slot.slot_name));
                          const isAvailable = slot.is_available && !isPast;

                          return (
                            <button
                              key={slot.id}
                              type="button"
                              disabled={!isAvailable}
                              onClick={() => setSelectedSlot(slot.slot_name)}
                              className={`relative p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-150 flex flex-col justify-between ${
                                isSelected
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200 ring-2 ring-emerald-600 ring-offset-2'
                                  : isPast
                                  ? 'bg-slate-100/90 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                                  : isAvailable
                                  ? 'bg-white hover:bg-emerald-50/50 border-slate-200 text-slate-800 hover:border-emerald-300'
                                  : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <Clock className={`w-4 h-4 ${isSelected ? 'text-white' : isPast ? 'text-amber-500' : isAvailable ? 'text-emerald-600' : 'text-slate-400'}`} />
                                <span
                                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                    isSelected
                                      ? 'bg-white/20 text-white'
                                      : isPast
                                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                      : isAvailable
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-slate-200 text-slate-600'
                                  }`}
                                >
                                  {isPast ? 'เลยเวลาจอง' : isAvailable ? `ว่าง ${slot.available_slots}/${slot.max_capacity}` : 'เต็ม'}
                                </span>
                              </div>
                              <div className="mt-2 font-bold text-base sm:text-lg tracking-tight">
                                {slot.slot_name}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Navigation Action Buttons for Step 1 */}
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={loadingSlots || isBlocked || !selectedSlot}
                  className={`px-6 py-3.5 rounded-2xl font-bold text-sm sm:text-base flex items-center gap-2 shadow-md transition ${
                    loadingSlots || isBlocked || !selectedSlot
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 active:scale-95'
                  }`}
                >
                  <span>ขั้นตอนถัดไป (ข้อมูลผู้ส่งและรถ)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </section>
          )}

          {/* STEP 2: Shipper & Delivery Information */}
          {currentStep === 2 && (
            <section className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5 text-slate-900 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-extrabold text-base">
                  2
                </div>
                <div>
                  <h2 className="text-xl font-bold">ข้อมูลการขนส่งและสินค้า</h2>
                  <p className="text-xs text-slate-500">ข้อมูลนี้จะถูกส่งไปที่ป้อม รปภ. เพื่อตรวจสอบรถเข้าพื้นที่คลังสินค้า</p>
                </div>
              </div>

              {/* Datalist Auto-Suggestions for frequent carriers and clients */}
              <datalist id="carrier-suggestions">
                {carrierSuggestions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <datalist id="client-suggestions">
                {clientSuggestions.map((cl) => (
                  <option key={cl} value={cl} />
                ))}
              </datalist>

              {/* LocalStorage Pre-filled banner */}
              {isPreFilledFromLocal && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 text-emerald-900 shadow-sm animate-in fade-in duration-300">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">นำข้อมูลล่าสุดของคุณมาใส่ให้อัตโนมัติแล้ว</p>
                      <p className="text-xs text-emerald-700 truncate">สามารถแก้ไขข้อมูลสำหรับการจองรอบนี้ หรือกดล้างข้อมูลได้</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearSavedProfile}
                    className="shrink-0 text-xs text-emerald-800 hover:text-rose-600 bg-white hover:bg-rose-50 border border-emerald-200 hover:border-rose-200 px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
                    title="ล้างข้อมูลและกรอกใหม่"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>ล้างข้อมูล</span>
                  </button>
                </div>
              )}

              {/* Cargo Type Selection */}
              <div className="space-y-2">
                <label className="block text-base font-semibold text-slate-800">
                  <span className="text-rose-500">*</span> ประเภทสินค้า (Cargo Category)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {cargoTypes.map((item) => {
                    const isSelected = cargoType === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setCargoType(item.id)}
                        className={`p-4 rounded-2xl border text-left transition flex items-start justify-between gap-2 ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-600/30 shadow-sm'
                            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70'
                        }`}
                      >
                        <div className="space-y-1">
                          <span className={`text-base font-bold ${isSelected ? 'text-emerald-900' : 'text-slate-800'}`}>
                            {item.title}
                          </span>
                          <p className="text-xs sm:text-sm text-slate-600">{item.desc}</p>
                        </div>
                        <div className="mt-1 shrink-0">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'
                          }`}>
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="block text-base font-semibold text-slate-800">
                    <span className="text-rose-500">*</span> เบอร์โทรศัพท์ติดต่อ
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-5 h-5" />
                    </div>
                    <input
                      type="tel"
                      required
                      placeholder="08X-XXX-XXXX"
                      maxLength={12}
                      value={userPhone}
                      onChange={handlePhoneChange}
                      className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition text-slate-900 font-semibold text-base"
                    />
                    {lookingUpPhone && (
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-emerald-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">ระบบจัดรูปแบบ 08X-XXX-XXXX ให้อัตโนมัติ</p>
                </div>

                {/* Carrier Name */}
                <div className="space-y-1.5">
                  <label className="block text-base font-semibold text-slate-800">
                    <span className="text-rose-500">*</span> ชื่อบริษัทขนส่ง / ผู้ให้บริการ
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Truck className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      required
                      list="carrier-suggestions"
                      placeholder="เช่น Kerry Express, Flash Express, ขนส่งเอกชน..."
                      value={carrierName}
                      onChange={(e) => setCarrierName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition text-slate-900 text-base"
                    />
                  </div>
                </div>

                {/* Cloud Profile Suggestion Card (If phone matches past bookings) */}
                {cloudProfileFound && (
                  <div className="sm:col-span-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl p-4 text-amber-950 shadow-sm space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
                        <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>พบประวัติการจองเดิมจากเบอร์โทรนี้ ({cloudProfileFound.booking_count} ครั้งล่าสุด)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCloudProfileFound(null)}
                        className="text-amber-500 hover:text-amber-700 p-1 rounded-lg hover:bg-amber-100/60 transition"
                        title="ปิดการแจ้งเตือน"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="bg-white/90 rounded-xl p-3 text-xs sm:text-sm border border-amber-200/60 text-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                      <div><span className="text-slate-500">ผู้ส่ง/คนขับ:</span> <strong className="text-slate-900">{cloudProfileFound.driver_name || '-'}</strong></div>
                      <div><span className="text-slate-500">บริษัทขนส่ง:</span> <strong className="text-slate-900">{cloudProfileFound.carrier_name || '-'}</strong></div>
                      <div><span className="text-slate-500">เจ้าของสินค้า:</span> <strong className="text-slate-900">{cloudProfileFound.client_name || '-'}</strong></div>
                      <div><span className="text-slate-500">ทะเบียนรถ:</span> <strong className="text-slate-900">{cloudProfileFound.license_plate || '-'}</strong></div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setCloudProfileFound(null)}
                        className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-medium rounded-lg hover:bg-amber-100/50 transition"
                      >
                        ไม่ใช้ข้อมูลนี้
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyCloudProfile}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 active:scale-95"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>ดึงข้อมูลมาใส่ให้อัตโนมัติ</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Client Name */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-base font-semibold text-slate-800">
                    <span className="text-rose-500">*</span> บริษัทเจ้าของสินค้า / ผู้ส่งต้นทาง
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      required
                      list="client-suggestions"
                      placeholder="เช่น บจก. พีทีเอ็น เภสัชภัณฑ์, โรงงานผู้ผลิต..."
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition text-slate-900 text-base"
                    />
                  </div>
                </div>

                {/* Vehicle Type */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-base font-semibold text-slate-800">
                    <span className="text-rose-500">*</span> ประเภทรถขนส่ง (Vehicle Type)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {vehicleTypes.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setVehicleType(v)}
                        className={`px-3.5 py-3 rounded-xl border text-sm font-semibold text-left transition flex items-center justify-between ${
                          vehicleType === v
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span className="truncate">{v}</span>
                        {vehicleType === v && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Driver Name */}
                <div className="space-y-1.5">
                  <label className="block text-base font-semibold text-slate-800">
                    <span className="text-rose-500">*</span> ชื่อผู้ส่งสินค้า / คนขับรถ
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="เช่น สมชาย ใจดี"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition text-slate-900 text-base"
                    />
                  </div>
                </div>

                {/* License Plate */}
                <div className="space-y-1.5">
                  <label className="block text-base font-semibold text-slate-800">
                    ทะเบียนรถ <span className="text-xs text-slate-500 font-normal">(ระบุหรือไม่ก็ได้)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Car className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      placeholder="เช่น 1กข-1234 กทม."
                      value={licensePlate}
                      onChange={(e) => setLicensePlate(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition text-slate-900 text-base"
                    />
                  </div>
                </div>
              </div>

              {/* Remember Profile Option */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-3">
                <input
                  type="checkbox"
                  id="remember-profile-checkbox"
                  checked={rememberProfile}
                  onChange={(e) => setRememberProfile(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                />
                <label
                  htmlFor="remember-profile-checkbox"
                  className="text-xs sm:text-sm text-slate-700 font-medium cursor-pointer select-none"
                >
                  จดจำข้อมูลของฉันสำหรับการจองครั้งถัดไปในเครื่องนี้ (เบอร์โทร, ชื่อผู้ส่ง, บริษัท, ทะเบียน)
                </label>
              </div>

              {/* Navigation Action Buttons for Step 2 */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="px-5 py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>ย้อนกลับ</span>
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm sm:text-base shadow-md shadow-emerald-200 active:scale-95 transition flex items-center gap-2"
                >
                  <span>ขั้นตอนถัดไป (สินค้าและเอกสาร)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </section>
          )}

          {/* STEP 3: Pallets, Cargo, Notes & Photo Attachment */}
          {currentStep === 3 && (
            <section className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5 text-slate-900 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-extrabold text-base">
                  3
                </div>
                <div>
                  <h2 className="text-xl font-bold">จำนวนสินค้าและเอกสารประกอบ</h2>
                  <p className="text-xs text-slate-500">ช่วยให้ทีมคลังจัดสรรกำลังพลและ Forklift เทียบท่าได้อย่างรวดเร็ว</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Pallet/Crate Count with Stepper */}
                <div className="space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <label className="block text-base font-semibold text-slate-800">
                    <span className="text-rose-500">*</span> จำนวนลัง
                  </label>
                  <div className="relative flex items-center pt-2">
                    <button
                      type="button"
                      onClick={() => setPalletCount((prev) => Math.max(1, (Number(prev) || 1) - 1))}
                      className="w-12 h-12 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-l-2xl font-bold flex items-center justify-center text-xl transition shadow-2xs active:scale-95 shrink-0"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="ระบุจำนวนลัง"
                      value={palletCount}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setPalletCount('');
                        } else {
                          const num = parseInt(val, 10);
                          setPalletCount(isNaN(num) ? '' : Math.max(1, num));
                        }
                      }}
                      onBlur={() => {
                        if (palletCount === '' || Number(palletCount) < 1) {
                          setPalletCount(1);
                        }
                      }}
                      className="w-full py-3 text-center bg-white border-y border-slate-300 text-emerald-800 font-extrabold text-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:z-10"
                    />
                    <button
                      type="button"
                      onClick={() => setPalletCount((prev) => (Number(prev) || 0) + 1)}
                      className="w-12 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-r-2xl font-bold flex items-center justify-center text-xl transition shadow-md shadow-emerald-200 active:scale-95 shrink-0"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">สามารถพิมพ์ตัวเลขได้โดยตรง หรือกดปุ่ม + / - เพื่อปรับจำนวน</p>
                </div>

                {/* Vehicle Count with Stepper */}
                <div className="space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <label className="block text-base font-semibold text-slate-800">
                    <span className="text-rose-500">*</span> จำนวนรถขนส่ง
                  </label>
                  <div className="relative flex items-center pt-2">
                    <button
                      type="button"
                      onClick={() => setVehicleCount((prev) => Math.max(1, (Number(prev) || 1) - 1))}
                      className="w-12 h-12 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-l-2xl font-bold flex items-center justify-center text-xl transition shadow-2xs active:scale-95 shrink-0"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="ระบุจำนวนคัน"
                      value={vehicleCount}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setVehicleCount('');
                        } else {
                          const num = parseInt(val, 10);
                          setVehicleCount(isNaN(num) ? '' : Math.max(1, num));
                        }
                      }}
                      onBlur={() => {
                        if (vehicleCount === '' || Number(vehicleCount) < 1) {
                          setVehicleCount(1);
                        }
                      }}
                      className="w-full py-3 text-center bg-white border-y border-slate-300 text-slate-900 font-extrabold text-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:z-10"
                    />
                    <button
                      type="button"
                      onClick={() => setVehicleCount((prev) => (Number(prev) || 0) + 1)}
                      className="w-12 h-12 bg-slate-800 hover:bg-slate-900 text-white rounded-r-2xl font-bold flex items-center justify-center text-xl transition shadow-sm active:scale-95 shrink-0"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">สามารถพิมพ์ตัวเลขได้โดยตรง หรือกดปุ่ม + / - เพื่อปรับจำนวน</p>
                </div>

                {/* Notes */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-base font-semibold text-slate-800">
                    หมายเหตุเพิ่มเติม <span className="text-xs text-slate-500 font-normal">(ถ้ามี)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="เช่น ต้องการรถโฟล์คลิฟท์ช่วยยก, สินค้าควบคุมอุณหภูมิ, เอกสารวางบิล ฯลฯ"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition text-slate-900 text-base"
                  />
                </div>

                {/* Photo Attachment Section */}
                <div className="space-y-2 sm:col-span-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="block text-base font-semibold text-slate-800 flex items-center gap-2">
                      <Camera className="w-5 h-5 text-emerald-600" />
                      <span>แนบรูปถ่ายใบส่งของ / เอกสาร หรือรูปสินค้า</span>
                      <span className="text-xs text-slate-500 font-normal">(ไม่บังคับ)</span>
                    </label>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-bold">
                      {attachedPhotos.length}/5 รูป
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500">
                    รองรับรูปถ่ายจากกล้องมือถือ ระบบจะย่อขนาดรูปให้อัตโนมัติ เพื่อการโหลดที่รวดเร็ว
                  </p>

                  {photoError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm font-medium">
                      {photoError}
                    </div>
                  )}

                  {attachedPhotos.length === 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50 rounded-2xl cursor-pointer transition text-center group">
                        <div className="w-12 h-12 bg-emerald-100 group-hover:scale-110 text-emerald-700 rounded-full flex items-center justify-center mb-2 transition">
                          <Camera className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-bold text-emerald-900">ถ่ายรูปจากกล้องมือถือ</span>
                        <span className="text-xs text-emerald-700/80">กดถ่ายใบส่งของ หรือสภาพสินค้า</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handlePhotoChange}
                          disabled={compressingPhoto}
                          className="hidden"
                        />
                      </label>

                      <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50/70 hover:bg-slate-100 rounded-2xl cursor-pointer transition text-center group">
                        <div className="w-12 h-12 bg-slate-200 group-hover:scale-110 text-slate-700 rounded-full flex items-center justify-center mb-2 transition">
                          <Upload className="w-6 h-6" />
                        </div>
                        <span className="text-sm font-bold text-slate-800">เลือกรูปจากคลังภาพ / ไฟล์</span>
                        <span className="text-xs text-slate-500">รองรับไฟล์ JPG, PNG, WEBP (เลือกได้หลายรูป)</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handlePhotoChange}
                          disabled={compressingPhoto}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {attachedPhotos.map((photo, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-50 rounded-2xl border border-slate-200 p-3 flex items-center justify-between gap-2.5 hover:border-slate-300 transition"
                          >
                            <div
                              onClick={() => {
                                setGalleryActiveIndex(idx);
                                setGalleryModalOpen(true);
                              }}
                              className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-300 bg-slate-900 shrink-0 cursor-pointer group hover:ring-2 hover:ring-emerald-500 transition shadow-xs"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={photo.dataUrl}
                                alt={`รูปที่ ${idx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                                <Eye className="w-3.5 h-3.5" />
                              </div>
                              <span className="absolute bottom-0.5 right-0.5 text-[9px] font-mono font-bold text-white bg-black/70 px-1 rounded">
                                #{idx + 1}
                              </span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {photo.file.name}
                              </p>
                              <p className="text-[11px] text-emerald-700 font-medium">
                                {formatFileSize(photo.stats.compressedSize)}
                              </p>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setGalleryActiveIndex(idx);
                                  setGalleryModalOpen(true);
                                }}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition"
                                title="ดูภาพขยาย"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(idx)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                                title="ลบรูปนี้"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add More Buttons (if < 5 photos) */}
                      {attachedPhotos.length < 5 && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <label className="px-3 py-1.5 rounded-xl border border-dashed border-emerald-400 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold cursor-pointer transition flex items-center gap-1.5 shadow-2xs">
                            <Camera className="w-3.5 h-3.5 text-emerald-600" />
                            <span>+ ถ่ายรูปเพิ่ม</span>
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={handlePhotoChange}
                              disabled={compressingPhoto}
                              className="hidden"
                            />
                          </label>

                          <label className="px-3 py-1.5 rounded-xl border border-dashed border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer transition flex items-center gap-1.5 shadow-2xs">
                            <Upload className="w-3.5 h-3.5 text-slate-500" />
                            <span>+ เลือกรูปเพิ่มจากไฟล์</span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handlePhotoChange}
                              disabled={compressingPhoto}
                              className="hidden"
                            />
                          </label>

                          <span className="text-xs text-slate-400 font-medium ml-auto">
                            แนบได้อีก {5 - attachedPhotos.length} รูป
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {compressingPhoto && (
                    <div className="flex items-center gap-2 text-sm text-emerald-700 font-medium p-2">
                      <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      <span>กำลังย่อขนาดรูปภาพความละเอียดสูง...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation Action Buttons for Step 3 */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="px-5 py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>ย้อนกลับ</span>
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm sm:text-base shadow-md shadow-emerald-200 active:scale-95 transition flex items-center gap-2"
                >
                  <span>ตรวจสอบข้อมูลสรุป</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </section>
          )}

          {/* STEP 4: Review & Confirm */}
          {currentStep === 4 && (
            <section className="space-y-6 animate-in fade-in duration-200">
              <div className="text-center py-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ขั้นตอนสุดท้าย
                </span>
                <h2 className="text-2xl font-black text-slate-900">ตรวจสอบและยืนยันการจองคิว</h2>
                <p className="text-xs sm:text-sm text-slate-500">กรุณาตรวจสอบความถูกต้องของข้อมูลก่อนกดยืนยันออกบัตรคิว</p>
              </div>

              {/* Digital Pass Preview Card */}
              <div className="max-w-lg mx-auto bg-gradient-to-b from-emerald-800 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-emerald-500/40 relative overflow-hidden">
                <div className="flex justify-between items-start border-b border-emerald-600/50 pb-3 mb-4">
                  <div>
                    <span className="text-2xs text-emerald-300 font-bold uppercase tracking-wider">PTN Logistics Queue Pass</span>
                    <h4 className="text-lg font-black">บจก. พีทีเอ็น ฟาร์มาเซ็นเตอร์</h4>
                  </div>
                  <span className="px-2.5 py-0.5 bg-amber-400 text-slate-950 font-black text-xs rounded-full">
                    รอส่งจองคิว
                  </span>
                </div>

                <div className="space-y-2.5 text-xs sm:text-sm text-slate-200">
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-slate-400">วันที่ต้องการเข้าส่ง:</span>
                    <strong className="text-white font-bold">{formatThaiDateDisplay(requestedDate)}</strong>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-slate-400">รอบเวลา (Time Slot):</span>
                    <strong className="text-emerald-300 font-extrabold">{selectedSlot}</strong>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-slate-400">บริษัทขนส่ง:</span>
                    <strong className="text-white font-bold truncate max-w-[200px]">{carrierName}</strong>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-slate-400">เจ้าของสินค้า / ผู้รับ:</span>
                    <strong className="text-white font-bold truncate max-w-[200px]">{clientName}</strong>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-slate-400">ผู้ส่งสินค้า / คนขับ:</span>
                    <strong className="text-white font-bold truncate max-w-[200px]">{driverName}</strong>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-slate-400">เบอร์โทรติดต่อ:</span>
                    <strong className="text-white font-mono font-bold">{userPhone}</strong>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-slate-400">ประเภทรถ / ทะเบียน:</span>
                    <strong className="text-white font-bold">{licensePlate || '-'} ({vehicleType})</strong>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-slate-400">จำนวนสินค้า:</span>
                    <strong className="text-emerald-300 font-extrabold">{palletCount} ลัง ({vehicleCount} คัน)</strong>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-slate-400">ประเภทสินค้า:</span>
                    <strong className="text-white text-xs">{cargoType}</strong>
                  </div>
                  {attachedPhotos.length > 0 && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-slate-400">เอกสาร/รูปภาพแนบ:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setGalleryActiveIndex(0);
                          setGalleryModalOpen(true);
                        }}
                        className="text-xs text-emerald-300 underline font-bold hover:text-emerald-200"
                      >
                        ดูรูปภาพแนบ ({attachedPhotos.length} รูป)
                      </button>
                    </div>
                  )}
                  {notes && (
                    <div className="pt-2 text-xs text-slate-300">
                      <span className="text-slate-400 block">หมายเหตุ:</span>
                      <p className="italic bg-white/5 p-2 rounded-lg mt-1">{notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button & Prev Button */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={submitting}
                  className="px-5 py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>แก้ไขข้อมูล</span>
                </button>

                <button
                  type="submit"
                  disabled={submitting || isBlocked || !selectedSlot}
                  className={`flex-1 sm:flex-initial px-8 py-4 rounded-2xl font-bold text-base sm:text-lg flex items-center justify-center gap-2 shadow-lg transition-all duration-200 ${
                    submitting || isBlocked || !selectedSlot
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 hover:shadow-emerald-300 active:scale-[0.99]'
                  }`}
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>กำลังสร้างคิวและออกบัตร...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 text-emerald-200" />
                      <span>ยืนยันการจองคิวส่งของ</span>
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </section>
          )}

          {/* Error Message Box */}
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <p className="text-sm font-medium">{errorMessage}</p>
            </div>
          )}
        </form>
      </div>

      {/* 🖼️ Multi-Photo Lightbox Gallery Modal */}
      <ImageGalleryModal
        images={attachedPhotos.map((p) => p.dataUrl)}
        initialIndex={galleryActiveIndex}
        title="รูปถ่ายใบส่งของ / เอกสารแนบ"
        isOpen={galleryModalOpen}
        onClose={() => setGalleryModalOpen(false)}
      />
    </div>
  </div>
);
}
