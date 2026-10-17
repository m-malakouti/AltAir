import { useEffect, useId, useState } from 'react';
import { PersianDatePicker } from '@/components/ui/PersianDatePicker';
import type { GoogleProfile } from '../google-auth';
import {
  GENDERS,
  readGoogleDetails,
  saveGoogleDetails,
  type GoogleDetails,
} from '../google-details';

export function GoogleAccountProfile({ user }: { user: GoogleProfile }) {
  const id = useId();
  const [details, setDetails] = useState<GoogleDetails | null>(null);
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [photoFailed, setPhotoFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    void readGoogleDetails(user.sub)
      .then((saved) => {
        if (!alive) return;
        setDetails(saved);
        setBirthDate(saved?.birthDate ?? '');
        setGender(saved?.gender ?? '');
        setEditing(!saved);
        setLoadFailed(false);
        setError('');
      })
      .catch(() => {
        if (alive) {
          setLoadFailed(true);
          setError('خواندن مشخصات انجام نشد. دوباره تلاش کن.');
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [user.sub, retry]);
  return (
    <div className="google-account-profile">
      <div className="google-account-heading">
        {user.picture && !photoFailed ? (
          <img
            className="google-account-avatar"
            src={user.picture}
            alt={`تصویر پروفایل ${user.name}`}
            referrerPolicy="no-referrer"
            onError={() => setPhotoFailed(true)}
          />
        ) : (
          <span
            className="google-account-avatar google-account-avatar--fallback"
            aria-hidden="true"
          >
            {Array.from(user.name)[0]}
          </span>
        )}
        <p className="auth-welcome">{user.name}، خوش آمدی</p>
      </div>
      <dl>
        <dt>ایمیل گوگل</dt>
        <dd dir="ltr">{user.email}</dd>
      </dl>
      {loading ? (
        <p role="status">در حال خواندن مشخصات…</p>
      ) : loadFailed ? (
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setRetry((value) => value + 1);
          }}
        >
          تلاش دوباره
        </button>
      ) : editing ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSaving(true);
            setError('');
            setNotice('');
            const next = { birthDate, gender: gender as GoogleDetails['gender'] };
            void saveGoogleDetails(user.sub, next)
              .then(() => {
                setDetails(next);
                setEditing(false);
                setNotice('مشخصات ذخیره شد.');
              })
              .catch((reason: unknown) =>
                setError(reason instanceof Error ? reason.message : 'ذخیرهٔ مشخصات انجام نشد.'),
              )
              .finally(() => setSaving(false));
          }}
        >
          <h3>{details ? 'ویرایش مشخصات' : 'تکمیل مشخصات'}</h3>
          <p className="helper-text">
            این اطلاعات را خودت وارد می‌کنی و فقط روی همین مرورگر ذخیره می‌شوند.
          </p>
          <label htmlFor={`${id}-birth`}>تاریخ تولد (شمسی)</label>
          <PersianDatePicker
            id={`${id}-birth`}
            value={birthDate}
            disabled={saving}
            onChange={setBirthDate}
          />
          <label htmlFor={`${id}-gender`}>جنسیت</label>
          <select
            id={`${id}-gender`}
            value={gender}
            required
            disabled={saving}
            onChange={(event) => setGender(event.target.value)}
          >
            <option value="">انتخاب کن</option>
            {Object.entries(GENDERS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <div className="auth-actions">
            <button type="submit" disabled={saving}>
              {saving ? 'در حال ذخیره…' : 'ذخیرهٔ مشخصات'}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setEditing(false);
                setError('');
              }}
            >
              {details ? 'انصراف' : 'بعداً تکمیل می‌کنم'}
            </button>
          </div>
        </form>
      ) : (
        <>
          {details && (
            <dl>
              <dt>تاریخ تولد</dt>
              <dd>
                {new Date(`${details.birthDate}T12:00:00Z`).toLocaleDateString('fa-IR', {
                  timeZone: 'UTC',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </dd>
              <dt>جنسیت</dt>
              <dd>{GENDERS[details.gender]}</dd>
            </dl>
          )}
          <button
            type="button"
            onClick={() => {
              setBirthDate(details?.birthDate ?? '');
              setGender(details?.gender ?? '');
              setEditing(true);
              setNotice('');
            }}
          >
            {details ? 'ویرایش مشخصات' : 'تکمیل مشخصات'}
          </button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
    </div>
  );
}
