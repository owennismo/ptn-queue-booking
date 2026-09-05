'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Phone,
  Hash,
  ArrowRight,
  Calendar,
  CalendarClock,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Truck,
  Camera,
  RefreshCw,
  Building2,
  Package,
  Layers,
  MessageCircle,
  Smartphone,
  ShieldCheck,
  PlusCircle,
  X,
} from 'lucide-react';
import { Booking } from '@/lib/types';
import QRScannerModal from '@/components/QRScannerModal';
import { formatThaiDate, formatThaiShortDate } from '@/lib/dateUtils';

export default function TrackPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Booking[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Device Bookings state (Auto-loaded if booked on this device)
  const [deviceBookings, setDeviceBookings] = useState<Booking[]>([]);
  const [loadingDevice, setLoadingDevice] = useState(true);
  const [refreshingDevice, setRefreshingDevice] = useState(false);

  const [scannerOpen, setScannerOpen] = useState(false);

  // 1. Fetch bookings that were created on this device (LocalStorage ptn_my_bookings)
  const fetchDeviceBookings = useCallback(async (isManual = false) => {
    if (typeof window === 'undefined') return;

    if (isManual) setRefreshingDevice(true);
    else setLoadingDevice(true);

    try {
      const myBookings: string[] = JSON.parse(localStorage.getItem('ptn_my_bookings') || '[]');
      const singleSessionId = sessionStorage.getItem('ptn_booking_id');
      const allIds = Array.from(new Set([...myBookings, ...(singleSessionId ? [singleSessionId] : [])])).filter(Boolean);

      if (allIds.length === 0) {
        setDeviceBookings([]);
        setLoadingDevice(false);
        setRefreshingDevice(false);
        return;
      }

      const res = await fetch(`/api/bookings?ids=${encodeURIComponent(allIds.join(','))}`);
      const data = await res.json();
      if (res.ok && data.bookings) {
        setDeviceBookings(data.bookings);
      } else {
        setDeviceBookings([]);
      }
    } catch (e) {
      console.error('Fetch device bookings error:', e);
      setDeviceBookings([]);
    } finally {
      setLoadingDevice(false);
      setRefreshingDevice(false);
    }
  }, []);

  useEffect(() => {
    fetchDeviceBookings();
  }, [fetchDeviceBookings]);

  // 2. Search Handler (By Booking ID or Phone Number)
  const handleSearch = async (searchVal?: string) => {
    const term = (searchVal !== undefined ? searchVal : query).trim();
    if (!term) {
      setSearchResults(null);
      setSearchError(null);
      return;
    }

    setSearching(true);
    setSearchError(null);

    try {
      const cleanPhone = term.replace(/[- ]/g, '');
      const isPhone = /^[0-9]{9,10}$/.test(cleanPhone);

      const url = `/api/bookings?${isPhone ? `phone=${encodeURIComponent(cleanPhone)}` : `id=${encodeURIComponent(term.toUpperCase())}`}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'ไม่พบข้อมูลการจองที่ตรงกับเงื่อนไข');
      }

      const list: Booking[] = data.bookings || [];
      if (list.length === 0) {
        setSearchResults([]);
        setSearchError(`ไม่พบรายการคิวสำหรับ "${term}" กรุณาตรวจสอบรหัสคิวหรือเบอร์โทรศัพท์อีกครั้ง`);
      } else {
        setSearchResults(list);
        setSearchError(null);

        // Auto-save found IDs to device storage for convenience
        try {
          const myBookings: string[] = JSON.parse(localStorage.getItem('ptn_my_bookings') || '[]');
          let updated = false;
          list.forEach((b) => {
            if (!myBookings.includes(b.booking_id)) {
              myBookings.push(b.booking_id);
              updated = true;
            }
          });
          if (updated) {
            localStorage.setItem('ptn_my_bookings', JSON.stringify(myBookings));
          }
        } catch (e) {}
      }
    } catch (err: any) {
      setSearchResults([]);
      setSearchError(err.message || 'เกิดข้อผิดพลาดในการค้นหา');
    } finally {
      setSearching(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  const handleQRScanned = (scannedId: string) => {
    setScannerOpen(false);
    setQuery(scannedId);
    if (scannedId.startsWith('PTN-')) {
      router.push(`/booking?id=${scannedId}`);
    } else {
      handleSearch(scannedId);
    }
  };

  const handleClearSearch = () => {
    setQuery('');
    setSearchResults(null);
    setSearchError(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return (
          <span className="px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> อนุมัติแล้ว
          </span>
        );
      case 'CheckedIn':
        return (
          <span className="px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-blue-100 text-blue-800 flex items-center gap-1 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-blue-600" /> เข้าพื้นที่แล้ว
          </span>
        );
      case 'Receiving':
        return (
          <span className="px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-indigo-100 text-indigo-800 flex items-center gap-1 shadow-sm">
            <Truck className="w-4 h-4 text-indigo-600 animate-bounce" /> กำลังลงสินค้า
          </span>
        );
      case 'Completed':
        return (
          <span className="px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-teal-100 text-teal-800 flex items-center gap-1 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-teal-600" /> ตรวจรับเสร็จแล้ว
          </span>
        );
      case 'Rejected':
        return (
          <span className="px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-rose-100 text-rose-800 flex items-center gap-1 shadow-sm">
            <XCircle className="w-4 h-4 text-rose-600" /> ไม่อนุมัติ
          </span>
        );
      case 'Cancelled':
        return (
          <span className="px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-slate-100 text-slate-700 flex items-center gap-1 shadow-sm">
            <AlertCircle className="w-4 h-4 text-slate-500" /> ยกเลิกแล้ว
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-amber-100 text-amber-800 flex items-center gap-1 shadow-sm animate-pulse">
            <Clock className="w-4 h-4 text-amber-600" /> รอตรวจสอบ
          </span>
        );
    }
  };

  const renderBookingCard = (item: Booking) => (
    <Link
      key={item.booking_id}
      href={`/booking?id=${item.booking_id}`}
      className="block bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-emerald-300 transition group"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono font-extrabold text-slate-900 group-hover:text-emerald-600 transition text-lg sm:text-xl">
              {item.booking_id}
            </span>
          </div>
          <span className="text-sm text-slate-600 font-medium block">
            ผู้รับ/เจ้าของสินค้า: <strong className="text-slate-800">{item.client_name}</strong>
          </span>
        </div>
        <div>{getStatusBadge(item.status)}</div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-3.5 text-sm text-slate-600">
        <div>
          <span className="text-slate-500 block text-xs font-medium">วันที่นัดหมาย (พ.ศ.)</span>
          <span className="font-bold text-slate-900 flex items-center gap-1.5 mt-0.5 text-base">
            <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
            {formatThaiShortDate(item.requested_date)}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-xs font-medium">ช่วงเวลานัด</span>
          <span className="font-bold text-slate-900 flex items-center gap-1.5 mt-0.5 text-base">
            <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
            {item.requested_time}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-xs font-medium">บริษัทขนส่ง</span>
          <span className="font-bold text-slate-900 flex items-center gap-1.5 mt-0.5 truncate text-base">
            <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
            {item.carrier_name}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-xs font-medium">จำนวนสินค้า</span>
          <span className="font-bold text-slate-900 flex items-center gap-1.5 mt-0.5 text-base">
            <Package className="w-4 h-4 text-emerald-600 shrink-0" />
            {item.pallet_count} ลัง / {item.vehicle_count} คัน
          </span>
        </div>
      </div>

      {/* Cargo Type & Vehicle Type Badges */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
        <div className="flex flex-wrap items-center gap-2">
          {item.cargo_type && (
            <span
              className={`px-2.5 py-1 rounded-lg font-medium ${
                item.cargo_type.includes('ยาเย็น') || item.cargo_type.includes('Cold Chain')
                  ? 'bg-cyan-100 text-cyan-800 border border-cyan-200 font-bold'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              📦 {item.cargo_type}
            </span>
          )}
          {item.vehicle_type && (
            <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-medium">
              🚛 {item.vehicle_type}
            </span>
          )}
        </div>

        <span className="text-emerald-700 font-bold group-hover:underline flex items-center gap-1 shrink-0 text-sm">
          เปิดดูบัตรคิว <ArrowRight className="w-4 h-4" />
        </span>
      </div>

      {(item.driver_name || item.license_plate) && (
        <div className="mt-2 text-xs text-slate-600">
          ผู้ส่งสินค้า: <strong className="text-slate-800">{item.driver_name || '-'}</strong> | ทะเบียน: <strong className="text-slate-800">{item.license_plate || '-'}</strong>
        </div>
      )}
    </Link>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="py-6 sm:py-8 px-4 sm:px-6 lg:px-8 pb-24 sm:pb-12">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* ⚡ Quick Action Shortcut Banner: สำหรับคนที่ต้องการจองคิวใหม่ */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200/90 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm hover:border-emerald-300 transition">
            <div className="flex items-center gap-3.5 w-full sm:w-auto">
              <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-200">
                <CalendarClock className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2 flex-wrap">
                  <span>ต้องการจองคิวส่งสินค้ารอบใหม่?</span>
                  <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    จองล่วงหน้าได้ 14 วัน
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                  นัดหมายวันและรอบเวลาเข้าส่งสะดวกรวดเร็ว ตรวจสอบสล็อตว่างแบบเรียลไทม์
                </p>
              </div>
            </div>
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md shadow-emerald-600/20 hover:shadow-lg transition shrink-0 group"
            >
              <span>จองคิวส่งของ</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          {/* Header Title */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-full px-3.5 py-1 text-xs sm:text-sm font-semibold mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>ระบบตรวจสอบและติดตามสถานะคิวดิจิทัล (Private Tracking)</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              ตรวจสอบสถานะบัตรคิว
            </h1>
            <p className="text-sm sm:text-base text-slate-600 max-w-lg mx-auto">
              กรอกรหัสการจองคิว หรือเบอร์โทรศัพท์ที่ใช้จอง หรือสแกน QR Code เพื่อตรวจสอบสถานะแบบเรียลไทม์
            </p>
          </div>

          {/* Search Input Box & QR Camera Button */}
          <form
            onSubmit={handleSearchSubmit}
            className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-md space-y-3"
          >
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder="กรอกรหัสคิว เช่น PTN-XXXX หรือ เบอร์โทรศัพท์ที่ใช้จอง..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-11 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-500 focus:bg-white transition text-base"
                />
                {query && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={searching || !query.trim()}
                  className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-2xl transition flex items-center justify-center gap-2 shrink-0 text-base shadow-sm"
                >
                  {searching ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Search className="w-5 h-5" />
                  )}
                  <span>ค้นหา</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition flex items-center justify-center gap-2 shrink-0 text-base shadow-sm"
                  title="เปิดกล้องสแกน QR Code"
                >
                  <Camera className="w-5 h-5 text-emerald-600" />
                  <span className="hidden sm:inline">สแกน QR</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500 px-1 pt-2 border-t border-slate-100">
              <span>💡 แนะนำ: ค้นหาได้ด้วยรหัสคิว หรือเบอร์โทรศัพท์ 10 หลัก</span>
              <Link href="/" className="text-emerald-700 font-bold hover:underline flex items-center gap-1">
                <PlusCircle className="w-4 h-4" /> จองคิวใหม่
              </Link>
            </div>
          </form>

          {/* Error / Not Found Message */}
          {searchError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm font-medium text-center space-y-1">
              <p className="font-bold">{searchError}</p>
              <p className="text-xs text-rose-600">
                หากจำรหัสไม่ได้ สามารถติดต่อฝ่ายรับสินค้า โทร. 099-378-7463 เพื่อให้เจ้าหน้าที่ตรวจสอบ
              </p>
            </div>
          )}

          {/* 🌟 SECTION A: SEARCH RESULTS (IF QUERY WAS ENTERED) */}
          {searchResults !== null && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Search className="w-4 h-4 text-emerald-600" />
                  <span>ผลการค้นหา ({searchResults.length} รายการ)</span>
                </h3>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="text-xs font-semibold text-rose-600 hover:underline"
                >
                  ปิดผลการค้นหา
                </button>
              </div>

              {searchResults.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                  <Calendar className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">ไม่พบคิวที่ตรงกับข้อมูลที่ค้นหา</p>
                  <p className="text-xs text-slate-400">กรุณาตรวจสอบความถูกต้องของรหัสคิวหรือเบอร์โทรศัพท์อีกครั้ง</p>
                </div>
              ) : (
                searchResults.map(renderBookingCard)
              )}
            </div>
          )}

          {/* 🌟 SECTION B: DEVICE BOOKINGS (AUTO-SHOWN IF BOOKED ON THIS DEVICE) */}
          {searchResults === null && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-800">
                    คิวของคุณบนอุปกรณ์นี้
                  </h3>
                  {deviceBookings.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                      {deviceBookings.length} คิว
                    </span>
                  )}
                </div>

                {deviceBookings.length > 0 && (
                  <button
                    type="button"
                    onClick={() => fetchDeviceBookings(true)}
                    disabled={refreshingDevice}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-emerald-700 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshingDevice ? 'animate-spin text-emerald-600' : ''}`} />
                    <span>รีเฟรช</span>
                  </button>
                )}
              </div>

              {loadingDevice ? (
                <div className="py-12 text-center text-slate-400 space-y-2 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                  <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs">กำลังตรวจสอบประวัติการจองบนอุปกรณ์นี้...</p>
                </div>
              ) : deviceBookings.length > 0 ? (
                <div className="space-y-3">
                  {deviceBookings.map(renderBookingCard)}
                </div>
              ) : (
                /* 🛡️ PRIVACY EMPTY STATE (NO STRANGER DATA IS EXPOSED) */
                <div className="bg-white rounded-3xl border border-slate-200/90 p-8 text-center space-y-4 shadow-sm">
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto border border-emerald-150">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1.5">
                    <h3 className="text-base font-bold text-slate-800">
                      ยังไม่มีประวัติการจองคิวบนอุปกรณ์นี้
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      ระบบจะบันทึกและแสดงคิวที่คุณจองจากโทรศัพท์หรือคอมพิวเตอร์เครื่องนี้ให้อัตโนมัติ<br />
                      หากคุณเคยจองไว้จากอุปกรณ์อื่น สามารถใช้ <strong>ช่องค้นหาด้านบน</strong> กรอกรหัสคิวหรือเบอร์โทรศัพท์เพื่อติดตามสถานะได้ทันทีครับ
                    </p>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                    <Link
                      href="/"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-200 transition"
                    >
                      <PlusCircle className="w-4 h-4" />
                      จองคิวส่งสินค้าทันที
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 📷 Camera QR Scanner Modal */}
      <QRScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={handleQRScanned}
      />
    </div>
  );
}
