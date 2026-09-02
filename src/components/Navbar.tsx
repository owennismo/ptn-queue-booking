'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarClock, Search, ShieldAlert, Truck, Sparkles } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Company Title */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-200 group-hover:scale-105 transition-transform">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-lg sm:text-xl tracking-tight">PTN Pharma</span>
                <span className="text-[10px] uppercase font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">พัฒนาเภสัช</span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">บริษัท พีทีเอ็น ฟาร์มาเซ็นเตอร์ จำกัด</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <CalendarClock className="w-4 h-4" />
              <span>จองคิว</span>
            </Link>

            <Link
              href="/track"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/track'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>เช็คสถานะ</span>
            </Link>

            <Link
              href="/admin"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith('/admin')
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>เจ้าหน้าที่ / Admin</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
