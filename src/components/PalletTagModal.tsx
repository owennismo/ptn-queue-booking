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
        <div className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col">
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>พิมพ์ป้ายพาเลท & รายการคิวส่งของ</span>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    ขนาด A4 มาตรฐาน
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  ป้ายปะหน้าพาเลทมาตรฐาน A4 (Pallet Tag) • รหัสคิว:{' '}
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
                  รูปแบบและจำนวนป้ายพาเลท A4
                </span>
                <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  กระดาษ A4 แนวตั้ง (Portrait)
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
                      พิมพ์แยกทุกพาเลท ({totalPallets} แผ่น A4)
                    </span>
                    <span
                      className={`text-[11px] block mt-0.5 ${
                        printMode === 'individual' ? 'text-emerald-100' : 'text-slate-500'
                      }`}
                    >
                      พิมพ์ A4 แผ่นละพาเลท 1/{totalPallets}, 2/{totalPallets} ... สำหรับติดทุกพาเลท
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
                    <span className="text-xs font-bold block">พิมพ์ใบสรุปรวม (1 แผ่น A4)</span>
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
                    ตำแหน่งจัดเก็บ (Bin/Rack):
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

            {/* A4 Preview Mockup */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  ตัวอย่างป้ายพาเลทขนาด A4 (A4 Preview):
                </span>
                <span className="text-[11px] text-slate-400">อัตราส่วนกระดาษ A4 แนวตั้ง</span>
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 bg-slate-100 flex justify-center">
                {/* Visual A4 Card */}
                <div className="w-[420px] bg-white border-2 border-slate-900 rounded-xl p-5 shadow-lg text-black font-sans space-y-3.5 select-none">
                  {/* Top Header */}
                  <div className="flex items-start justify-between border-b-2 border-slate-900 pb-2.5">
                    <div>
                      <span className="text-[10px] font-black tracking-widest text-slate-600 uppercase block">
                        PTN PHARMA CENTER • WMS LOGISTICS
                      </span>
                      <h4 className="text-sm font-black text-slate-900 leading-tight mt-0.5">
                        บริษัท พีทีเอ็น ฟาร์มาเซ็นเตอร์ จำกัด (พัฒนาเภสัช)
                      </h4>
                      <span className="text-[10px] text-slate-700 font-bold block mt-0.5">
                        แผนกรับและจัดเก็บสินค้าคลังเวชภัณฑ์ • ป้ายกำกับคิวส่งสินค้าและพาเลท
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="bg-black text-white px-3 py-1.5 rounded-lg text-center min-w-[70px]">
                        <span className="text-[9px] font-bold block uppercase tracking-wider leading-none">
                          PALLET
                        </span>
                        <span className="text-base font-black font-mono leading-none mt-1 block">
                          {printMode === 'individual'
                            ? `01 / ${String(totalPallets).padStart(2, '0')}`
                            : `1 - ${String(totalPallets).padStart(2, '0')}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Big Queue ID & QR Banner */}
                  <div className="bg-slate-50 border-2 border-slate-900 rounded-xl p-3 flex items-center justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <span className="text-[9px] font-black uppercase text-slate-600 block">
                        หมายเลขคิวส่งของ (QUEUE ID / BOOKING CODE)
                      </span>
                      <div className="text-xl font-mono font-black text-slate-950 tracking-tight leading-none">
                        {booking.booking_id}
                      </div>
                      <div className="text-sm font-black text-slate-950 pt-1 border-t border-slate-200 mt-1">
                        🗓️ นัดหมาย: {formatThaiDate(booking.requested_date)} • {booking.requested_time} น.
                      </div>
                    </div>
                    <div className="bg-white p-1.5 rounded-lg border-2 border-slate-900 shrink-0 text-center">
                      <QRCodeSVG value={trackingUrl} size={90} level="M" />
                      <span className="text-[8px] font-mono font-bold block mt-0.5 text-slate-700">
                        SCAN TO VERIFY
                      </span>
                    </div>
                  </div>

                  {/* Delivery Queue Details (รายการคิวส่งของ) */}
                  <div className="border-2 border-slate-900 rounded-xl overflow-hidden text-xs">
                    <div className="bg-slate-900 text-white font-black text-[10px] px-3 py-1 uppercase tracking-wider flex items-center justify-between">
                      <span>รายการข้อมูลคิวส่งของ (DELIVERY MANIFEST)</span>
                      <span>สถานะ: {booking.status}</span>
                    </div>
                    <div className="divide-y divide-slate-200">
                      <div className="px-3 py-1.5 flex justify-between gap-2">
                        <span className="text-slate-600 font-bold shrink-0">เจ้าของสินค้า (Client):</span>
                        <strong className="text-slate-900 truncate text-right font-black">
                          {booking.client_name}
                        </strong>
                      </div>
                      <div className="px-3 py-1.5 flex justify-between gap-2">
                        <span className="text-slate-600 font-bold shrink-0">บริษัทขนส่ง (Carrier):</span>
                        <span className="text-slate-900 truncate text-right font-bold">
                          {booking.carrier_name} {booking.user_phone ? `(${booking.user_phone})` : ''}
                        </span>
                      </div>
                      <div className="px-3 py-1.5 flex justify-between gap-2">
                        <span className="text-slate-600 font-bold shrink-0">รถ / ทะเบียน:</span>
                        <span className="text-slate-900 font-mono font-bold">
                          {booking.license_plate || '-'} ({booking.vehicle_type || 'รถกระบะ 4 ล้อ'})
                        </span>
                      </div>
                      <div className="px-3 py-1.5 flex justify-between gap-2">
                        <span className="text-slate-600 font-bold shrink-0">พนักงานขับรถ:</span>
                        <span className="text-slate-900 font-bold">{booking.driver_name || '-'}</span>
                      </div>
                      <div className="px-3 py-1.5 flex justify-between gap-2">
                        <span className="text-slate-600 font-bold shrink-0">ประเภทสินค้า:</span>
                        <span
                          className={`font-black ${
                            isColdChain ? 'bg-cyan-100 text-cyan-950 px-1.5 py-0.5 rounded' : 'text-slate-900'
                          }`}
                        >
                          {isColdChain ? `❄️ ${booking.cargo_type} (ควบคุมอุณหภูมิ 2-8°C)` : (booking.cargo_type || 'ยาและเวชภัณฑ์ทั่วไป')}
                        </span>
                      </div>
                      <div className="px-3 py-1.5 flex justify-between gap-2 bg-slate-50">
                        <span className="text-slate-600 font-bold shrink-0">จำนวนพาเลท & ลัง:</span>
                        <span className="font-mono font-black text-slate-950">
                          ส่งสินค้า: {booking.pallet_count} ลัง ({booking.vehicle_count} คัน) | รับเข้า: {totalPallets} พาเลท
                          {booking.actual_pallet_count !== undefined &&
                            booking.actual_pallet_count !== null && (
                              <span className="ml-2 font-bold text-emerald-800">
                                ({booking.actual_pallet_count} ลัง)
                              </span>
                            )}
                        </span>
                      </div>
                      {(booking.receiving_notes || booking.notes) && (
                        <div className="px-3 py-1.5 text-[11px] text-slate-700 bg-amber-50/50">
                          <strong className="font-bold text-amber-900">หมายเหตุคิว:</strong>{' '}
                          {booking.receiving_notes || booking.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sign-off & Storage Location Box */}
                  <div className="grid grid-cols-2 gap-3 text-xs border-t-2 border-slate-900 pt-2.5">
                    <div className="border border-slate-400 p-2 rounded-lg">
                      <span className="font-bold block text-slate-700 text-[10px]">
                        ผู้ตรวจรับสินค้าเข้าคลัง (Receiving Inspector):
                      </span>
                      <div className="h-8 border-b border-dashed border-slate-400 my-1"></div>
                      <span className="font-black text-slate-900 block truncate text-xs">
                        {booking.received_by || booking.admin_action_by || 'เจ้าหน้าที่ตรวจรับ'}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        วันที่: {booking.receiving_completed_at ? formatThaiDateTime(booking.receiving_completed_at) : printTimestamp}
                      </span>
                    </div>

                    <div className="border border-slate-400 p-2 rounded-lg">
                      <span className="font-bold block text-slate-700 text-[10px]">
                        ตำแหน่งจัดเก็บเข้าชั้น (Putaway Bin):
                      </span>
                      <div className="h-8 flex items-center justify-center font-mono font-black text-sm text-slate-950">
                        {storageLocation || 'โซน: ____ แถว: ____ ชั้น: ____'}
                      </div>
                      <span className="text-[10px] text-slate-500 block text-center border-t border-dashed border-slate-300 pt-0.5">
                        (ลงชื่อผู้จัดเก็บเข้าชั้นวาง)
                      </span>
                    </div>
                  </div>

                  {/* Micro Footer */}
                  <div className="flex items-center justify-between text-[8px] text-slate-500 pt-1 border-t border-slate-200">
                    <span>PTN PHARMA CENTER WMS • A4 PALLET TAG</span>
                    <span>พิมพ์เมื่อ: {printTimestamp}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2.5 shrink-0">
            <div className="text-2xs text-slate-500 flex items-center gap-1.5">
              <Printer className="w-4 h-4 text-slate-400" />
              <span>สั่งพิมพ์ขนาด A4 เต็มแผ่น (พิมพ์ 1 พาเลทต่อ 1 แผ่น A4)</span>
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
                <span>สั่งพิมพ์ป้ายพาเลท A4 ({tagsArray.length} แผ่น)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 📄 Dedicated A4 Pallet Tag Print Portal (Rendered directly into body to avoid background leakage) */}
      {mounted &&
        createPortal(
          <div id="pallet-tag-print-portal" className="hidden">
            {/* Embedded Print CSS scoped strictly to A4 pallet tag printing */}
            <style
              dangerouslySetInnerHTML={{
                __html: `
                @media print {
                  @page {
                    size: A4 portrait !important;
                    margin: 10mm !important;
                  }
                  body.printing-pallet-tag-mode {
                    margin: 0 !important;
                    padding: 0 !important;
                    width: 100% !important;
                    min-width: 100% !important;
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
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #ffffff !important;
                  }
                  .pallet-a4-page {
                    width: 100% !important;
                    height: 260mm !important;
                    max-height: 265mm !important;
                    box-sizing: border-box !important;
                    padding: 8mm 10mm !important;
                    margin: 0 0 10mm 0 !important;
                    border: 3px solid #000000 !important;
                    border-radius: 4mm !important;
                    page-break-after: always !important;
                    break-after: page !important;
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                    overflow: hidden !important;
                    background: #ffffff !important;
                    color: #000000 !important;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
                    display: flex !important;
                    flex-direction: column !important;
                    justify-content: space-between !important;
                  }
                }
              `,
              }}
            />

            {tagsArray.map((palletIndex) => (
              <div
                key={`print-tag-a4-${palletIndex}`}
                className="pallet-a4-page"
                style={{
                  width: '100%',
                  height: '260mm',
                  maxHeight: '265mm',
                  boxSizing: 'border-box',
                  padding: '8mm 10mm',
                  border: '3px solid #000000',
                  borderRadius: '4mm',
                  pageBreakAfter: 'always',
                  breakAfter: 'page',
                  pageBreakInside: 'avoid',
                  breakInside: 'avoid',
                  overflow: 'hidden',
                  background: '#ffffff',
                  color: '#000000',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                {/* 1. Top Header */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      borderBottom: '3.5px solid #000000',
                      paddingBottom: '4mm',
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: '9pt',
                          fontWeight: '900',
                          letterSpacing: '1px',
                          textTransform: 'uppercase',
                          color: '#444444',
                          display: 'block',
                        }}
                      >
                        PTN PHARMA CENTER • WMS LOGISTICS
                      </span>
                      <h1
                        style={{
                          fontSize: '18pt',
                          fontWeight: '900',
                          color: '#000000',
                          lineHeight: 1.2,
                          marginTop: '1.5mm',
                        }}
                      >
                        บริษัท พีทีเอ็น ฟาร์มาเซ็นเตอร์ จำกัด (พัฒนาเภสัช)
                      </h1>
                      <span
                        style={{
                          fontSize: '10.5pt',
                          fontWeight: '700',
                          color: '#333333',
                          display: 'block',
                          marginTop: '1mm',
                        }}
                      >
                        แผนกรับและจัดเก็บสินค้าคลังเวชภัณฑ์ • ป้ายกำกับคิวส่งสินค้าและพาเลท (Pallet Identification Tag)
                      </span>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div
                        style={{
                          backgroundColor: '#000000',
                          color: '#ffffff',
                          padding: '3mm 6mm',
                          borderRadius: '3mm',
                          textAlign: 'center',
                          minWidth: '38mm',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '8pt',
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            display: 'block',
                            lineHeight: 1,
                          }}
                        >
                          PALLET NUMBER
                        </span>
                        <span
                          style={{
                            fontSize: '24pt',
                            fontWeight: '900',
                            fontFamily: 'monospace',
                            lineHeight: 1.1,
                            display: 'block',
                            marginTop: '1mm',
                          }}
                        >
                          {printMode === 'individual'
                            ? `${String(palletIndex).padStart(2, '0')} / ${String(totalPallets).padStart(2, '0')}`
                            : `1 - ${String(totalPallets).padStart(2, '0')}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Big Queue ID Banner & Scannable QR Code */}
                  <div
                    style={{
                      margin: '4mm 0',
                      padding: '4mm 5mm',
                      border: '3px solid #000000',
                      borderRadius: '3mm',
                      backgroundColor: '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '5mm',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <span
                        style={{
                          fontSize: '9pt',
                          fontWeight: '900',
                          textTransform: 'uppercase',
                          color: '#555555',
                          display: 'block',
                          letterSpacing: '0.5px',
                        }}
                      >
                        หมายเลขคิวส่งสินค้า (QUEUE ID / BOOKING CODE)
                      </span>
                      <div
                        style={{
                          fontSize: '24pt',
                          fontWeight: '900',
                          fontFamily: 'monospace',
                          color: '#000000',
                          letterSpacing: '-0.5px',
                          lineHeight: 1.1,
                          marginTop: '1mm',
                        }}
                      >
                        {booking.booking_id}
                      </div>
                      <div
                        style={{
                          fontSize: '15pt',
                          fontWeight: '900',
                          color: '#000000',
                          marginTop: '2.5mm',
                          paddingTop: '2mm',
                          borderTop: '1.5px solid #cbd5e1',
                          lineHeight: 1.2,
                        }}
                      >
                        วันนัดหมายเข้าส่ง: {formatThaiDate(booking.requested_date)} • รอบเวลา: {booking.requested_time} น.
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '2.5mm',
                        backgroundColor: '#ffffff',
                        border: '2.5px solid #000000',
                        borderRadius: '2.5mm',
                        textAlign: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <QRCodeSVG value={trackingUrl} size={135} level="M" />
                      <span
                        style={{
                          fontSize: '7.5pt',
                          fontWeight: '900',
                          fontFamily: 'monospace',
                          display: 'block',
                          marginTop: '1mm',
                          color: '#000000',
                          letterSpacing: '0.5px',
                        }}
                      >
                        SCAN TO VERIFY
                      </span>
                    </div>
                  </div>

                  {/* 3. Delivery Queue Manifest Table (รายการคิวส่งของ) */}
                  <div
                    style={{
                      border: '2.5px solid #000000',
                      borderRadius: '3mm',
                      overflow: 'hidden',
                      margin: '3mm 0',
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: '#000000',
                        color: '#ffffff',
                        fontWeight: '900',
                        fontSize: '9.5pt',
                        padding: '2mm 4mm',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>รายการข้อมูลคิวส่งของ (DELIVERY MANIFEST)</span>
                      <span>สถานะคิว: {booking.status}</span>
                    </div>

                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '10pt',
                      }}
                    >
                      <tbody>
                        <tr style={{ borderBottom: '1.5px solid #000000' }}>
                          <td
                            style={{
                              width: '46mm',
                              backgroundColor: '#eaeaea',
                              fontWeight: '900',
                              padding: '2.5mm 3.5mm',
                              color: '#000000',
                            }}
                          >
                            บริษัทเจ้าของสินค้า (Client):
                          </td>
                          <td
                            style={{
                              fontWeight: '900',
                              padding: '2.5mm 3.5mm',
                              color: '#000000',
                              fontSize: '12pt',
                            }}
                          >
                            {booking.client_name}
                          </td>
                        </tr>

                        <tr style={{ borderBottom: '1.5px solid #000000' }}>
                          <td
                            style={{
                              backgroundColor: '#eaeaea',
                              fontWeight: '900',
                              padding: '2.5mm 3.5mm',
                              color: '#000000',
                            }}
                          >
                            บริษัทขนส่ง (Carrier):
                          </td>
                          <td
                            style={{
                              fontWeight: '800',
                              padding: '2.5mm 3.5mm',
                              color: '#000000',
                              fontSize: '11pt',
                            }}
                          >
                            {booking.carrier_name}{' '}
                            {booking.user_phone ? `(เบอร์โทร: ${booking.user_phone})` : ''}
                          </td>
                        </tr>

                        <tr style={{ borderBottom: '1.5px solid #000000' }}>
                          <td
                            style={{
                              backgroundColor: '#eaeaea',
                              fontWeight: '900',
                              padding: '2.5mm 3.5mm',
                              color: '#000000',
                            }}
                          >
                            ยานพาหนะ & ทะเบียนรถ:
                          </td>
                          <td
                            style={{
                              fontWeight: '800',
                              padding: '2.5mm 3.5mm',
                              color: '#000000',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '13pt',
                                fontWeight: '900',
                                fontFamily: 'monospace',
                              }}
                            >
                              {booking.license_plate || '-'}
                            </span>{' '}
                            ({booking.vehicle_type || 'รถกระบะ 4 ล้อ'}) • ผู้ขับขี่:{' '}
                            <strong>{booking.driver_name || '-'}</strong>
                          </td>
                        </tr>

                        <tr style={{ borderBottom: '1.5px solid #000000' }}>
                          <td
                            style={{
                              backgroundColor: '#eaeaea',
                              fontWeight: '900',
                              padding: '2.5mm 3.5mm',
                              color: '#000000',
                            }}
                          >
                            ประเภทสินค้า (Cargo):
                          </td>
                          <td
                            style={{
                              fontWeight: '900',
                              padding: '2.5mm 3.5mm',
                              color: '#000000',
                              fontSize: '11pt',
                            }}
                          >
                            {isColdChain ? (
                              <span
                                style={{
                                  backgroundColor: '#000000',
                                  color: '#ffffff',
                                  padding: '1mm 3mm',
                                  borderRadius: '1.5mm',
                                  display: 'inline-block',
                                }}
                              >
                                ❄️ {booking.cargo_type} (ยาควบคุมอุณหภูมิ 2-8°C)
                              </span>
                            ) : (
                              <span>{booking.cargo_type || 'ยาและเวชภัณฑ์ทั่วไป'}</span>
                            )}
                          </td>
                        </tr>

                        <tr style={{ borderBottom: '1.5px solid #000000' }}>
                          <td
                            style={{
                              backgroundColor: '#eaeaea',
                              fontWeight: '900',
                              padding: '2.5mm 3.5mm',
                              color: '#000000',
                            }}
                          >
                            จำนวนพาเลท & ลัง:
                          </td>
                          <td
                            style={{
                              fontWeight: '900',
                              fontFamily: 'monospace',
                              padding: '2.5mm 3.5mm',
                              color: '#000000',
                              fontSize: '12pt',
                            }}
                          >
                            ส่งสินค้า: {booking.pallet_count} ลัง ({booking.vehicle_count} คัน) |
                            รับเข้า: {totalPallets} พาเลท
                            {booking.actual_pallet_count !== undefined &&
                              booking.actual_pallet_count !== null && (
                                <span style={{ marginLeft: '3mm', color: '#000000' }}>
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
                                fontWeight: '900',
                                padding: '2mm 3.5mm',
                                color: '#000000',
                              }}
                            >
                              หมายเหตุคิว / เอกสาร DO:
                            </td>
                            <td
                              style={{
                                padding: '2mm 3.5mm',
                                fontSize: '9.5pt',
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
                </div>

                {/* 4. Bottom Sign-off & Warehouse Putaway Location */}
                <div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '5mm',
                      marginTop: '3mm',
                    }}
                  >
                    <div
                      style={{
                        border: '2.5px solid #000000',
                        borderRadius: '3mm',
                        padding: '3mm 4mm',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '8.5pt',
                          fontWeight: '800',
                          color: '#444444',
                          display: 'block',
                        }}
                      >
                        ผู้ตรวจรับสินค้าเข้าคลัง (Receiving Inspector):
                      </span>
                      <div
                        style={{
                          height: '14mm',
                          borderBottom: '1.5px dashed #666666',
                          margin: '1mm 0',
                        }}
                      />
                      <span
                        style={{
                          fontSize: '11pt',
                          fontWeight: '900',
                          color: '#000000',
                          display: 'block',
                        }}
                      >
                        {booking.received_by || booking.admin_action_by || 'เจ้าหน้าที่ตรวจรับสินค้า'}
                      </span>
                      <span
                        style={{
                          fontSize: '8pt',
                          color: '#555555',
                          display: 'block',
                          marginTop: '1mm',
                        }}
                      >
                        วันที่ตรวจรับ:{' '}
                        {booking.receiving_completed_at
                          ? formatThaiDateTime(booking.receiving_completed_at)
                          : printTimestamp}
                      </span>
                    </div>

                    <div
                      style={{
                        border: '2.5px solid #000000',
                        borderRadius: '3mm',
                        padding: '3mm 4mm',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '8.5pt',
                          fontWeight: '800',
                          color: '#444444',
                          display: 'block',
                        }}
                      >
                        ตำแหน่งจัดเก็บเข้าชั้นวาง (Putaway Location / Bin):
                      </span>
                      <div
                        style={{
                          height: '14mm',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14pt',
                          fontWeight: '900',
                          fontFamily: 'monospace',
                          color: '#000000',
                        }}
                      >
                        {storageLocation || 'โซน: _____ แถว: _____ ชั้น: _____'}
                      </div>
                      <span
                        style={{
                          fontSize: '8pt',
                          color: '#555555',
                          display: 'block',
                          textAlign: 'center',
                          borderTop: '1.5px dashed #666666',
                          paddingTop: '1mm',
                        }}
                      >
                        (ลงลายมือชื่อผู้จัดเก็บเข้าชั้นวางสินค้า)
                      </span>
                    </div>
                  </div>

                  {/* 5. Micro Bottom Stamp */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '7.5pt',
                      color: '#666666',
                      paddingTop: '2mm',
                      marginTop: '3mm',
                      borderTop: '1.5px solid #000000',
                      lineHeight: 1,
                    }}
                  >
                    <span style={{ fontWeight: '700' }}>
                      PTN PHARMA CENTER WMS • PALLET IDENTIFICATION TAG (A4 STANDARD)
                    </span>
                    <span>พิมพ์เมื่อ: {printTimestamp}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
