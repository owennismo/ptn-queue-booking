'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Printer,
  Copy,
  Share2,
  Calendar,
  Truck,
  Building2,
  Phone,
  Package,
  Car,
  RefreshCw,
  ArrowLeft,
  ShieldCheck,
  User,
} from 'lucide-react';
import { Booking } from '@/lib/types';

export default function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const bookingId = resolvedParams.id;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchBooking = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setRefreshing(true);
    setError(null);

    try {
      const res = await fetch(`/api/bookings/${bookingId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'ไม่พบข้อมูลการจอง');
      }

      setBooking(data.booking);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBooking(true);

    // Auto refresh every 15 seconds if status is Pending
    const interval = setInterval(() => {
      fetchBooking(false);
    }, 15000);

    return () => clearInterval(interval);
  }, [bookingId]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-600 font-medium">กำลังโหลดข้อมูลบัตรคิว...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 text-center shadow-md space-y-4">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">ไม่พบข้อมูลการจอง</h2>
          <p className="text-sm text-slate-500">{error || 'รหัสการจองไม่ถูกต้อง หรือคิวถูกลบออกจากระบบแล้ว'}</p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition"
            >
              <ArrowLeft className="w-4 h-4" />
              กลับหน้าหลัก
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Status Styling Logic
  const getStatusDisplay = () => {
    switch (booking.status) {
      case 'Approved':
        return {
          badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: <CheckCircle2 className="w-6 h-6 text-emerald-600" />,
          title: 'อนุมัติคิวเรียบร้อย (Approved)',
          desc: 'สามารถนำรถและสินค้าเข้าส่งตามวันและเวลาที่ระบุได้',
          headerBg: 'from-emerald-600 to-teal-700',
        };
      case 'Rejected':
        return {
          badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: <XCircle className="w-6 h-6 text-rose-600" />,
          title: 'ไม่อนุมัติคิว (Rejected)',
          desc: 'คิวนี้ถูกปฏิเสธโดยเจ้าหน้าที่คลังสินค้า',
          headerBg: 'from-rose-600 to-red-700',
        };
      case 'Cancelled':
        return {
          badgeBg: 'bg-slate-100 text-slate-700 border-slate-300',
          icon: <AlertCircle className="w-6 h-6 text-slate-600" />,
          title: 'ยกเลิกคิวแล้ว (Cancelled)',
          desc: 'คิวนี้ถูกยกเลิกแล้ว',
          headerBg: 'from-slate-700 to-slate-800',
        };
      default:
        return {
          badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: <Clock className="w-6 h-6 text-amber-600 animate-pulse" />,
          title: 'รอการตรวจสอบ (Pending)',
          desc: 'ระบบได้บันทึกคิวแล้ว เจ้าหน้าที่คลังสินค้ากำลังตรวจสอบ',
          headerBg: 'from-amber-600 to-emerald-800',
        };
    }
  };

  const statusInfo = getStatusDisplay();

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Navigation & Action Bar */}
        <div className="flex items-center justify-between no-print">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-emerald-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>จองคิวใหม่</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchBooking(false)}
              disabled={refreshing}
              className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-sm"
              title="รีเฟรชสถานะ"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-sm"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'คัดลอกลิงก์แล้ว!' : 'คัดลอกลิงก์'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์บัตรคิว</span>
            </button>
          </div>
        </div>

        {/* Digital Ticket Card */}
        <div className="ticket-card bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden">
          {/* Top Header */}
          <div className={`bg-gradient-to-r ${statusInfo.headerBg} p-6 sm:p-8 text-white text-center relative`}>
            <p className="text-xs uppercase tracking-widest text-emerald-100 font-semibold mb-1">
              บริษัท พีทีเอ็น ฟาร์มาเซ็นเตอร์ จำกัด (พัฒนาเภสัช)
            </p>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">บัตรคิวเข้าส่งสินค้าดิจิทัล</h1>
            <div className="mt-4 inline-block bg-white/15 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/30 text-sm font-mono font-bold tracking-wider">
              {booking.booking_id}
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Status Alert Banner */}
            <div className={`p-4 rounded-2xl border flex items-start gap-4 ${statusInfo.badgeBg}`}>
              <div className="shrink-0">{statusInfo.icon}</div>
              <div>
                <h3 className="font-bold text-base">{statusInfo.title}</h3>
                <p className="text-xs sm:text-sm mt-0.5 opacity-90">{statusInfo.desc}</p>
                {booking.admin_reason && (
                  <div className="mt-2.5 p-3 bg-white/80 rounded-xl border border-rose-200 text-xs text-rose-900 font-medium">
                    <span className="font-bold">เหตุผลจากเจ้าหน้าที่:</span> {booking.admin_reason}
                  </div>
                )}
              </div>
            </div>

            {/* QR Code & Fast Verification Section */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-center sm:text-left space-y-1">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Digital Pass QR</span>
                <h4 className="font-bold text-slate-800 text-base">สแกนตรวจสอบที่คลังสินค้า</h4>
                <p className="text-xs text-slate-500 max-w-xs">
                  แสดง QR Code นี้ให้เจ้าหน้าที่ รปภ. หรือฝ่ายรับสินค้าสแกนเมื่อเดินทางมาถึง
                </p>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm shrink-0">
                <QRCodeSVG
                  value={booking.booking_id}
                  size={120}
                  level="H"
                  includeMargin={false}
                />
              </div>
            </div>

            {/* Delivery Key Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-1">
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" /> วันที่เข้าส่ง
                </span>
                <p className="font-bold text-slate-900 text-base">{booking.requested_date}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-1">
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" /> ช่วงเวลานัดหมาย
                </span>
                <p className="font-bold text-slate-900 text-base">{booking.requested_time}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-1">
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-emerald-600" /> บริษัทขนส่ง
                </span>
                <p className="font-bold text-slate-900 text-base">{booking.carrier_name}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-1">
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" /> เบอร์โทรติดต่อ
                </span>
                <p className="font-bold text-slate-900 text-base">{booking.user_phone}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-1 sm:col-span-2">
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" /> บริษัทเจ้าของสินค้า / ผู้ส่ง
                </span>
                <p className="font-bold text-slate-900 text-base">{booking.client_name}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-1">
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-emerald-600" /> จำนวนลัง / พาเลท
                </span>
                <p className="font-bold text-slate-900 text-base">{booking.pallet_count} รายการ</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-1">
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-emerald-600" /> จำนวนรถขนส่ง
                </span>
                <p className="font-bold text-slate-900 text-base">{booking.vehicle_count} คัน</p>
              </div>

              {(booking.driver_name || booking.license_plate) && (
                <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-1 sm:col-span-2">
                  <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-600" /> ข้อมูลคนขับและรถ
                  </span>
                  <p className="font-bold text-slate-900 text-sm">
                    {booking.driver_name ? `คนขับ: ${booking.driver_name}` : ''}
                    {booking.driver_name && booking.license_plate ? ' | ' : ''}
                    {booking.license_plate ? `ทะเบียน: ${booking.license_plate}` : ''}
                  </p>
                </div>
              )}

              {booking.notes && (
                <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-1 sm:col-span-2">
                  <span className="text-xs text-slate-500 font-medium">หมายเหตุเพิ่มเติม</span>
                  <p className="text-xs text-slate-700">{booking.notes}</p>
                </div>
              )}
            </div>

            {/* Footer Notice */}
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center text-xs text-emerald-800 space-y-1">
              <p className="font-bold">คำแนะนำสำหรับผู้ส่งสินค้า:</p>
              <p>กรุณาเดินทางมาถึงก่อนเวลานัดหมาย 10-15 นาที และแสดงบัตรคิวนี้ให้ฝ่ายรับสินค้า</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
