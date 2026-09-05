'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { Camera, X, RefreshCw, AlertCircle, SwitchCamera } from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (bookingId: string) => void;
}

export default function QRScannerModal({ isOpen, onClose, onScanSuccess }: QRScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isScanning, setIsScanning] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const isStoppingRef = useRef<boolean>(false);

  // Keep latest callbacks in refs so parent re-renders never cause camera re-initialization
  const onScanSuccessRef = useRef(onScanSuccess);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
  }, [onScanSuccess]);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const stopCamera = useCallback(() => {
    isStoppingRef.current = true;
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      } catch (e) {}
    }
    setIsScanning(false);
  }, []);

  const playBeep = () => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      const audioCtx = new AudioCtxClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {}
  };

  const extractBookingId = (text: string): string => {
    const clean = text.trim();
    // 1. If it's a URL like https://.../booking?id=PTN-20260903-XXXX or /booking/PTN-...
    try {
      if (clean.includes('id=')) {
        const url = new URL(clean);
        const id = url.searchParams.get('id');
        if (id) return id.trim();
      }
      if (clean.includes('/booking/')) {
        const parts = clean.split('/booking/')[1];
        if (parts) return parts.split('?')[0].trim();
      }
    } catch (e) {}

    // 2. If it's a raw booking ID or text containing PTN-
    const match = clean.match(/PTN-[A-Za-z0-9\-]+/i);
    if (match) {
      return match[0].trim();
    }

    return clean;
  };

  const startScanningLoop = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }

    setIsScanning(true);
    let lastScanTimestamp = 0;

    const scanFrame = (timestamp: number) => {
      if (isStoppingRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState >= video.HAVE_CURRENT_DATA && video.videoWidth > 0) {
        // Throttle jsQR analysis to every 120ms (approx ~8 frames/sec)
        // This prevents CPU hogging, stuttering, and dropped video frames
        if (timestamp - lastScanTimestamp >= 120) {
          lastScanTimestamp = timestamp;

          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
            }
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            try {
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert',
              });

              if (code && code.data) {
                const bookingId = extractBookingId(code.data);
                if (bookingId) {
                  playBeep();
                  stopCamera();
                  if (onScanSuccessRef.current) {
                    onScanSuccessRef.current(bookingId);
                  }
                  return;
                }
              }
            } catch (e) {
              // Ignore temporary frame decoding errors
            }
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(scanFrame);
    };

    animFrameIdRef.current = requestAnimationFrame(scanFrame);
  }, [stopCamera]);

  // Start or restart camera only when isOpen or facingMode changes
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    let isSubscribed = true;
    isStoppingRef.current = false;
    setCameraError(null);

    const initCamera = async () => {
      try {
        if (!navigator?.mediaDevices?.getUserMedia) {
          throw new Error('อุปกรณ์หรือเบราว์เซอร์นี้ไม่รองรับการเปิดกล้อง');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!isSubscribed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          try {
            await videoRef.current.play();
          } catch (playErr) {
            console.warn('Camera video play error:', playErr);
          }
          if (isSubscribed && !isStoppingRef.current) {
            startScanningLoop();
          }
        }
      } catch (err: any) {
        if (!isSubscribed) return;
        console.error('Camera access error:', err);
        let msg = 'ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตสิทธิ์การใช้กล้องในเบราว์เซอร์';
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          msg = 'ท่านปฏิเสธสิทธิ์การเข้าถึงกล้อง กรุณาอนุญาตการใช้กล้องในการตั้งค่าเบราว์เซอร์';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          msg = 'ไม่พบอุปกรณ์กล้องบนอุปกรณ์นี้';
        }
        setCameraError(msg);
      }
    };

    initCamera();

    return () => {
      isSubscribed = false;
      stopCamera();
    };
  }, [isOpen, facingMode, startScanningLoop, stopCamera]);

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleManualEntry = () => {
    const manualId = prompt('กรุณากรอกรหัสคิว Booking ID ที่ต้องการตรวจสอบ:');
    if (manualId && manualId.trim()) {
      stopCamera();
      if (onScanSuccessRef.current) {
        onScanSuccessRef.current(manualId.trim());
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl text-white space-y-4 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-900/30">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">สแกน QR Code บัตรคิว</h3>
              <p className="text-[11px] text-slate-400">ส่องกล้องไปที่ QR Code บนมือถือหรือกระดาษ</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              if (onCloseRef.current) {
                onCloseRef.current();
              }
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewfinder */}
        <div className="relative aspect-square bg-black rounded-2xl overflow-hidden border border-slate-700/80 flex items-center justify-center shadow-inner">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            autoPlay
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Scanner Targeting Reticle */}
          {isScanning && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-56 h-56 border-2 border-emerald-400/80 rounded-2xl relative shadow-lg">
                {/* Corner accents */}
                <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                {/* Laser scan indicator line */}
                <div
                  className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent absolute top-0 shadow-emerald-500/50 shadow-md animate-pulse"
                  style={{ animationDuration: '1.5s' }}
                />
              </div>
            </div>
          )}

          {/* Camera Error Message */}
          {cameraError && (
            <div className="absolute inset-0 bg-slate-900/95 p-6 flex flex-col items-center justify-center text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-rose-400" />
              <p className="text-xs text-rose-200 leading-relaxed max-w-xs">{cameraError}</p>
              <button
                type="button"
                onClick={() => {
                  setFacingMode((prev) => (prev === 'environment' ? 'environment' : 'environment'));
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-900/40"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>ลองใหม่อีกครั้ง</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between pt-1 text-xs">
          <button
            type="button"
            onClick={toggleCamera}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold transition flex items-center gap-1.5 border border-slate-700"
          >
            <SwitchCamera className="w-4 h-4 text-emerald-400" />
            <span>สลับกล้องหน้า/หลัง</span>
          </button>

          <button
            type="button"
            onClick={handleManualEntry}
            className="text-emerald-400 hover:text-emerald-300 font-semibold py-1.5 px-2 rounded-lg hover:bg-slate-800/60 transition"
          >
            พิมพ์รหัสด้วยตนเอง
          </button>
        </div>
      </div>
    </div>
  );
}
