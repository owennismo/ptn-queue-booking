'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  Truck,
  Phone,
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
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatThaiDate, formatThaiShortDate, formatPhoneMask } from '@/lib/dateUtils';
import ThaiDatePicker from '@/components/ThaiDatePicker';
import { compressImage, formatFileSize } from '@/lib/imageCompressor';

interface Slot {
  id: number;
  slot_name: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  booked_count: number;
  available_slots: number;
  is_available: boolean;
}

export default function BookingPage() {
  const router = useRouter();

  // Today string YYYY-MM-DD
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
  const [palletCount, setPalletCount] = useState<number>(1);
  const [vehicleCount, setVehicleCount] = useState<number>(1);
  const [vehicleType, setVehicleType] = useState<string>('รถกระบะ 4 ล้อ (ตู้ทึบ/คอก)');
  const [cargoType, setCargoType] = useState<string>('ยาและเวชภัณฑ์ทั่วไป (Room Temp 15-30°C)');
  const [driverName, setDriverName] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [notes, setNotes] = useState('');

  // Photo Attachment State
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoStats, setPhotoStats] = useState<{ originalSize: number; compressedSize: number } | null>(null);
  const [compressingPhoto, setCompressingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Photo file selection and auto-compression handler
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressingPhoto(true);
    setPhotoError(null);

    try {
      const result = await compressImage(file, 1600, 0.82);
      setPhotoFile(result.file);
      setPhotoPreview(result.dataUrl);
      setPhotoStats({
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
      });
    } catch (err: any) {
      console.error('Image compression error:', err);
      setPhotoError(err.message || 'ไม่สามารถบีบอัดรูปภาพได้');
    } finally {
      setCompressingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoStats(null);
    setPhotoError(null);
  };

  // Phone Input Masking (08X-XXX-XXXX / 0XX-XXX-XXXX)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserPhone(formatPhoneMask(e.target.value));
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

    setSubmitting(true);

    try {
      let uploadedPhotoUrl: string | null = null;

      // 1. If user attached a photo, upload it to Cloudflare R2 via /api/upload
      if (photoPreview) {
        try {
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dataUrl: photoPreview,
              filename: photoFile?.name || 'delivery-doc.webp',
              booking_id: 'new',
            }),
          });
          const uploadData = await uploadRes.json();
          if (uploadRes.ok && uploadData.url) {
            uploadedPhotoUrl = uploadData.url;
          }
        } catch (uploadErr) {
          console.warn('Photo upload warning, proceeding with booking:', uploadErr);
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
          pallet_count: palletCount,
          vehicle_count: vehicleCount,
          vehicle_type: vehicleType,
          cargo_type: cargoType,
          requested_date: requestedDate,
          requested_time: selectedSlot,
          driver_name: driverName,
          license_plate: licensePlate,
          notes: notes,
          photo_url: uploadedPhotoUrl,
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
      {/* 🌟 TOP GLOBAL TRUST & DIRECT CONTACT HEADER */}
      <header className="bg-white/95 backdrop-blur border-b border-slate-200/80 sticky top-0 z-40 shadow-xs no-print">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Company Brand */}
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white flex items-center justify-center font-black text-lg shadow-md shadow-emerald-900/20">
              P
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
                  PTN PHARMA CENTER
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  พัฒนาเภสัช
                </span>
              </div>
              <span className="text-xs text-slate-600 font-medium block">
                ระบบนัดหมายจองคิวส่งสินค้าคลังยาและเวชภัณฑ์
              </span>
            </div>
          </div>

          {/* Contact Badges (Phone & LINE) */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-start sm:justify-end flex-wrap">
            {/* Phone Badge */}
            <a
              href="tel:0993787463"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-sm font-bold transition shadow-2xs group"
              title="โทรติดต่อแผนกรับสินค้าโดยตรง"
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center group-hover:scale-110 transition shadow-xs">
                <Phone className="w-3.5 h-3.5" />
              </div>
              <span>
                แผนกรับสินค้า: <strong className="text-emerald-700 font-mono">099-378-7463</strong>
              </span>
            </a>

            {/* LINE ID Badge */}
            <a
              href="https://line.me/ti/p/~ptnexpress"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#06C755]/10 hover:bg-[#06C755]/20 text-[#048737] border border-[#06C755]/30 text-sm font-bold transition shadow-2xs group"
              title="เพิ่มเพื่อนทาง LINE"
            >
              <div className="w-6 h-6 rounded-lg bg-[#06C755] text-white flex items-center justify-center group-hover:scale-110 transition shadow-xs">
                <MessageCircle className="w-4 h-4" />
              </div>
              <span>
                LINE ID: <strong className="text-[#036d2c] font-mono">ptnexpress</strong>
              </span>
            </a>
          </div>
        </div>
      </header>

      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Hero & Company Branding Banner */}
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
            <div className="relative z-10 max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 bg-emerald-500/30 border border-emerald-400/40 rounded-full px-3.5 py-1 text-xs sm:text-sm font-semibold text-emerald-100 backdrop-blur">
                <Sparkles className="w-4 h-4 text-emerald-300" />
                <span>ระบบจองคิวออนไลน์ Serverless • สะดวก รวดเร็ว</span>
              </div>
              <div>
                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                  จองคิวเข้าส่งสินค้า
                </h1>
                <p className="text-emerald-100/90 text-sm sm:text-base mt-1.5 font-normal">
                  บริษัท พีทีเอ็น ฟาร์มาเซ็นเตอร์ จำกัด (พัฒนาเภสัช)
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

              {/* Direct Hero Contact Strip */}
              <div className="pt-3 border-t border-white/15 flex flex-wrap items-center gap-2.5 text-xs sm:text-sm">
                <span className="text-emerald-200 text-xs sm:text-sm font-medium">ติดต่อฝ่ายรับสินค้า:</span>
                <a
                  href="tel:0993787463"
                  className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-3.5 py-1.5 rounded-xl border border-white/20 text-white font-bold transition backdrop-blur-sm shadow-xs"
                >
                  <Phone className="w-4 h-4 text-emerald-300" />
                  <span>โทร: 099-378-7463</span>
                </a>
                <a
                  href="https://line.me/ti/p/~ptnexpress"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-[#06C755]/30 hover:bg-[#06C755]/40 px-3.5 py-1.5 rounded-xl border border-[#06C755]/40 text-white font-bold transition backdrop-blur-sm shadow-xs"
                >
                  <MessageCircle className="w-4 h-4 text-[#42ff84]" />
                  <span>LINE ID: ptnexpress</span>
                </a>
              </div>
            </div>
            {/* Subtle Background Art */}
            <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          </div>

        {/* Main Booking Form Card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 sm:p-8 space-y-8">
          {/* Step 1: Select Date & Time Slot */}
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 text-slate-900 pb-2 border-b border-slate-100">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-extrabold text-base">
                1
              </div>
              <h2 className="text-xl font-bold">เลือกวันและรอบเวลาที่ต้องการเข้าส่ง</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date Input with Thai Buddhist Era (พ.ศ.) Picker */}
              <div className="space-y-1.5 sm:col-span-2">
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
                      const isAvailable = slot.is_available;

                      return (
                        <button
                          key={slot.id}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => setSelectedSlot(slot.slot_name)}
                          className={`relative p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-150 flex flex-col justify-between ${
                            isSelected
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200 ring-2 ring-emerald-600 ring-offset-2'
                              : isAvailable
                              ? 'bg-white hover:bg-emerald-50/50 border-slate-200 text-slate-800 hover:border-emerald-300'
                              : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <Clock className={`w-4 h-4 ${isSelected ? 'text-white' : isAvailable ? 'text-emerald-600' : 'text-slate-400'}`} />
                            <span
                              className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : isAvailable
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {isAvailable ? `ว่าง ${slot.available_slots}/${slot.max_capacity}` : 'เต็ม'}
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
          </section>

          {/* Step 2: Shipper & Delivery Information */}
          <section className="space-y-5">
            <div className="flex items-center gap-2.5 text-slate-900 pb-2 border-b border-slate-100">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-extrabold text-base">
                2
              </div>
              <h2 className="text-xl font-bold">ข้อมูลการขนส่งและสินค้า</h2>
            </div>

            {/* Cargo Type Selection (ยาธรรมดา vs ยาเย็น) */}
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
                        <div className="flex items-center gap-2">
                          <span className={`text-base font-bold ${isSelected ? 'text-emerald-900' : 'text-slate-800'}`}>
                            {item.title}
                          </span>
                        </div>
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
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition text-slate-900 font-semibold text-base"
                  />
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
                    placeholder="เช่น Kerry Express, Flash Express, ขนส่งเอกชน..."
                    value={carrierName}
                    onChange={(e) => setCarrierName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition text-slate-900 text-base"
                  />
                </div>
              </div>

              {/* Client Name (Owner of Cargo / Destination) */}
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
                    placeholder="เช่น บจก. พีทีเอ็น เภสัชภัณฑ์, โรงงานผู้ผลิต..."
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition text-slate-900 text-base"
                  />
                </div>
              </div>

              {/* Vehicle Type (ประเภทรถ) */}
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

              {/* Pallet/Crate Count */}
              <div className="space-y-1.5">
                <label className="block text-base font-semibold text-slate-800">
                  <span className="text-rose-500">*</span> จำนวนลัง
                </label>
                <div className="relative flex items-center">
                  <button
                    type="button"
                    onClick={() => setPalletCount((prev) => Math.max(1, prev - 1))}
                    className="w-12 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-l-xl font-bold flex items-center justify-center text-xl transition"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    required
                    value={palletCount}
                    onChange={(e) => setPalletCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full py-3 text-center bg-slate-50 border-y border-slate-300 text-slate-900 font-bold text-lg focus:outline-none focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setPalletCount((prev) => prev + 1)}
                    className="w-12 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-r-xl font-bold flex items-center justify-center text-xl transition"
                  >
                    +
                  </button>
                </div>
                <p className="text-xs text-slate-500">ระบุจำนวนลังสินค้าทั้งหมด</p>
              </div>

              {/* Vehicle Count */}
              <div className="space-y-1.5">
                <label className="block text-base font-semibold text-slate-800">
                  <span className="text-rose-500">*</span> จำนวนรถขนส่ง
                </label>
                <div className="relative flex items-center">
                  <button
                    type="button"
                    onClick={() => setVehicleCount((prev) => Math.max(1, prev - 1))}
                    className="w-12 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-l-xl font-bold flex items-center justify-center text-xl transition"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    required
                    value={vehicleCount}
                    onChange={(e) => setVehicleCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full py-3 text-center bg-slate-50 border-y border-slate-300 text-slate-900 font-bold text-lg focus:outline-none focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setVehicleCount((prev) => prev + 1)}
                    className="w-12 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-r-xl font-bold flex items-center justify-center text-xl transition"
                  >
                    +
                  </button>
                </div>
                <p className="text-xs text-slate-500">ระบุจำนวนคันรถ</p>
              </div>

              {/* Sender Name (ผู้ส่งสินค้า) */}
              <div className="space-y-1.5">
                <label className="block text-base font-semibold text-slate-800">
                  ชื่อผู้ส่งสินค้า <span className="text-xs text-slate-500 font-normal">(ระบุหรือไม่ก็ได้)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    placeholder="เช่น สมชาย ใจดี"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition text-slate-900 text-base"
                  />
                </div>
              </div>

              {/* License Plate (Optional) */}
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

              {/* Notes */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-base font-semibold text-slate-800">
                  หมายเหตุเพิ่มเติม <span className="text-xs text-slate-500 font-normal">(ถ้ามี)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="เช่น ต้องการรถโฟล์คลิฟท์ช่วยยก, สินค้าควบคุมอุณหภูมิ, ฯลฯ"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition text-slate-900 text-base"
                />
              </div>

              {/* 📷 Photo Attachment Section (Delivery Note / Invoice / Cargo Photo) */}
              <div className="space-y-2 sm:col-span-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-base font-semibold text-slate-800 flex items-center gap-2">
                    <Camera className="w-5 h-5 text-emerald-600" />
                    <span>แนบรูปถ่ายใบส่งของ / เอกสาร หรือรูปสินค้า</span>
                    <span className="text-xs text-slate-500 font-normal">(ไม่บังคับ)</span>
                  </label>
                </div>
                <p className="text-xs sm:text-sm text-slate-500">
                  รองรับรูปถ่ายจากกล้องมือถือ ระบบจะย่อขนาดรูปให้อัตโนมัติ เพื่อการโหลดที่รวดเร็ว
                </p>

                {photoError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm font-medium">
                    {photoError}
                  </div>
                )}

                {!photoPreview ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Option A: Open Camera on Mobile */}
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

                    {/* Option B: Choose from Photo Gallery / File */}
                    <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50/70 hover:bg-slate-100 rounded-2xl cursor-pointer transition text-center group">
                      <div className="w-12 h-12 bg-slate-200 group-hover:scale-110 text-slate-700 rounded-full flex items-center justify-center mb-2 transition">
                        <Upload className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-bold text-slate-800">เลือกรูปจากคลังภาพ / ไฟล์</span>
                      <span className="text-xs text-slate-500">รองรับไฟล์ JPG, PNG, WEBP</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        disabled={compressingPhoto}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-300 bg-slate-900 shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photoPreview}
                            alt="Attached Document"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-sm font-bold text-slate-900 truncate max-w-xs">
                            {photoFile?.name || 'เอกสารที่แนบ'}
                          </p>
                          {photoStats && (
                            <p className="text-xs text-emerald-700 font-medium">
                              ย่อขนาดเรียบร้อย: {formatFileSize(photoStats.compressedSize)}{' '}
                              <span className="text-slate-500">
                                (จากเดิม {formatFileSize(photoStats.originalSize)})
                              </span>
                            </p>
                          )}
                          <span className="inline-block px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-md">
                            พร้อมอัปโหลด
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const w = window.open('');
                            w?.document.write(`<img src="${photoPreview}" style="max-width:100%; height:auto;" />`);
                          }}
                          className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition"
                        >
                          <Eye className="w-4 h-4" />
                          <span>ดูรูปเต็ม</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="px-3.5 py-2 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>ลบรูป</span>
                        </button>
                      </div>
                    </div>
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
          </section>

          {/* Error Message Box */}
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <p className="text-sm font-medium">{errorMessage}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting || isBlocked || !selectedSlot}
              className={`w-full py-4 px-6 rounded-2xl font-bold text-base sm:text-lg flex items-center justify-center gap-2 shadow-lg transition-all duration-200 ${
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
                  <span>ยืนยันการจองคิวส่งของ</span>
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
            <p className="text-center text-xs sm:text-sm text-slate-500 mt-2">
              เมื่อกดจองคิว ระบบจะสร้าง Booking ID และแสดงสถานะ Pending เพื่อรอเจ้าหน้าที่คลังสินค้าอนุมัติ
            </p>
          </div>
        </form>
      </div>
    </div>
  </div>
);
}
