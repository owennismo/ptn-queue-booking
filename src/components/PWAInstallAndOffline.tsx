'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, Download, X, Smartphone, Share } from 'lucide-react';

export default function PWAInstallAndOffline() {
  const [isOffline, setIsOffline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    // 1. Service Worker Registration
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('SW Registered:', reg.scope))
        .catch((err) => console.log('SW Register Error:', err));
    }

    // 2. Online / Offline Status
    const updateOnlineStatus = () => {
      if (!navigator.onLine) {
        setIsOffline(true);
        setWasOffline(true);
      } else {
        setIsOffline(false);
        if (wasOffline) {
          setTimeout(() => setWasOffline(false), 3000);
        }
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    // 3. PWA BeforeInstallPrompt (Android / Chrome)
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Check if user already dismissed in this session
      const dismissed = sessionStorage.getItem('pwa_prompt_dismissed');
      if (!dismissed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // 4. iOS Safari Detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;

    if (isIosDevice && !isStandalone) {
      setIsIOS(true);
    }

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, [wasOffline]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    setShowIOSPrompt(false);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  return (
    <>
      {/* 🔴 Real-time Offline Warning Banner */}
      {isOffline && (
        <div className="bg-rose-600 text-white text-xs sm:text-sm font-bold px-4 py-2.5 shadow-md flex items-center justify-center gap-2 sticky top-0 z-50 animate-pulse">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>⚠️ คุณกำลังอยู่ในโหมดออฟไลน์ (ไม่มีสัญญาณอินเทอร์เน็ต) ข้อมูลที่แคชไว้ยังสามารถเปิดดูได้</span>
        </div>
      )}

      {/* 🟢 Online Restored Toast Banner */}
      {!isOffline && wasOffline && (
        <div className="bg-emerald-600 text-white text-xs sm:text-sm font-bold px-4 py-2 shadow-md flex items-center justify-center gap-2 sticky top-0 z-50 transition-all">
          <Wifi className="w-4 h-4 shrink-0" />
          <span>✓ กลับมาเชื่อมต่ออินเทอร์เน็ตแล้ว</span>
        </div>
      )}

      {/* 📱 Android / Desktop Chrome PWA Install Prompt Banner */}
      {showInstallBanner && deferredPrompt && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-md">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm">ติดตั้งแอป PTN จองคิว</h4>
              <p className="text-[11px] text-slate-300">เพิ่มลงหน้าจอมือถือเพื่อเปิดใช้งานได้สะดวกรวดเร็ว</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ติดตั้ง</span>
            </button>
            <button
              onClick={handleDismiss}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 🍎 iOS Safari Install Guide Banner */}
      {isIOS && showIOSPrompt && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 space-y-2 animate-in fade-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <h4 className="font-bold text-xs">ติดตั้งบน iPhone / iPad</h4>
            </div>
            <button onClick={handleDismiss} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            กดปุ่มแชร์ <Share className="w-3.5 h-3.5 inline mx-0.5 text-emerald-400" /> ที่แถบล่างของ Safari แล้วเลือก <strong className="text-white">&quot;เพิ่มไปยังหน้าจอโฮม&quot; (Add to Home Screen)</strong>
          </p>
        </div>
      )}
    </>
  );
}
