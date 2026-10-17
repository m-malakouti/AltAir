import { browser } from 'wxt/browser';

export interface GoogleProfile {
  sub: string;
  name: string;
  email: string;
  picture?: string;
}
const configured: unknown = import.meta.env.WXT_GOOGLE_OAUTH_CLIENT_ID;
export const googleAuthConfigured =
  typeof configured === 'string' &&
  /^[\w-]+\.apps\.googleusercontent\.com$/.test(configured.trim());
const KEY = 'altAir.auth.google';

export function parseGoogleProfile(value: unknown): GoogleProfile {
  if (!value || typeof value !== 'object') throw new Error('پاسخ گوگل معتبر نیست.');
  const item = value as Record<string, unknown>;
  if (
    typeof item.sub !== 'string' ||
    !item.sub ||
    item.sub.length > 255 ||
    typeof item.email !== 'string' ||
    !item.email.includes('@') ||
    item.email.length > 320 ||
    item.email_verified !== true
  )
    throw new Error('ایمیل تأییدشده از گوگل دریافت نشد.');
  let picture: string | undefined;
  if (typeof item.picture === 'string') {
    try {
      const url = new URL(item.picture);
      if (
        url.protocol === 'https:' &&
        !url.username &&
        !url.password &&
        (url.hostname === 'googleusercontent.com' ||
          url.hostname.endsWith('.googleusercontent.com'))
      )
        picture = url.href;
    } catch {
      /* An optional invalid photo must not prevent sign-in. */
    }
  }
  return {
    sub: item.sub,
    email: item.email,
    name: typeof item.name === 'string' && item.name.trim() ? item.name.slice(0, 200) : item.email,
    ...(picture ? { picture } : {}),
  };
}

async function googleProfile(token: string) {
  const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'omit',
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    if (response.status === 401) await browser.identity.removeCachedAuthToken({ token });
    throw new Error('تأیید حساب گوگل انجام نشد؛ دوباره وارد شو.');
  }
  return parseGoogleProfile(await response.json());
}

export async function signInGoogle() {
  if (!googleAuthConfigured) throw new Error('ورود گوگل هنوز فعال نشده است.');
  if (!browser.runtime?.id || !browser.identity?.getAuthToken)
    throw new Error('این روش ورود را در افزونهٔ نصب‌شده روی Chrome اجرا کن.');
  let result;
  try {
    result = await browser.identity.getAuthToken({ interactive: true });
  } catch {
    throw new Error('ورود گوگل کامل نشد. اگر پنجره را نبسته‌ای، تنظیمات اتصال گوگل را بررسی کن.');
  }
  const token = typeof result === 'string' ? result : result?.token;
  if (!token) throw new Error('اجازهٔ ورود از گوگل دریافت نشد.');
  const user = await googleProfile(token);
  // Only a connection flag is stored. Tokens stay in the browser identity cache.
  await browser.storage.session.set({ [KEY]: true });
  return user;
}

export async function restoreGoogle() {
  if (!googleAuthConfigured || !browser.runtime?.id || !browser.identity?.getAuthToken) return null;
  if ((await browser.storage.session.get(KEY))[KEY] !== true) return null;
  try {
    const result = await browser.identity.getAuthToken({ interactive: false });
    const token = typeof result === 'string' ? result : result?.token;
    if (!token) throw new Error('missing_token');
    return await googleProfile(token);
  } catch {
    await browser.storage.session.remove(KEY);
    return null;
  }
}

export async function signOutGoogle() {
  await browser.identity.clearAllCachedAuthTokens();
  await browser.storage.session.remove(KEY);
}

export function watchGoogle(callback: () => void) {
  if (!browser.runtime?.id) return () => {};
  const listener = (changes: Record<string, unknown>, area: string) => {
    if (area === 'session' && KEY in changes) callback();
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
