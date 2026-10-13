import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
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
  const label = user
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
            {step === 'profile'
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
        {step === 'phone' && (
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
        {step === 'code' && challenge && (
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
            <label htmlFor={id + '-birth'}>تاریخ تولد (میلادی)</label>
            <input
              id={id + '-birth'}
              type="date"
              dir="ltr"
              autoComplete="bday"
              required
              min={new Date(now - 120 * 365.25 * 86400000).toISOString().slice(0, 10)}
              max={new Date(now).toISOString().slice(0, 10)}
              value={profile.birthDate}
              onChange={(e) => setProfile({ ...profile, birthDate: e.target.value })}
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
