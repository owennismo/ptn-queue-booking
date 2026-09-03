'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import {
  Printer,
  Download,
  ArrowLeft,
  Phone,
  Scan,
  Calendar,
  FileEdit,
  Ticket,
  Smartphone,
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
        pixelRatio: 3, // 300 DPI high clarity
        cacheBust: true,
        backgroundColor: '#08192e',
      });
      const link = document.createElement('a');
      link.download = 'PTN_Queue_Booking_Standee_Poster.png';
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
    <div className="min-h-screen bg-slate-200/70 py-8 px-4 sm:px-6 flex flex-col items-center justify-center">
      {/* Top Action Bar (Hidden during printing) */}
      <div className="w-full max-w-[560px] mx-auto mb-5 flex flex-wrap items-center justify-between gap-3 no-print">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-sm transition"
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
            <span>{downloading ? 'กำลังบันทึกภาพ...' : 'บันทึกรูปภาพ (PNG คมชัดสูง)'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์ A4 Standee</span>
          </button>
        </div>
      </div>

      {/* 🌟 POSTER CANVAS (Exact match with Standee mockup design) */}
      <div
        ref={posterRef}
        className="w-full max-w-[540px] bg-[#08192e] rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col justify-between relative border border-slate-700/60 print:shadow-none print:border-none print:max-w-none print:w-full print:rounded-none"
        style={{ minHeight: '820px' }}
      >
        {/* Background Geometric Angled Ribbons */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Top Right Green Diagonal Bands */}
          <div className="absolute -top-16 -right-16 w-80 h-80 bg-emerald-600/30 -rotate-45 transform origin-center blur-xs" />
          <div className="absolute top-12 -right-8 w-72 h-20 bg-emerald-500/25 -rotate-45 transform origin-center" />
          <div className="absolute top-28 -right-12 w-64 h-12 bg-teal-400/20 -rotate-45 transform origin-center" />

          {/* Left Middle Green Diagonal Bands */}
          <div className="absolute top-1/3 -left-20 w-80 h-28 bg-emerald-700/40 -rotate-45 transform origin-center" />
          <div className="absolute top-[42%] -left-12 w-64 h-12 bg-teal-500/25 -rotate-45 transform origin-center" />

          {/* Speed line accents */}
          <div className="absolute top-[28%] left-6 w-16 h-1 bg-emerald-400/40 rounded-full" />
          <div className="absolute top-[30%] left-4 w-12 h-1 bg-emerald-400/30 rounded-full" />
          <div className="absolute top-[32%] left-8 w-8 h-1 bg-emerald-400/20 rounded-full" />

          <div className="absolute top-[52%] right-6 w-16 h-1 bg-emerald-400/40 rounded-full" />
          <div className="absolute top-[54%] right-4 w-12 h-1 bg-emerald-400/30 rounded-full" />
        </div>

        {/* 1. TOP HEADER SECTION */}
        <div className="relative z-10 pt-7 px-7 pb-4 space-y-4">
          {/* Top Brand Logo Banner */}
          <div className="flex items-center justify-between">
            <div className="bg-white rounded-2xl px-3.5 py-2 flex items-center gap-2.5 shadow-md">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-black text-sm shadow-xs">
                P
              </div>
              <div className="text-left">
                <span className="font-extrabold text-slate-900 text-sm tracking-tight block leading-tight">
                  PTN
                </span>
                <span className="text-[9px] font-bold text-emerald-700 tracking-wider block">
                  PHARMA CENTER
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                Queue Booking System
              </span>
              <span className="text-xs text-slate-300 font-medium">
                พัฒนาเภสัช
              </span>
            </div>
          </div>

          {/* Main Titles */}
          <div className="text-center pt-2 space-y-1">
            <h2 className="text-xl sm:text-2xl font-black tracking-wider uppercase text-white font-sans">
              PTN PHARMA CENTER
            </h2>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-emerald-300 tracking-tight">
              ระบบจองคิวเข้าส่งสินค้าออนไลน์
            </h1>
          </div>
        </div>

        {/* 2. CENTER WHITE QR CODE CARD */}
        <div className="relative z-10 px-6 py-2 flex justify-center">
          <div className="w-full max-w-[380px] bg-white rounded-3xl p-6 text-slate-900 shadow-2xl text-center space-y-4 border border-slate-100">
            {/* Scan Title Box */}
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 shadow-xs">
                <Scan className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  สแกนที่นี่เพื่อจองคิว
                </h3>
                <span className="text-xs font-semibold text-slate-500 block">
                  (Scan to Book Queue)
                </span>
              </div>
            </div>

            {/* Crisp High-Contrast QR Code */}
            <div className="p-4 bg-white rounded-2xl border-2 border-slate-200 inline-block shadow-inner">
              <QRCodeSVG
                value={websiteUrl}
                size={220}
                level="H"
                includeMargin={false}
                imageSettings={{
                  src: '/favicon.png',
                  x: undefined,
                  y: undefined,
                  height: 38,
                  width: 38,
                  excavate: true,
                }}
              />
            </div>

            <div className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 py-1.5 px-3 rounded-xl border border-emerald-100 inline-block">
              ptn-queue-booking.pages.dev
            </div>
          </div>
        </div>

        {/* 3. LOWER 4-STEPS GUIDE SECTION */}
        <div className="relative z-10 px-5 pt-4 pb-4">
          <div className="grid grid-cols-4 gap-2 text-center">
            {/* Step 1 */}
            <div className="flex flex-col items-center space-y-1.5">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/90 border border-slate-600/80 text-white flex items-center justify-center shadow-md">
                  <Smartphone className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-emerald-500 text-white font-black text-[10px] flex items-center justify-center border-2 border-[#08192e]">
                  1.
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-200 leading-tight">
                สแกน QR Code
              </span>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center space-y-1.5">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/90 border border-slate-600/80 text-white flex items-center justify-center shadow-md">
                  <Calendar className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-emerald-500 text-white font-black text-[10px] flex items-center justify-center border-2 border-[#08192e]">
                  2.
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-200 leading-tight">
                เลือกรอบเวลา
              </span>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center space-y-1.5">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/90 border border-slate-600/80 text-white flex items-center justify-center shadow-md">
                  <FileEdit className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-emerald-500 text-white font-black text-[10px] flex items-center justify-center border-2 border-[#08192e]">
                  3.
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-200 leading-tight">
                กรอกข้อมูล
              </span>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col items-center space-y-1.5">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/90 border border-slate-600/80 text-white flex items-center justify-center shadow-md">
                  <Ticket className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-emerald-500 text-white font-black text-[10px] flex items-center justify-center border-2 border-[#08192e]">
                  4.
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-200 leading-tight">
                รับบัตรคิวดิจิทัล
              </span>
            </div>
          </div>
        </div>

        {/* 4. BOTTOM CONTACT & COMPANY BANNER */}
        <div className="relative z-10">
          {/* Green Contact Bar */}
          <div className="bg-emerald-600 py-3.5 px-6 flex flex-wrap items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-2 font-bold text-sm sm:text-base">
              <div className="w-6 h-6 rounded-full bg-white text-emerald-700 flex items-center justify-center shadow-xs">
                <Phone className="w-3.5 h-3.5" />
              </div>
              <span className="font-mono tracking-tight">099-378-7463</span>
            </div>

            <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
              <span className="bg-white text-emerald-800 text-[10px] font-black px-1.5 py-0.5 rounded-md">
                LINE
              </span>
              <span>LINE ID: <strong className="font-mono">ptnexpress</strong></span>
            </div>
          </div>

          {/* Deep Navy Company Footer */}
          <div className="bg-[#051120] py-3 px-4 text-center border-t border-slate-800">
            <p className="text-xs font-semibold text-slate-300">
              บริษัท พีทีเอ็น ฟาร์มาเซ็นเตอร์ จำกัด (พัฒนาเภสัช)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
