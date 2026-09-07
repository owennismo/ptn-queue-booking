'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  Image as ImageIcon,
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

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.min(initialIndex, Math.max(0, images.length - 1)));
    }
  }, [isOpen, initialIndex, images.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, images.length, onClose]);

  if (!isOpen || images.length === 0) return null;

  const currentImageUrl = images[currentIndex] || images[0];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

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

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-3 sm:p-6 no-print animate-in fade-in duration-200"
    >
      {/* Top Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex items-center justify-between text-white pb-3 border-b border-white/10 shrink-0"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
            <ImageIcon className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-bold text-white truncate max-w-xs sm:max-w-md">
              {title}
            </h4>
            <span className="text-xs text-slate-400 font-mono">
              รูปที่ {currentIndex + 1} จาก {images.length} รูป
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            title="ดาวน์โหลดรูปภาพนี้"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ดาวน์โหลด</span>
          </button>
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition"
            title="ปิด (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex-1 flex items-center justify-center my-3 overflow-hidden"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentImageUrl}
          alt={`Preview ${currentIndex + 1}`}
          className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl transition duration-200 select-none"
        />

        {/* Previous Button */}
        {images.length > 1 && (
          <button
            onClick={handlePrev}
            className="absolute left-2 sm:left-4 p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition active:scale-95 shadow-lg border border-white/10"
            title="รูปก่อนหน้า (ลูกศรซ้าย)"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}

        {/* Next Button */}
        {images.length > 1 && (
          <button
            onClick={handleNext}
            className="absolute right-2 sm:right-4 p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition active:scale-95 shadow-lg border border-white/10"
            title="รูปถัดไป (ลูกศรขวา)"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip */}
      {images.length > 1 && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center gap-2 overflow-x-auto py-2 shrink-0 max-w-full"
        >
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition shrink-0 ${
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
