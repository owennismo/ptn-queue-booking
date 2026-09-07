// Thai Date & Time utilities (พุทธศักราช พ.ศ.)

const THAI_MONTHS_FULL = [
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

const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

const THAI_DAYS = [
  'วันอาทิตย์',
  'วันจันทร์',
  'วันอังคาร',
  'วันพุธ',
  'วันพฤหัสบดี',
  'วันศุกร์',
  'วันเสาร์',
];

/**
 * Format YYYY-MM-DD to dd/mm/พ.ศ. e.g. "03/09/2569"
 */
export function formatThaiNumericDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split(/[-T :]/);
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const thaiYear = year + 543;

    const dd = String(day).padStart(2, '0');
    const mm = String(month).padStart(2, '0');

    return `${dd}/${mm}/${thaiYear}`;
  } catch (e) {
    return dateStr;
  }
}

/**
 * Format YYYY-MM-DD to Short Thai Date as "dd/mm/พ.ศ." e.g. "03/09/2569"
 */
export function formatThaiShortDate(dateStr?: string | null): string {
  return formatThaiNumericDate(dateStr);
}

/**
 * Format YYYY-MM-DD to dd/mm/พ.ศ. e.g. "04/09/2569"
 */
export function formatThaiDate(dateStr?: string | null): string {
  return formatThaiNumericDate(dateStr);
}

/**
 * Format YYYY-MM-DD to Full Thai Date e.g. "04/09/2569 (วันพฤหัสบดีที่ 4 กันยายน 2569)"
 */
export function formatThaiFullDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split(/[-T :]/);
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    const d = new Date(year, month, day);
    const dayName = THAI_DAYS[d.getDay()];
    const thaiYear = year + 543;
    const dd = String(day).padStart(2, '0');
    const mm = String(month + 1).padStart(2, '0');

    return `${dd}/${mm}/${thaiYear} (${dayName}ที่ ${day} ${THAI_MONTHS_FULL[month]})`;
  } catch (e) {
    return dateStr;
  }
}

/**
 * Format timestamp e.g. "2026-09-03 14:30:00" to "03/09/2569 14:30 น."
 * Handles UTC strings from Cloudflare Workers and formats accurately to Asia/Bangkok time
 */
export function formatThaiDateTime(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    if (dateStr.length <= 10) {
      return formatThaiNumericDate(dateStr);
    }
    let d: Date;
    if (dateStr.includes('Z') || dateStr.includes('+')) {
      d = new Date(dateStr);
    } else if (dateStr.includes('T')) {
      d = new Date(dateStr + 'Z');
    } else if (dateStr.includes(' ') && dateStr.length >= 16) {
      d = new Date(dateStr.replace(' ', 'T') + 'Z');
    } else {
      d = new Date(dateStr);
    }

    if (isNaN(d.getTime())) return dateStr;

    const bangkokFormatter = new Intl.DateTimeFormat('th-TH', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = bangkokFormatter.formatToParts(d);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';
    const day = getPart('day');
    const month = getPart('month');
    const year = getPart('year');
    const hour = getPart('hour');
    const minute = getPart('minute');

    return `${day}/${month}/${year} ${hour}:${minute} น.`;
  } catch (e) {
    return dateStr;
  }
}

/**
 * Phone Number Masking Helper (08X-XXX-XXXX or 02X-XXX-XXXX)
 */
export function formatPhoneMask(input: string): string {
  const digits = input.replace(/\D/g, '').substring(0, 10);
  if (digits.length <= 3) {
    return digits;
  }
  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}
