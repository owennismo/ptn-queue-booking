'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import { formatThaiNumericDate } from '@/lib/dateUtils';

interface ThaiDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  minDate?: string; // YYYY-MM-DD
  maxDate?: string; // YYYY-MM-DD
  disabledDates?: string[];
  disableSundays?: boolean;
  placeholder?: string;
  required?: boolean;
  className?: string;
  id?: string;
}

const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

const THAI_DAYS_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

function padZero(num: number): string {
  return String(num).padStart(2, '0');
}

export default function ThaiDatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  disabledDates = [],
  disableSundays = true,
  placeholder = 'เลือกวันที่ (วัน/เดือน/พ.ศ.)',
  required = false,
  className = '',
  id,
}: ThaiDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial view year and month
  const today = new Date();
  const initDate = value ? new Date(value) : today;

  const [viewYear, setViewYear] = useState(initDate.getFullYear() || today.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth() ?? today.getMonth());

  // Close calendar popover on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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

  // Sync view when value changes
  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        setViewYear(parseInt(parts[0], 10));
        setViewMonth(parseInt(parts[1], 10) - 1);
      }
    }
  }, [value]);

  const thaiBuddhistYear = viewYear + 543;

  // Month navigation
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Generate calendar days
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // Format today YYYY-MM-DD
  const todayStr = `${today.getFullYear()}-${padZero(today.getMonth() + 1)}-${padZero(today.getDate())}`;

  // Tomorrow YYYY-MM-DD
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${padZero(tomorrow.getMonth() + 1)}-${padZero(tomorrow.getDate())}`;

  const handleSelectDay = (day: number) => {
    const dateStr = `${viewYear}-${padZero(viewMonth + 1)}-${padZero(day)}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleQuickSelect = (dateStr: string) => {
    onChange(dateStr);
    const parts = dateStr.split('-');
    setViewYear(parseInt(parts[0], 10));
    setViewMonth(parseInt(parts[1], 10) - 1);
    setIsOpen(false);
  };

  // Check if a day is disabled
  const isDayDisabled = (day: number) => {
    const dateStr = `${viewYear}-${padZero(viewMonth + 1)}-${padZero(day)}`;
    if (minDate && dateStr < minDate) return true;
    if (maxDate && dateStr > maxDate) return true;
    if (disabledDates.includes(dateStr)) return true;
    const dayOfWeek = new Date(viewYear, viewMonth, day).getDay();
    if (disableSundays && dayOfWeek === 0) return true;
    return false;
  };

  const displayFormattedText = value ? formatThaiNumericDate(value) : '';

  return (
    <div ref={containerRef} className="relative w-full">
      {/* 🌟 CUSTOM INPUT BOX (SHOWS DD/MM/พ.ศ.) */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus-within:ring-2 focus-within:ring-emerald-500 focus-within:bg-white transition flex items-center justify-between cursor-pointer shadow-xs group ${
          isOpen ? 'ring-2 ring-emerald-500 bg-white border-emerald-500' : 'hover:bg-white hover:border-slate-400'
        } ${className}`}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            {value ? (
              <span className="text-slate-900 font-extrabold text-xs sm:text-sm font-mono tracking-tight">
                {displayFormattedText}
              </span>
            ) : (
              <span className="text-slate-400 text-xs font-normal">
                {placeholder}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-1 hover:text-slate-600 rounded-full hover:bg-slate-200 transition"
              title="ล้างวันที่"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-600' : ''}`} />
        </div>
      </div>

      {/* Hidden native input for form compatibility */}
      <input
        type="hidden"
        id={id}
        value={value}
        required={required}
      />

      {/* 🌟 POPUP THAI BUDDHIST CALENDAR */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 w-full sm:w-80 bg-white rounded-3xl border border-slate-200 shadow-2xl p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150">
          {/* Quick Shortcuts */}
          <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
            {(!disableSundays || today.getDay() !== 0) && (!minDate || todayStr >= minDate) && !disabledDates.includes(todayStr) && (
              <button
                type="button"
                onClick={() => handleQuickSelect(todayStr)}
                className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg transition text-center"
              >
                วันนี้ ({formatThaiNumericDate(todayStr)})
              </button>
            )}
            {(!disableSundays || tomorrow.getDay() !== 0) && (!minDate || tomorrowStr >= minDate) && !disabledDates.includes(tomorrowStr) && (
              <button
                type="button"
                onClick={() => handleQuickSelect(tomorrowStr)}
                className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition text-center"
              >
                พรุ่งนี้ ({formatThaiNumericDate(tomorrowStr)})
              </button>
            )}
            {disableSundays && (today.getDay() === 0 || tomorrow.getDay() === 0) && (
              <span className="text-[10px] text-rose-600 font-bold px-2 py-1 bg-rose-50 rounded-lg flex items-center gap-1">
                🚫 วันอาทิตย์ปิดทำการ
              </span>
            )}
          </div>

          {/* Month & Buddhist Year Header */}
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-center">
              <span className="font-extrabold text-slate-900 text-sm block">
                {THAI_MONTHS[viewMonth]}
              </span>
              <span className="text-[11px] font-bold text-emerald-700 block">
                ปี พ.ศ. {thaiBuddhistYear}
              </span>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
              title="เดือนถัดไป"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day Names Grid */}
          <div className="grid grid-cols-7 text-center text-[11px] font-bold text-slate-400">
            {THAI_DAYS_SHORT.map((dayName, idx) => (
              <div
                key={dayName}
                className={`py-1 ${idx === 0 ? 'text-rose-500 font-extrabold' : 'text-slate-500'}`}
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {/* Empty slots for previous month offset */}
            {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-8" />
            ))}

            {/* Days of current month */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = `${viewYear}-${padZero(viewMonth + 1)}-${padZero(dayNum)}`;
              const isSelected = value === dateStr;
              const isToday = todayStr === dateStr;
              const disabled = isDayDisabled(dayNum);
              const dayOfWeek = new Date(viewYear, viewMonth, dayNum).getDay();
              const isSunday = dayOfWeek === 0;

              return (
                <button
                  key={`day-${dayNum}`}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleSelectDay(dayNum)}
                  className={`h-8 w-8 mx-auto rounded-xl font-bold flex items-center justify-center transition text-xs ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 scale-105'
                      : isToday
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold'
                      : disabled && isSunday
                      ? 'text-rose-300 bg-rose-50/40 cursor-not-allowed line-through opacity-60'
                      : disabled
                      ? 'text-slate-300 cursor-not-allowed opacity-40'
                      : isSunday
                      ? 'text-rose-600 hover:bg-rose-50'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                  title={isSunday && disabled ? 'วันอาทิตย์ (คลังสินค้าปิดทำการ - งดรับจองคิว)' : isSunday ? 'วันอาทิตย์' : dateStr}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" /> วันที่เลือก
            </span>
            <span className="flex items-center gap-1 font-bold text-rose-600">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> วันอาทิตย์ (ปิดทำการ)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
