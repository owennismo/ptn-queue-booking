'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Lock, ArrowRight, AlertCircle, Truck, User, Clock, ShieldAlert } from 'lucide-react';

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pin, setPin] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Check if redirected due to idle timeout
  const reason = searchParams.get('reason');

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (lockoutSeconds > 0) {
      timer = setInterval(() => {
        setLockoutSeconds((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim() || isLocked) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: pin.trim(),
          operator_name: operatorName.trim() || 'เจ้าหน้าที่คลังสินค้า',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.is_locked) {
          setIsLocked(true);
          setLockoutSeconds(data.remaining_seconds || 900);
        }
        throw new Error(data.error || 'รหัส PIN ไม่ถูกต้อง');
      }

      // Save cryptographically signed admin JWT token in sessionStorage
      sessionStorage.setItem('ptn_admin_jwt', data.token);
      sessionStorage.setItem('ptn_admin_operator', data.operator_name || 'เจ้าหน้าที่คลังสินค้า');
      sessionStorage.setItem('ptn_admin_login_time', Date.now().toString());

      router.push('/admin');
    } catch (err: any) {
      setError(err.message || 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const formatLockoutTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
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

        {reason === 'idle_timeout' && (
          <div className="p-3.5 bg-amber-900/40 border border-amber-600/50 rounded-2xl flex items-start gap-3 text-amber-200 text-xs">
            <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">ระบบออกจากระบบอัตโนมัติ</span>
              เซสชันหมดอายุเนื่องจากไม่มีการใช้งานเกิน 15 นาที เพื่อความปลอดภัยของข้อมูล
            </div>
          </div>
        )}

        {isLocked && (
          <div className="p-4 bg-rose-950/60 border border-rose-600 rounded-2xl space-y-1 text-center text-rose-300">
            <ShieldAlert className="w-6 h-6 text-rose-400 mx-auto" />
            <h4 className="font-bold text-sm text-white">ระบบถูกระงับชั่วคราว</h4>
            <p className="text-xs text-rose-200">
              กรอกรหัสผิดเกินกำหนด ปลดล็อกในอีก <strong className="text-white text-sm font-mono">{formatLockoutTime(lockoutSeconds)}</strong> นาที
            </p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              ชื่อเจ้าหน้าที่ / รหัสพนักงาน <span className="text-slate-500 font-normal">(ไม่ระบุก็ได้)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="เช่น สมศักดิ์ (คลัง A)"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                disabled={isLocked}
                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm placeholder:text-slate-500 disabled:opacity-50"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              รหัสผ่าน / PIN เจ้าหน้าที่ <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                autoFocus
                disabled={isLocked}
                placeholder="กรอก PIN (ค่าเริ่มต้น: 8888)"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none tracking-widest text-center text-lg placeholder:text-xs placeholder:tracking-normal placeholder:text-slate-500 disabled:opacity-50"
              />
            </div>
          </div>

          {error && !isLocked && (
            <div className="p-3 bg-rose-900/40 border border-rose-700/60 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !pin.trim() || isLocked}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/40 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>เข้าสู่ระบบความปลอดภัยสูง</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2 space-y-1">
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            ระบบป้องกัน Brute-force & เข้ารหัสความปลอดภัย Edge JWT
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AdminLoginForm />
    </Suspense>
  );
}
