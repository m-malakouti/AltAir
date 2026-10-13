export interface Profile {
  id: string;
  phone: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: 'female' | 'male' | 'other' | 'undisclosed';
}
export type ProfileInput = Pick<Profile, 'firstName' | 'lastName' | 'birthDate' | 'gender'>;
export interface Session {
  token: string;
  expiresAt: string;
}
export interface Challenge {
  challengeId: string;
  expiresAt: string;
  retryAfterSeconds: number;
  developmentCode?: string;
}
export function latinDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (c) => String(c.charCodeAt(0) - (c >= '۰' ? 1776 : 1632)));
}
export function normalizePhone(value: string): string {
  const phone = latinDigits(value).trim().replace(/[ -]/g, '').replace(/^\+98/, '0');
  if (!/^09[0-9]{9}$/.test(phone))
    throw new Error('شماره موبایل معتبر وارد کن؛ مثلاً 09123456789.');
  return phone;
}
function object(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error('پاسخ سرویس معتبر نیست.');
  return value as Record<string, unknown>;
}
export function parseSession(value: unknown): Session {
  const item = object(value);
  if (
    typeof item.token !== 'string' ||
    !/^[A-F0-9]{64}$/.test(item.token) ||
    typeof item.expiresAt !== 'string' ||
    !Number.isFinite(Date.parse(item.expiresAt))
  )
    throw new Error('نشست معتبر نیست.');
  return { token: item.token, expiresAt: item.expiresAt };
}
export function parseChallenge(value: unknown): Challenge {
  const item = object(value);
  if (
    typeof item.challengeId !== 'string' ||
    !/^[A-F0-9]{64}$/.test(item.challengeId) ||
    typeof item.expiresAt !== 'string' ||
    !Number.isFinite(Date.parse(item.expiresAt)) ||
    typeof item.retryAfterSeconds !== 'number' ||
    !Number.isInteger(item.retryAfterSeconds) ||
    item.retryAfterSeconds < 0 ||
    item.retryAfterSeconds > 3600 ||
    (item.developmentCode !== undefined &&
      (typeof item.developmentCode !== 'string' || !/^[0-9]{6}$/.test(item.developmentCode)))
  )
    throw new Error('پاسخ کد معتبر نیست.');
  return item as unknown as Challenge;
}
export function parseProfileResult(value: unknown): Profile | null {
  const user = object(value).user;
  if (user === null) return null;
  const item = object(user);
  if (
    typeof item.id !== 'string' ||
    item.id.length > 64 ||
    typeof item.phone !== 'string' ||
    !/^09[0-9]{9}$/.test(item.phone) ||
    typeof item.firstName !== 'string' ||
    item.firstName.length < 1 ||
    item.firstName.length > 60 ||
    typeof item.lastName !== 'string' ||
    item.lastName.length < 1 ||
    item.lastName.length > 60 ||
    typeof item.birthDate !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(item.birthDate) ||
    !['female', 'male', 'other', 'undisclosed'].includes(String(item.gender))
  )
    throw new Error('مشخصات دریافتی معتبر نیست.');
  return item as unknown as Profile;
}
