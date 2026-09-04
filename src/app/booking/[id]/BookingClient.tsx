'use client';

import React, { useEffect, useState, useRef, use } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Printer,
  Copy,
  Calendar,
  Truck,
  Building2,
  Phone,
  Package,
  Car,
  RefreshCw,
  ArrowLeft,
  User,
  Download,
  Share2,
  MapPin,
  ThermometerSnowflake,
  ShieldCheck,
  MessageCircle,
  Bell,
  Image as ImageIcon,
  Camera,
  Eye,
  X,
} from 'lucide-react';
import { Booking } from '@/lib/types';
import { toPng } from 'html-to-image';
import { formatThaiDate, formatThaiShortDate } from '@/lib/dateUtils';
import NotificationPrompt from '@/components/NotificationPrompt';
import { sendQueueNotification } from '@/lib/pushNotifications';

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
  const [downloadingImage, setDownloadingImage] = useState<boolean>(false);
  const [cancelModalOpen, setCancelModalOpen] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelling, setCancelling] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isCreatorDevice, setIsCreatorDevice] = useState<boolean>(false);
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);
  const prevStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && booking?.booking_id) {
      try {
        const myBookings: string[] = JSON.parse(localStorage.getItem('ptn_my_bookings') || '[]');
        const sessionBookingId = sessionStorage.getItem('ptn_booking_id');
        if (myBookings.includes(booking.booking_id) || sessionBookingId === booking.booking_id) {
          setIsCreatorDevice(true);
        } else {
          setIsCreatorDevice(false);
        }
      } catch (e) {
        setIsCreatorDevice(false);
      }
    }
  }, [booking?.booking_id]);

  const handleUserCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    setCancelling(true);
    setCancelError(null);

    try {
      const res = await fetch(`/api/bookings/${booking.booking_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          reason: cancelReason || 'ผู้จองขอยกเลิกการนัดหมาย',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถยกเลิกคิวได้');
      }

      setBooking(data.booking);
      setCancelModalOpen(false);
      setCancelReason('');
    } catch (err: any) {
      setCancelError(err.message || 'เกิดข้อผิดพลาดในการยกเลิกคิว');
    } finally {
      setCancelling(false);
    }
  };

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

      const fetchedBooking: Booking = data.booking;

      // 🔔 Trigger Web Push Notification if status changed
      if (prevStatusRef.current && prevStatusRef.current !== fetchedBooking.status) {
        const newSt = fetchedBooking.status;
        let title = '🔔 อัปเดตสถานะคิวส่งสินค้า!';
        let body = `คิว ${fetchedBooking.booking_id} (${fetchedBooking.carrier_name}) เปลี่ยนสถานะเป็น "${newSt}"`;

        if (newSt === 'Approved') {
          title = '🎉 คิวส่งสินค้าได้รับการอนุมัติแล้ว!';
          body = `คิว ${fetchedBooking.booking_id} (${formatThaiShortDate(fetchedBooking.requested_date)} ${fetchedBooking.requested_time}) ได้รับการอนุมัติแล้ว พร้อมเข้าส่งสินค้าได้`;
        } else if (newSt === 'CheckedIn') {
          title = '🚗 รถขนส่งเช็คอินเข้าพื้นที่แล้ว!';
          body = `คิว ${fetchedBooking.booking_id} ได้รับการตรวจสอบเข้าพื้นที่คลังสินค้าแล้ว กรุณารอเรียกเข้าช่องจอดเทียบ`;
        } else if (newSt === 'Receiving') {
          title = '📦 เริ่มการตรวจนับและลงสินค้า!';
          body = `คิว ${fetchedBooking.booking_id} กำลังดำเนินการลงสินค้าที่คลัง`;
        } else if (newSt === 'Completed') {
          title = '✨ ตรวจรับสินค้าเสร็จสิ้นสมบูรณ์!';
          body = `คิว ${fetchedBooking.booking_id} ตรวจรับเสร็จสิ้นแล้ว ${fetchedBooking.actual_pallet_count !== undefined && fetchedBooking.actual_pallet_count !== null ? `(รับจริง ${fetchedBooking.actual_pallet_count} ลัง)` : ''}`;
        } else if (newSt === 'Rejected') {
          title = '❌ คิวส่งสินค้าไม่ได้รับการอนุมัติ';
          body = `คิว ${fetchedBooking.booking_id}: ${fetchedBooking.admin_reason || 'กรุณาตรวจสอบสาเหตุบนบัตรคิว'}`;
        } else if (newSt === 'Cancelled') {
          title = '🚫 คิวถูกยกเลิกแล้ว';
          body = `คิว ${fetchedBooking.booking_id} ได้รับการยกเลิกเรียบร้อยแล้ว`;
        }

        sendQueueNotification({
          title,
          body,
          booking_id: fetchedBooking.booking_id,
          url: `/booking/${fetchedBooking.booking_id}`,
        });
      }

      prevStatusRef.current = fetchedBooking.status;
      setBooking(fetchedBooking);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBooking(true);

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

  // 📲 Share to LINE Handler
  const handleShareLine = () => {
    if (!booking) return;
    const url = typeof window !== 'undefined' ? window.location.href : `https://ptn-queue-booking.pages.dev/booking/${booking.booking_id}`;
    const statusText = booking.status === 'Approved' ? '✅ อนุมัติแล้ว (Approved)' : booking.status === 'Pending' ? '⏳ รอการตรวจสอบ' : booking.status;
    const dateText = formatThaiDate(booking.requested_date);

    const text = `🚚 บัตรคิวเข้าส่งสินค้า PTN Pharma Center
📌 รหัสคิว: ${booking.booking_id}
📅 วันที่นัดหมาย: ${dateText}
⏰ รอบเวลา: ${booking.requested_time}
🏢 ขนส่ง: ${booking.carrier_name}
📦 สินค้า: ${booking.cargo_type || 'ยาและเวชภัณฑ์'} (${booking.pallet_count} ลัง)
🚛 ประเภทรถ: ${booking.vehicle_type || 'รถกระบะ'} (${booking.vehicle_count} คัน)
${booking.driver_name ? `👤 ผู้ส่งสินค้า: ${booking.driver_name}\n` : ''}${booking.license_plate ? `🚗 ทะเบียนรถ: ${booking.license_plate}\n` : ''}📊 สถานะ: ${statusText}

🔗 เปิดดูบัตรคิวดิจิทัล:
${url}`;

    const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
    window.open(lineUrl, '_blank');
  };

  // 🗺️ Open Google Maps Directions Handler
  const handleOpenGoogleMaps = () => {
    const destination = encodeURIComponent('บริษัท พีทีเอ็น ฟาร์มาเซ็นเตอร์ จำกัด');
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${destination}`;
    window.open(mapsUrl, '_blank');
  };

  // 🖼️ Generate and Download Ticket as PNG Image via html-to-image (High-Res Retina)
  const handleDownloadImage = async () => {
    if (!booking) return;
    setDownloadingImage(true);

    try {
      const ticketElement = document.querySelector('.ticket-card') as HTMLElement;
      if (ticketElement) {
        const dataUrl = await toPng(ticketElement, {
          quality: 1,
          pixelRatio: 3, // Crisp 3x Ultra-HD export
          backgroundColor: '#ffffff',
          filter: (node) => {
            if (node instanceof HTMLElement && node.classList.contains('no-print')) {
              return false;
            }
            return true;
          },
        });

        const link = document.createElement('a');
        link.download = `PTN-Ticket-${booking.booking_id}.png`;
        link.href = dataUrl;
        link.click();
        setDownloadingImage(false);
        return;
      }
    } catch (e) {
      console.warn('html-to-image error, attempting canvas fallback:', e);
    }

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      // High Resolution Canvas (2x Retina)
      const width = 800;
      const height = 1150;
      canvas.width = width;
      canvas.height = height;

      // 1. Background
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, width, height);

      // Card Container
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 10;
      ctx.beginPath();
      ctx.roundRect(30, 30, 740, 1090, 28);
      ctx.fill();
      ctx.shadowColor = 'transparent';

      // 2. Header Gradient
      const grad = ctx.createLinearGradient(30, 30, 770, 200);
      if (booking.status === 'Approved') {
        grad.addColorStop(0, '#059669');
        grad.addColorStop(1, '#0f766e');
      } else if (booking.status === 'Rejected') {
        grad.addColorStop(0, '#dc2626');
        grad.addColorStop(1, '#991b1b');
      } else {
        grad.addColorStop(0, '#d97706');
        grad.addColorStop(1, '#047857');
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(30, 30, 740, 170, [28, 28, 0, 0]);
      ctx.fill();

      // Header Texts
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = '600 15px sans-serif';
      ctx.fillText('บริษัท พีทีเอ็น ฟาร์มาเซ็นเตอร์ จำกัด (พัฒนาเภสัช)', 400, 75);

      ctx.font = '900 28px sans-serif';
      ctx.fillText('บัตรคิวเข้าส่งสินค้าดิจิทัล', 400, 115);

      // Booking ID Pill
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.roundRect(260, 135, 280, 42, 21);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(booking.booking_id, 400, 163);

      // 3. Status Box
      ctx.textAlign = 'left';
      let statusBg = '#ecfdf5';
      let statusBorder = '#a7f3d0';
      let statusTextColor = '#065f46';
      let statusTitle = 'อนุมัติคิวเรียบร้อย (Approved)';
      let statusSub = 'สามารถนำรถและสินค้าเข้าส่งตามวันและเวลาที่ระบุได้';

      if (booking.status === 'Rejected') {
        statusBg = '#fef2f2';
        statusBorder = '#fecaca';
        statusTextColor = '#991b1b';
        statusTitle = 'ไม่อนุมัติคิว (Rejected)';
        statusSub = 'คิวนี้ถูกปฏิเสธโดยเจ้าหน้าที่คลังสินค้า';
      } else if (booking.status === 'Cancelled') {
        statusBg = '#f1f5f9';
        statusBorder = '#cbd5e1';
        statusTextColor = '#334155';
        statusTitle = 'ยกเลิกคิวแล้ว (Cancelled)';
        statusSub = 'คิวนี้ถูกยกเลิกแล้ว';
      } else if (booking.status === 'Pending') {
        statusBg = '#fffbeb';
        statusBorder = '#fde68a';
        statusTextColor = '#92400e';
        statusTitle = 'รอการตรวจสอบ (Pending)';
        statusSub = 'ระบบได้บันทึกคิวแล้ว เจ้าหน้าที่กำลังตรวจสอบ';
      }

      ctx.fillStyle = statusBg;
      ctx.beginPath();
      ctx.roundRect(60, 225, 680, 65, 16);
      ctx.fill();
      ctx.strokeStyle = statusBorder;
      ctx.stroke();

      ctx.fillStyle = statusTextColor;
      ctx.font = 'bold 17px sans-serif';
      ctx.fillText(statusTitle, 80, 252);
      ctx.font = '13px sans-serif';
      ctx.fillText(statusSub, 80, 273);

      // 4. QR Code Box
      const qrSvg = document.querySelector('.ticket-card svg');
      if (qrSvg) {
        const svgData = new XMLSerializer().serializeToString(qrSvg);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const URL = window.URL || window.webkitURL || window;
        const blobURL = URL.createObjectURL(svgBlob);

        const img = new Image();
        img.onload = () => {
          // QR Card Container
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.roundRect(60, 305, 680, 160, 20);
          ctx.fill();
          ctx.strokeStyle = '#e2e8f0';
          ctx.stroke();

          ctx.drawImage(img, 570, 320, 130, 130);

          ctx.fillStyle = '#059669';
          ctx.font = 'bold 14px sans-serif';
          ctx.fillText('DIGITAL PASS QR CODE', 90, 345);

          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 20px sans-serif';
          ctx.fillText('สแกนตรวจสอบที่คลังสินค้า', 90, 378);

          ctx.fillStyle = '#64748b';
          ctx.font = '13px sans-serif';
          ctx.fillText('แสดง QR Code นี้ให้เจ้าหน้าที่ตรวจสอบคิวส่ง หรือฝ่ายรับสินค้า', 90, 410);
          ctx.fillText('เพื่อเช็คอินและเรียกเข้าช่องโหลดสินค้า', 90, 432);

          // 5. Grid Details
          drawDetailsSection();
          URL.revokeObjectURL(blobURL);
        };
        img.src = blobURL;
      } else {
        drawDetailsSection();
      }

      function drawDetailsSection() {
        if (!ctx || !booking) return;

        const startY = 485;
        const cellW = 330;
        const cellH = 75;

        const items = [
          { label: '📅 วันที่เข้าส่ง (พ.ศ.)', val: formatThaiDate(booking.requested_date) },
          { label: '⏰ ช่วงเวลานัดหมาย', val: booking.requested_time },
          { label: '🚚 บริษัทขนส่ง', val: booking.carrier_name },
          { label: '📞 เบอร์โทรติดต่อ', val: booking.user_phone },
          { label: '🏢 บริษัทเจ้าของสินค้า / ผู้ส่ง', val: booking.client_name, full: true },
          { label: '📦 ประเภทสินค้า', val: booking.cargo_type || 'ยาและเวชภัณฑ์ทั่วไป', full: true, highlight: booking.cargo_type?.includes('ยาเย็น') },
          { label: '🚛 ประเภทรถขนส่ง', val: `${booking.vehicle_type || 'รถกระบะ 4 ล้อ'} (${booking.vehicle_count} คัน)` },
          { label: '📦 จำนวนสินค้า', val: `${booking.pallet_count} ลัง` },
        ];

        let currY = startY;
        let col = 0;

        items.forEach((item) => {
          const x = item.full || col === 0 ? 60 : 410;
          const w = item.full ? 680 : cellW;

          ctx.fillStyle = item.highlight ? '#ecfeff' : '#f8fafc';
          ctx.beginPath();
          ctx.roundRect(x, currY, w, cellH, 14);
          ctx.fill();
          ctx.strokeStyle = item.highlight ? '#a5f3fc' : '#f1f5f9';
          ctx.stroke();

          ctx.fillStyle = item.highlight ? '#0e7490' : '#64748b';
          ctx.font = '12px sans-serif';
          ctx.fillText(item.label, x + 16, currY + 28);

          ctx.fillStyle = item.highlight ? '#155e75' : '#0f172a';
          ctx.font = 'bold 15px sans-serif';
          ctx.fillText(item.val, x + 16, currY + 54);

          if (item.full) {
            currY += cellH + 10;
            col = 0;
          } else {
            if (col === 1) {
              currY += cellH + 10;
              col = 0;
            } else {
              col = 1;
            }
          }
        });

        // Sender & License Plate
        if (booking.driver_name || booking.license_plate) {
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.roundRect(60, currY, 680, 60, 14);
          ctx.fill();
          ctx.strokeStyle = '#f1f5f9';
          ctx.stroke();

          ctx.fillStyle = '#64748b';
          ctx.font = '12px sans-serif';
          ctx.fillText('👤 ข้อมูลผู้ส่งสินค้าและทะเบียนรถ', 76, currY + 24);

          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 14px sans-serif';
          const info = `ผู้ส่ง: ${booking.driver_name || '-'}  |  ทะเบียน: ${booking.license_plate || '-'}`;
          ctx.fillText(info, 76, currY + 46);
          currY += 70;
        }

        // Footer Banner
        ctx.fillStyle = '#ecfdf5';
        ctx.beginPath();
        ctx.roundRect(60, 1030, 680, 60, 16);
        ctx.fill();
        ctx.strokeStyle = '#d1fae5';
        ctx.stroke();

        ctx.fillStyle = '#065f46';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('คำแนะนำ: กรุณาเดินทางมาถึงก่อนเวลานัดหมาย 10-15 นาที และแสดงบัตรคิวนี้ให้ฝ่ายรับสินค้า', 400, 1065);

        // Trigger Download
        const link = document.createElement('a');
        link.download = `PTN-Ticket-${booking.booking_id}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        setDownloadingImage(false);
      }
    } catch (e) {
      console.error('Download ticket image error:', e);
      alert('ไม่สามารถดาวน์โหลดรูปภาพได้ กรุณาใช้ปุ่มพิมพ์หรือถ่ายภาพหน้าจอ');
      setDownloadingImage(false);
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
      case 'CheckedIn':
        return {
          badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: <CheckCircle2 className="w-6 h-6 text-blue-600" />,
          title: 'ตรวจสอบเข้าพื้นที่แล้ว (Checked-in)',
          desc: 'เจ้าหน้าที่ตรวจสอบคิวส่งได้สแกนรับรถเข้าพื้นที่แล้ว กรุณารอเรียกเข้าช่องจอดเทียบ',
          headerBg: 'from-blue-600 to-indigo-700',
        };
      case 'Receiving':
        return {
          badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          icon: <Truck className="w-6 h-6 text-indigo-600 animate-bounce" />,
          title: 'กำลังลงสินค้า (Receiving / Unloading)',
          desc: 'กำลังดำเนินการตรวจนับและถ่ายสินค้าเข้าคลังสินค้า',
          headerBg: 'from-indigo-600 to-purple-700',
        };
      case 'Completed':
        return {
          badgeBg: 'bg-teal-50 text-teal-800 border-teal-200',
          icon: <CheckCircle2 className="w-6 h-6 text-teal-600" />,
          title: 'รับสินค้าเสร็จสิ้นสมบูรณ์ (Completed)',
          desc: 'สินค้าได้รับการตรวจรับและลงบันทึกเข้าระบบคลังสินค้าเรียบร้อยแล้ว',
          headerBg: 'from-teal-700 to-slate-800',
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
  const isColdChain = booking.cargo_type?.includes('ยาเย็น') || booking.cargo_type?.includes('Cold Chain');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 🌟 TOP GLOBAL TRUST & DIRECT CONTACT HEADER */}
      <header className="bg-white/95 backdrop-blur border-b border-slate-200/80 sticky top-0 z-40 shadow-xs no-print">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Company Brand */}
          <Link href="/" className="flex items-center gap-3 self-start sm:self-auto group">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white flex items-center justify-center font-black text-base shadow-md shadow-emerald-900/20 group-hover:scale-105 transition">
              P
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-sm tracking-tight">
                  PTN PHARMA CENTER
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  พัฒนาเภสัช
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium block">
                ระบบนัดหมายจองคิวส่งสินค้าคลังยาและเวชภัณฑ์
              </span>
            </div>
          </Link>

          {/* Contact Badges (Phone & LINE) */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-start sm:justify-end flex-wrap">
            <a
              href="tel:0993787463"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold transition shadow-2xs group"
              title="โทรติดต่อแผนกรับสินค้าโดยตรง"
            >
              <div className="w-5 h-5 rounded-lg bg-emerald-600 text-white flex items-center justify-center group-hover:scale-110 transition shadow-xs">
                <Phone className="w-3 h-3" />
              </div>
              <span>
                แผนกรับสินค้า: <strong className="text-emerald-700 font-mono">099-378-7463</strong>
              </span>
            </a>

            <a
              href="https://line.me/ti/p/~ptnexpress"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#06C755]/10 hover:bg-[#06C755]/20 text-[#048737] border border-[#06C755]/30 text-xs font-bold transition shadow-2xs group"
              title="เพิ่มเพื่อนทาง LINE"
            >
              <div className="w-5 h-5 rounded-lg bg-[#06C755] text-white flex items-center justify-center group-hover:scale-110 transition shadow-xs">
                <MessageCircle className="w-3.5 h-3.5" />
              </div>
              <span>
                LINE ID: <strong className="text-[#036d2c] font-mono">ptnexpress</strong>
              </span>
            </a>
          </div>
        </div>
      </header>

      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Top Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 no-print">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-emerald-700 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>จองคิวใหม่</span>
            </Link>

          <div className="flex flex-wrap items-center gap-2">
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
              <span>{copied ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์</span>
            </button>
          </div>
        </div>

        {/* Digital Ticket Card */}
        <div className="ticket-card bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden">
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

            {/* 🔔 Web Push Notification Prompt Banner & Toggle */}
            <NotificationPrompt booking={booking} />

            {/* Quick Action Buttons Bar (Save Image, Share LINE, Google Maps) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 no-print">
              {/* 1. Download as PNG Image Button */}
              <button
                type="button"
                onClick={handleDownloadImage}
                disabled={downloadingImage}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-md shadow-emerald-200 transition active:scale-[0.98]"
              >
                {downloadingImage ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>บันทึกเป็นรูปภาพ</span>
              </button>

              {/* 2. Share to LINE Button */}
              <button
                type="button"
                onClick={handleShareLine}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-[#06C755] hover:bg-[#05b34c] text-white rounded-2xl font-bold text-xs sm:text-sm shadow-md shadow-green-200 transition active:scale-[0.98]"
              >
                <Share2 className="w-4 h-4" />
                <span>แชร์เข้า LINE</span>
              </button>

              {/* 3. Google Maps GPS Navigation */}
              <button
                type="button"
                onClick={handleOpenGoogleMaps}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-md shadow-slate-300 transition active:scale-[0.98]"
              >
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>แผนที่ GPS นำทาง</span>
              </button>
            </div>

            {/* QR Code Pass Box */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-center sm:text-left space-y-1">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Digital Pass QR</span>
                <h4 className="font-bold text-slate-800 text-base">สแกนตรวจสอบที่คลังสินค้า</h4>
                <p className="text-xs text-slate-500 max-w-xs">
                  แสดง QR Code นี้ให้เจ้าหน้าที่ตรวจสอบคิวส่ง หรือฝ่ายรับสินค้าสแกนเมื่อเดินทางมาถึง
                </p>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm shrink-0">
                <QRCodeSVG
                  value={
                    typeof window !== 'undefined'
                      ? `${window.location.origin}/booking/${booking.booking_id}`
                      : `https://ptn-queue-booking.pages.dev/booking/${booking.booking_id}`
                  }
                  size={120}
                  level="H"
                  includeMargin={false}
                />
              </div>
            </div>

            {/* Delivery Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Date in Thai format */}
              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-1">
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" /> วันที่เข้าส่ง (พ.ศ.)
                </span>
                <p className="font-bold text-slate-900 text-base">{formatThaiDate(booking.requested_date)}</p>
                <p className="text-[11px] text-slate-400 font-mono">({booking.requested_date})</p>
              </div>

              {/* Time Slot */}
              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-1">
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" /> ช่วงเวลานัดหมาย
                </span>
                <p className="font-bold text-slate-900 text-base">{booking.requested_time}</p>
              </div>

              {/* Carrier */}
              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-1">
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-emerald-600" /> บริษัทขนส่ง
                </span>
                <p className="font-bold text-slate-900 text-base">{booking.carrier_name}</p>
              </div>

              {/* Phone */}
              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-1">
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" /> เบอร์โทรติดต่อ
                </span>
                <p className="font-bold text-slate-900 text-base">{booking.user_phone}</p>
              </div>

              {/* Client Name */}
              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-1 sm:col-span-2">
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" /> บริษัทเจ้าของสินค้า / ผู้ส่ง
                </span>
                <p className="font-bold text-slate-900 text-base">{booking.client_name}</p>
              </div>

              {/* Cargo Category (ยาธรรมดา vs ยาเย็น) */}
              <div className={`p-4 rounded-2xl border space-y-1 sm:col-span-2 ${
                isColdChain ? 'bg-cyan-50/80 border-cyan-200 text-cyan-950' : 'bg-slate-50/70 border-slate-100 text-slate-900'
              }`}>
                <span className="text-xs font-medium flex items-center gap-1.5 text-slate-500">
                  {isColdChain ? <ThermometerSnowflake className="w-3.5 h-3.5 text-cyan-600" /> : <Package className="w-3.5 h-3.5 text-emerald-600" />}
                  ประเภทสินค้า (Cargo Category)
                </span>
                <div className="flex items-center justify-between">
                  <p className="font-bold text-base">{booking.cargo_type || 'ยาและเวชภัณฑ์ทั่วไป (Room Temp)'}</p>
                  {isColdChain && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-200 text-cyan-900 flex items-center gap-1">
                      <ThermometerSnowflake className="w-3 h-3" /> ยาเย็น 2-8°C
                    </span>
                  )}
                </div>
              </div>

              {/* Vehicle Type */}
              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-1">
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-emerald-600" /> ประเภทรถขนส่ง
                </span>
                <p className="font-bold text-slate-900 text-base">{booking.vehicle_type || 'รถกระบะ 4 ล้อ'}</p>
              </div>

              {/* Crate & Vehicle Count */}
              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-1">
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-emerald-600" /> จำนวนลังและจำนวนรถ
                </span>
                <p className="font-bold text-slate-900 text-base">
                  {booking.pallet_count} ลัง <span className="text-xs font-normal text-slate-500">({booking.vehicle_count} คัน)</span>
                </p>
              </div>

              {(booking.driver_name || booking.license_plate) && (
                <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-1 sm:col-span-2">
                  <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-600" /> ข้อมูลผู้ส่งสินค้าและทะเบียนรถ
                  </span>
                  <p className="font-bold text-slate-900 text-sm">
                    {booking.driver_name ? `ผู้ส่งสินค้า: ${booking.driver_name}` : ''}
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

              {/* 📷 Attached Delivery Note / Document Photo */}
              {booking.photo_url && (
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-150 space-y-2 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                      รูปถ่ายใบส่งของ / เอกสารที่แนบมา (Delivery Note / Invoice)
                    </span>
                    <button
                      type="button"
                      onClick={() => setImageModalUrl(booking.photo_url!)}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs transition"
                    >
                      <Eye className="w-3 h-3" /> ขยายดูรูปเต็ม
                    </button>
                  </div>
                  <div
                    onClick={() => setImageModalUrl(booking.photo_url!)}
                    className="relative w-full max-w-xs h-40 rounded-xl overflow-hidden border border-emerald-200 bg-slate-900 cursor-pointer group shadow-sm hover:ring-2 hover:ring-emerald-500 transition"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={booking.photo_url}
                      alt="Delivery Note Document"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold gap-1 transition">
                      <Eye className="w-4 h-4" /> คลิกเพื่อดูขนาดเต็ม
                    </div>
                  </div>
                </div>
              )}

              {/* 📸 Receiving Inspection Photo (Taken by Warehouse Staff) */}
              {booking.receiving_photo_url && (
                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-150 space-y-2 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-indigo-600" />
                      รูปถ่ายตอนตรวจรับสินค้าหน้างาน (Receiving Inspection Photo)
                    </span>
                    <button
                      type="button"
                      onClick={() => setImageModalUrl(booking.receiving_photo_url!)}
                      className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs transition"
                    >
                      <Eye className="w-3 h-3" /> ขยายดูรูปเต็ม
                    </button>
                  </div>
                  <div
                    onClick={() => setImageModalUrl(booking.receiving_photo_url!)}
                    className="relative w-full max-w-xs h-40 rounded-xl overflow-hidden border border-indigo-200 bg-slate-900 cursor-pointer group shadow-sm hover:ring-2 hover:ring-indigo-500 transition"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={booking.receiving_photo_url}
                      alt="Receiving Inspection"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold gap-1 transition">
                      <Eye className="w-4 h-4" /> คลิกเพื่อดูขนาดเต็ม
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Advice Footer */}
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center text-xs text-emerald-800 space-y-1">
              <p className="font-bold flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> คำแนะนำสำหรับผู้ส่งสินค้า:
              </p>
              <p>กรุณาเดินทางมาถึงก่อนเวลานัดหมาย 10-15 นาที และแสดงบัตรคิวนี้ให้เจ้าหน้าที่ตรวจสอบคิวส่งเมื่อเดินทางมาถึง</p>
            </div>

            {/* Notice & Cancellation Section */}
            <div className="pt-2 border-t border-slate-100 space-y-3 no-print">
              {/* Official Contact Notice */}
              <div className="p-3.5 bg-amber-50/90 border border-amber-200/90 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
                <Phone className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-amber-950">
                    📌 หมายเหตุ: หากต้องการยกเลิกหรือแก้ไขรอบเวลาเข้าส่ง
                  </p>
                  <p className="text-amber-800 leading-relaxed">
                    กรุณาติดต่อเจ้าหน้าที่ฝ่ายตรวจรับสินค้า โทร.{' '}
                    <a
                      href="tel:0993787463"
                      className="font-bold underline text-emerald-800 hover:text-emerald-950"
                    >
                      099-378-7463
                    </a>{' '}
                    ก่อนเวลานัดหมายอย่างน้อย 1 ชั่วโมง
                  </p>
                </div>
              </div>

              {/* Self-Cancel Button (Displayed ONLY on Creator Device & if Pending or Approved) */}
              {isCreatorDevice && (booking.status === 'Pending' || booking.status === 'Approved') && (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setCancelModalOpen(true)}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold hover:underline inline-flex items-center gap-1.5 py-2 px-3 rounded-xl hover:bg-rose-50 transition"
                    title="ยกเลิกการจอง (สำหรับเครื่องที่ทำรายการจอง)"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>ขอยกเลิกการจองคิวนี้ (สำหรับเครื่องที่ทำรายการจอง)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* User Self-Cancel Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900">ยืนยันการยกเลิกคิว</h3>
              <p className="text-xs text-slate-500">
                คุณแน่ใจหรือไม่ว่าต้องการยกเลิกคิว <strong className="font-mono text-slate-800">{booking.booking_id}</strong>?
              </p>
            </div>

            <form onSubmit={handleUserCancel} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">เหตุผลในการขอยกเลิก (ระบุหรือไม่ก็ได้)</label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="เช่น ติดภารกิจด่วน, ขอเปลี่ยนวันส่งใหม่, รถเกิดเหตุขัดข้อง"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              {cancelError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                  {cancelError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  disabled={cancelling}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition"
                >
                  ย้อนกลับ
                </button>
                <button
                  type="submit"
                  disabled={cancelling}
                  className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-rose-200"
                >
                  {cancelling ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิกคิว'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}
