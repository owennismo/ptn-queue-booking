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
} from 'lucide-react';
import { Booking } from '@/lib/types';
import QRScannerModal from '@/components/QRScannerModal';
import { formatThaiDate, formatThaiShortDate } from '@/lib/dateUtils';

export default function TrackPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [error, setError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 1. Fetch All Bookings on mount and on refresh
  const fetchAllBookings = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/bookings');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ไม่สามารถโหลดข้อมูลคิวได้');
      const list: Booking[] = data.bookings || [];
      setAllBookings(list);
    } catch (err: any) {
      console.error('Fetch bookings error:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllBookings();
  }, [fetchAllBookings]);

  // 2. Filter bookings locally based on query and statusFilter
  useEffect(() => {
    let result = [...allBookings];

    // Status filter
    if (statusFilter !== 'All') {
      result = result.filter((b) => b.status === statusFilter);
    }

    // Search Query
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      const cleanQ = query.trim().replace(/[- ]/g, '');
      result = result.filter(
        (b) =>
          b.booking_id.toLowerCase().includes(q) ||
          b.carrier_name.toLowerCase().includes(q) ||
          b.client_name.toLowerCase().includes(q) ||
          b.requested_date.includes(q) ||
          (b.driver_name && b.driver_name.toLowerCase().includes(q)) ||
          (b.license_plate && b.license_plate.toLowerCase().includes(q)) ||
          b.user_phone.replace(/[- ]/g, '').includes(cleanQ)
      );
    }

    setFilteredBookings(result);
  }, [allBookings, query, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      fetchAllBookings(true);
      return;
    }
  };

  const handleQRScanned = (scannedId: string) => {
    setScannerOpen(false);
    setQuery(scannedId);
    if (scannedId.startsWith('PTN-')) {
      router.push(`/booking?id=${scannedId}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> อนุมัติแล้ว
          </span>
        );
      case 'Rejected':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 flex items-center gap-1 shadow-sm">
            <XCircle className="w-3.5 h-3.5 text-rose-600" /> ไม่อนุมัติ
          </span>
        );
      case 'Cancelled':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 flex items-center gap-1 shadow-sm">
            <AlertCircle className="w-3.5 h-3.5 text-slate-500" /> ยกเลิกแล้ว
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1 shadow-sm animate-pulse">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> รอตรวจสอบ
          </span>
        );
    }
  };

  // Stats Counters
  const totalCount = allBookings.length;
  const approvedCount = allBookings.filter((b) => b.status === 'Approved').length;
  const pendingCount = allBookings.filter((b) => b.status === 'Pending').length;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Title */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-full px-3 py-1 text-xs font-semibold mb-2">
            <Layers className="w-3.5 h-3.5" />
            <span>ตารางคิวและสถานะการเข้าส่งสินค้าดิจิทัล</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            รายการจองคิวและตรวจสอบสถานะ
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
            แสดงรายการคิวทั้งหมดที่จองเข้ามา สามารถค้นหาด้วยรหัส Booking ID, เบอร์โทรศัพท์, ขนส่ง หรือสแกน QR Code
          </p>
        </div>

        {/* Quick Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setStatusFilter('All')}
            className={`p-3.5 rounded-2xl border text-center transition ${
              statusFilter === 'All'
                ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900 ring-offset-2'
                : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
            }`}
          >
            <span className="text-[10px] sm:text-xs block opacity-80">คิวทั้งหมด</span>
            <span className="text-lg sm:text-xl font-black">{totalCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('Pending')}
            className={`p-3.5 rounded-2xl border text-center transition ${
              statusFilter === 'Pending'
                ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-600 ring-offset-2'
                : 'bg-white hover:bg-amber-50/50 text-slate-800 border-slate-200'
            }`}
          >
            <span className="text-[10px] sm:text-xs block opacity-80">รอตรวจสอบ</span>
            <span className="text-lg sm:text-xl font-black text-amber-600 group-hover:text-amber-700">
              {pendingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('Approved')}
            className={`p-3.5 rounded-2xl border text-center transition ${
              statusFilter === 'Approved'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-600 ring-offset-2'
                : 'bg-white hover:bg-emerald-50/50 text-slate-800 border-slate-200'
            }`}
          >
            <span className="text-[10px] sm:text-xs block opacity-80">อนุมัติแล้ว</span>
            <span className="text-lg sm:text-xl font-black text-emerald-600">
              {approvedCount}
            </span>
          </button>
        </div>

        {/* Search Input Box & QR Camera Button */}
        <form onSubmit={handleSearchSubmit} className="bg-white rounded-3xl border border-slate-200 p-3 sm:p-4 shadow-md flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="ค้นหา Booking ID, เบอร์โทร, ขนส่ง, วันที่..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white transition text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition flex items-center justify-center gap-1.5 shrink-0 text-sm shadow-sm"
              title="เปิดกล้องสแกน QR Code"
            >
              <Camera className="w-4 h-4 text-emerald-600" />
              <span>สแกน QR</span>
            </button>

            <button
              type="button"
              onClick={() => fetchAllBookings(true)}
              disabled={loading || refreshing}
              className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition flex items-center justify-center shrink-0 shadow-sm"
              title="รีเฟรชข้อมูลล่าสุด"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>
        </form>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-semibold text-slate-500 mr-1">สถานะ:</span>
          {['All', 'Pending', 'Approved', 'Rejected', 'Cancelled'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                statusFilter === st
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {st === 'All'
                ? 'ทั้งหมด'
                : st === 'Pending'
                ? 'รอตรวจสอบ'
                : st === 'Approved'
                ? 'อนุมัติแล้ว'
                : st === 'Rejected'
                ? 'ไม่อนุมัติ'
                : 'ยกเลิกแล้ว'}
            </button>
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm font-medium text-center">
            {error}
          </div>
        )}

        {/* Bookings List Cards */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-slate-800">
              รายการคิวทั้งหมด ({filteredBookings.length} คิว)
            </h3>
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-xs font-semibold text-rose-600 hover:underline"
              >
                ล้างคำค้นหา
              </button>
            )}
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400 space-y-2 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
              <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">กำลังโหลดรายการคิวทั้งหมด...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
              <Calendar className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">ไม่พบรายการคิวการจอง</p>
              <p className="text-xs text-slate-400">ยังไม่มีคิวที่ตรงกับเงื่อนไขการค้นหาในขณะนี้</p>
            </div>
          ) : (
            filteredBookings.map((item) => (
              <Link
                key={item.booking_id}
                href={`/booking?id=${item.booking_id}`}
                className="block bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:border-emerald-300 transition group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 group-hover:text-emerald-600 transition text-base">
                        {item.booking_id}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 font-medium block">
                      ผู้รับ/เจ้าของสินค้า: <strong className="text-slate-700">{item.client_name}</strong>
                    </span>
                  </div>
                  <div>{getStatusBadge(item.status)}</div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[11px]">วันที่นัดหมาย (พ.ศ.)</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      {formatThaiShortDate(item.requested_date)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">ช่วงเวลานัด</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      {item.requested_time}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">บริษัทขนส่ง</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5 truncate">
                      <Truck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      {item.carrier_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">จำนวนสินค้า</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                      <Package className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      {item.pallet_count} ลัง / {item.vehicle_count} คัน
                    </span>
                  </div>
                </div>

                {/* Cargo Type & Vehicle Type Badges */}
                <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {item.cargo_type && (
                      <span className={`px-2 py-0.5 rounded-md font-medium ${
                        item.cargo_type.includes('ยาเย็น') || item.cargo_type.includes('Cold Chain')
                          ? 'bg-cyan-100 text-cyan-800 border border-cyan-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        📦 {item.cargo_type}
                      </span>
                    )}
                    {item.vehicle_type && (
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                        🚛 {item.vehicle_type}
                      </span>
                    )}
                  </div>

                  <span className="text-emerald-600 font-semibold group-hover:underline flex items-center gap-0.5 shrink-0">
                    ดูบัตรคิว <ArrowRight className="w-3 h-3" />
                  </span>
                </div>

                {(item.driver_name || item.license_plate) && (
                  <div className="mt-2 text-[11px] text-slate-500">
                    ผู้ส่งสินค้า: <strong className="text-slate-700">{item.driver_name || '-'}</strong> | ทะเบียน: <strong className="text-slate-700">{item.license_plate || '-'}</strong>
                  </div>
                )}
              </Link>
            ))
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
