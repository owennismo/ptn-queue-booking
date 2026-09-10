import { SystemSettings } from './types';
import { formatThaiNumericDate } from './dateUtils';

export type AnnouncementStatusType =
  | 'disabled'
  | 'no_content'
  | 'always_active'
  | 'scheduled'
  | 'active'
  | 'expired'
  | 'outside_daily_hours';

export interface AnnouncementStatusResult {
  isVisible: boolean;
  status: AnnouncementStatusType;
  badgeText: string;
  badgeClass: string;
  detailText: string;
}

/**
 * Format a local datetime string (e.g. "2026-09-11T08:00") into Thai format
 * e.g. "11/09/2569 เวลา 08:00 น."
 */
export function formatScheduleThaiDateTime(dtStr?: string | null): string {
  if (!dtStr) return '-';
  try {
    const parts = dtStr.split('T');
    const datePart = parts[0];
    const timePart = parts[1] ? parts[1].slice(0, 5) : '';
    const thaiDate = formatThaiNumericDate(datePart);
    return timePart ? `${thaiDate} เวลา ${timePart} น.` : thaiDate;
  } catch (e) {
    return dtStr;
  }
}

/**
 * Checks whether the booking announcement is currently active and should be displayed.
 */
export function checkAnnouncementStatus(
  settings: Partial<SystemSettings> | null | undefined,
  nowInput?: Date
): AnnouncementStatusResult {
  if (!settings) {
    return {
      isVisible: false,
      status: 'disabled',
      badgeText: 'ปิดการแสดงผล',
      badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
      detailText: 'ไม่ได้เปิดใช้งานการแสดงผล',
    };
  }

  // 1. Check main toggle
  if (!settings.booking_announcement_active) {
    return {
      isVisible: false,
      status: 'disabled',
      badgeText: 'ปิดการแสดงผล',
      badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
      detailText: 'สวิตช์หลักปิดอยู่',
    };
  }

  // 2. Check content
  if (!settings.booking_announcement?.trim()) {
    return {
      isVisible: false,
      status: 'no_content',
      badgeText: 'ยังไม่มีข้อความ',
      badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
      detailText: 'เปิดสวิตช์ไว้ แต่ยังไม่มีข้อความประกาศ',
    };
  }

  // 3. If schedule is NOT enabled, it is always active
  if (!settings.booking_announcement_schedule_enabled) {
    return {
      isVisible: true,
      status: 'always_active',
      badgeText: 'เปิดตลอด 24 ชม.',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      detailText: 'แสดงผลตลอดเวลา (ไม่ได้ตั้งเวลาเปิด-ปิดอัตโนมัติ)',
    };
  }

  // 4. Evaluate Schedule
  const now = nowInput || new Date();
  const startStr = settings.booking_announcement_start_datetime?.trim();
  const endStr = settings.booking_announcement_end_datetime?.trim();

  // If start datetime is set and now is before start
  if (startStr) {
    const startDate = new Date(startStr);
    if (!isNaN(startDate.getTime()) && now.getTime() < startDate.getTime()) {
      return {
        isVisible: false,
        status: 'scheduled',
        badgeText: 'รอถึงกำหนดเวลาเริ่ม',
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
        detailText: `จะเริ่มแสดงผลในวันที่ ${formatScheduleThaiDateTime(startStr)}`,
      };
    }
  }

  // If end datetime is set and now is after end
  if (endStr) {
    const endDate = new Date(endStr);
    if (!isNaN(endDate.getTime()) && now.getTime() > endDate.getTime()) {
      return {
        isVisible: false,
        status: 'expired',
        badgeText: 'สิ้นสุดเวลาแสดงผลแล้ว',
        badgeClass: 'bg-rose-100 text-rose-700 border-rose-300',
        detailText: `สิ้นสุดการแสดงผลเมื่อ ${formatScheduleThaiDateTime(endStr)}`,
      };
    }
  }

  // 5. Check daily recurring hours if enabled
  if (settings.booking_announcement_daily_recurring) {
    const dailyStart = settings.booking_announcement_daily_start_time?.trim() || '08:00';
    const dailyEnd = settings.booking_announcement_daily_end_time?.trim() || '17:00';

    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMins = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMins}`;

    if (currentTimeStr < dailyStart || currentTimeStr > dailyEnd) {
      return {
        isVisible: false,
        status: 'outside_daily_hours',
        badgeText: 'อยู่นอกเวลาประจำวัน',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
        detailText: `แสดงผลเฉพาะเวลา ${dailyStart} - ${dailyEnd} น. (ขณะนี้เวลา ${currentTimeStr} น.)`,
      };
    }
  }

  // Active in schedule!
  let detail = 'กำลังแสดงผลตามกำหนดเวลา';
  if (endStr) {
    detail = `กำลังแสดงผล (จะสิ้นสุดในวันที่ ${formatScheduleThaiDateTime(endStr)})`;
  } else if (settings.booking_announcement_daily_recurring) {
    detail = `กำลังแสดงผล (รอบประจำวันถึงเวลา ${settings.booking_announcement_daily_end_time || '17:00'} น.)`;
  }

  return {
    isVisible: true,
    status: 'active',
    badgeText: 'กำลังแสดงผล (Active)',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    detailText: detail,
  };
}
