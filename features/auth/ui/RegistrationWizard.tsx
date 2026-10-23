import { useEffect, useId, useRef, useState } from 'react';
import { PersianDatePicker } from '@/components/ui/PersianDatePicker';
import { parseGoogleDetails, GENDERS } from '../google-details';
import type { ProfileInput } from '../auth-model';
import {
  cardCatalog,
  interestCatalog,
  defaultCardChoices,
  suggestedCards,
  type CardChoices,
  type InterestId,
} from '@/features/workspace/card-catalog';
import { readPersonalization } from '@/features/workspace/personalization-store';
import './registration-wizard.css';

const steps = ['ورود', 'مشخصات', 'تولد', 'علایق', 'کارت‌ها', 'مرور نهایی'];
export function RegistrationProgress({ current }: { current: number }) {
  return (
    <nav className="registration-progress" aria-label="مراحل ثبت‌نام">
      <p aria-live="polite">
        مرحلهٔ {(current + 1).toLocaleString('fa-IR')} از ۶ · {steps[current]}
      </p>
      <progress value={current + 1} max={steps.length} aria-label="پیشرفت ثبت‌نام" />
      <ol>
        {steps.map((label, index) => (
          <li
            key={label}
            aria-current={index === current ? 'step' : undefined}
            className={index < current ? 'is-complete' : ''}
          >
            <span aria-hidden="true">
              {index < current ? '✓' : (index + 1).toLocaleString('fa-IR')}
            </span>
            {label}
          </li>
        ))}
      </ol>
    </nav>
  );
}
export interface WizardSelection {
  profile: ProfileInput;
  interests: InterestId[];
  cards: CardChoices;
}
export function RegistrationWizard({
  accountKey,
  initialProfile,
  personalizationOnly = false,
  verifiedName,
  onComplete,
}: {
  accountKey: string;
  initialProfile?: ProfileInput;
  personalizationOnly?: boolean;
  verifiedName?: string;
  onComplete: (selection: WizardSelection) => Promise<void>;
}) {
  const id = useId();
  const [current, setCurrent] = useState(personalizationOnly ? 3 : 1);
  const [profile, setProfile] = useState<ProfileInput>(
    initialProfile ?? { firstName: '', lastName: '', birthDate: '', gender: 'undisclosed' },
  );
  const [interests, setInterests] = useState<InterestId[]>([]);
  const [cards, setCards] = useState(defaultCardChoices);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    let alive = true;
    void readPersonalization()
      .then((saved) => {
        if (!alive) return;
        setCards(saved.cards);
        setInterests(saved.accounts[accountKey]?.interests ?? []);
        setLoadError(false);
        setError('');
      })
      .catch(() => {
        if (alive) {
          setLoadError(true);
          setError('خواندن تنظیمات انجام نشد؛ دوباره تلاش کن.');
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [accountKey, retry]);
  useEffect(() => {
    title.current?.focus();
  }, [current, loading]);
  function next() {
    setError('');
    if (
      current === 1 &&
      !verifiedName &&
      [profile.firstName, profile.lastName].some(
        (name) => !/^[\p{L}\p{M}\u200c '-]{1,60}$/u.test(name.trim()),
      )
    ) {
      setError('نام و نام خانوادگی معتبر وارد کن؛ هرکدام بین ۱ تا ۶۰ حرف.');
      return;
    }
    if (current === 2) {
      try {
        parseGoogleDetails(profile);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'تاریخ تولد معتبر وارد کن.');
        return;
      }
    }
    setCurrent((value) => Math.min(5, value + 1));
  }
  async function finish() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await onComplete({
        profile: {
          ...profile,
          firstName: profile.firstName.trim(),
          lastName: profile.lastName.trim(),
        },
        interests,
        cards,
      });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'ذخیره انجام نشد؛ انتخاب‌هایت حفظ شده‌اند، دوباره تلاش کن.',
      );
    } finally {
      setBusy(false);
    }
  }
  const enabled = cardCatalog.filter((card) => cards[card.id]);
  return (
    <div className="registration-wizard" aria-busy={busy || loading}>
      <RegistrationProgress current={current} />
      {loading ? (
        <p role="status">در حال آماده‌سازی…</p>
      ) : loadError ? (
        <>
          <p role="alert">{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setRetry((value) => value + 1);
            }}
          >
            تلاش دوباره
          </button>
        </>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (current === 5) void finish();
            else next();
          }}
        >
          <div className="wizard-heading">
            <h3 ref={title} tabIndex={-1}>
              {
                [
                  '',
                  'با هم آشنا بشیم',
                  'چه روزی به دنیا اومدی؟',
                  'چه چیزهایی دوست داری؟',
                  'میزکارت را بچین',
                  'همه‌چیز به سلیقهٔ تو',
                ][current]
              }
            </h3>
            <p>
              {
                [
                  '',
                  'نامی که با آن صدایت کنیم.',
                  'روز، ماه و سال تولدت را در تقویم شمسی انتخاب کن.',
                  'اختیاریه؛ هر تعداد که دوست داری انتخاب کن.',
                  'این‌ها نمونهٔ کارت‌ها هستند؛ با کلید هر کارت، نمایش آن را انتخاب کن.',
                  'انتخاب‌هایت را مرور کن؛ بعداً هم می‌توانی کارت‌ها را تغییر بدهی.',
                ][current]
              }
            </p>
          </div>
          <fieldset disabled={busy} className="wizard-fields">
            {current === 1 && (
              <>
                {verifiedName ? (
                  <p>
                    نام حساب گوگل: <strong>{verifiedName}</strong>
                  </p>
                ) : (
                  <>
                    <label htmlFor={id + '-first'}>نام</label>
                    <input
                      id={id + '-first'}
                      autoComplete="given-name"
                      maxLength={60}
                      required
                      value={profile.firstName}
                      onChange={(event) =>
                        setProfile({ ...profile, firstName: event.target.value })
                      }
                    />
                    <label htmlFor={id + '-last'}>نام خانوادگی</label>
                    <input
                      id={id + '-last'}
                      autoComplete="family-name"
                      maxLength={60}
                      required
                      value={profile.lastName}
                      onChange={(event) => setProfile({ ...profile, lastName: event.target.value })}
                    />
                  </>
                )}
                <label htmlFor={id + '-gender'}>جنسیت (اختیاری)</label>
                <select
                  id={id + '-gender'}
                  value={profile.gender}
                  onChange={(event) =>
                    setProfile({ ...profile, gender: event.target.value as ProfileInput['gender'] })
                  }
                >
                  {Object.entries(GENDERS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </>
            )}
            {current === 2 && (
              <>
                <label htmlFor={id + '-birth'}>تاریخ تولد (شمسی)</label>
                <PersianDatePicker
                  id={id + '-birth'}
                  value={profile.birthDate}
                  disabled={busy}
                  onChange={(birthDate) => setProfile({ ...profile, birthDate })}
                />
                <p className="helper-text">تاریخ تولدت در کارت‌های عمومی نمایش داده نمی‌شود.</p>
              </>
            )}
            {current === 3 && (
              <div className="wizard-interests">
                {interestCatalog.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={interests.includes(item.id)}
                    onClick={() =>
                      setInterests((previous) =>
                        previous.includes(item.id)
                          ? previous.filter((value) => value !== item.id)
                          : [...previous, item.id],
                      )
                    }
                  >
                    {interests.includes(item.id) && <span aria-hidden="true">✓ </span>}
                    {item.title}
                  </button>
                ))}
              </div>
            )}
            {current === 4 && (
              <>
                <div className="wizard-card-tools">
                  <span role="status">{enabled.length.toLocaleString('fa-IR')} کارت روشن</span>
                  <button type="button" onClick={() => setCards(suggestedCards(interests))}>
                    پیشنهاد بر اساس علایق
                  </button>
                  <button type="button" onClick={() => setCards(defaultCardChoices())}>
                    همه روشن
                  </button>
                </div>
                <div className="wizard-card-grid">
                  {cardCatalog.map((card) => (
                    <article
                      key={card.id}
                      className={`wizard-card ${cards[card.id] ? 'is-enabled' : ''}`}
                    >
                      <div
                        className={`wizard-preview wizard-preview--${card.id}`}
                        aria-hidden="true"
                      >
                        <small>پیش‌نمایش</small>
                        <strong>{card.sample}</strong>
                        <span>{card.caption}</span>
                      </div>
                      <div className="wizard-card-title">
                        <h4>{card.title}</h4>
                        <button
                          type="button"
                          role="switch"
                          className="wizard-switch"
                          aria-checked={cards[card.id]}
                          aria-label={`نمایش ${card.title}`}
                          onClick={() =>
                            setCards((previous) => ({ ...previous, [card.id]: !previous[card.id] }))
                          }
                        >
                          <span />
                        </button>
                      </div>
                      <p>{card.detail}</p>
                      <span className="wizard-card-state">{cards[card.id] ? 'روشن' : 'خاموش'}</span>
                    </article>
                  ))}
                </div>
                {enabled.length === 0 && (
                  <p role="status">
                    میزکارت خلوت می‌مونه؛ حساب کاربری و جست‌وجو همیشه در دسترس‌اند.
                  </p>
                )}
              </>
            )}
            {current === 5 && (
              <div className="wizard-review">
                <div className="wizard-review-avatar" aria-hidden="true">
                  {profile.firstName.slice(0, 1) || '✓'}
                </div>
                <h4>{profile.firstName}، میزکارت آماده‌ست</h4>
                {!personalizationOnly && (
                  <p>
                    تولد:{' '}
                    {new Date(profile.birthDate + 'T12:00:00Z').toLocaleDateString('fa-IR', {
                      timeZone: 'UTC',
                    })}
                  </p>
                )}
                <p>
                  علایق:{' '}
                  {interests.length
                    ? interestCatalog
                        .filter((item) => interests.includes(item.id))
                        .map((item) => item.title)
                        .join('، ')
                    : 'فعلاً انتخاب نشده'}
                </p>
                <div className="wizard-summary-cards">
                  {enabled.map((card) => (
                    <span key={card.id}>✓ {card.title}</span>
                  ))}
                </div>
                <p>
                  {enabled.length.toLocaleString('fa-IR')} کارت روشن ·{' '}
                  {(cardCatalog.length - enabled.length).toLocaleString('fa-IR')} کارت خاموش
                </p>
                <p className="helper-text">
                  علایق و چیدمان در همین مرورگر ذخیره می‌شوند. خاموش‌کردن کارت، محتوای آن را پاک
                  نمی‌کند.
                </p>
              </div>
            )}
          </fieldset>
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <footer className="wizard-actions">
            <button
              type="button"
              disabled={busy || current === (personalizationOnly ? 3 : 1)}
              onClick={() => {
                setError('');
                setCurrent((value) => value - 1);
              }}
            >
              مرحلهٔ قبل
            </button>
            <button type="submit" className="wizard-primary" disabled={busy}>
              {busy
                ? 'در حال ذخیره…'
                : current === 5
                  ? 'ذخیره و ورود به میزکار'
                  : current === 3 && interests.length === 0
                    ? 'فعلاً رد می‌کنم'
                    : 'ادامه'}
            </button>
          </footer>
        </form>
      )}
    </div>
  );
}
