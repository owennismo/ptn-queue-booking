'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, ArrowRight, AlertCircle, Truck } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'รหัส PIN ไม่ถูกต้อง');
      }

      // Save admin session token
      localStorage.setItem('ptn_admin_token', data.token);
      router.push('/admin');
    } catch (err: any) {
      setError(err.message || 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl space-y-6 text-white">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-900/50">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">ระบบเจ้าหน้าที่คลังสินค้า</h1>
          <p className="text-xs text-slate-400">
            บจก. พีทีเอ็น ฟาร์มาเซ็นเตอร์ (พัฒนาเภสัช)
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              รหัสผ่าน / PIN เจ้าหน้าที่
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                autoFocus
                placeholder="กรอก PIN (ค่าเริ่มต้น: 8888)"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none tracking-widest text-center text-lg placeholder:text-xs placeholder:tracking-normal placeholder:text-slate-500"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-900/40 border border-rose-700/60 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !pin.trim()}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/40 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>เข้าสู่ระบบจัดการ</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-[11px] text-slate-500">
            ระบบความปลอดภัยสำหรับบุคลากรภายใน พัฒนาเภสัช
          </p>
        </div>
      </div>
    </div>
  );
}
