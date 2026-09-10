'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Move,
} from 'lucide-react';

interface ImageGalleryModalProps {
  images: string[];
  initialIndex?: number;
  title?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageGalleryModal({
  images,
  initialIndex = 0,
  title = 'รูปภาพเอกสารแนบ',
  isOpen,
  onClose,
}: ImageGalleryModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Zoom, Pan & Rotation states
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Touch gesture refs
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialPinchDistRef = useRef<number | null>(null);
  const initialPinchZoomRef = useRef<number>(1);

  // Reset transformations
  const resetTransform = useCallback(() => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.min(initialIndex, Math.max(0, images.length - 1)));
      resetTransform();
    }
  }, [isOpen, initialIndex, images.length, resetTransform]);

  // When switching images, reset zoom & rotation
  const handleIndexChange = useCallback(
    (newIndex: number) => {
      setCurrentIndex(newIndex);
      resetTransform();
    },
    [resetTransform]
  );

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    handleIndexChange(currentIndex > 0 ? currentIndex - 1 : images.length - 1);
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    handleIndexChange(currentIndex < images.length - 1 ? currentIndex + 1 : 0);
  };

  const handleZoomIn = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoom((prev) => Math.min(4, Math.round((prev + 0.5) * 10) / 10));
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoom((prev) => {
      const next = Math.max(1, Math.round((prev - 0.5) * 10) / 10);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleRotate = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRotation((prev) => (prev + 90) % 360);
    setPosition({ x: 0, y: 0 });
  };

  const handleToggleZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (zoom > 1) {
      resetTransform();
    } else {
      setZoom(2.5);
    }
  };

  // Keyboard navigation & Shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        if (zoom === 1) {
          handleIndexChange(currentIndex > 0 ? currentIndex - 1 : images.length - 1);
        }
      } else if (e.key === 'ArrowRight') {
        if (zoom === 1) {
          handleIndexChange(currentIndex < images.length - 1 ? currentIndex + 1 : 0);
        }
      } else if (e.key === '+' || e.key === '=') {
        setZoom((prev) => Math.min(4, Math.round((prev + 0.5) * 10) / 10));
      } else if (e.key === '-' || e.key === '_') {
        setZoom((prev) => {
          const next = Math.max(1, Math.round((prev - 0.5) * 10) / 10);
          if (next === 1) setPosition({ x: 0, y: 0 });
          return next;
        });
      } else if (e.key === '0') {
        resetTransform();
      } else if (e.key === 'r' || e.key === 'R') {
        setRotation((prev) => (prev + 90) % 360);
        setPosition({ x: 0, y: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, images.length, onClose, currentIndex, zoom, handleIndexChange, resetTransform]);

  if (!isOpen || images.length === 0) return null;

  const currentImageUrl = images[currentIndex] || images[0];

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = currentImageUrl;
    a.download = `photo_${currentIndex + 1}.jpg`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Mouse drag handlers for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    e.preventDefault();
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile pan and pinch-to-zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      if (zoom > 1) {
        setIsDragging(true);
        touchStartRef.current = {
          x: e.touches[0].clientX - position.x,
          y: e.touches[0].clientY - position.y,
        };
      }
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistRef.current = dist;
      initialPinchZoomRef.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging && zoom > 1) {
      setPosition({
        x: e.touches[0].clientX - touchStartRef.current.x,
        y: e.touches[0].clientY - touchStartRef.current.y,
      });
    } else if (e.touches.length === 2 && initialPinchDistRef.current !== null) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scaleFactor = currentDist / initialPinchDistRef.current;
      const newZoom = Math.min(4, Math.max(1, Math.round(initialPinchZoomRef.current * scaleFactor * 10) / 10));
      setZoom(newZoom);
      if (newZoom === 1) {
        setPosition({ x: 0, y: 0 });
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    initialPinchDistRef.current = null;
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    if (e.deltaY < 0) {
      setZoom((prev) => Math.min(4, Math.round((prev + 0.25) * 100) / 100));
    } else if (e.deltaY > 0) {
      setZoom((prev) => {
        const next = Math.max(1, Math.round((prev - 0.25) * 100) / 100);
        if (next === 1) setPosition({ x: 0, y: 0 });
        return next;
      });
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-2 sm:p-5 no-print animate-in fade-in duration-200 select-none"
    >
      {/* Top Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex items-center justify-between text-white pb-2.5 sm:pb-3 border-b border-white/10 shrink-0 z-20"
      >
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <ImageIcon className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-base font-bold text-white truncate max-w-[160px] sm:max-w-md">
              {title}
            </h4>
            <span className="text-[11px] sm:text-xs text-slate-400 font-mono">
              รูปที่ {currentIndex + 1} จาก {images.length} รูป
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handleDownload}
            className="px-2.5 sm:px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            title="ดาวน์โหลดรูปภาพนี้"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ดาวน์โหลด</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition"
            title="ปิด (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative flex-1 flex items-center justify-center my-2 sm:my-3 overflow-hidden ${
          zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
        }`}
      >
        {/* Transform Container */}
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0.2, 1)',
            touchAction: zoom > 1 ? 'none' : 'auto',
          }}
          onDoubleClick={handleToggleZoom}
          className="relative max-h-full max-w-full flex items-center justify-center select-none"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentImageUrl}
            alt={`Preview ${currentIndex + 1}`}
            className="max-h-[65vh] sm:max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl pointer-events-none select-none"
            draggable={false}
          />
        </div>

        {/* Previous Button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-2 sm:left-4 p-2 sm:p-3 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition active:scale-95 shadow-lg border border-white/10 z-10"
            title="รูปก่อนหน้า (ลูกศรซ้าย)"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}

        {/* Next Button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-2 sm:right-4 p-2 sm:p-3 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition active:scale-95 shadow-lg border border-white/10 z-10"
            title="รูปถัดไป (ลูกศรขวา)"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}

        {/* Floating Zoom & Rotate Dock */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 sm:gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/80 hover:bg-slate-950/95 backdrop-blur-md border border-white/20 text-white shadow-2xl transition"
        >
          {/* Zoom Out */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= 1}
            className="p-1.5 sm:p-2 rounded-full hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent transition active:scale-95"
            title="ซูมออก (-)"
          >
            <ZoomOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Zoom Level Indicator / Reset */}
          <button
            type="button"
            onClick={resetTransform}
            className="px-2 py-1 rounded-full text-xs font-mono font-bold hover:bg-white/20 transition flex items-center gap-1"
            title="คลิกเพื่อรีเซ็ตขนาด (100%)"
          >
            <span>{Math.round(zoom * 100)}%</span>
            {(zoom !== 1 || rotation !== 0) && (
              <RotateCcw className="w-3 h-3 text-emerald-400" />
            )}
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= 4}
            className="p-1.5 sm:p-2 rounded-full hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent transition active:scale-95"
            title="ซูมเข้า (+)"
          >
            <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <div className="w-px h-4 bg-white/20 mx-0.5 sm:mx-1" />

          {/* Rotate */}
          <button
            type="button"
            onClick={handleRotate}
            className="p-1.5 sm:p-2 rounded-full hover:bg-white/20 transition active:scale-95 text-emerald-400 hover:text-emerald-300"
            title="หมุนรูป 90° ตามเข็มนาฬิกา"
          >
            <RotateCw className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Reset View Button when transformed */}
          {(zoom !== 1 || rotation !== 0 || position.x !== 0 || position.y !== 0) && (
            <button
              type="button"
              onClick={resetTransform}
              className="px-2 sm:px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-[10px] sm:text-xs font-bold transition flex items-center gap-1 ml-0.5"
              title="รีเซ็ตมุมมองภาพกลับสู่ค่าเดิม"
            >
              <span>รีเซ็ต</span>
            </button>
          )}
        </div>

        {/* Interactive Tip Banner when Zoomed */}
        {zoom > 1 && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[11px] text-slate-300 flex items-center gap-1.5 pointer-events-none border border-white/10 shadow-sm animate-in fade-in">
            <Move className="w-3 h-3 text-emerald-400" />
            <span>คลิก/แตะลากเลื่อนเพื่อส่องดูรายละเอียด • แตะ 2 ครั้งเพื่อรีเซ็ต</span>
          </div>
        )}
      </div>

      {/* Bottom Thumbnail Strip */}
      {images.length > 1 && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center gap-2 overflow-x-auto py-1.5 shrink-0 max-w-full z-20"
        >
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleIndexChange(idx)}
              className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border-2 transition shrink-0 ${
                idx === currentIndex
                  ? 'border-emerald-500 scale-105 shadow-md ring-2 ring-emerald-400/40'
                  : 'border-white/20 opacity-60 hover:opacity-100'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img}
                alt={`Thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-0.5 right-1 text-[9px] font-mono font-bold text-white bg-black/60 px-1 rounded">
                {idx + 1}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

