'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellRing, BellOff, CheckCircle2, Volume2, Sparkles } from 'lucide-react';
import {
  isNotificationSupported,
  getNotificationPermission,
  sendQueueNotification,
  subscribeDeviceToPush,
  checkIsPushSubscribed,
} from '@/lib/pushNotifications';
import { Booking } from '@/lib/types';

interface NotificationPromptProps {
  booking?: Booking | null;
}

export default function NotificationPrompt({ booking }: NotificationPromptProps) {
  const [supported, setSupported] = useState<boolean>(false);
  const [permission, setPermission] = useState<NotificationPermission>('denied');
  const [requesting, setRequesting] = useState<boolean>(false);
  const [testSent, setTestSent] = useState<boolean>(false);
  const [isServerSubscribed, setIsServerSubscribed] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);

  useEffect(() => {
    const isSup = isNotificationSupported();
    setSupported(isSup);
    if (isSup) {
      setPermission(getNotificationPermission());
      checkIsPushSubscribed().then(setIsServerSubscribed);
    }
    if (typeof navigator !== 'undefined') {
      setIsIOS(/iPhone|iPad|iPod/i.test(navigator.userAgent));
      setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || !!(navigator as any).standalone);
    }
  }, []);

  if (!supported) return null;

  const handleEnableNotifications = async () => {
    if (!booking?.booking_id) return;
    setRequesting(true);
    try {
      // 1. Subscribe this device to Server-Side Web Push (VAPID)
      const res = await subscribeDeviceToPush(booking.booking_id);
      setPermission(getNotificationPermission());

      if (res.success) {
        setIsServerSubscribed(true);
      } else if (res.error && res.error !== 'permission_denied') {
        alert(`การเปิดรับแจ้งเตือน: ${res.error}`);
      }
    } catch (e: any) {
      console.error('Notification error:', e);
    } finally {
      setRequesting(false);
    }
  };

  const handleSendTestNotification = async () => {
    setTestSent(true);
    await sendQueueNotification({
      title: '🎉 ทดสอบการแจ้งเตือน (PTN Pharma Center)',
      body: booking
        ? `คิว ${booking.booking_id} (${booking.carrier_name}) พร้อมรับการแจ้งเตือนสถานะแบบ Real-time!`
        : 'ระบบแจ้งเตือนผ่านเบราว์เซอร์พร้อมทำงาน 100%!',
      booking_id: booking?.booking_id,
      url: booking ? `/booking/${booking.booking_id}` : '/',
    });
    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <div className="no-print space-y-2">
      {permission === 'granted' ? (
        <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <BellRing className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="font-bold text-xs sm:text-sm text-emerald-950">
                  เปิดรับการแจ้งเตือนบนอุปกรณ์นี้แล้ว
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                  {isServerSubscribed ? 'เชื่อมต่อเซิร์ฟเวอร์เรียบร้อย' : 'พร้อมรับแจ้งเตือน'}
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                ระบบจะส่ง Web Push Notification และเสียงเตือนเข้าเครื่องทันทีเมื่อเจ้าหน้าที่อนุมัติหรือเปลี่ยนสถานะคิว
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSendTestNotification}
            disabled={testSent}
            className="px-3.5 py-2 bg-white hover:bg-emerald-100/60 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0 shadow-2xs self-start sm:self-auto"
            title="ทดสอบส่ง Notification บนอุปกรณ์นี้"
          >
            <Sparkles className={`w-3.5 h-3.5 text-emerald-600 ${testSent ? 'animate-spin' : ''}`} />
            <span>{testSent ? 'ส่งแจ้งเตือนแล้ว!' : 'ทดสอบส่งการแจ้งเตือน'}</span>
          </button>
        </div>
      ) : permission === 'denied' ? (
        <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 flex items-start gap-3 text-xs">
          <div className="p-2 bg-slate-200 text-slate-500 rounded-xl shrink-0 mt-0.5">
            <BellOff className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <strong className="block font-bold text-slate-800">
              การแจ้งเตือนถูกปิดไว้ในการตั้งค่าเบราว์เซอร์
            </strong>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              หากต้องการให้ระบบแจ้งเตือนเมื่ออนุมัติคิว กรุณาแตะที่ไอคอนรูปกุญแจ 🔒 หรือการตั้งค่าเว็บไซต์บนเบราว์เซอร์ แล้วเลือก <strong>อนุญาตการแจ้งเตือน (Allow Notifications)</strong>
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-900 to-teal-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md border border-emerald-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-bold text-xs sm:text-sm text-white">
                  เปิดรับการแจ้งเตือนบนมือถือ (Push Notification)
                </h4>
              </div>
              <p className="text-[11px] text-emerald-200/90 mt-0.5">
                รับการแจ้งเตือนทันทีเมื่อเจ้าหน้าที่อนุมัติคิว, สแกนรับรถ หรือตรวจรับสินค้าเสร็จสิ้น
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleEnableNotifications}
            disabled={requesting}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shrink-0 shadow-md shadow-emerald-900/40 self-start sm:self-auto active:scale-95"
          >
            {requesting ? (
              <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Bell className="w-3.5 h-3.5 text-slate-950" />
            )}
            <span>{requesting ? 'กำลังเชื่อมต่อ...' : 'เปิดรับการแจ้งเตือน'}</span>
          </button>
        </div>
      )}

      {/* iOS Safari Home Screen Tip */}
      {isIOS && !isStandalone && (
        <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs flex items-start gap-2 shadow-2xs">
          <span className="text-sm shrink-0 mt-0.5">💡</span>
          <div>
            <strong className="font-bold text-amber-950 block">คำแนะนำสำหรับผู้ใช้ iPhone:</strong>
            <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
              เพื่อให้ระบบแจ้งเตือนมีเสียงเด้งเตือนขณะล็อกหน้าจอ กรุณาแตะปุ่มแชร์ <strong>⎋ (Share)</strong> ของ Safari แล้วเลือก <strong>&quot;เพิ่มไปยังหน้าจอโฮม (Add to Home Screen)&quot;</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
