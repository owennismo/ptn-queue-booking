'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellRing, BellOff, CheckCircle2, Volume2, Sparkles } from 'lucide-react';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  sendQueueNotification,
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

  useEffect(() => {
    const isSup = isNotificationSupported();
    setSupported(isSup);
    if (isSup) {
      setPermission(getNotificationPermission());
    }
  }, []);

  if (!supported) return null;

  const handleEnableNotifications = async () => {
    setRequesting(true);
    try {
      const perm = await requestNotificationPermission();
      setPermission(perm);
      if (perm === 'granted') {
        // Send a welcome notification
        await sendQueueNotification({
          title: '🔔 เปิดรับการแจ้งเตือนคิวส่งสินค้าสำเร็จ!',
          body: booking
            ? `ระบบจะแจ้งเตือนทันทีเมื่อคิว ${booking.booking_id} มีการเปลี่ยนสถานะ`
            : 'ระบบจะแจ้งเตือนทันทีเมื่อคิวของท่านมีการเปลี่ยนสถานะ',
          booking_id: booking?.booking_id,
          url: booking ? `/booking/${booking.booking_id}` : '/',
        });
      }
    } catch (e) {
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
    <div className="no-print">
      {permission === 'granted' ? (
        <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <BellRing className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-bold text-xs sm:text-sm text-emerald-950">
                  เปิดรับการแจ้งเตือนบนอุปกรณ์นี้แล้ว
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900">
                  Active
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                ระบบจะส่ง Notification และเสียงเตือนเมื่อเจ้าหน้าที่เปลี่ยนสถานะคิว
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
            <span>เปิดรับการแจ้งเตือน</span>
          </button>
        </div>
      )}
    </div>
  );
}
