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
} from 'lucide-react';
import confetti from 'canvas-confetti';

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
  const [driverName, setDriverName] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Common Carrier suggestions
  const carrierSuggestions = [
    'Kerry Express',
    'Flash Express',
    'DHL Supply Chain',
    'SCG Logistics',
    'รถร่วมบริการขนส่ง',
    'ขนส่งประจำบริษัท',
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
          setSlots(data.slots || []);
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
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_phone: userPhone,
          carrier_name: carrierName,
          client_name: clientName,
          pallet_count: palletCount,
          vehicle_count: vehicleCount,
          requested_date: requestedDate,
          requested_time: selectedSlot,
          driver_name: driverName,
          license_plate: licensePlate,
          notes: notes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'การจองไม่สำเร็จ');
      }

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
      router.push(`/booking/${data.booking.booking_id}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการจองคิว');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Hero & Company Branding Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-emerald-500/30 border border-emerald-400/40 rounded-full px-3 py-1 text-xs font-semibold text-emerald-100 mb-4 backdrop-blur">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>ระบบจองคิวออนไลน์ Serverless • สะดวก รวดเร็ว</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              จองคิวเข้าส่งสินค้า
            </h1>
            <p className="text-emerald-100/90 text-sm sm:text-base mt-2 font-light">
              บริษัท พีทีเอ็น ฟาร์มาเซ็นเตอร์ จำกัด (พัฒนาเภสัช)
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-emerald-200/90">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> ไม่ต้องสมัครสมาชิก
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> ตรวจสอบสล็อตว่าง Real-time
              </span>
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-400" /> รับบัตรคิวพร้อม QR Code ทันที
              </span>
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
              <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h2 className="text-lg font-bold">เลือกวันและรอบเวลาที่ต้องการเข้าส่ง</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date Input */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  <span className="text-rose-500">*</span> วันที่ต้องการเข้าส่ง
                </label>
                <div className="relative">
                  <input
                    type="date"
                    min={getTodayStr()}
                    value={requestedDate}
                    onChange={(e) => setRequestedDate(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition text-slate-900 font-medium"
                  />
                </div>
                <p className="text-xs text-slate-500">เลือกวันที่เปิดรับส่งสินค้า</p>
              </div>
            </div>

            {/* Blocked Date Alert */}
            {isBlocked && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm">วันที่ {requestedDate} ปิดรับจองคิว</h4>
                  <p className="text-xs text-amber-800 mt-0.5">{blockReason || 'ขออภัย วันดังกล่าวปิดทำการหรือไม่เปิดรับส่งของ'}</p>
                  <p className="text-xs text-amber-700 mt-1">กรุณาเลือกวันอื่นที่เปิดให้บริการ</p>
                </div>
              </div>
            )}

            {/* Time Slot Selection */}
            {!isBlocked && (
              <div className="space-y-2 pt-2">
                <label className="block text-sm font-semibold text-slate-700">
                  <span className="text-rose-500">*</span> เลือกรอบเวลา (Time Slot)
                </label>

                {loadingSlots ? (
                  <div className="py-8 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    กำลังตรวจสอบรอบเวลาว่าง...
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4">ไม่พบช่วงเวลาทำการสำหรับวันที่เลือก</p>
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
                          className={`relative p-3.5 rounded-2xl border text-left transition-all duration-150 flex flex-col justify-between ${
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
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
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
                          <div className="mt-2 font-bold text-sm sm:text-base tracking-tight">
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
          <section className="space-y-4">
            <div className="flex items-center gap-2.5 text-slate-900 pb-2 border-b border-slate-100">
              <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h2 className="text-lg font-bold">ข้อมูลการขนส่งและสินค้า</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Phone */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  <span className="text-rose-500">*</span> เบอร์โทรศัพท์ติดต่อ
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="08X-XXX-XXXX"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition text-slate-900"
                  />
                </div>
              </div>

              {/* Carrier Name */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  <span className="text-rose-500">*</span> ชื่อบริษัทขนส่ง / ผู้ให้บริการ
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Truck className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="เช่น Kerry Express, Flash, ขนส่งเอกชน"
                    value={carrierName}
                    onChange={(e) => setCarrierName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition text-slate-900"
                  />
                </div>
                {/* Quick pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {carrierSuggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCarrierName(item)}
                      className="text-[11px] bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 px-2 py-0.5 rounded-md transition"
                    >
                      + {item}
                    </button>
                  ))}
                </div>
              </div>

              {/* Client Name (Owner of Cargo / Destination) */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-sm font-semibold text-slate-700">
                  <span className="text-rose-500">*</span> บริษัทเจ้าของสินค้า / ผู้ส่งต้นทาง
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="เช่น บจก. พีทีเอ็น เภสัชภัณฑ์, โรงงานผู้ผลิต..."
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition text-slate-900"
                  />
                </div>
              </div>

              {/* Pallet Count */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  <span className="text-rose-500">*</span> จำนวนลัง / พาเลท
                </label>
                <div className="relative flex items-center">
                  <button
                    type="button"
                    onClick={() => setPalletCount((prev) => Math.max(1, prev - 1))}
                    className="w-12 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-l-xl font-bold flex items-center justify-center text-lg transition"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    required
                    value={palletCount}
                    onChange={(e) => setPalletCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full py-3 text-center bg-slate-50 border-y border-slate-300 text-slate-900 font-bold focus:outline-none focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setPalletCount((prev) => prev + 1)}
                    className="w-12 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-r-xl font-bold flex items-center justify-center text-lg transition"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Vehicle Count */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  <span className="text-rose-500">*</span> จำนวนรถขนส่ง
                </label>
                <div className="relative flex items-center">
                  <button
                    type="button"
                    onClick={() => setVehicleCount((prev) => Math.max(1, prev - 1))}
                    className="w-12 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-l-xl font-bold flex items-center justify-center text-lg transition"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    required
                    value={vehicleCount}
                    onChange={(e) => setVehicleCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full py-3 text-center bg-slate-50 border-y border-slate-300 text-slate-900 font-bold focus:outline-none focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setVehicleCount((prev) => prev + 1)}
                    className="w-12 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-r-xl font-bold flex items-center justify-center text-lg transition"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Driver Name (Optional) */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  ชื่อคนขับรถ <span className="text-xs text-slate-400 font-normal">(ระบุหรือไม่ก็ได้)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="เช่น สมชาย ใจดี"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition text-slate-900"
                  />
                </div>
              </div>

              {/* License Plate (Optional) */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  ทะเบียนรถ <span className="text-xs text-slate-400 font-normal">(ระบุหรือไม่ก็ได้)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Car className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="เช่น 1กข-1234 กทม."
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition text-slate-900"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-sm font-semibold text-slate-700">
                  หมายเหตุเพิ่มเติม <span className="text-xs text-slate-400 font-normal">(ถ้ามี)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="เช่น ต้องการรถโฟล์คลิฟท์ช่วยยก, สินค้าควบคุมอุณหภูมิ, ฯลฯ"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition text-slate-900"
                />
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
            <p className="text-center text-xs text-slate-500 mt-2">
              เมื่อกดจองคิว ระบบจะสร้าง Booking ID และแสดงสถานะ Pending เพื่อรอเจ้าหน้าที่คลังสินค้าอนุมัติ
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
