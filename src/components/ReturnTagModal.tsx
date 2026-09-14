'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Printer,
  X,
  Package,
  Calendar,
  Truck,
  Building2,
  AlertTriangle,
  MapPin,
  FileText,
  Phone,
  ShieldAlert,
} from 'lucide-react';
import { ReturnTicket } from '@/lib/types';
import { formatThaiDateTime } from '@/lib/dateUtils';

interface ReturnTagModalProps {
  ticket: ReturnTicket | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ReturnTagModal({ ticket, isOpen, onClose }: ReturnTagModalProps) {
  const [mounted, setMounted] = useState<boolean>(false);
  const [tagCopies, setTagCopies] = useState<number>(1);
  const [customNote, setCustomNote] = useState<string>('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (ticket) {
      setTagCopies(1);
      setCustomNote('');
    }
  }, [ticket]);

  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.classList.remove('printing-return-tag-mode');
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  if (!isOpen || !ticket) return null;

  const handlePrint = () => {
    document.body.classList.add('printing-return-tag-mode');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-return-tag-mode');
      }, 500);
    }, 80);
  };

  const printTimestamp = new Date().toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const trackingUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/admin`
      : `https://ptn-queue-booking.pages.dev/admin`;

  const copiesArray = Array.from({ length: Math.max(1, tagCopies) }, (_, i) => i + 1);

  return (
    <>
      {/* 🖨️ On-screen Modal Dialog (Screen Preview) */}
      <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 no-print animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col">
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>พิมพ์ป้ายปะสินค้าตีคืน (RTV Tag)</span>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">
                    ห้ามจัดเก็บเด็ดขาด
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  เลขที่เอกสาร:{' '}
                  <strong className="font-mono text-amber-700">{ticket.id}</strong>
                  {ticket.booking_id && (
                    <span className="ml-2 text-slate-400">
                      (อ้างอิงคิว: {ticket.booking_id})
                    </span>
                  )}
                  {ticket.invoice_or_po_no && (
                    <span className="ml-2 text-indigo-700 font-bold">
                      [บิล/PO: {ticket.invoice_or_po_no}]
                    </span>
                  )}
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

          {/* Settings & Preview */}
          <div className="py-4 space-y-4 overflow-y-auto flex-1 pr-1 text-sm">
            <div className="flex items-center gap-3 bg-amber-50/70 p-3 rounded-2xl border border-amber-200">
              <div className="flex-1">
                <label className="text-xs font-bold text-amber-900 block mb-1">
                  จำนวนชุดที่ต้องการพิมพ์ (Copies)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={tagCopies}
                    onChange={(e) => setTagCopies(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-24 p-2 rounded-xl border border-amber-300 bg-white font-bold text-center text-sm"
                  />
                  <span className="text-xs text-amber-800 font-medium">แผ่น (สำหรับปะกล่องหรือพาเลท)</span>
                </div>
              </div>

              <div className="flex-1">
                <label className="text-xs font-bold text-amber-900 block mb-1">
                  หมายเหตุเพิ่มเติมบนป้าย (ถ้ามี)
                </label>
                <input
                  type="text"
                  placeholder="เช่น ย้ายไปรอห้องควบคุมอุณหภูมิ..."
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  className="w-full p-2 rounded-xl border border-amber-300 bg-white text-xs"
                />
              </div>
            </div>

            {/* Live Preview Card */}
            <div className="border-4 border-amber-500 rounded-3xl p-5 bg-white shadow-sm space-y-4 relative overflow-hidden">
              {/* Top Warning Strip */}
              <div className="bg-amber-600 text-white p-3 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-6 h-6 shrink-0" />
                  <div>
                    <div className="text-xs font-bold tracking-wider opacity-90">PTN WAREHOUSE • RETURN TO VENDOR</div>
                    <div className="text-base sm:text-lg font-black tracking-wide">
                      ⚠️ สินค้าส่งผิด / ห้ามจัดเก็บเด็ดขาด (RTV)
                    </div>
                  </div>
                </div>
                <div className="font-mono text-sm font-black bg-black/25 px-3 py-1 rounded-xl">
                  {ticket.id}
                </div>
              </div>

              {/* Ticket Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                  <div className="text-slate-400 font-semibold uppercase flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" /> ซัพพลายเออร์ (Supplier)
                  </div>
                  <div className="font-black text-slate-900 text-sm">{ticket.supplier_name}</div>
                  {ticket.carrier_name && (
                    <div className="text-slate-600 font-medium">ขนส่ง: {ticket.carrier_name}</div>
                  )}
                  {ticket.contact_phone && (
                    <div className="text-slate-600 flex items-center gap-1 font-mono">
                      <Phone className="w-3 h-3 text-slate-400" /> {ticket.contact_phone}
                    </div>
                  )}
                  {ticket.invoice_or_po_no && (
                    <div className="text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg font-bold mt-1 inline-flex items-center gap-1.5">
                      <FileText className="w-3 h-3 text-indigo-600" />
                      <span>เลขที่บิล/PO: <span className="font-mono">{ticket.invoice_or_po_no}</span></span>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                  <div className="text-slate-400 font-semibold uppercase flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> ตำแหน่งพักสินค้า (Storage)
                  </div>
                  <div className="font-black text-amber-800 text-sm font-mono">
                    {ticket.storage_location || 'โซนพักสินค้าตีคืน (RTV)'}
                  </div>
                  <div className="text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    วันที่ตรวจพบ: {formatThaiDateTime(ticket.created_at)}
                  </div>
                  {ticket.booking_id && (
                    <div className="text-slate-500 font-mono">คิวอ้างอิง: {ticket.booking_id}</div>
                  )}
                </div>
              </div>

              {/* Items & Reason Box */}
              <div className="p-4 bg-rose-50/60 rounded-2xl border-2 border-rose-200 space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-rose-200 pb-2">
                  <div className="font-bold text-rose-900 flex items-center gap-1 text-sm">
                    <Package className="w-4 h-4 text-rose-600" /> รายการสินค้าตีคืน
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-200 text-rose-800">
                    จำนวน: {ticket.quantity || '1 รายการ'}
                  </span>
                </div>
                <div className="font-bold text-slate-900 text-sm leading-relaxed">
                  {ticket.items_detail}
                </div>
                <div className="text-rose-700 font-semibold pt-1">
                  สาเหตุ: <span className="font-normal text-slate-700">{ticket.reason}</span>
                </div>
                {ticket.notes && (
                  <div className="text-slate-700 font-medium pt-1 border-t border-rose-200/60">
                    หมายเหตุ: <span className="font-normal text-slate-900">{ticket.notes}</span>
                  </div>
                )}
                {customNote && (
                  <div className="text-amber-800 font-semibold pt-1 border-t border-rose-200/60">
                    หมายเหตุหน้างาน: <span className="font-normal text-slate-800">{customNote}</span>
                  </div>
                )}
              </div>

              {/* QR Code and Instructions */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="text-xs text-slate-500 space-y-1">
                  <div className="font-bold text-slate-800">คำเตือนสำหรับเจ้าหน้าที่ฝ่ายคลังสินค้า:</div>
                  <div>• สินค้านี้อยู่ระหว่างรอการส่งมอบคืนซัพพลายเออร์</div>
                  <div>• ห้ามนำไปตรวจรับขึ้นสต็อกหรือจัดส่งให้ลูกค้าเด็ดขาด</div>
                  <div className="text-[11px] text-slate-400">พิมพ์เมื่อ: {printTimestamp} • โดย: {ticket.created_by || 'เจ้าหน้าที่คลัง'}</div>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200 shrink-0">
                  <QRCodeSVG value={trackingUrl} size={64} level="M" />
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-slate-100 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs sm:text-sm transition"
            >
              ปิดหน้าต่าง
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-200 transition active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>สั่งพิมพ์ป้ายนี้ ({tagCopies} แผ่น)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 🖨️ PRINT PORTAL (Strictly for Printing) */}
      {mounted &&
        createPortal(
          <div id="return-tag-print-portal" className="hidden">
            <style
              dangerouslySetInnerHTML={{
                __html: `
                @media print {
                  @page {
                    size: A4 portrait;
                    margin: 8mm;
                  }
                  body.printing-return-tag-mode {
                    margin: 0 !important;
                    padding: 0 !important;
                    background: white !important;
                    color: black !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  body.printing-return-tag-mode > *:not(#return-tag-print-portal) {
                    display: none !important;
                  }
                  body.printing-return-tag-mode #return-tag-print-portal {
                    display: block !important;
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                  }
                  .print-return-page {
                    page-break-after: always;
                    box-sizing: border-box;
                    padding: 12mm;
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    border: 8px solid #d97706;
                    border-radius: 16px;
                  }
                  .print-return-page:last-child {
                    page-break-after: avoid;
                  }
                }
              `,
              }}
            />

            {copiesArray.map((copyNum) => (
              <div key={`print-return-${copyNum}`} className="print-return-page">
                {/* Header */}
                <div className="space-y-3">
                  <div
                    style={{
                      backgroundColor: '#d97706',
                      color: 'white',
                      padding: '16px 20px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', letterSpacing: '1px' }}>
                        PTN WAREHOUSE • RETURN TO VENDOR (RTV)
                      </div>
                      <div style={{ fontSize: '26px', fontWeight: '900', marginTop: '4px' }}>
                        ⚠️ สินค้าส่งผิด / ห้ามจัดเก็บเด็ดขาด
                      </div>
                    </div>
                    <div
                      style={{
                        backgroundColor: 'rgba(0,0,0,0.25)',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontSize: '20px',
                        fontWeight: 'bold',
                        fontFamily: 'monospace',
                      }}
                    >
                      {ticket.id}
                    </div>
                  </div>

                  {/* Supplier & Storage Table */}
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      marginTop: '16px',
                      fontSize: '15px',
                    }}
                  >
                    <tbody>
                      <tr>
                        <td
                          style={{
                            border: '2px solid #cbd5e1',
                            padding: '12px 16px',
                            width: '50%',
                            backgroundColor: '#f8fafc',
                          }}
                        >
                          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>
                            ซัพพลายเออร์ (SUPPLIER)
                          </div>
                          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', marginTop: '4px' }}>
                            {ticket.supplier_name}
                          </div>
                          {ticket.carrier_name && (
                            <div style={{ fontSize: '14px', color: '#334155', marginTop: '2px' }}>
                              ขนส่ง: {ticket.carrier_name}
                            </div>
                          )}
                          {ticket.contact_phone && (
                            <div style={{ fontSize: '14px', color: '#334155', fontFamily: 'monospace' }}>
                              โทร: {ticket.contact_phone}
                            </div>
                          )}
                          {ticket.invoice_or_po_no && (
                            <div style={{ fontSize: '15px', color: '#1e3a8a', fontWeight: 'bold', marginTop: '6px', backgroundColor: '#eff6ff', padding: '4px 8px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                              เลขที่บิล / PO: {ticket.invoice_or_po_no}
                            </div>
                          )}
                        </td>
                        <td
                          style={{
                            border: '2px solid #cbd5e1',
                            padding: '12px 16px',
                            width: '50%',
                            backgroundColor: '#f8fafc',
                          }}
                        >
                          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>
                            จุดพักวางสินค้า (STORAGE ZONE)
                          </div>
                          <div
                            style={{
                              fontSize: '20px',
                              fontWeight: '900',
                              color: '#b45309',
                              fontFamily: 'monospace',
                              marginTop: '4px',
                            }}
                          >
                            {ticket.storage_location || 'โซนพักสินค้าตีคืน (RTV)'}
                          </div>
                          <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
                            วันที่ตรวจพบ: {formatThaiDateTime(ticket.created_at)}
                          </div>
                          {ticket.booking_id && (
                            <div style={{ fontSize: '13px', color: '#475569', fontFamily: 'monospace' }}>
                              อ้างอิงคิว: {ticket.booking_id}
                            </div>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Return Items Box */}
                  <div
                    style={{
                      border: '3px solid #f43f5e',
                      backgroundColor: '#fff1f2',
                      borderRadius: '12px',
                      padding: '20px',
                      marginTop: '16px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '2px solid #fecdd3',
                        paddingBottom: '8px',
                        marginBottom: '12px',
                      }}
                    >
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#9f1239' }}>
                        📦 รายการสินค้าที่ส่งผิด / ต้องตีคืน
                      </div>
                      <div
                        style={{
                          backgroundColor: '#fecdd3',
                          color: '#881337',
                          padding: '4px 12px',
                          borderRadius: '999px',
                          fontWeight: 'bold',
                          fontSize: '14px',
                        }}
                      >
                        จำนวน: {ticket.quantity || '1 รายการ'}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: '22px',
                        fontWeight: 'bold',
                        color: '#0f172a',
                        lineHeight: '1.4',
                      }}
                    >
                      {ticket.items_detail}
                    </div>
                    <div style={{ fontSize: '15px', color: '#9f1239', marginTop: '12px', fontWeight: 'bold' }}>
                      สาเหตุ: <span style={{ color: '#334155', fontWeight: 'normal' }}>{ticket.reason}</span>
                    </div>
                    {ticket.notes && (
                      <div
                        style={{
                          fontSize: '15px',
                          color: '#475569',
                          marginTop: '8px',
                          fontWeight: 'bold',
                        }}
                      >
                        หมายเหตุ: <span style={{ color: '#0f172a', fontWeight: 'normal' }}>{ticket.notes}</span>
                      </div>
                    )}
                    {customNote && (
                      <div
                        style={{
                          fontSize: '15px',
                          color: '#b45309',
                          marginTop: '8px',
                          fontWeight: 'bold',
                          borderTop: '1px dashed #fecdd3',
                          paddingTop: '8px',
                        }}
                      >
                        หมายเหตุหน้างาน: <span style={{ color: '#1e293b', fontWeight: 'normal' }}>{customNote}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Instructions & Signatures */}
                <div style={{ marginTop: '24px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '2px solid #e2e8f0',
                      paddingTop: '16px',
                    }}
                  >
                    <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>
                      <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '15px' }}>
                        คำสั่งการสำหรับเจ้าหน้าที่ฝ่ายคลังสินค้า:
                      </div>
                      <div>1. ห้ามเคลื่อนย้ายสินค้าไปยังเชลฟ์จำหน่ายสินค้าปกติเด็ดขาด</div>
                      <div>2. เมื่อมีขนส่งมารับของกลับ ให้ตรวจสอบเอกสารลายเซ็นผู้รับและบันทึกเข้าระบบ</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                        พิมพ์เมื่อ: {printTimestamp} | ผู้บันทึก: {ticket.created_by || 'Admin'} | แผ่นที่ {copyNum}/{tagCopies}
                      </div>
                    </div>
                    <div
                      style={{
                        border: '2px solid #cbd5e1',
                        padding: '8px',
                        borderRadius: '10px',
                        backgroundColor: 'white',
                      }}
                    >
                      <QRCodeSVG value={trackingUrl} size={90} level="M" />
                    </div>
                  </div>

                  {/* Sign-off Boxes */}
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      marginTop: '16px',
                      fontSize: '13px',
                      textAlign: 'center',
                    }}
                  >
                    <tbody>
                      <tr>
                        <td
                          style={{
                            border: '1px solid #94a3b8',
                            padding: '24px 10px 8px 10px',
                            width: '50%',
                          }}
                        >
                          <div>ลงชื่อ..........................................................</div>
                          <div style={{ marginTop: '6px', color: '#64748b' }}>( เจ้าหน้าที่คลังผู้ตรวจพบ )</div>
                        </td>
                        <td
                          style={{
                            border: '1px solid #94a3b8',
                            padding: '24px 10px 8px 10px',
                            width: '50%',
                          }}
                        >
                          <div>ลงชื่อ..........................................................</div>
                          <div style={{ marginTop: '6px', color: '#64748b' }}>( คนขับรถ/ขนส่งผู้มารับของกลับ )</div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
