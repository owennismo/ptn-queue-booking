'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarClock, Search } from 'lucide-react';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [deviceBookingCount, setDeviceBookingCount] = useState<number>(0);

  // Hide on admin, poster, and preview pages
  if (pathname.startsWith('/admin') || pathname === '/poster' || pathname === '/preview') {
    return null;
  }

  // Load count of bookings created on this phone
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const myBookings: string[] = JSON.parse(localStorage.getItem('ptn_my_bookings') || '[]');
      const sessionBookingId = sessionStorage.getItem('ptn_booking_id');
      const allIds = Array.from(new Set([...myBookings, ...(sessionBookingId ? [sessionBookingId] : [])])).filter(Boolean);
      setDeviceBookingCount(allIds.length);
    } catch (e) {
      setDeviceBookingCount(0);
    }
  }, [pathname]);

  const isBookingActive = pathname === '/';
  const isTrackActive = pathname === '/track' || pathname.startsWith('/booking');

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-3 py-1.5 pb-[max(env(safe-area-inset-bottom),0.5rem)] no-print">
      <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
        {/* Button 1: จองคิวส่งของ */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all ${
            isBookingActive
              ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-200 ring-2 ring-emerald-600/30'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
          }`}
        >
          <div className="relative">
            <CalendarClock className={`w-5 h-5 ${isBookingActive ? 'text-white' : 'text-emerald-600'}`} />
          </div>
          <span className="text-xs mt-1 leading-tight tracking-tight">จองคิวส่งของ</span>
        </Link>

        {/* Button 2: ตรวจสอบสถานะ */}
        <Link
          href="/track"
          className={`relative flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all ${
            isTrackActive
              ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-200 ring-2 ring-emerald-600/30'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
          }`}
        >
          <div className="relative">
            <Search className={`w-5 h-5 ${isTrackActive ? 'text-white' : 'text-emerald-600'}`} />
            {deviceBookingCount > 0 && (
              <span className={`absolute -top-1.5 -right-3 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full border ${
                isTrackActive
                  ? 'bg-amber-400 text-slate-950 border-white'
                  : 'bg-emerald-500 text-white border-white'
              }`}>
                {deviceBookingCount}
              </span>
            )}
          </div>
          <span className="text-xs mt-1 leading-tight tracking-tight">ตรวจสอบสถานะ</span>
        </Link>
      </div>
    </div>
  );
}
