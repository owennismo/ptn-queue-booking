'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Printer,
  X,
  Package,
  Calendar,
  Clock,
  Truck,
  Building2,
  ThermometerSnowflake,
  User,
  ShieldCheck,
  CheckCircle2,
  Tag,
  MapPin,
  FileText,
} from 'lucide-react';
import { Booking } from '@/lib/types';
import { formatThaiDate, formatThaiDateTime } from '@/lib/dateUtils';

interface PalletTagModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function PalletTagModal({ booking, isOpen, onClose }: PalletTagModalProps) {
  const [printMode, setPrintMode] = useState<'individual' | 'summary'>('individual');
  const [customPalletCount, setCustomPalletCount] = useState<number>(0);
  const [storageLocation, setStorageLocation] = useState<string>('');
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Reset custom count and location when a new booking opens
    if (booking) {
      const defaultPallets =
        booking.actual_pallet_count !== undefined &&
        booking.actual_pallet_count !== null &&
        booking.actual_pallet_count > 0
          ? booking.actual_pallet_count
          : booking.pallet_count || 1;
      setCustomPalletCount(defaultPallets);
      setStorageLocation('');
    }
  }, [booking]);

  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.classList.remove('printing-pallet-tag-mode');
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  if (!isOpen || !booking) return null;

  const totalPallets = customPalletCount > 0 ? customPalletCount : booking.pallet_count || 1;

  const tagsArray =
    printMode === 'individual'
      ? Array.from({ length: Math.max(1, totalPallets) }, (_, i) => i + 1)
      : [1];

  const handlePrint = () => {
    document.body.classList.add('printing-pallet-tag-mode');
    // Allow DOM to apply class before calling native print dialog
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-pallet-tag-mode');
      }, 500);
    }, 80);
  };

  const isColdChain =
    booking.cargo_type?.includes('ยาเย็น') ||
    booking.cargo_type?.includes('Cold Chain') ||
    booking.cargo_type?.includes('2-8');

  // URL for scanning QR code on pallet
  const trackingUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/booking/${booking.booking_id}`
      : `https://ptn-queue-booking.pages.dev/booking/${booking.booking_id}`;

  const printTimestamp = new Date().toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <>
      {/* 🖨️ On-screen Modal Dialog (Never printed) */}
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 no-print animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col">
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>พิมพ์ป้ายพาเลท & รายการคิวส่งของ</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold">
                    100 × 150 มม.
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  สติ๊กเกอร์ความร้อน (Thermal Label 4x6 นิ้ว) • รหัสคิว:{' '}
                  <strong className="font-mono text-emerald-700">{booking.booking_id}</strong>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body & Settings */}
          <div className="py-4 space-y-4 overflow-y-auto flex-1 pr-1">
            {/* Print Mode & Quantity Settings */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  รูปแบบและจำนวนป้าย
                </span>
                <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  เครื่องพิมพ์สติ๊กเกอร์ความร้อน 100x150 มม.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPrintMode('individual')}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                    printMode === 'individual'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                      printMode === 'individual'
                        ? 'border-white bg-white text-emerald-600'
                        : 'border-slate-400'
                    }`}
                  >
                    {printMode === 'individual' && (
                      <div className="w-2 h-2 rounded-full bg-emerald-600" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold block">
                      พิมพ์แยกทุกพาเลท ({totalPallets} แผ่น)
                    </span>
                    <span
                      className={`text-[11px] block mt-0.5 ${
                        printMode === 'individual' ? 'text-emerald-100' : 'text-slate-500'
                      }`}
                    >
                      ระบุหมายเลข 1/{totalPallets}, 2/{totalPallets} ... สำหรับติดทุกพาเลท
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPrintMode('summary')}
                  className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                    printMode === 'summary'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                      printMode === 'summary'
                        ? 'border-white bg-white text-emerald-600'
                        : 'border-slate-400'
                    }`}
                  >
                    {printMode === 'summary' && (
                      <div className="w-2 h-2 rounded-full bg-emerald-600" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold block">พิมพ์ใบสรุปรวม (1 แผ่น)</span>
                    <span
                      className={`text-[11px] block mt-0.5 ${
                        printMode === 'summary' ? 'text-emerald-100' : 'text-slate-500'
                      }`}
                    >
                      ป้ายรวมยอดพาเลททั้งหมด {totalPallets} พาเลทในใบเดียว
                    </span>
                  </div>
                </button>
              </div>

              {/* Number of Pallets and Storage Bin Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/80 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">จำนวนพาเลท:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      max="200"
                      value={customPalletCount || totalPallets}
                      onChange={(e) =>
                        setCustomPalletCount(Math.max(1, parseInt(e.target.value, 10) || 1))
                      }
                      className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-center font-mono font-bold text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-slate-500">พาเลท</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600 font-medium whitespace-nowrap">
                    ตำแหน่งจัดเก็บ (Bin):
                  </span>
                  <input
                    type="text"
                    placeholder="เช่น A-02-04 หรือ RACK-1"
                    value={storageLocation}
                    onChange={(e) => setStorageLocation(e.target.value)}
                    className="flex-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-mono text-slate-800 text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Sticker Preview Mockup (100x150 mm proportion) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  ตัวอย่างสติ๊กเกอร์ขนาด 100 × 150 มม. (Label Preview):
                </span>
                <span className="text-[11px] text-slate-400">อัตราส่วน 100 : 150 mm</span>
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 bg-slate-100 flex justify-center">
                {/* Visual Label Card */}
                <div className="w-[340px] bg-white border-2 border-slate-900 rounded-xl p-3.5 shadow-md text-black font-sans space-y-2 select-none">
                  {/* Top Header */}
                  <div className="flex items-center justify-between border-b-2 border-slate-900 pb-1.5">
                    <div>
                      <span className="text-[9px] font-black tracking-widest text-slate-600 uppercase block">
                        PTN PHARMA CENTER • LOGISTICS
                      </span>
                      <h4 className="text-xs font-black text-slate-900 leading-tight">
                        บจก. พีทีเอ็น ฟาร์มาเซ็นเตอร์ (พัฒนาเภสัช)
                      </h4>
                      <span className="text-[9px] text-slate-700 font-semibold block">
                        ป้ายกำกับคิวส่งสินค้า & พาเลท (Pallet & Queue Tag)
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="bg-black text-white px-2 py-1 rounded-md text-center">
                        <span className="text-[8px] font-bold block uppercase tracking-wider leading-none">
                          PALLET
                        </span>
                        <span className="text-sm font-black font-mono leading-none mt-0.5 block">
                          {printMode === 'individual'
                            ? `01 / ${String(totalPallets).padStart(2, '0')}`
                            : `TOTAL ${totalPallets}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Big Queue ID & QR Banner */}
                  <div className="bg-slate-100 border border-slate-800 rounded-lg p-2 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[8px] font-black uppercase text-slate-600 block">
                        หมายเลขคิวส่งของ (QUEUE ID)
                      </span>
                      <div className="text-xl font-mono font-black text-slate-950 tracking-tight leading-none mt-0.5">
                        {booking.booking_id}
                      </div>
                      <div className="text-[10px] text-slate-800 font-bold mt-1">
                        นัดส่ง: {formatThaiDate(booking.requested_date)} ({booking.requested_time})
                      </div>
                    </div>
                    <div className="bg-white p-1 rounded border border-slate-400 shrink-0 text-center">
                      <QRCodeSVG value={trackingUrl} size={50} level="M" />
                      <span className="text-[7px] font-mono font-bold block mt-0.5 text-slate-600">
                        สแกนคิว
                      </span>
                    </div>
                  </div>

                  {/* Delivery Queue Details (รายการคิวส่งของ) */}
                  <div className="border border-slate-800 rounded-lg overflow-hidden text-[10px]">
                    <div className="bg-slate-900 text-white font-black text-[9px] px-2 py-0.5 uppercase tracking-wider flex items-center justify-between">
                      <span>รายการข้อมูลคิวส่งของ (DELIVERY MANIFEST)</span>
                      <span>สถานะ: {booking.status}</span>
                    </div>
                    <div className="divide-y divide-slate-300">
                      <div className="px-2 py-1 flex justify-between gap-2">
                        <span className="text-slate-600 font-semibold shrink-0">
                          เจ้าของสินค้า:
                        </span>
                        <strong className="text-slate-900 truncate text-right font-bold">
                          {booking.client_name}
                        </strong>
                      </div>
                      <div className="px-2 py-1 flex justify-between gap-2">
                        <span className="text-slate-600 font-semibold shrink-0">บริษัทขนส่ง:</span>
                        <span className="text-slate-900 truncate text-right font-bold">
                          {booking.carrier_name} {booking.user_phone ? `(${booking.user_phone})` : ''}
                        </span>
                      </div>
                      <div className="px-2 py-1 flex justify-between gap-2">
                        <span className="text-slate-600 font-semibold shrink-0">รถ / ทะเบียน:</span>
                        <span className="text-slate-900 font-mono font-bold">
                          {booking.license_plate || '-'} ({booking.vehicle_type || 'กระบะ 4 ล้อ'})
                        </span>
                      </div>
                      <div className="px-2 py-1 flex justify-between gap-2">
                        <span className="text-slate-600 font-semibold shrink-0">
                          ประเภทสินค้า:
                        </span>
                        <span
                          className={`font-black ${
                            isColdChain ? 'bg-cyan-100 text-cyan-950 px-1 rounded' : 'text-slate-900'
                          }`}
                        >
                          {booking.cargo_type || 'ยาและเวชภัณฑ์ทั่วไป'}
                        </span>
                      </div>
                      <div className="px-2 py-1 flex justify-between gap-2 bg-slate-50">
                        <span className="text-slate-600 font-semibold shrink-0">
                          จำนวนลัง / พาเลท:
                        </span>
                        <span className="font-mono font-black text-slate-950">
                          จอง {booking.pallet_count} ลัง | รับจริง {totalPallets} พาเลท
                        </span>
                      </div>
                      {(booking.receiving_notes || booking.notes) && (
                        <div className="px-2 py-1 text-[9px] text-slate-700 bg-amber-50/50">
                          <strong className="font-bold">หมายเหตุ:</strong>{' '}
                          {booking.receiving_notes || booking.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sign-off & Storage Location Box */}
                  <div className="grid grid-cols-2 gap-1.5 text-[9px] border-t border-slate-800 pt-1.5">
                    <div className="border border-slate-400 p-1.5 rounded">
                      <span className="font-bold block text-slate-700">ผู้ตรวจรับเข้าคลัง:</span>
                      <div className="h-5 border-b border-dashed border-slate-400"></div>
                      <span className="font-bold text-slate-900 block truncate mt-0.5">
                        {booking.received_by || booking.admin_action_by || 'เจ้าหน้าที่ตรวจรับ'}
                      </span>
                    </div>
                    <div className="border border-slate-400 p-1.5 rounded">
                      <span className="font-bold block text-slate-700">ตำแหน่งจัดเก็บ (Bin):</span>
                      <div className="h-5 flex items-center justify-center font-mono font-black text-[11px] text-slate-950">
                        {storageLocation || '________________'}
                      </div>
                      <span className="text-[8px] text-slate-500 block text-center">
                        (ลงชื่อผู้จัดเก็บ)
                      </span>
                    </div>
                  </div>

                  {/* Micro Footer */}
                  <div className="flex items-center justify-between text-[7px] text-slate-500 pt-0.5">
                    <span>PTN WMS • 100x150MM THERMAL STICKER</span>
                    <span>พิมพ์: {printTimestamp}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2.5 shrink-0">
            <div className="text-2xs text-slate-500 flex items-center gap-1">
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span>พิมพ์ตรงสู่เครื่องพิมพ์สติ๊กเกอร์ความร้อน (Thermal Label 100x150mm)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs sm:text-sm font-bold transition rounded-xl"
              >
                ปิด
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-black rounded-xl shadow-md transition flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>สั่งพิมพ์ป้ายสติ๊กเกอร์ ({tagsArray.length} แผ่น)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 📄 Dedicated Thermal Sticker Print Portal (Rendered directly into body) */}
      {mounted &&
        createPortal(
          <div id="pallet-tag-print-portal" className="hidden">
            {/* Embedded Print CSS scoped strictly to 100x150mm sticker printing */}
            <style
              dangerouslySetInnerHTML={{
                __html: `
                @media print {
                  @page {
                    size: 100mm 150mm !important;
                    margin: 0mm !important;
                  }
                  body.printing-pallet-tag-mode {
                    margin: 0 !important;
                    padding: 0 !important;
                    width: 100mm !important;
                    min-width: 100mm !important;
                    background: #ffffff !important;
                    color: #000000 !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  /* Hide EVERYTHING in body except the pallet tag print portal */
                  body.printing-pallet-tag-mode > *:not(#pallet-tag-print-portal) {
                    display: none !important;
                  }
                  body.printing-pallet-tag-mode #pallet-tag-print-portal {
                    display: block !important;
                    position: static !important;
                    width: 100mm !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #ffffff !important;
                  }
                  .pallet-sticker-page {
                    width: 100mm !important;
                    height: 148mm !important;
                    max-height: 148mm !important;
                    box-sizing: border-box !important;
                    padding: 3.5mm 4mm !important;
                    page-break-after: always !important;
                    break-after: page !important;
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                    overflow: hidden !important;
                    background: #ffffff !important;
                    color: #000000 !important;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
                  }
                }
              `,
              }}
            />

            {tagsArray.map((palletIndex) => (
              <div
                key={`print-tag-${palletIndex}`}
                className="pallet-sticker-page flex flex-col justify-between"
                style={{
                  width: '100mm',
                  height: '148mm',
                  maxHeight: '148mm',
                  boxSizing: 'border-box',
                  padding: '3.5mm 4mm',
                  pageBreakAfter: 'always',
                  breakAfter: 'page',
                  pageBreakInside: 'avoid',
                  breakInside: 'avoid',
                  overflow: 'hidden',
                  background: '#ffffff',
                  color: '#000000',
                }}
              >
                {/* 1. Header (PTN Logo & Pallet Number) */}
                <div
                  className="flex items-center justify-between pb-1.5"
                  style={{ borderBottom: '2.5px solid #000000' }}
                >
                  <div style={{ flex: 1, paddingRight: '2mm' }}>
                    <span
                      style={{
                        fontSize: '7.5pt',
                        fontWeight: '900',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        color: '#333333',
                        display: 'block',
                        lineHeight: 1,
                      }}
                    >
                      PTN PHARMA CENTER • LOGISTICS
                    </span>
                    <h1
                      style={{
                        fontSize: '10pt',
                        fontWeight: '900',
                        color: '#000000',
                        lineHeight: 1.2,
                        marginTop: '1mm',
                      }}
                    >
                      บจก. พีทีเอ็น ฟาร์มาเซ็นเตอร์ (พัฒนาเภสัช)
                    </h1>
                    <span
                      style={{
                        fontSize: '7pt',
                        fontWeight: '700',
                        color: '#444444',
                        display: 'block',
                        lineHeight: 1.1,
                      }}
                    >
                      ป้ายกำกับคิวส่งสินค้า & พาเลท (Pallet & Queue Tag)
                    </span>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div
                      style={{
                        backgroundColor: '#000000',
                        color: '#ffffff',
                        padding: '1.5mm 2.5mm',
                        borderRadius: '2mm',
                        textAlign: 'center',
                        minWidth: '22mm',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '6.5pt',
                          fontWeight: '800',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          display: 'block',
                          lineHeight: 1,
                        }}
                      >
                        PALLET NO.
                      </span>
                      <span
                        style={{
                          fontSize: '13pt',
                          fontWeight: '900',
                          fontFamily: 'monospace',
                          lineHeight: 1.1,
                          display: 'block',
                          marginTop: '0.5mm',
                        }}
                      >
                        {printMode === 'individual'
                          ? `${String(palletIndex).padStart(2, '0')}/${String(totalPallets).padStart(2, '0')}`
                          : `TOT ${totalPallets}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Big Queue ID Banner & Scannable QR Code */}
                <div
                  style={{
                    margin: '1.5mm 0',
                    padding: '2mm',
                    border: '2px solid #000000',
                    borderRadius: '2mm',
                    backgroundColor: '#f8f8f8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ flex: 1, paddingRight: '2mm' }}>
                    <span
                      style={{
                        fontSize: '7pt',
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        color: '#555555',
                        display: 'block',
                        lineHeight: 1,
                      }}
                    >
                      หมายเลขคิวส่งของ (QUEUE ID)
                    </span>
                    <div
                      style={{
                        fontSize: '18pt',
                        fontWeight: '900',
                        fontFamily: 'monospace',
                        color: '#000000',
                        letterSpacing: '-0.5px',
                        lineHeight: 1.1,
                        marginTop: '0.5mm',
                      }}
                    >
                      {booking.booking_id}
                    </div>
                    <div
                      style={{
                        fontSize: '8pt',
                        fontWeight: '800',
                        color: '#000000',
                        lineHeight: 1.1,
                        marginTop: '1mm',
                      }}
                    >
                      นัดหมาย: {formatThaiDate(booking.requested_date)} • {booking.requested_time}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '1mm',
                      backgroundColor: '#ffffff',
                      border: '1.5px solid #000000',
                      borderRadius: '1.5mm',
                      textAlign: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <QRCodeSVG value={trackingUrl} size={56} level="M" />
                    <span
                      style={{
                        fontSize: '5.5pt',
                        fontWeight: '800',
                        fontFamily: 'monospace',
                        display: 'block',
                        marginTop: '0.5mm',
                        color: '#333333',
                      }}
                    >
                      สแกนเช็คคิว
                    </span>
                  </div>
                </div>

                {/* 3. Delivery Queue Manifest (รายการคิวส่งของ) */}
                <div
                  style={{
                    border: '1.5px solid #000000',
                    borderRadius: '1.5mm',
                    overflow: 'hidden',
                    fontSize: '8pt',
                    margin: '1mm 0',
                  }}
                >
                  <div
                    style={{
                      backgroundColor: '#000000',
                      color: '#ffffff',
                      fontWeight: '900',
                      fontSize: '7.5pt',
                      padding: '1mm 2mm',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      lineHeight: 1.1,
                    }}
                  >
                    <span>รายการข้อมูลคิวส่งของ (DELIVERY MANIFEST)</span>
                    <span>สถานะ: {booking.status}</span>
                  </div>

                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '7.8pt',
                    }}
                  >
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #000000' }}>
                        <td
                          style={{
                            width: '28mm',
                            backgroundColor: '#eaeaea',
                            fontWeight: '800',
                            padding: '1.2mm 2mm',
                            color: '#000000',
                          }}
                        >
                          เจ้าของสินค้า:
                        </td>
                        <td
                          style={{
                            fontWeight: '900',
                            padding: '1.2mm 2mm',
                            color: '#000000',
                            fontSize: '8.5pt',
                          }}
                        >
                          {booking.client_name}
                        </td>
                      </tr>

                      <tr style={{ borderBottom: '1px solid #000000' }}>
                        <td
                          style={{
                            backgroundColor: '#eaeaea',
                            fontWeight: '800',
                            padding: '1.2mm 2mm',
                            color: '#000000',
                          }}
                        >
                          บริษัทขนส่ง:
                        </td>
                        <td style={{ fontWeight: '700', padding: '1.2mm 2mm', color: '#000000' }}>
                          {booking.carrier_name}{' '}
                          {booking.user_phone ? `(โทร: ${booking.user_phone})` : ''}
                        </td>
                      </tr>

                      <tr style={{ borderBottom: '1px solid #000000' }}>
                        <td
                          style={{
                            backgroundColor: '#eaeaea',
                            fontWeight: '800',
                            padding: '1.2mm 2mm',
                            color: '#000000',
                          }}
                        >
                          รถ / ทะเบียน:
                        </td>
                        <td
                          style={{
                            fontWeight: '800',
                            padding: '1.2mm 2mm',
                            fontFamily: 'monospace',
                            color: '#000000',
                          }}
                        >
                          <span style={{ fontSize: '9pt', fontWeight: '900' }}>
                            {booking.license_plate || '-'}
                          </span>{' '}
                          ({booking.vehicle_type || 'รถกระบะ 4 ล้อ'})
                        </td>
                      </tr>

                      <tr style={{ borderBottom: '1px solid #000000' }}>
                        <td
                          style={{
                            backgroundColor: '#eaeaea',
                            fontWeight: '800',
                            padding: '1.2mm 2mm',
                            color: '#000000',
                          }}
                        >
                          ผู้ขับขี่:
                        </td>
                        <td style={{ fontWeight: '700', padding: '1.2mm 2mm', color: '#000000' }}>
                          {booking.driver_name || '-'}
                        </td>
                      </tr>

                      <tr style={{ borderBottom: '1px solid #000000' }}>
                        <td
                          style={{
                            backgroundColor: '#eaeaea',
                            fontWeight: '800',
                            padding: '1.2mm 2mm',
                            color: '#000000',
                          }}
                        >
                          ประเภทสินค้า:
                        </td>
                        <td style={{ fontWeight: '900', padding: '1.2mm 2mm', color: '#000000' }}>
                          {isColdChain ? (
                            <span
                              style={{
                                backgroundColor: '#000000',
                                color: '#ffffff',
                                padding: '0.5mm 1.5mm',
                                borderRadius: '1mm',
                                display: 'inline-block',
                              }}
                            >
                              ❄️ {booking.cargo_type} (ควบคุมอุณหภูมิ 2-8°C)
                            </span>
                          ) : (
                            <span>{booking.cargo_type || 'ยาและเวชภัณฑ์ทั่วไป'}</span>
                          )}
                        </td>
                      </tr>

                      <tr style={{ borderBottom: '1px solid #000000' }}>
                        <td
                          style={{
                            backgroundColor: '#eaeaea',
                            fontWeight: '800',
                            padding: '1.2mm 2mm',
                            color: '#000000',
                          }}
                        >
                          จำนวนรับคิว:
                        </td>
                        <td
                          style={{
                            fontWeight: '900',
                            fontFamily: 'monospace',
                            padding: '1.2mm 2mm',
                            color: '#000000',
                          }}
                        >
                          แจ้งจอง: {booking.pallet_count} ลัง | ตรวจรับจริง: {totalPallets} พาเลท
                          {booking.actual_pallet_count !== undefined &&
                            booking.actual_pallet_count !== null && (
                              <span style={{ marginLeft: '2mm', fontWeight: '800' }}>
                                ({booking.actual_pallet_count} ลัง)
                              </span>
                            )}
                        </td>
                      </tr>

                      {(booking.receiving_notes || booking.notes) && (
                        <tr>
                          <td
                            style={{
                              backgroundColor: '#eaeaea',
                              fontWeight: '800',
                              padding: '1mm 2mm',
                              color: '#000000',
                            }}
                          >
                            หมายเหตุคิว:
                          </td>
                          <td
                            style={{
                              padding: '1mm 2mm',
                              fontSize: '7.2pt',
                              color: '#000000',
                              fontWeight: '600',
                            }}
                          >
                            {booking.receiving_notes || booking.notes}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 4. Inspection & Storage Sign-off Footer */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '2mm',
                    marginTop: '1mm',
                  }}
                >
                  <div
                    style={{
                      border: '1.5px solid #000000',
                      borderRadius: '1.5mm',
                      padding: '1.5mm 2mm',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '6.8pt',
                        fontWeight: '800',
                        color: '#444444',
                        display: 'block',
                        lineHeight: 1,
                      }}
                    >
                      ผู้ตรวจรับสินค้าเข้าคลัง (Inspector):
                    </span>
                    <div
                      style={{
                        height: '7mm',
                        borderBottom: '1px dashed #777777',
                        margin: '0.5mm 0',
                      }}
                    />
                    <span
                      style={{
                        fontSize: '8pt',
                        fontWeight: '900',
                        color: '#000000',
                        display: 'block',
                        lineHeight: 1.1,
                      }}
                    >
                      {booking.received_by || booking.admin_action_by || 'เจ้าหน้าที่ตรวจรับ'}
                    </span>
                    <span
                      style={{
                        fontSize: '6.5pt',
                        color: '#555555',
                        display: 'block',
                        marginTop: '0.5mm',
                      }}
                    >
                      วันที่: {booking.receiving_completed_at ? formatThaiDateTime(booking.receiving_completed_at) : printTimestamp}
                    </span>
                  </div>

                  <div
                    style={{
                      border: '1.5px solid #000000',
                      borderRadius: '1.5mm',
                      padding: '1.5mm 2mm',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '6.8pt',
                        fontWeight: '800',
                        color: '#444444',
                        display: 'block',
                        lineHeight: 1,
                      }}
                    >
                      ตำแหน่งจัดเก็บเข้าชั้น (Putaway Bin):
                    </span>
                    <div
                      style={{
                        height: '7mm',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '9.5pt',
                        fontWeight: '900',
                        fontFamily: 'monospace',
                        color: '#000000',
                      }}
                    >
                      {storageLocation || '________________'}
                    </div>
                    <span
                      style={{
                        fontSize: '6.5pt',
                        color: '#555555',
                        display: 'block',
                        textAlign: 'center',
                        borderTop: '1px dashed #777777',
                        paddingTop: '0.5mm',
                      }}
                    >
                      (ลงชื่อผู้จัดเก็บเข้าชั้นวางสินค้า)
                    </span>
                  </div>
                </div>

                {/* 5. Micro Bottom Stamp */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '6pt',
                    color: '#666666',
                    paddingTop: '1mm',
                    borderTop: '1px solid #000000',
                    lineHeight: 1,
                  }}
                >
                  <span style={{ fontWeight: '700' }}>
                    PTN WMS • 100x150MM DIRECT THERMAL STICKER
                  </span>
                  <span>พิมพ์: {printTimestamp}</span>
                </div>
              </div>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
