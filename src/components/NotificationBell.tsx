'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellRing, BellOff, Volume2, CheckCircle2, AlertCircle, X, Sparkles } from 'lucide-react';
import {
  isNotificationSupported,
  getNotificationPermission,
  sendQueueNotification,
  subscribeDeviceToPush,
} from '@/lib/pushNotifications';

export default function NotificationBell() {
  const [supported, setSupported] = useState<boolean>(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [testSent, setTestSent] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isSup = isNotificationSupported();
    setSupported(isSup);
    if (isSup) {
      setPermission(getNotificationPermission());
    }
    if (typeof navigator !== 'undefined') {
      setIsIOS(/iPhone|iPad|iPod/i.test(navigator.userAgent));
      setIsStandalone(
        window.matchMedia('(display-mode: standalone)').matches || !!(navigator as any).standalone
      );
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!supported && (!isIOS || isStandalone)) {
    return null;
  }

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleEnableNotifications = async () => {
    setLoading(true);
    try {
      const res = await subscribeDeviceToPush('GENERAL');
      const newPerm = getNotificationPermission();
      setPermission(newPerm);

      if (res.success) {
        await sendQueueNotification({
          title: '🎉 เปิดรับแจ้งเตือนสำเร็จ!',
          body: 'คุณจะได้รับข้อความประกาศด่วนและข้อมูลคิวจากคลังสินค้า PTN ทันที',
          url: '/',
        });
      }
    } catch (e) {
      console.error('Failed to subscribe:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestNotification = async () => {
    setTestSent(true);
    await sendQueueNotification({
      title: '🔊 ทดสอบแจ้งเตือน (PTN Pharma Center)',
      body: 'ระบบแจ้งเตือนพร้อมทำงาน 100%! พร้อมรับประกาศสำคัญและสถานะคิว',
      url: '/',
    });
    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <div ref={dropdownRef} className="relative inline-block text-left no-print">
      {/* 🔔 BELL BUTTON IN NAVBAR */}
      <button
        type="button"
        onClick={handleToggle}
        className={`relative inline-flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border text-xs sm:text-sm font-bold transition shadow-2xs group ${
          permission === 'granted'
            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
            : permission === 'denied'
            ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-300'
            : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
        }`}
        title={
          permission === 'granted'
            ? 'การแจ้งเตือน: เปิดใช้งานแล้ว'
            : permission === 'denied'
            ? 'การแจ้งเตือน: ถูกปิดกั้นในเบราว์เซอร์'
            : 'คลิกเพื่อเปิดรับแจ้งเตือนและประกาศสำคัญ'
        }
      >
        <div
          className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center transition shadow-xs ${
            permission === 'granted'
              ? 'bg-emerald-600 text-white group-hover:scale-110'
              : permission === 'denied'
              ? 'bg-slate-400 text-white'
              : 'bg-amber-600 text-white group-hover:scale-110'
          }`}
        >
          {permission === 'granted' ? (
            <BellRing className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          ) : permission === 'denied' ? (
            <BellOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          ) : (
            <Bell className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          )}
        </div>

        <span className="hidden lg:inline text-xs font-bold">
          {permission === 'granted'
            ? 'แจ้งเตือน: เปิด'
            : permission === 'denied'
            ? 'แจ้งเตือน: ปิด'
            : 'เปิดแจ้งเตือน'}
        </span>

        {/* Live Indicator Dot */}
        {permission === 'granted' ? (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
        ) : permission === 'default' ? (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 border-2 border-white rounded-full animate-ping" />
        ) : null}
      </button>

      {/* 📱 POPUP DROPDOWN CARD */}
      {isOpen && (
        <div className="absolute right-0 mt-2 z-50 w-76 sm:w-84 bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-4 space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">การแจ้งเตือนระบบ (Push)</h4>
                <p className="text-[10px] text-slate-400">สถานะคิวและประกาศสำคัญจากคลัง</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* iOS Safari Instruction */}
          {isIOS && !isStandalone && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>สำหรับผู้ใช้ iPhone / iPad:</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                กรุณากดปุ่มแชร์ <strong>⎋ (Share)</strong> ของ Safari ด้านล่าง แล้วเลือก <strong>&quot;เพิ่มไปยังหน้าจอโฮม (Add to Home Screen)&quot;</strong> จากนั้นเปิดผ่านหน้าจอโฮมเพื่อรับการแจ้งเตือน
              </p>
            </div>
          )}

          {/* Status Content */}
          {permission === 'granted' ? (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold text-xs text-emerald-900">เปิดรับแจ้งเตือนเรียบร้อยแล้ว</strong>
                  <span className="text-[11px] text-emerald-700 block leading-tight mt-0.5">
                    อุปกรณ์นี้จะได้รับข้อความประกาศและแจ้งเตือนสถานะคิวแบบ Real-time
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSendTestNotification}
                disabled={testSent}
                className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{testSent ? 'ส่งเสียงเตือนแล้ว!' : 'ทดสอบส่งเสียงแจ้งเตือน'}</span>
              </button>
            </div>
          ) : permission === 'denied' ? (
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold text-xs text-rose-900">การแจ้งเตือนถูกปิดกั้น</strong>
                  <span className="text-[11px] text-rose-700 block leading-tight mt-0.5">
                    คุณได้ปิดกั้นการแจ้งเตือนไว้ หากต้องการเปิดรับข่าวสาร กรุณาคลิกไอคอนแม่กุญแจ 🔒 ที่แถบที่อยู่เว็บ แล้วปรับเป็น &quot;อนุญาต (Allow)&quot;
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                เปิดรับข้อความประกาศด่วน การแจ้งเตือนสถานะคิว และข้อมูลสำคัญจากคลังสินค้า เด้งแจ้งเตือนบนหน้าจอมือถือของคุณทันที
              </p>

              <button
                type="button"
                onClick={handleEnableNotifications}
                disabled={loading}
                className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{loading ? 'กำลังเชื่อมต่อ...' : 'เปิดรับการแจ้งเตือน'}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
