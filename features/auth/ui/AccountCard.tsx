import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { GoogleAccountProfile } from './GoogleAccountProfile';
import { PersianDatePicker } from '@/components/ui/PersianDatePicker';
import {
  authConfigured,
  AuthError,
  completeProfile,
  getProfile,
  logout,
  requestOtp,
  verifyOtp,
} from '../auth-client';
import { latinDigits, normalizePhone } from '../auth-model';
import type { Challenge, Profile, ProfileInput, Session } from '../auth-model';
import { readSession, saveSession, watchSession } from '../auth-storage';
import {
  googleAuthConfigured,
  restoreGoogle,
  signInGoogle,
  signOutGoogle,
  watchGoogle,
  type GoogleProfile,
} from '../google-auth';

export function AccountCard() {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'phone' | 'code' | 'profile' | 'account'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(Date.now);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [googleUser, setGoogleUser] = useState<GoogleProfile | null>(null);
  useEffect(() => {
    if (!session || !user) return;
    const heartbeat = () => {
      if (document.visibilityState === 'visible') void getProfile(session.token).catch(() => {});
    };
    heartbeat();
    const timer = window.setInterval(heartbeat, 120_000);
    document.addEventListener('visibilitychange', heartbeat);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', heartbeat);
    };
  }, [session, user]);
  useEffect(() => {
    let alive = true;
    let revision = 0;
    const load = async () => {
      const current = ++revision;
      const found = await restoreGoogle();
      if (alive && current === revision) setGoogleUser(found);
    };
    void load().catch(() => {});
    const refresh = () => {
      void load().catch(() => {});
    };
    window.addEventListener('focus', refresh);
    const stop = watchGoogle(() => {
      void load().catch(() => {});
    });
    return () => {
      alive = false;
      stop();
      window.removeEventListener('focus', refresh);
    };
  }, []);
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    gender: '',
  });

  useEffect(() => {
    let alive = true;
    let revision = 0;
    async function load() {
      const current = ++revision;
      try {
        const saved = await readSession();
        const found = saved ? await getProfile(saved.token) : null;
        if (alive && current === revision) {
          setSession(saved);
          setUser(found);
          if (saved) setStep(found ? 'account' : 'profile');
          else setStep('phone');
          setError('');
        }
      } catch (e) {
        if (alive && current === revision) {
          if (e instanceof AuthError && e.status === 401) {
            setSession(null);
            setUser(null);
            setStep('phone');
            await saveSession(null);
          } else setError(e instanceof Error ? e.message : 'خواندن نشست انجام نشد.');
        }
      } finally {
        if (alive && current === revision) setReady(true);
      }
    }
    void load();
    const stop = watchSession(() => {
      void load();
    });
    return () => {
      alive = false;
      stop();
    };
  }, [reload]);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [open]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'درخواست انجام نشد.');
      if (e instanceof AuthError && e.status === 401) {
        setSession(null);
        setUser(null);
        setStep('phone');
        await saveSession(null);
      }
    } finally {
      setBusy(false);
    }
  }
  async function send() {
    const normalized = normalizePhone(phone);
    const next = await requestOtp(normalized);
    setPhone(normalized);
    setChallenge(next);
    setCode('');
    setNow(Date.now());
    setRetryAt(Date.now() + next.retryAfterSeconds * 1000);
    setStep('code');
  }
  const seconds = Math.max(0, Math.ceil((retryAt - now) / 1000));
  const expired = challenge !== null && Date.parse(challenge.expiresAt) <= now;
  const label = googleUser
    ? googleUser.name
    : user
      ? user.firstName + ' ' + user.lastName
      : session
        ? 'تکمیل مشخصات'
        : 'ورود / ثبت‌نام';
  return (
    <div className="account-card">
      <span>{label}</span>
      <button
        type="button"
        className="icon-button"
        aria-label={label}
        title={label}
        disabled={!ready}
        onClick={() => setOpen(true)}
      >
        <Icon name="user" />
      </button>
      <dialog
        ref={dialog}
        className="auth-dialog"
        aria-labelledby={id + '-title'}
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
      >
        <header>
          <h2 id={id + '-title'}>
            {googleUser
              ? 'حساب گوگل'
              : step === 'profile'
                ? 'تکمیل ثبت‌نام'
                : step === 'code'
                  ? 'تأیید شماره موبایل'
                  : step === 'account'
                    ? 'حساب کاربری'
                    : 'ورود / ثبت‌نام'}
          </h2>
          <button
            className="icon-button"
            aria-label="بستن"
            title="بستن"
            onClick={() => setOpen(false)}
          >
            <Icon name="close" />
          </button>
        </header>
        {!session && !googleUser && (
          <div className="auth-google-section">
            <button
              type="button"
              className="auth-google-button"
              disabled={busy || !googleAuthConfigured}
              onClick={() => {
                void run(async () => {
                  setGoogleUser(await signInGoogle());
                  setChallenge(null);
                  setCode('');
                });
              }}
            >
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 48 48">
                <path
                  fill="#4285F4"
                  d="M43.61 24.46c0-1.36-.12-2.66-.35-3.92H24v7.42h11a9.4 9.4 0 0 1-4.08 6.17v5h6.62c3.88-3.58 6.07-8.85 6.07-14.67Z"
                />
                <path
                  fill="#34A853"
                  d="M24 44c5.4 0 9.92-1.79 13.54-4.87l-6.62-5A12.3 12.3 0 0 1 24 36.1c-5.3 0-9.8-3.58-11.4-8.4H5.76v5.16A20.45 20.45 0 0 0 24 44Z"
                />
                <path
                  fill="#FBBC05"
                  d="M12.6 27.7a12.3 12.3 0 0 1 0-7.4v-5.16H5.76a20 20 0 0 0 0 17.72Z"
                />
                <path
                  fill="#EA4335"
                  d="M24 11.9c2.96 0 5.6 1.02 7.7 3.02l5.77-5.77A19.7 19.7 0 0 0 24 4 20.45 20.45 0 0 0 5.76 15.14l6.84 5.16c1.6-4.82 6.1-8.4 11.4-8.4Z"
                />
              </svg>
              <span>ادامه با Google</span>
            </button>
            <p className="helper-text">
              ورود با حساب گوگل با دسترسی به نام و ایمیل؛ رمزت فقط در صفحهٔ گوگل وارد می‌شود.
            </p>
            {!googleAuthConfigured && (
              <p className="helper-text" role="status">
                ورود گوگل هنوز فعال نشده است.
              </p>
            )}
          </div>
        )}
        {googleUser && (
          <div className="auth-profile">
            <GoogleAccountProfile key={googleUser.sub} user={googleUser} />
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                void run(async () => {
                  await signOutGoogle();
                  setGoogleUser(null);
                  setStep('phone');
                });
              }}
            >
              خروج از حساب گوگل
            </button>
          </div>
        )}
        {!googleUser && step === 'phone' && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void run(send);
            }}
          >
            <p className="helper-text">
              با شماره موبایل وارد شو. حساب جدید پس از تأیید شماره ساخته می‌شود.
            </p>
            <label htmlFor={id + '-phone'}>شماره موبایل</label>
            <input
              id={id + '-phone'}
              type="tel"
              dir="ltr"
              autoComplete="tel"
              inputMode="tel"
              required
              maxLength={20}
              placeholder="09xxxxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={busy}
            />
            <p className="auth-development">
              نسخهٔ آزمایشی محلی: پیامک ارسال نمی‌شود؛ کد تست در مرحلهٔ بعد نمایش داده می‌شود.
            </p>
            {!authConfigured && <p role="status">سرویس حساب کاربری هنوز تنظیم نشده است.</p>}
            <div className="auth-actions">
              <button
                className="icon-button icon-button--primary"
                disabled={busy || !authConfigured}
                aria-label="دریافت کد ورود"
                title="دریافت کد ورود"
              >
                <Icon name="next" />
              </button>
            </div>
          </form>
        )}
        {!googleUser && step === 'code' && challenge && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                const result = await verifyOtp(challenge.challengeId, latinDigits(code));
                await saveSession(result.session);
                setSession(result.session);
                setUser(result.user);
                setChallenge(null);
                setCode('');
                setStep(result.user ? 'account' : 'profile');
              });
            }}
          >
            <p className="helper-text">
              کد مربوط به <bdi>{phone}</bdi> · اعتبار پنج دقیقه
            </p>
            {challenge.developmentCode && (
              <p className="auth-development">
                کد آزمایشی محلی (ارسال پیامکی انجام نشده):{' '}
                <strong dir="ltr">{challenge.developmentCode}</strong>
              </p>
            )}
            <label htmlFor={id + '-code'}>کد یک‌بارمصرف</label>
            <input
              id={id + '-code'}
              dir="ltr"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(latinDigits(e.target.value))}
              disabled={busy}
            />
            {expired && <p role="status">اعتبار کد تمام شد؛ کد جدید بگیر.</p>}
            <div className="auth-actions">
              <button
                type="button"
                className="icon-button"
                disabled={busy}
                aria-label="ویرایش شماره"
                title="ویرایش شماره"
                onClick={() => {
                  setStep('phone');
                  setChallenge(null);
                  setError('');
                }}
              >
                <Icon name="edit" />
              </button>
              <button
                type="button"
                className="icon-button"
                disabled={busy || seconds > 0}
                aria-label="ارسال مجدد کد"
                title="ارسال مجدد کد"
                onClick={() => {
                  void run(send);
                }}
              >
                <Icon name="refresh" />
              </button>
              {seconds > 0 && (
                <span className="helper-text" aria-live="off">
                  {seconds} ثانیه تا دریافت مجدد
                </span>
              )}
              <button
                className="icon-button icon-button--primary"
                disabled={busy || expired || code.length !== 6}
                aria-label="تأیید کد"
                title="تأیید کد"
              >
                <Icon name="check" />
              </button>
            </div>
          </form>
        )}
        {step === 'profile' && session && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                const saved = await completeProfile(session.token, profile as ProfileInput);
                if (!saved) throw new Error('ثبت مشخصات انجام نشد.');
                setUser(saved);
                setStep('account');
                await saveSession(session);
                setProfile({ firstName: '', lastName: '', birthDate: '', gender: '' });
              });
            }}
          >
            <p className="helper-text">شماره موبایل تأیید شد. مشخصاتت را تکمیل کن.</p>
            <label htmlFor={id + '-first'}>نام</label>
            <input
              id={id + '-first'}
              autoComplete="given-name"
              required
              maxLength={60}
              value={profile.firstName}
              onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
              disabled={busy}
            />
            <label htmlFor={id + '-last'}>نام خانوادگی</label>
            <input
              id={id + '-last'}
              autoComplete="family-name"
              required
              maxLength={60}
              value={profile.lastName}
              onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
              disabled={busy}
            />
            <label htmlFor={id + '-birth'}>تاریخ تولد (شمسی)</label>
            <PersianDatePicker
              id={id + '-birth'}
              value={profile.birthDate}
              onChange={(birthDate) => setProfile({ ...profile, birthDate })}
              disabled={busy}
            />
            <label htmlFor={id + '-gender'}>جنسیت</label>
            <select
              id={id + '-gender'}
              required
              value={profile.gender}
              onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
              disabled={busy}
            >
              <option value="">انتخاب کن</option>
              <option value="female">زن</option>
              <option value="male">مرد</option>
              <option value="other">سایر</option>
              <option value="undisclosed">ترجیح می‌دهم نگویم</option>
            </select>
            <p className="helper-text">مشخصات این نسخه روی سرور محلی ذخیره می‌شود.</p>
            <div className="auth-actions">
              <button
                className="icon-button icon-button--primary"
                disabled={busy}
                aria-label="ثبت مشخصات"
                title="ثبت مشخصات"
              >
                <Icon name="check" />
              </button>
            </div>
          </form>
        )}
        {step === 'account' && user && (
          <div className="auth-profile">
            <p className="auth-welcome">{user.firstName}، خوش آمدی</p>
            <dl>
              <dt>نام و نام خانوادگی</dt>
              <dd>
                {user.firstName} {user.lastName}
              </dd>
              <dt>موبایل</dt>
              <dd dir="ltr">{user.phone}</dd>
              <dt>تاریخ تولد</dt>
              <dd>{new Date(user.birthDate + 'T12:00:00Z').toLocaleDateString('fa-IR')}</dd>
              <dt>جنسیت</dt>
              <dd>
                {
                  { female: 'زن', male: 'مرد', other: 'سایر', undisclosed: 'ترجیح می‌دهم نگویم' }[
                    user.gender
                  ]
                }
              </dd>
            </dl>
          </div>
        )}
        {session && (
          <div className="auth-actions">
            <button
              className="icon-button"
              disabled={busy}
              aria-label="خروج از حساب"
              title="خروج از حساب"
              onClick={() => {
                void run(async () => {
                  await logout(session.token);
                  await saveSession(null);
                  setSession(null);
                  setUser(null);
                  setStep('phone');
                  setPhone('');
                  setCode('');
                });
              }}
            >
              <Icon name="logout" />
            </button>
          </div>
        )}
        {busy && (
          <p role="status" className="helper-text">
            در حال انجام…
          </p>
        )}
        {error && (
          <div className="auth-error" role="alert">
            {error}
            <button
              className="icon-button"
              disabled={busy}
              title="بررسی دوبارهٔ نشست"
              aria-label="بررسی دوبارهٔ نشست"
              onClick={() => setReload((v) => v + 1)}
            >
              <Icon name="refresh" />
            </button>
          </div>
        )}
      </dialog>
    </div>
  );
}
