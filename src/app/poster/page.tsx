'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import {
  Printer,
  Download,
  ArrowLeft,
  Phone,
  MessageCircle,
  Sparkles,
  QrCode,
} from 'lucide-react';
import { toPng } from 'html-to-image';

export default function PosterPage() {
  const posterRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const websiteUrl = 'https://ptn-queue-booking.pages.dev';

  const handleDownloadPNG = async () => {
    if (!posterRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(posterRef.current, {
        pixelRatio: 3, // Ultra high resolution for crisp print
        cacheBust: true,
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      link.download = 'PTN_Queue_Booking_Poster_A4.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Download poster error:', err);
      alert('เกิดข้อผิดพลาดในการดาวน์โหลดรูปภาพ');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 flex flex-col items-center justify-center">
      {/* Top Control Bar (Hidden when Printing) */}
      <div className="w-full max-w-xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-3 no-print">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-sm transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับหน้า Admin</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadPNG}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-200 transition active:scale-95 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'กำลังบันทึกภาพ...' : 'บันทึกรูปภาพความคมชัดสูง (PNG)'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์โปสเตอร์ A4</span>
          </button>
        </div>
      </div>

      {/* 🌟 POSTER CANVAS (A4 Ratio ~ 1 : 1.414) */}
      <div
        ref={posterRef}
        className="w-full max-w-[560px] bg-white rounded-3xl border-2 border-slate-300 shadow-2xl overflow-hidden text-slate-900 flex flex-col justify-between print:shadow-none print:border-none print:max-w-none print:w-full print:rounded-none"
        style={{ minHeight: '780px' }}
      >
        {/* Header Section */}
        <div className="bg-gradient-to-br from-emerald-700 via-emerald-800 to-slate-900 text-white p-7 text-center relative overflow-hidden">
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-3.5 py-1 text-xs font-semibold text-emerald-100 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>PTN PHARMA CENTER • ONLINE QUEUE SYSTEM</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white pt-1">
              ระบบจองคิวเข้าส่งสินค้า
            </h1>

            <p className="text-sm font-medium text-emerald-100/90">
              บริษัท พีทีเอ็น ฟาร์มาเซ็นเตอร์ จำกัด (พัฒนาเภสัช)
            </p>
          </div>

          {/* Background Decorative Rings */}
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-teal-500/20 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Center: Prominent QR Code Section */}
        <div className="p-7 flex flex-col items-center text-center space-y-5 flex-1 justify-center">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
              <QrCode className="w-3.5 h-3.5" />
              <span>SCAN TO BOOK QUEUE</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              สแกนที่นี่เพื่อจองคิวส่งของ
            </h2>
            <p className="text-xs text-slate-500">
              เปิดกล้องมือถือหรือแอป LINE สแกน QR Code เพื่อเลือกเวลานัดหมาย
            </p>
          </div>

          {/* High-Resolution QR Code Card */}
          <div className="p-5 bg-white rounded-3xl border-2 border-emerald-500/30 shadow-xl relative group">
            <div className="p-2 bg-white rounded-2xl">
              <QRCodeSVG
                value={websiteUrl}
                size={230}
                level="H"
                includeMargin={false}
                imageSettings={{
                  src: '/favicon.png',
                  x: undefined,
                  y: undefined,
                  height: 42,
                  width: 42,
                  excavate: true,
                }}
              />
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 text-center">
              <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                ptn-queue-booking.pages.dev
              </span>
            </div>
          </div>

          {/* 4 Steps to Book */}
          <div className="w-full pt-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              ขั้นตอนการจองคิว 4 ขั้นตอนง่ายๆ
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <div className="w-7 h-7 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-xs mx-auto shadow-xs">
                  1
                </div>
                <span className="text-[11px] font-bold text-slate-800 block">สแกน QR</span>
                <span className="text-[9px] text-slate-400 block">เปิดระบบจอง</span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <div className="w-7 h-7 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-xs mx-auto shadow-xs">
                  2
                </div>
                <span className="text-[11px] font-bold text-slate-800 block">เลือกรอบเวลา</span>
                <span className="text-[9px] text-slate-400 block">วันที่ & สล็อต</span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <div className="w-7 h-7 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-xs mx-auto shadow-xs">
                  3
                </div>
                <span className="text-[11px] font-bold text-slate-800 block">กรอกข้อมูล</span>
                <span className="text-[9px] text-slate-400 block">ขนส่ง & จำนวนลัง</span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <div className="w-7 h-7 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-xs mx-auto shadow-xs">
                  4
                </div>
                <span className="text-[11px] font-bold text-slate-800 block">รับบัตรคิว</span>
                <span className="text-[9px] text-slate-400 block">พร้อมแสดงหน้างาน</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Contact Info Banner */}
        <div className="bg-slate-900 text-white p-5 border-t border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold">
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3.5 py-2 rounded-xl text-emerald-300">
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>แผนกรับสินค้า: 099-378-7463</span>
            </div>

            <div className="flex items-center gap-2 bg-[#06C755]/20 border border-[#06C755]/40 px-3.5 py-2 rounded-xl text-[#52ff94]">
              <MessageCircle className="w-4 h-4 text-[#06C755]" />
              <span>LINE ID: ptnexpress</span>
            </div>
          </div>

          <p className="text-center text-[10px] text-slate-400 font-medium">
            คลังสินค้า บริษัท พีทีเอ็น ฟาร์มาเซ็นเตอร์ จำกัด (พัฒนาเภสัช) • เวลาทำการ จันทร์ - เสาร์ 08:00 - 17:00 น.
          </p>
        </div>
      </div>
    </div>
  );
}
