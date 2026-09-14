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
  FileText,
  Phone,
  CheckCircle2,
  User,
} from 'lucide-react';
import { ReturnTicket } from '@/lib/types';
import { formatThaiDate, formatThaiDateTime } from '@/lib/dateUtils';

interface ReturnHandoverPrintModalProps {
  ticket: ReturnTicket | null;
  isOpen: boolean;
  onClose: () => void;
  defaultDriverName?: string;
  defaultLicensePlate?: string;
  defaultHandoverNotes?: string;
}

export default function ReturnHandoverPrintModal({
  ticket,
  isOpen,
  onClose,
  defaultDriverName,
  defaultLicensePlate,
  defaultHandoverNotes,
}: ReturnHandoverPrintModalProps) {
  const [mounted, setMounted] = useState<boolean>(false);
  const [slipCopies, setSlipCopies] = useState<number>(2);
  const [customNote, setCustomNote] = useState<string>('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (ticket) {
      setSlipCopies(2);
      setCustomNote('');
    }
  }, [ticket]);

  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.classList.remove('printing-handover-slip-mode');
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  if (!isOpen || !ticket) return null;

  const handlePrint = () => {
    document.body.classList.add('printing-handover-slip-mode');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-handover-slip-mode');
      }, 500);
    }, 150);
  };

  const printTimestamp = formatThaiDateTime(new Date().toISOString());

  const trackingUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/admin?tab=returns&rtv=${ticket.id}`
      : `https://ptn-queue-booking.pages.dev/admin?tab=returns&rtv=${ticket.id}`;

  const copiesArray = Array.from({ length: Math.max(1, slipCopies) }, (_, i) => i + 1);

  const getCopyTitle = (index: number) => {
    if (index === 1) return 'ต้นฉบับ สำหรับคลังสินค้า (Warehouse Copy)';
    if (index === 2) return 'สำเนา สำหรับผู้รับมอบคืน / ขนส่ง (Carrier Copy)';
    return `สำเนาชุดที่ ${index} (Copy)`;
  };

  const driverNameToUse = ticket.driver_name || defaultDriverName || '';
  const licensePlateToUse = ticket.driver_license_plate || defaultLicensePlate || '';
  const handoverNotesToUse = ticket.handover_notes || defaultHandoverNotes || '';
  const handoverAtToUse = ticket.handover_at ? formatThaiDateTime(ticket.handover_at) : printTimestamp;

  return (
    <>
      {/* Modal Preview Dialog */}
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150 no-print">
        <div className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[94vh] flex flex-col space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">
                  พิมพ์ใบส่งมอบสินค้าตีคืน (Return Handover Slip)
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  เลขที่เอกสาร:{' '}
                  <strong className="font-mono text-emerald-700">{ticket.id}</strong>
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

          {/* Settings Bar */}
          <div className="flex items-center gap-3 bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200 shrink-0">
            <div className="w-48">
              <label className="text-xs font-black text-slate-900 block mb-1">
                จำนวนชุดที่ต้องการพิมพ์
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={slipCopies}
                  onChange={(e) => setSlipCopies(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-20 p-2 rounded-xl border-2 border-slate-400 bg-white font-black text-center text-sm text-slate-950 text-black shadow-inner focus:outline-emerald-600 focus:border-emerald-600"
                />
                <span className="text-xs text-slate-800 font-bold">ชุด (A4)</span>
              </div>
            </div>

            <div className="flex-1">
              <label className="text-xs font-black text-slate-900 block mb-1">
                หมายเหตุเพิ่มเติมบนใบส่งมอบ (ถ้ามี)
              </label>
              <input
                type="text"
                placeholder="เช่น คนขับตรวจสอบสินค้าครบถ้วนไม่มีแตกหัก..."
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="w-full p-2 rounded-xl border-2 border-slate-400 bg-white text-xs sm:text-sm font-bold text-slate-950 text-black placeholder:text-slate-400 focus:outline-emerald-600 focus:border-emerald-600 shadow-inner"
              />
            </div>
          </div>

          {/* Live Preview Container */}
          <div className="overflow-y-auto flex-1 p-4 bg-slate-100 rounded-2xl border border-slate-200 space-y-4">
            <div className="text-xs text-slate-500 font-bold text-center">
              📄 ตัวอย่างหน้ากระดาษพิมพ์จริง (A4 Document Preview)
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-2xl border-2 border-slate-300 shadow-md text-slate-900 max-w-2xl mx-auto space-y-4 text-xs font-sans">
              {/* Slip Header */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
                <div>
                  <div className="text-base sm:text-lg font-black tracking-tight text-slate-950">
                    บริษัท พัฒนาฯ โลจิสติกส์ จำกัด (PTN WAREHOUSE)
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium">
                    ศูนย์กระจายสินค้าและคลังสินค้าพัฒนา • แผนกรับคืนสินค้า (RTV)
                  </div>
                  <div className="text-sm font-black text-emerald-800 uppercase tracking-wide mt-1">
                    ใบส่งมอบสินค้าตีคืน (RETURN GOODS HANDOVER SLIP / POD)
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm sm:text-base font-black text-slate-900">
                    {ticket.id}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded mt-0.5 inline-block">
                    {getCopyTitle(1)}
                  </div>
                </div>
              </div>

              {/* Reference Grid */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px]">
                <div>
                  <div><b>ซัพพลายเออร์:</b> {ticket.supplier_name}</div>
                  <div><b>บริษัทขนส่งเดิม:</b> {ticket.carrier_name || '-'}</div>
                  <div><b>เบอร์โทรติดต่อ:</b> {ticket.contact_phone || '-'}</div>
                </div>
                <div>
                  <div><b>วันที่ส่งมอบ:</b> {handoverAtToUse}</div>
                  <div><b>รหัสคิวอ้างอิง:</b> {ticket.booking_id || 'สร้างแบบแมนนวล'}</div>
                  {ticket.invoice_or_po_no && (
                    <div><b>เลขที่บิล / PO:</b> <span className="font-mono font-bold text-indigo-900">{ticket.invoice_or_po_no}</span></div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div>
                <table className="w-full border-collapse border border-slate-300 text-left text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
                      <th className="p-2 border-r border-slate-300 w-10 text-center">ลำดับ</th>
                      <th className="p-2 border-r border-slate-300">รายการสินค้าตีคืน</th>
                      <th className="p-2 border-r border-slate-300 w-24 text-center">จำนวน</th>
                      <th className="p-2">สาเหตุการตีคืน / จุดพัก</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="p-2.5 border-r border-slate-200 text-center font-bold">1</td>
                      <td className="p-2.5 border-r border-slate-200 font-bold text-slate-900">
                        {ticket.items_detail}
                        {ticket.notes && (
                          <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                            หมายเหตุ: {ticket.notes}
                          </div>
                        )}
                      </td>
                      <td className="p-2.5 border-r border-slate-200 text-center font-black text-rose-700">
                        {ticket.quantity || '1 ลัง'}
                      </td>
                      <td className="p-2.5 text-slate-700">
                        <div>{ticket.reason || '-'}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {ticket.storage_location || 'โซนพักสินค้าตีคืน (RTV)'}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Handover Pickup Details */}
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200 text-[11px] space-y-1">
                <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>ข้อมูลการรับมอบสินค้ากลับโดยคนขับรถ:</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-800 pt-1">
                  <div><b>ชื่อคนขับรถ / ผู้รับมอบ:</b> {driverNameToUse || '...................................................'}</div>
                  <div><b>ทะเบียนรถขนส่ง:</b> {licensePlateToUse || '...................................................'}</div>
                  <div><b>เจ้าหน้าที่คลังผู้ส่งมอบ:</b> {ticket.handover_by || ticket.created_by || 'Admin'}</div>
                  <div><b>หมายเหตุการส่งมอบ:</b> {handoverNotesToUse || customNote || '-'}</div>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-300">
                <div className="p-3 border border-slate-300 rounded-xl text-center space-y-3">
                  <div className="font-bold text-[11px] text-slate-800">ผู้ส่งมอบสินค้า (เจ้าหน้าที่คลัง PTN)</div>
                  <div className="pt-6 font-mono text-[10px] text-slate-400">ลงชื่อ ..............................................................</div>
                  <div className="text-[10px] text-slate-600">( {ticket.handover_by || ticket.created_by || '..............................................................'} )</div>
                  <div className="text-[9px] text-slate-400">วันที่ .........../.........../...........</div>
                </div>
                <div className="p-3 border border-slate-300 rounded-xl text-center space-y-3">
                  <div className="font-bold text-[11px] text-slate-800">ผู้รับมอบสินค้าคืน (คนขับรถ / ขนส่ง)</div>
                  <div className="pt-6 font-mono text-[10px] text-slate-400">ลงชื่อ ..............................................................</div>
                  <div className="text-[10px] text-slate-600">( {driverNameToUse || '..............................................................'} )</div>
                  <div className="text-[9px] text-slate-400">วันที่ .........../.........../...........</div>
                </div>
              </div>

              {/* Footer barcode & verify */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                <div>พิมพ์เมื่อ: {printTimestamp} | PTN Warehouse Management System</div>
                <div className="flex items-center gap-1.5 font-mono">
                  <span>สแกนตรวจสอบเอกสาร</span>
                  <QRCodeSVG value={trackingUrl} size={36} level="L" />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 text-xs sm:text-sm transition"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg hover:shadow-emerald-600/25 transition flex items-center gap-2 active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ใบส่งมอบสินค้า ({slipCopies} ชุด)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Printable Document (Portal to document.body) */}
      {mounted &&
        createPortal(
          <div className="handover-slip-print-container">
            <style
              dangerouslySetInnerHTML={{
                __html: `
                @media screen {
                  .handover-slip-print-container {
                    display: none !important;
                  }
                }
                @media print {
                  body.printing-handover-slip-mode {
                    background: white !important;
                    color: black !important;
                  }
                  body.printing-handover-slip-mode * {
                    visibility: hidden !important;
                  }
                  body.printing-handover-slip-mode .handover-slip-print-container,
                  body.printing-handover-slip-mode .handover-slip-print-container * {
                    visibility: visible !important;
                  }
                  .handover-slip-print-container {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    display: block !important;
                    background: white !important;
                  }
                  .handover-slip-page {
                    page-break-after: always !important;
                    break-after: page !important;
                    padding: 1.2cm !important;
                    box-sizing: border-box !important;
                    width: 100% !important;
                    min-height: 95vh !important;
                    color: #000000 !important;
                    font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                  }
                  .handover-slip-page:last-child {
                    page-break-after: avoid !important;
                    break-after: avoid !important;
                  }
                  @page {
                    size: A4 portrait;
                    margin: 0.8cm;
                  }
                }
              `,
              }}
            />

            {copiesArray.map((copyNum) => (
              <div key={`print-slip-${copyNum}`} className="handover-slip-page">
                {/* Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    borderBottom: '2px solid #0f172a',
                    paddingBottom: '12px',
                    marginBottom: '14px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>
                      บริษัท พัฒนาฯ โลจิสติกส์ จำกัด (PTN WAREHOUSE)
                    </div>
                    <div style={{ fontSize: '13px', color: '#334155', marginTop: '2px' }}>
                      ศูนย์กระจายสินค้าและคลังสินค้าพัฒนา • แผนกรับคืนสินค้า (RTV)
                    </div>
                    <div
                      style={{
                        fontSize: '16px',
                        fontWeight: '900',
                        color: '#065f46',
                        marginTop: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      ใบส่งมอบสินค้าตีคืน (RETURN GOODS HANDOVER SLIP / POD)
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: '900', fontFamily: 'monospace', color: '#0f172a' }}>
                      {ticket.id}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        marginTop: '4px',
                        display: 'inline-block',
                      }}
                    >
                      {getCopyTitle(copyNum)}
                    </div>
                  </div>
                </div>

                {/* Reference Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    padding: '12px 14px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    marginBottom: '16px',
                    fontSize: '13px',
                    lineHeight: '1.6',
                  }}
                >
                  <div>
                    <div>
                      <strong>ซัพพลายเออร์ (Supplier):</strong> {ticket.supplier_name}
                    </div>
                    <div>
                      <strong>บริษัทขนส่งเดิม:</strong> {ticket.carrier_name || '-'}
                    </div>
                    <div>
                      <strong>เบอร์โทรติดต่อ:</strong> {ticket.contact_phone || '-'}
                    </div>
                  </div>
                  <div>
                    <div>
                      <strong>วันที่ส่งมอบ:</strong> {handoverAtToUse}
                    </div>
                    <div>
                      <strong>รหัสคิวอ้างอิง:</strong> {ticket.booking_id || 'สร้างแบบแมนนวล'}
                    </div>
                    {ticket.invoice_or_po_no && (
                      <div>
                        <strong>เลขที่บิล / PO:</strong>{' '}
                        <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                          {ticket.invoice_or_po_no}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Return Items Table */}
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    marginBottom: '16px',
                    fontSize: '13px',
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', border: '1px solid #94a3b8' }}>
                      <th style={{ padding: '8px 10px', border: '1px solid #94a3b8', width: '40px', textAlign: 'center' }}>
                        ลำดับ
                      </th>
                      <th style={{ padding: '8px 10px', border: '1px solid #94a3b8', textAlign: 'left' }}>
                        รายการสินค้าที่ส่งมอบคืน
                      </th>
                      <th style={{ padding: '8px 10px', border: '1px solid #94a3b8', width: '100px', textAlign: 'center' }}>
                        จำนวน
                      </th>
                      <th style={{ padding: '8px 10px', border: '1px solid #94a3b8', width: '220px', textAlign: 'left' }}>
                        สาเหตุการส่งคืน / จุดเบิก
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ border: '1px solid #94a3b8' }}>
                      <td style={{ padding: '10px', border: '1px solid #94a3b8', textAlign: 'center', fontWeight: 'bold' }}>
                        1
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #94a3b8' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{ticket.items_detail}</div>
                        {ticket.notes && (
                          <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                            หมายเหตุสินค้า: {ticket.notes}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #94a3b8', textAlign: 'center', fontWeight: '900', fontSize: '15px' }}>
                        {ticket.quantity || '1 ลัง'}
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #94a3b8' }}>
                        <div>{ticket.reason || '-'}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace', marginTop: '2px' }}>
                          จุดเบิก: {ticket.storage_location || 'โซนพักสินค้าตีคืน (RTV)'}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Handover & Pickup Section */}
                <div
                  style={{
                    padding: '12px 14px',
                    border: '1px solid #94a3b8',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    fontSize: '13px',
                    lineHeight: '1.7',
                    backgroundColor: '#fafafa',
                  }}
                >
                  <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px', color: '#0f172a' }}>
                    🚚 บันทึกข้อมูลการส่งมอบและยานพาหนะผู้รับมอบ:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <strong>พนักงานขับรถ / ผู้รับมอบ:</strong>{' '}
                      {driverNameToUse || '....................................................................'}
                    </div>
                    <div>
                      <strong>ทะเบียนรถขนส่ง:</strong>{' '}
                      {licensePlateToUse || '....................................................................'}
                    </div>
                    <div>
                      <strong>เจ้าหน้าที่คลังผู้ส่งมอบ:</strong>{' '}
                      {ticket.handover_by || ticket.created_by || 'Admin'}
                    </div>
                    <div>
                      <strong>หมายเหตุการส่งมอบ:</strong>{' '}
                      {handoverNotesToUse || customNote || '-'}
                    </div>
                  </div>
                </div>

                {/* Sign-Off Blocks */}
                <div style={{ marginTop: '24px' }}>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '13px',
                      textAlign: 'center',
                    }}
                  >
                    <tbody>
                      <tr>
                        <td
                          style={{
                            border: '1px solid #475569',
                            padding: '30px 14px 14px 14px',
                            width: '50%',
                          }}
                        >
                          <div style={{ fontWeight: 'bold', marginBottom: '25px', fontSize: '14px' }}>
                            ผู้ส่งมอบสินค้า (เจ้าหน้าที่คลังสินค้า PTN)
                          </div>
                          <div>ลงชื่อ..............................................................................</div>
                          <div style={{ marginTop: '6px', color: '#334155' }}>
                            ( {ticket.handover_by || ticket.created_by || '..................................................................'} )
                          </div>
                          <div style={{ marginTop: '6px', fontSize: '12px', color: '#64748b' }}>
                            วันที่ ............/............/............
                          </div>
                        </td>

                        <td
                          style={{
                            border: '1px solid #475569',
                            padding: '30px 14px 14px 14px',
                            width: '50%',
                          }}
                        >
                          <div style={{ fontWeight: 'bold', marginBottom: '25px', fontSize: '14px' }}>
                            ผู้รับมอบสินค้าคืน (คนขับรถขนส่ง / ตัวแทน)
                          </div>
                          <div>ลงชื่อ..............................................................................</div>
                          <div style={{ marginTop: '6px', color: '#334155' }}>
                            ( {driverNameToUse || '..................................................................'} )
                          </div>
                          <div style={{ marginTop: '6px', fontSize: '12px', color: '#64748b' }}>
                            วันที่ ............/............/............
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Bottom Verification & QR */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '28px',
                    paddingTop: '12px',
                    borderTop: '1px dashed #cbd5e1',
                    fontSize: '11px',
                    color: '#64748b',
                  }}
                >
                  <div>
                    <div>
                      เอกสารนี้เป็นหลักฐานการส่งมอบสินค้าตีคืนอย่างเป็นทางการของ บริษัท พัฒนาฯ โลจิสติกส์ จำกัด
                    </div>
                    <div>
                      พิมพ์เมื่อ: {printTimestamp} | ชุดที่ {copyNum}/{slipCopies}
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      border: '1px solid #cbd5e1',
                      padding: '4px 8px',
                      borderRadius: '8px',
                      backgroundColor: 'white',
                    }}
                  >
                    <span style={{ fontSize: '10px', color: '#475569' }}>สแกนตรวจสอบสถานะ</span>
                    <QRCodeSVG value={trackingUrl} size={50} level="M" />
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
