export const MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];
export const WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
export const CALENDAR_SOURCE =
  'https://calendar.ut.ac.ir/documents/2139738/7092644/Calendar-1405.pdf/64228cbb-f4de-dc32-4d2b-57db3c8e322f?t=1761972997587';
export const VERIFIED_YEAR = 1405;
// Final official 1405 calendar, University of Tehran Calendar Center, pages 3–14.
// Explicit dated data: never derive Iranian religious holidays from an Islamic calendar algorithm.
export const HOLIDAYS: Readonly<Record<string, string>> = {
  '1-1': 'نوروز و عید فطر',
  '1-2': 'نوروز و تعطیل عید فطر',
  '1-3': 'نوروز',
  '1-4': 'نوروز',
  '1-12': 'روز جمهوری اسلامی',
  '1-13': 'روز طبیعت',
  '1-25': 'شهادت امام صادق',
  '3-6': 'عید قربان',
  '3-14': 'عید غدیر و رحلت امام خمینی',
  '3-15': 'قیام ۱۵ خرداد',
  '4-3': 'تاسوعا',
  '4-4': 'عاشورا',
  '5-13': 'اربعین',
  '5-21': 'رحلت پیامبر و شهادت امام حسن',
  '5-22': 'شهادت امام رضا',
  '5-30': 'شهادت امام حسن عسکری',
  '6-8': 'میلاد پیامبر و امام صادق',
  '8-22': 'شهادت حضرت فاطمه',
  '10-2': 'میلاد امام علی',
  '10-16': 'مبعث پیامبر',
  '11-4': 'میلاد امام مهدی',
  '11-22': 'پیروزی انقلاب اسلامی',
  '12-9': 'شهادت امام علی',
  '12-19': 'عید فطر',
  '12-20': 'تعطیل عید فطر',
  '12-29': 'ملی شدن صنعت نفت',
};
export interface PersianDay {
  year: number;
  month: number;
  day: number;
}
export interface CalendarDay extends PersianDay {
  date: Date;
  weekday: number;
  holiday?: string;
}
const persian = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {
  timeZone: 'Asia/Tehran',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});
export const faNumber = (value: number) =>
  new Intl.NumberFormat('fa-IR', { useGrouping: false }).format(value);
export function persianDay(date: Date): PersianDay {
  const parts = persian.formatToParts(date);
  const part = (name: string) => Number(parts.find((item) => item.type === name)?.value);
  return { year: part('year'), month: part('month'), day: part('day') };
}
export function holidayFor(day: PersianDay): string | undefined {
  return day.year === VERIFIED_YEAR ? HOLIDAYS[`${day.month}-${day.day}`] : undefined;
}
export function sameDay(a: PersianDay, b: PersianDay) {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}
const years = new Map<number, CalendarDay[]>();
export function yearDays(year: number): CalendarDay[] {
  if (!Number.isInteger(year) || year < 1300 || year > 1500)
    throw new Error('Unsupported calendar year');
  const cached = years.get(year);
  if (cached) return cached;
  const result: CalendarDay[] = [];
  const start = Date.UTC(year + 621, 2, 18, 12);
  for (let i = 0; i < 370; i++) {
    const date = new Date(start + i * 86400000);
    const day = persianDay(date);
    if (day.year === year)
      result.push({ ...day, date, weekday: (date.getUTCDay() + 1) % 7, holiday: holidayFor(day) });
  }
  years.set(year, result);
  return result;
}
export function monthDays(year: number, month: number) {
  return yearDays(year).filter((day) => day.month === month);
}
export function shiftMonth(year: number, month: number, delta: number) {
  const total = year * 12 + month - 1 + delta;
  return { year: Math.floor(total / 12), month: (((total % 12) + 12) % 12) + 1 };
}
