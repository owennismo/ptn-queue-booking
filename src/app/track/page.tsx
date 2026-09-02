'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, Phone, Hash, ArrowRight, Calendar, Clock, CheckCircle2, AlertCircle, XCircle, Truck } from 'lucide-react';
import { Booking } from '@/lib/types';

export default function TrackPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults(null);

    const isPhone = /^[0-9-+ ]+$/.test(query.trim()) && query.trim().length >= 8;
    const url = isPhone
      ? `/api/bookings?phone=${encodeURIComponent(query.trim())}`
      : `/api/bookings?id=${encodeURIComponent(query.trim())}`;

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'ไม่พบข้อมูลการจอง');
      }

      setResults(data.bookings || []);
      if (!data.bookings || data.bookings.length === 0) {
        setError('ไม่พบคิวที่ตรงกับข้อมูลที่ค้นหา');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการค้นหา');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> อนุมัติแล้ว</span>;
      case 'Rejected':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> ไม่อนุมัติ</span>;
      case 'Cancelled':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> ยกเลิกแล้ว</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> รอตรวจสอบ</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            ตรวจสอบสถานะคิวการจอง
          </h1>
          <p className="text-sm text-slate-500">
            ค้นหาด้วยรหัสการจอง (Booking ID) หรือเบอร์โทรศัพท์ที่ใช้ลงทะเบียน
          </p>
        </div>

        {/* Search Input Box */}
        <form onSubmit={handleSearch} className="bg-white rounded-3xl border border-slate-200 p-3 sm:p-4 shadow-md flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="กรอก Booking ID หรือ เบอร์โทรศัพท์..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>ค้นหา</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Error message */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm font-medium text-center">
            {error}
          </div>
        )}

        {/* Results List */}
        {results && results.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-700 px-1">
              ผลการค้นหา ({results.length} รายการ)
            </h3>
            {results.map((item) => (
              <Link
                key={item.booking_id}
                href={`/booking?id=${item.booking_id}`}
                className="block bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:border-emerald-300 transition group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 text-base group-hover:text-emerald-700 transition">
                      {item.booking_id}
                    </span>
                  </div>
                  <div>{getStatusBadge(item.status)}</div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 text-xs sm:text-sm">
                  <div>
                    <span className="text-slate-400 block text-[11px]">วันที่เข้าส่ง</span>
                    <span className="font-semibold text-slate-800">{item.requested_date}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">ช่วงเวลา</span>
                    <span className="font-semibold text-slate-800">{item.requested_time}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">บริษัทขนส่ง</span>
                    <span className="font-semibold text-slate-800 truncate block">{item.carrier_name}</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-50">
                  <span>ผู้ส่ง: {item.client_name}</span>
                  <span className="text-emerald-600 font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    ดูบัตรคิว <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
