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
 * Format YYYY-MM-DD to Full Thai Date e.g. "วันพฤหัสบดีที่ 3 กันยายน 2569"
 */
export function formatThaiDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split(/[-T :]/);
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    const d = new Date(year, month, day);
    const dayName = THAI_DAYS[d.getDay()];
    const thaiYear = year + 543;

    return `${dayName}ที่ ${day} ${THAI_MONTHS_FULL[month]} ${thaiYear}`;
  } catch (e) {
    return dateStr;
  }
}

/**
 * Format YYYY-MM-DD to Short Thai Date e.g. "3 ก.ย. 2569"
 */
export function formatThaiShortDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split(/[-T :]/);
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const thaiYear = year + 543;

    return `${day} ${THAI_MONTHS_SHORT[month]} ${thaiYear}`;
  } catch (e) {
    return dateStr;
  }
}

/**
 * Format timestamp e.g. "2026-09-03 14:30:00" to "3 ก.ย. 2569 14:30 น."
 */
export function formatThaiDateTime(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const [dPart, tPart] = dateStr.split(' ');
    const shortDate = formatThaiShortDate(dPart);
    if (tPart) {
      const time = tPart.substring(0, 5);
      return `${shortDate} ${time} น.`;
    }
    return shortDate;
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
