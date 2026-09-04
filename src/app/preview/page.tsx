'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Truck,
  Calendar,
  Clock,
  CheckCircle2,
  Package,
  ArrowRight,
  ArrowLeft,
  Search,
  QrCode,
  CheckCheck,
  Building2,
  Phone,
  Layers,
  Sparkles,
  RotateCcw
} from 'lucide-react';

export default function PreviewPage() {
  const [activeMode, setActiveMode] = useState<'booking' | 'admin'>('booking');

  // Booking Flow State
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState('วันนี้ (18 ก.ย. 67)');
  const [selectedSlot, setSelectedSlot] = useState('08:00 - 10:00 น.');
  const [supplier, setSupplier] = useState('บริษัท สยามฟาร์มา ดิสทริบิวชั่น จำกัด');
  const [plate, setPlate] = useState('73-1234 กทม.');
  const [driver, setDriver] = useState('สมชาย รักชาติ');
  const [phone, setPhone] = useState('081-234-5678');
  const [pallets, setPallets] = useState(14);
  const [boxes, setBoxes] = useState(50);

  // Admin Dashboard State
  const [queues, setQueues] = useState([
    { id: 'Q2105', plate: '73-1234 กทม.', supplier: 'สยามฟาร์มา ดิสทริบิวชั่น', slot: '10:00 - 12:00', pallets: 12, boxes: 50, status: 'Pending' },
    { id: 'Q2106', plate: '1ฒฮ-5590 กทม.', supplier: 'โอสถทิพย์ โลจิสติกส์', slot: '10:00 - 12:00', pallets: 8, boxes: 0, status: 'Approved' },
    { id: 'Q2107', plate: '82-4411 อยุธยา', supplier: 'เบอร์ลี่ ยุคเกอร์ เมดิคอล', slot: '08:00 - 10:00', pallets: 18, boxes: 30, status: 'Receiving' },
    { id: 'Q2108', plate: '3กข-9921 สมุทรปราการ', supplier: 'ดีเคเอสเอช (ประเทศไทย)', slot: '08:00 - 10:00', pallets: 15, boxes: 0, status: 'Completed' }
  ]);

  const updateQueueStatus = (id: string, newStatus: string) => {
    setQueues(prev => prev.map(q => q.id === id ? { ...q, status: newStatus } : q));
  };

  const countPending = queues.filter(q => q.status === 'Pending').length;
  const countReceiving = queues.filter(q => q.status === 'Receiving').length;
  const countCompleted = queues.filter(q => q.status === 'Completed').length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-16">
      {/* Top Banner & Mode Switcher */}
      <div className="bg-slate-900 text-white py-4 px-4 sm:px-6 shadow-md">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center font-bold text-white shadow-md shadow-emerald-900/50">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight">PTN Pharma • หน้าจำลองระบบใหม่ (UI Prototype)</h1>
              <p className="text-xs text-slate-400">ทดสอบการคลิก กรอกข้อมูล และเปลี่ยนสถานะงานแบบโต้ตอบได้จริง</p>
            </div>
          </div>

          <div className="flex items-center bg-slate-800 p-1.5 rounded-2xl border border-slate-700 gap-1 w-full md:w-auto">
            <button
              onClick={() => setActiveMode('booking')}
              className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
                activeMode === 'booking'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>1. หน้าจองคิว (Customer Flow)</span>
            </button>
            <button
              onClick={() => setActiveMode('admin')}
              className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
                activeMode === 'admin'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>2. หน้าจัดการคลัง (Admin Dashboard)</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6">

        {/* ========================================================= */}
        {/* MODE 1: CUSTOMER BOOKING FLOW (4 STEPS)                   */}
        {/* ========================================================= */}
        {activeMode === 'booking' && (
          <div className="space-y-6">
            {/* Stepper Indicator */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 sm:pb-0">
                {[
                  { num: 1, title: 'เลือกวันและรอบเวลา' },
                  { num: 2, title: 'ข้อมูลบริษัทและคนขับ' },
                  { num: 3, title: 'จำนวนสินค้า/พาเลท' },
                  { num: 4, title: 'ยืนยันบัตรคิว' }
                ].map((s, idx) => (
                  <div key={s.num} className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => setStep(s.num)}
                      className="flex items-center gap-2 text-left"
                    >
                      <div className={`w-9 h-9 rounded-full font-bold flex items-center justify-center text-sm transition ${
                        step === s.num
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 ring-2 ring-emerald-600 ring-offset-2'
                          : step > s.num
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-400'
                      }`}>
                        {step > s.num ? '✓' : s.num}
                      </div>
                      <div>
                        <div className="text-2xs text-slate-400 font-semibold uppercase">ขั้นตอนที่ {s.num}</div>
                        <div className={`text-xs sm:text-sm font-bold ${step === s.num ? 'text-emerald-700' : 'text-slate-700'}`}>
                          {s.title}
                        </div>
                      </div>
                    </button>
                    {idx < 3 && <div className="w-8 sm:w-16 h-0.5 bg-slate-200 shrink-0 mx-1 sm:mx-2" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Step Card Content */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm min-h-[440px] flex flex-col justify-between">
              {/* STEP 1 */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-xl font-extrabold text-slate-900">1. เลือกวันที่และรอบเวลาส่งสินค้า</h2>
                    <p className="text-xs sm:text-sm text-slate-500">คลังเปิดรับสินค้าจันทร์ - เสาร์ (หยุดวันอาทิตย์) ล่วงหน้าได้ 14 วัน</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">เลือกวันที่ส่งมอบสินค้า (พ.ศ. 2567):</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'วันนี้', date: '18 ก.ย. 67', status: 'ว่าง 14 คิว', tag: 'ปกติ' },
                        { label: 'พรุ่งนี้', date: '19 ก.ย. 67', status: 'ว่าง 22 คิว', tag: 'ปกติ' },
                        { label: 'ศุกร์', date: '20 ก.ย. 67', status: 'ว่าง 19 คิว', tag: 'ปกติ' },
                        { label: 'เสาร์', date: '21 ก.ย. 67', status: 'เหลือ 4 คิว', tag: 'ใกล้เต็ม' }
                      ].map(d => {
                        const isSelected = selectedDate.includes(d.date);
                        return (
                          <div
                            key={d.date}
                            onClick={() => setSelectedDate(`${d.label} (${d.date})`)}
                            className={`cursor-pointer p-4 rounded-2xl border-2 transition text-center ${
                              isSelected
                                ? 'border-emerald-600 bg-emerald-50/80 shadow-xs'
                                : 'border-slate-200 hover:border-emerald-400 bg-white'
                            }`}
                          >
                            <span className="text-xs font-bold text-slate-500 block">{d.label}</span>
                            <span className="text-lg font-black text-slate-900 block my-0.5">{d.date}</span>
                            <span className={`text-2xs font-bold px-2 py-0.5 rounded-full inline-block ${
                              d.tag === 'ใกล้เต็ม' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {d.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">เลือกรอบเวลาเข้าเทียบท่า (Dock Time Slot):</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {[
                        { slot: '08:00 - 10:00 น.', desc: 'รอบเช้าตรู่ เหมาะสำหรับขนส่งระยะไกล', badge: 'ว่าง 8 คิว', full: false },
                        { slot: '10:00 - 12:00 น.', desc: 'รอบสาย รับทั้งสินค้าพาเลทและกล่อง', badge: 'เหลือ 2 คิว', full: false },
                        { slot: '13:00 - 15:00 น.', desc: 'รอบบ่าย สินค้าควบคุมอุณหภูมิ', badge: 'ว่าง 6 คิว', full: false },
                        { slot: '15:00 - 17:00 น.', desc: 'รอบเย็น สินค้าด่วน', badge: 'คิวเต็มแล้ว (0)', full: true }
                      ].map(s => {
                        const isSelected = selectedSlot === s.slot;
                        return (
                          <div
                            key={s.slot}
                            onClick={() => !s.full && setSelectedSlot(s.slot)}
                            className={`p-4 rounded-2xl border-2 flex items-center justify-between transition ${
                              s.full
                                ? 'opacity-50 border-slate-200 bg-slate-50 cursor-not-allowed'
                                : isSelected
                                ? 'border-emerald-600 bg-emerald-50/60 shadow-xs cursor-pointer'
                                : 'border-slate-200 hover:border-emerald-400 cursor-pointer'
                            }`}
                          >
                            <div>
                              <div className="font-extrabold text-sm sm:text-base text-slate-900">{s.slot}</div>
                              <div className="text-xs text-slate-500">{s.desc}</div>
                            </div>
                            <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                              s.full
                                ? 'bg-rose-100 text-rose-700'
                                : s.badge.includes('เหลือ 2')
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {s.badge}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-xl font-extrabold text-slate-900">2. ข้อมูลบริษัทคู่ค้า และคนขับรถ</h2>
                    <p className="text-xs sm:text-sm text-slate-500">ข้อมูลนี้จะถูกส่งไปที่ป้อม รปภ. เพื่อตรวจสอบรถเข้าพื้นที่คลังสินค้า</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">ชื่อบริษัทผู้ส่งสินค้า (Supplier Name) *</label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={supplier}
                          onChange={e => setSupplier(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">ทะเบียนรถขนส่ง (Truck License Plate) *</label>
                      <div className="relative">
                        <Truck className="w-4 h-4 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={plate}
                          onChange={e => setPlate(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">ชื่อ-นามสกุล คนขับรถ (Driver Name) *</label>
                      <input
                        type="text"
                        value={driver}
                        onChange={e => setDriver(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">เบอร์โทรศัพท์ติดต่อ (Phone Number) *</label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3 */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-xl font-extrabold text-slate-900">3. รายละเอียดจำนวนสินค้าที่นำมาส่ง</h2>
                    <p className="text-xs sm:text-sm text-slate-500">ช่วยให้ทีมคลังจัดสรรกำลังพลและอุปกรณ์ Forklift เทียบท่าได้อย่างรวดเร็ว</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 text-center">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">จำนวนพาเลท (Pallets Count)</span>
                      <div className="flex items-center justify-center gap-4 my-4">
                        <button
                          onClick={() => setPallets(Math.max(0, pallets - 1))}
                          className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold text-2xl hover:bg-slate-100 shadow-sm active:scale-95 transition"
                        >
                          -
                        </button>
                        <span className="text-4xl font-black text-emerald-700 font-mono w-20">{pallets}</span>
                        <button
                          onClick={() => setPallets(pallets + 1)}
                          className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-bold text-2xl hover:bg-emerald-700 shadow-md shadow-emerald-200 active:scale-95 transition"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-xs text-slate-400 font-medium">กดปุ่ม + หรือ - เพื่อปรับจำนวน</span>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 text-center">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">หรือจำนวนกล่อง / ลัง (Boxes Count)</span>
                      <div className="flex items-center justify-center gap-4 my-4">
                        <button
                          onClick={() => setBoxes(Math.max(0, boxes - 5))}
                          className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold text-lg hover:bg-slate-100 shadow-sm active:scale-95 transition"
                        >
                          -5
                        </button>
                        <span className="text-4xl font-black text-slate-800 font-mono w-24">{boxes}</span>
                        <button
                          onClick={() => setBoxes(boxes + 5)}
                          className="w-12 h-12 rounded-2xl bg-slate-800 text-white font-bold text-lg hover:bg-slate-900 shadow-sm active:scale-95 transition"
                        >
                          +5
                        </button>
                      </div>
                      <span className="text-xs text-slate-400 font-medium">กรณีสินค้าไม่ได้ขึ้นพาเลท</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4 */}
              {step === 4 && (
                <div className="space-y-6">
                  <div className="text-center py-2">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl mb-3 shadow-inner">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">จองคิวสำเร็จเรียบร้อย!</h2>
                    <p className="text-xs sm:text-sm text-slate-500">บันทึกคิวในระบบแล้ว สามารถบันทึกภาพหน้าจอหรือใช้ QR Code แสดงต่อ รปภ. ได้ทันที</p>
                  </div>

                  <div className="max-w-md mx-auto bg-gradient-to-b from-emerald-800 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-emerald-500/40 relative">
                    <div className="flex justify-between items-start border-b border-emerald-700/60 pb-3.5 mb-3.5">
                      <div>
                        <span className="text-2xs text-emerald-300 font-bold uppercase tracking-wider">PTN Digital Queue Pass</span>
                        <h4 className="text-lg font-black">บจก. พีทีเอ็น ฟาร์มาเซ็นเตอร์</h4>
                      </div>
                      <span className="px-3 py-1 bg-amber-400 text-slate-950 font-black text-xs rounded-full">⏳ รอตรวจสอบ</span>
                    </div>

                    <div className="text-center py-3 bg-white/10 rounded-2xl my-3 border border-white/10">
                      <span className="text-2xs text-slate-300 block">หมายเลขคิวของคุณ</span>
                      <span className="text-3xl font-black text-emerald-300 tracking-wider font-mono">Q2609-0012</span>
                    </div>

                    <div className="space-y-2 text-xs text-slate-200">
                      <div className="flex justify-between"><span>วันที่นัดหมาย:</span><strong className="text-white">{selectedDate}</strong></div>
                      <div className="flex justify-between"><span>ช่วงเวลา:</span><strong className="text-white">{selectedSlot}</strong></div>
                      <div className="flex justify-between"><span>บริษัทคู่ค้า:</span><strong className="text-white truncate max-w-[200px]">{supplier}</strong></div>
                      <div className="flex justify-between"><span>ทะเบียนรถ:</span><strong className="text-emerald-300 font-bold">{plate}</strong></div>
                      <div className="flex justify-between"><span>จำนวนสินค้า:</span><strong className="text-white">{pallets} พาเลท / {boxes} ลัง</strong></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Action Buttons */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-5 mt-6">
                {step > 1 && step < 4 ? (
                  <button
                    onClick={() => setStep(step - 1)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-50 transition flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>ย้อนกลับ</span>
                  </button>
                ) : <div />}

                <div className="ml-auto">
                  {step < 3 && (
                    <button
                      onClick={() => setStep(step + 1)}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-200 transition flex items-center gap-1.5"
                    >
                      <span>ขั้นตอนถัดไป</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                  {step === 3 && (
                    <button
                      onClick={() => setStep(4)}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-200 transition flex items-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>ยืนยันและออกบัตรคิว</span>
                    </button>
                  )}
                  {step === 4 && (
                    <button
                      onClick={() => setStep(1)}
                      className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>ทดลองจองใหม่อีกครั้ง</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}


        {/* ========================================================= */}
        {/* MODE 2: ADMIN LOGISTICS DASHBOARD                         */}
        {/* ========================================================= */}
        {activeMode === 'admin' && (
          <div className="space-y-6">
            {/* KPI Gauge Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-slate-500 uppercase">ยอดคิววันนี้ทั้งหมด</span>
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-2xs">รวม</span>
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-black text-slate-900 font-mono">48</span>
                  <span className="text-xs text-slate-400 ml-1">คัน</span>
                </div>
                <div className="mt-2 text-2xs text-emerald-600 font-bold">● ปกติตามตารางงาน</div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-slate-500 uppercase">รอตรวจสอบ (Pending)</span>
                  <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 font-bold text-2xs">รออนุมัติ</span>
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-black text-amber-500 font-mono">{countPending}</span>
                  <span className="text-xs text-slate-400 ml-1">คิว</span>
                </div>
                <div className="mt-2 text-2xs text-amber-600 font-bold">● รอเจ้าหน้าที่กดรับรอง</div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-slate-500 uppercase">กำลังลงของ (Dock)</span>
                  <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-2xs">หน้าท่า</span>
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-black text-indigo-600 font-mono">{countReceiving}</span>
                  <span className="text-xs text-slate-400 ml-1">ท่าเทียบ</span>
                </div>
                <div className="mt-2 text-2xs text-indigo-600 font-bold">● กำลังตรวจนับสินค้า</div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-slate-500 uppercase">ตรวจรับเสร็จสิ้น</span>
                  <span className="px-2 py-0.5 rounded-lg bg-teal-50 text-teal-700 font-bold text-2xs">ปิดงาน</span>
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-black text-teal-600 font-mono">{countCompleted}</span>
                  <span className="text-xs text-slate-400 ml-1">คิว</span>
                </div>
                <div className="mt-2 text-2xs text-teal-600 font-bold">● จัดเก็บเข้าคลังสมบูรณ์</div>
              </div>
            </div>

            {/* Queue Table Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">ตารางจัดการคิวเข้าคลังประจำวัน (พ.ศ. 2567)</h3>
                  <p className="text-xs text-slate-500">คลิกปุ่ม "อนุมัติ", "เริ่มลงของ", หรือ "ตรวจรับเสร็จสิ้น" เพื่อดูการอัปเดตแบบ Interactive</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-48 sm:w-60">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="ค้นหาทะเบียน, ชื่อบริษัท..."
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <button className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm shrink-0">
                    <QrCode className="w-4 h-4" />
                    <span>สแกน QR</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-2xs border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">รหัสคิว</th>
                      <th className="py-3 px-4">ทะเบียนรถ</th>
                      <th className="py-3 px-4">บริษัทผู้ส่ง</th>
                      <th className="py-3 px-4">รอบเวลา</th>
                      <th className="py-3 px-4">จำนวนสินค้า</th>
                      <th className="py-3 px-4">สถานะ</th>
                      <th className="py-3 px-4 text-center">ทดลองเปลี่ยนสถานะ (Interactive)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {queues.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{item.id}</td>
                        <td className="py-3.5 px-4 font-bold text-emerald-800">{item.plate}</td>
                        <td className="py-3.5 px-4">{item.supplier}</td>
                        <td className="py-3.5 px-4">{item.slot}</td>
                        <td className="py-3.5 px-4 font-semibold">{item.pallets} พาเลท {item.boxes > 0 ? `/ ${item.boxes} ลัง` : ''}</td>
                        <td className="py-3.5 px-4">
                          {item.status === 'Pending' && <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">⏳ รอตรวจสอบ</span>}
                          {item.status === 'Approved' && <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">✅ อนุมัติแล้ว</span>}
                          {item.status === 'Receiving' && <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">📦 กำลังลงของ</span>}
                          {item.status === 'Completed' && <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800">✨ เสร็จสิ้นสมบูรณ์</span>}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {item.status === 'Pending' && (
                              <button
                                onClick={() => updateQueueStatus(item.id, 'Approved')}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition"
                              >
                                อนุมัติ
                              </button>
                            )}
                            {(item.status === 'Approved' || item.status === 'Pending') && (
                              <button
                                onClick={() => updateQueueStatus(item.id, 'Receiving')}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-2xs transition"
                              >
                                เริ่มลงของ
                              </button>
                            )}
                            {item.status === 'Receiving' && (
                              <button
                                onClick={() => updateQueueStatus(item.id, 'Completed')}
                                className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-2xs transition"
                              >
                                ตรวจรับเสร็จสิ้น
                              </button>
                            )}
                            {item.status === 'Completed' && (
                              <button
                                onClick={() => updateQueueStatus(item.id, 'Pending')}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition"
                                title="รีเซ็ตสถานะกลับไปรอตรวจสอบเพื่อทดสอบใหม่"
                              >
                                ↺ รีเซ็ต
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
