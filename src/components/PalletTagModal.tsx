'use client';

import React, { useState } from 'react';
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

  if (!isOpen || !booking) return null;

  const totalPallets = customPalletCount > 0 
    ? customPalletCount 
    : (booking.actual_pallet_count !== undefined && booking.actual_pallet_count !== null && booking.actual_pallet_count > 0 
        ? booking.actual_pallet_count 
        : booking.pallet_count || 1);

  const tagsArray = printMode === 'individual' 
    ? Array.from({ length: Math.max(1, totalPallets) }, (_, i) => i + 1)
    : [1];

  const handlePrint = () => {
    window.print();
  };

  const isColdChain = booking.cargo_type?.includes('ยาเย็น') || booking.cargo_type?.includes('Cold Chain') || booking.cargo_type?.includes('2-8');

  // URL for scanning QR code on pallet
  const trackingUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/booking/${booking.booking_id}` 
    : `https://ptn-queue-booking.pages.dev/booking/${booking.booking_id}`;

  return (
    <>
      {/* 🖨️ On-screen Modal (Hidden when printing via CSS @media print) */}
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 no-print animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>พิมพ์ป้ายปะหน้าพาเลท</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-bold">
                    Pallet Tag
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  รหัสคิว: <strong className="font-mono text-emerald-700 font-bold">{booking.booking_id}</strong> • {booking.client_name}
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

          {/* Modal Body & Print Settings */}
          <div className="py-4 space-y-4 overflow-y-auto flex-1 pr-1">
            {/* Print Mode Selector */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                รูปแบบการพิมพ์ป้ายพาเลท
              </span>
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
                  <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                    printMode === 'individual' ? 'border-white bg-white text-emerald-600' : 'border-slate-400'
                  }`}>
                    {printMode === 'individual' && <div className="w-2 h-2 rounded-full bg-emerald-600" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold block">พิมพ์แยกทุกพาเลท ({totalPallets} ใบ)</span>
                    <span className={`text-[11px] block mt-0.5 ${printMode === 'individual' ? 'text-emerald-100' : 'text-slate-500'}`}>
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
                  <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                    printMode === 'summary' ? 'border-white bg-white text-emerald-600' : 'border-slate-400'
                  }`}>
                    {printMode === 'summary' && <div className="w-2 h-2 rounded-full bg-emerald-600" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold block">พิมพ์ใบสรุปพาเลทรวม (1 ใบ)</span>
                    <span className={`text-[11px] block mt-0.5 ${printMode === 'summary' ? 'text-emerald-100' : 'text-slate-500'}`}>
                      ป้ายรวมยอดพาเลททั้งหมด {totalPallets} พาเลทในใบเดียว
                    </span>
                  </div>
                </button>
              </div>

              {/* Optional Custom Pallet Count */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 text-xs">
                <span className="text-slate-600 font-medium">จำนวนพาเลทที่ต้องการพิมพ์:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={customPalletCount || totalPallets}
                    onChange={(e) => setCustomPalletCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-center font-mono font-bold text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-slate-500">พาเลท</span>
                </div>
              </div>
            </div>

            {/* Tag Live Preview Card */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                ตัวอย่างป้ายที่จะพิมพ์ (Preview):
              </span>
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 bg-slate-50/50">
                <div className="bg-white border-2 border-slate-900 rounded-xl p-4 shadow-sm text-slate-900 font-sans space-y-3">
                  {/* Tag Header */}
                  <div className="flex items-start justify-between border-b-2 border-slate-900 pb-2.5">
                    <div>
                      <span className="text-[10px] font-extrabold tracking-widest text-slate-500 uppercase block">
                        PTN PHARMA CENTER • PALLET IDENTIFICATION TAG
                      </span>
                      <h4 className="text-sm font-black text-slate-900">
                        บริษัท พีทีเอ็น ฟาร์มาเซ็นเตอร์ จำกัด (พัฒนาเภสัช)
                      </h4>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2 py-0.5 bg-slate-900 text-white font-mono font-black text-xs rounded-md">
                        {printMode === 'individual' ? `PALLET 01 / ${String(totalPallets).padStart(2, '0')}` : `TOTAL: ${totalPallets} PALLETS`}
                      </span>
                    </div>
                  </div>

                  {/* Big Queue ID & QR Code */}
                  <div className="flex items-center justify-between gap-3 bg-slate-100 p-3 rounded-lg border border-slate-300">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">หมายเลขคิวส่งสินค้า (QUEUE ID)</span>
                      <div className="text-2xl font-mono font-black text-slate-950 tracking-tight">
                        {booking.booking_id}
                      </div>
                      <span className="text-[11px] text-slate-600 block mt-0.5">
                        วันที่นัด: <strong>{formatThaiDate(booking.requested_date)}</strong> ({booking.requested_time})
                      </span>
                    </div>
                    <div className="bg-white p-1.5 rounded-lg border border-slate-300 shrink-0">
                      <QRCodeSVG value={trackingUrl} size={64} level="M" />
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs border-b-2 border-slate-900 pb-3">
                    <div>
                      <span className="text-[10px] text-slate-500 block">บริษัทเจ้าของสินค้า (CLIENT)</span>
                      <strong className="text-slate-900 block truncate">{booking.client_name}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">บริษัทขนส่ง (CARRIER)</span>
                      <strong className="text-slate-900 block truncate">{booking.carrier_name}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">ทะเบียนรถ (LICENSE)</span>
                      <strong className="text-slate-900 font-mono">{booking.license_plate || '-'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">ประเภทสินค้า (CARGO)</span>
                      <span className={`inline-block font-bold text-[11px] px-1.5 py-0.2 rounded ${
                        isColdChain ? 'bg-cyan-100 text-cyan-950' : 'text-slate-800'
                      }`}>
                        {booking.cargo_type || 'ยาและเวชภัณฑ์ทั่วไป'}
                      </span>
                    </div>
                  </div>

                  {/* Inspector Sign-off */}
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <div>
                      <span className="text-slate-500 block text-[10px]">ผู้ตรวจรับสินค้า:</span>
                      <span className="font-bold text-slate-800">{booking.received_by || booking.admin_action_by || 'เจ้าหน้าที่คลังสินค้า'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block text-[10px]">ลายเซ็นผู้จัดเก็บเข้าชั้น:</span>
                      <div className="border-b border-slate-400 w-28 h-4 mt-1"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs sm:text-sm font-bold transition rounded-xl"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-black rounded-xl shadow-md transition flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>สั่งพิมพ์ป้ายพาเลท ({tagsArray.length} ใบ)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 📄 Dedicated Print Area (Only visible during window.print()) */}
      <div id="pallet-tag-print-area" className="hidden print:block font-sans text-black">
        {tagsArray.map((palletIndex) => (
          <div
            key={palletIndex}
            className="w-full min-h-[500px] p-8 border-4 border-black rounded-2xl mb-8 break-after-page page-break-after-always flex flex-col justify-between"
            style={{ pageBreakAfter: 'always', breakAfter: 'page' }}
          >
            {/* Header */}
            <div>
              <div className="flex items-start justify-between border-b-4 border-black pb-4">
                <div>
                  <span className="text-xs font-black tracking-widest uppercase text-gray-700 block">
                    PTN PHARMA CENTER • PALLET IDENTIFICATION TAG
                  </span>
                  <h1 className="text-2xl font-black text-black mt-1">
                    บริษัท พีทีเอ็น ฟาร์มาเซ็นเตอร์ จำกัด (พัฒนาเภสัช)
                  </h1>
                  <span className="text-sm text-gray-700 font-bold block">
                    แผนกรับและจัดเก็บสินค้าคลังเวชภัณฑ์ (Warehouse Receiving Department)
                  </span>
                </div>
                <div className="text-right">
                  <div className="border-4 border-black px-4 py-2 rounded-xl bg-black text-white text-center">
                    <span className="text-xs font-bold block uppercase tracking-wider">PALLET NUMBER</span>
                    <span className="text-3xl font-black font-mono">
                      {printMode === 'individual'
                        ? `${String(palletIndex).padStart(2, '0')} / ${String(totalPallets).padStart(2, '0')}`
                        : `1-${String(totalPallets).padStart(2, '0')}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Big Queue ID and Barcode/QR */}
              <div className="my-6 p-6 border-4 border-black rounded-2xl bg-gray-50 flex items-center justify-between">
                <div>
                  <span className="text-xs font-black tracking-wider uppercase text-gray-600 block">
                    หมายเลขคิวส่งสินค้า (QUEUE ID / BOOKING CODE)
                  </span>
                  <div className="text-5xl font-black font-mono tracking-tight text-black mt-1">
                    {booking.booking_id}
                  </div>
                  <div className="mt-2 text-sm text-gray-800 font-bold">
                    วันนัดหมายเข้าส่ง: {formatThaiDate(booking.requested_date)} • ช่วงเวลา: {booking.requested_time}
                  </div>
                </div>
                <div className="p-3 bg-white border-2 border-black rounded-xl text-center shrink-0">
                  <QRCodeSVG value={trackingUrl} size={110} level="M" />
                  <span className="text-[10px] font-mono font-bold block mt-1 text-gray-700">SCAN TO VERIFY</span>
                </div>
              </div>

              {/* Data Table */}
              <table className="w-full border-collapse text-left text-sm mb-6">
                <tbody>
                  <tr className="border-b-2 border-black">
                    <th className="py-2.5 px-3 bg-gray-200 font-black w-44 uppercase text-xs">บริษัทเจ้าของสินค้า (Client):</th>
                    <td className="py-2.5 px-3 font-black text-lg text-black">{booking.client_name}</td>
                  </tr>
                  <tr className="border-b-2 border-black">
                    <th className="py-2.5 px-3 bg-gray-200 font-black uppercase text-xs">บริษัทขนส่ง (Carrier):</th>
                    <td className="py-2.5 px-3 font-bold text-base text-black">
                      {booking.carrier_name} {booking.user_phone ? `(โทร: ${booking.user_phone})` : ''}
                    </td>
                  </tr>
                  <tr className="border-b-2 border-black">
                    <th className="py-2.5 px-3 bg-gray-200 font-black uppercase text-xs">ผู้ขับขี่ / ทะเบียนรถ:</th>
                    <td className="py-2.5 px-3 font-bold text-base text-black font-mono">
                      {booking.driver_name || '-'} • ทะเบียน: <span className="text-lg font-black">{booking.license_plate || '-'}</span> ({booking.vehicle_type || 'รถกระบะ 4 ล้อ'})
                    </td>
                  </tr>
                  <tr className="border-b-2 border-black">
                    <th className="py-2.5 px-3 bg-gray-200 font-black uppercase text-xs">ประเภทสินค้า:</th>
                    <td className="py-2.5 px-3 font-black text-base text-black">
                      <span className={`inline-block px-2 py-0.5 rounded ${isColdChain ? 'bg-gray-300 font-extrabold' : ''}`}>
                        {booking.cargo_type || 'ยาและเวชภัณฑ์ทั่วไป'}
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b-2 border-black">
                    <th className="py-2.5 px-3 bg-gray-200 font-black uppercase text-xs">จำนวนพาเลทรับจริง:</th>
                    <td className="py-2.5 px-3 font-black text-lg text-black font-mono">
                      {totalPallets} พาเลท (จากที่แจ้งจอง: {booking.pallet_count} พาเลท)
                    </td>
                  </tr>
                  {booking.receiving_notes && (
                    <tr className="border-b-2 border-black">
                      <th className="py-2 px-3 bg-gray-200 font-black uppercase text-xs">หมายเหตุตรวจรับ:</th>
                      <td className="py-2 px-3 text-sm text-gray-800 font-medium">{booking.receiving_notes}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Sign-off Footer */}
            <div className="pt-6 border-t-4 border-black grid grid-cols-2 gap-8 text-center text-xs">
              <div className="border border-black p-4 rounded-xl">
                <span className="font-bold text-gray-700 block">ผู้ตรวจรับสินค้าเข้าคลัง (Receiving Inspector)</span>
                <div className="h-12 border-b-2 border-dashed border-gray-400 my-2"></div>
                <span className="font-black text-sm block">{booking.received_by || booking.admin_action_by || 'เจ้าหน้าที่ตรวจรับ'}</span>
                <span className="text-[11px] text-gray-600 block mt-0.5">
                  วันที่: {booking.receiving_completed_at ? formatThaiDateTime(booking.receiving_completed_at) : '____/____/________'}
                </span>
              </div>

              <div className="border border-black p-4 rounded-xl">
                <span className="font-bold text-gray-700 block">ผู้จัดเก็บเข้าตำแหน่งชั้นวาง (Putaway Storer)</span>
                <div className="h-12 border-b-2 border-dashed border-gray-400 my-2"></div>
                <span className="text-gray-500 text-xs block">(ลงชื่อผู้จัดเก็บ)</span>
                <span className="text-[11px] text-gray-600 block mt-0.5">ระบุตำแหน่งจัดเก็บ (Location/Bin): ________________</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
