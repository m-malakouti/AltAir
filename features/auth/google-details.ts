import { browser } from 'wxt/browser';

export const GENDERS = {
  female: 'زن',
  male: 'مرد',
  other: 'سایر',
  undisclosed: 'ترجیح می‌دهم نگویم',
} as const;
export interface GoogleDetails {
  birthDate: string;
  gender: keyof typeof GENDERS;
}
export function parseGoogleDetails(value: unknown, now = new Date()): GoogleDetails {
  if (!value || typeof value !== 'object') throw new Error('مشخصات معتبر نیست.');
  const item = value as Record<string, unknown>;
  const birthDate = typeof item.birthDate === 'string' ? item.birthDate : '';
  const date = new Date(`${birthDate}T12:00:00Z`);
  const min = new Date(now);
  min.setUTCFullYear(min.getUTCFullYear() - 120);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(birthDate) ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== birthDate ||
    birthDate > now.toISOString().slice(0, 10) ||
    birthDate < min.toISOString().slice(0, 10)
  )
    throw new Error('تاریخ تولد معتبر و در بازهٔ ۱۲۰ سال گذشته وارد کن.');
  if (typeof item.gender !== 'string' || !Object.hasOwn(GENDERS, item.gender))
    throw new Error('یکی از گزینه‌های جنسیت را انتخاب کن.');
  return { birthDate, gender: item.gender as GoogleDetails['gender'] };
}
const keyFor = (sub: string) => `altAir.auth.google.details.${sub}`;
export async function readGoogleDetails(sub: string): Promise<GoogleDetails | null> {
  const key = keyFor(sub);
  const value: unknown = (await browser.storage.local.get(key))[key];
  return value == null ? null : parseGoogleDetails(value);
}
export async function saveGoogleDetails(sub: string, value: GoogleDetails) {
  await browser.storage.local.set({ [keyFor(sub)]: parseGoogleDetails(value) });
}
