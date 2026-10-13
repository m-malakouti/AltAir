import { parseMarketEndpoint } from '@/features/market/market-endpoint';
import { parseChallenge, parseProfileResult, parseSession } from './auth-model';
import type { ProfileInput } from './auth-model';
const endpoint = parseMarketEndpoint(import.meta.env.WXT_MARKET_API_URL as unknown);
export const authConfigured = Boolean(endpoint);
export class AuthError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
const messages: Record<string, string> = {
  invalid_phone: 'شماره موبایل معتبر نیست.',
  invalid_otp: 'کد اشتباه یا منقضی شده است؛ پس از پنج تلاش باید کد تازه بگیری.',
  otp_rate_limited: 'برای دریافت دوباره کمی صبر کن؛ حداکثر پنج کد در ساعت.',
  invalid_name: 'نام و نام خانوادگی باید بین ۱ تا ۶۰ حرف باشند.',
  invalid_birth_date: 'تاریخ تولد معتبر وارد کن.',
  invalid_gender: 'گزینهٔ جنسیت را انتخاب کن.',
  unauthorized: 'نشست منقضی شده؛ دوباره وارد شو.',
  sms_not_configured: 'سرویس پیامک هنوز متصل نشده است.',
  auth_storage_unavailable: 'ذخیره یا خواندن حساب انجام نشد؛ دوباره تلاش کن.',
};
async function request(path: string, body?: unknown, token?: string): Promise<unknown> {
  if (!endpoint) throw new Error('سرویس حساب کاربری تنظیم نشده است.');
  let response: Response;
  try {
    response = await fetch(new URL('/api/auth/' + path, endpoint), {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    throw new Error('ارتباط با سرویس حساب برقرار نشد؛ دوباره تلاش کن.');
  }
  if (!response.ok) {
    const error: unknown = await response.json().catch(() => null);
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
    throw new AuthError(
      messages[code] ??
        (response.status === 429
          ? 'تعداد درخواست‌ها زیاد است؛ یک دقیقه صبر کن.'
          : 'درخواست انجام نشد؛ دوباره تلاش کن.'),
      response.status,
    );
  }
  return (await response.json()) as unknown;
}
export async function requestOtp(phone: string) {
  return parseChallenge(await request('request', { phone }));
}
export async function verifyOtp(challengeId: string, code: string) {
  const result = await request('verify', { challengeId, code });
  return { session: parseSession(result), user: parseProfileResult(result) };
}
export async function getProfile(token: string) {
  return parseProfileResult(await request('me', undefined, token));
}
export async function completeProfile(token: string, input: ProfileInput) {
  return parseProfileResult(await request('profile', input, token));
}
export async function logout(token: string) {
  await request('logout', {}, token);
}
