'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarClock, Search, Phone, MessageCircle } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  // Hide public navbar on admin pages, poster page, and preview prototype
  if (pathname.startsWith('/admin') || pathname === '/poster' || pathname === '/preview') {
    return null;
  }

  const isBookingActive = pathname === '/';
  const isTrackActive = pathname === '/track' || pathname.startsWith('/booking');

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs no-print">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Row 1: Brand & Contact Badges (Desktop & Mobile) */}
        <div className="flex items-center justify-between py-2.5 sm:py-3 border-b border-slate-100 sm:border-b-0 gap-2">
          {/* Logo & Company Title */}
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white flex items-center justify-center font-black text-base sm:text-lg shadow-md shadow-emerald-900/20 group-hover:scale-105 transition">
              P
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight">PTN PHARMA</span>
                <span className="text-[10px] sm:text-xs uppercase font-bold bg-emerald-100 text-emerald-800 px-2 py-0.2 sm:py-0.5 rounded-full border border-emerald-200">
                  พัฒนาเภสัช
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium hidden sm:block">
                ระบบนัดหมายจองคิวส่งสินค้าคลังยาและเวชภัณฑ์
              </p>
            </div>
          </Link>

          {/* Desktop Center: Segmented Capsule Switcher */}
          <div className="hidden md:flex items-center bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
            <Link
              href="/"
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                isBookingActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-600/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <CalendarClock className={`w-4 h-4 ${isBookingActive ? 'text-white' : 'text-emerald-600'}`} />
              <span>จองคิวส่งของใหม่</span>
            </Link>

            <Link
              href="/track"
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                isTrackActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-600/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <Search className={`w-4 h-4 ${isTrackActive ? 'text-white' : 'text-emerald-600'}`} />
              <span>ตรวจสอบสถานะคิว</span>
            </Link>
          </div>

          {/* Contact Badges (Phone & LINE) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <a
              href="tel:0993787463"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs sm:text-sm font-bold transition shadow-2xs group"
              title="โทรติดต่อแผนกรับสินค้าโดยตรง"
            >
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center group-hover:scale-110 transition shadow-xs">
                <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </div>
              <span className="hidden sm:inline">099-378-7463</span>
              <span className="sm:hidden text-xs">โทร</span>
            </a>

            <a
              href="https://line.me/ti/p/~ptnexpress"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#06C755]/10 hover:bg-[#06C755]/20 text-[#048737] border border-[#06C755]/30 text-xs sm:text-sm font-bold transition shadow-2xs group"
              title="เพิ่มเพื่อนทาง LINE"
            >
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-[#06C755] text-white flex items-center justify-center group-hover:scale-110 transition shadow-xs">
                <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </div>
              <span className="hidden sm:inline">LINE: <strong className="font-mono">ptnexpress</strong></span>
              <span className="sm:hidden text-xs font-mono">LINE</span>
            </a>
          </div>
        </div>

        {/* Mobile Sub-row: Full-Width Segmented Capsule Switcher */}
        <div className="md:hidden py-2">
          <div className="grid grid-cols-2 gap-1.5 bg-slate-100/90 p-1 rounded-2xl border border-slate-200 shadow-inner">
            <Link
              href="/"
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                isBookingActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarClock className={`w-4 h-4 ${isBookingActive ? 'text-white' : 'text-emerald-600'}`} />
              <span>จองคิวส่งของใหม่</span>
            </Link>

            <Link
              href="/track"
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                isTrackActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Search className={`w-4 h-4 ${isTrackActive ? 'text-white' : 'text-emerald-600'}`} />
              <span>ตรวจสอบสถานะคิว</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
