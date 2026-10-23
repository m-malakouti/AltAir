import { useEffect, useState } from 'react';
import type { GoogleProfile } from '../google-auth';
import {
  readGoogleDetails,
  saveGoogleDetails,
  GENDERS,
  type GoogleDetails,
} from '../google-details';
import { RegistrationWizard } from './RegistrationWizard';
import { savePersonalization } from '@/features/workspace/personalization-store';
export function GoogleAccountProfile({ user }: { user: GoogleProfile }) {
  const [details, setDetails] = useState<GoogleDetails | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let alive = true;
    void readGoogleDetails(user.sub)
      .then((saved) => {
        if (alive) {
          setDetails(saved);
          setEditing(!saved);
          setError('');
        }
      })
      .catch(() => {
        if (alive) setError('خواندن مشخصات انجام نشد؛ دوباره تلاش کن.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [user.sub, retry]);
  const names = user.name.trim().split(/\s+/);
  return (
    <div className="google-account-profile">
      <p className="auth-welcome">{user.name}، خوش آمدی</p>
      <p dir="ltr">{user.email}</p>
      {loading ? (
        <p role="status">در حال خواندن مشخصات…</p>
      ) : error ? (
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
      ) : editing ? (
        <RegistrationWizard
          accountKey={'google:' + user.sub}
          verifiedName={user.name}
          initialProfile={{
            firstName: names[0] ?? '',
            lastName: names.slice(1).join(' '),
            birthDate: details?.birthDate ?? '',
            gender: details?.gender ?? 'undisclosed',
          }}
          onComplete={async ({ profile, interests, cards }) => {
            const next = { birthDate: profile.birthDate, gender: profile.gender };
            await saveGoogleDetails(user.sub, next);
            await savePersonalization('google:' + user.sub, interests, cards);
            setDetails(next);
            setEditing(false);
            setNotice('مشخصات و کارت‌های میزکارت ذخیره شدند.');
          }}
        />
      ) : (
        <>
          {details && (
            <dl>
              <dt>تاریخ تولد</dt>
              <dd>
                {new Date(details.birthDate + 'T12:00:00Z').toLocaleDateString('fa-IR', {
                  timeZone: 'UTC',
                })}
              </dd>
              <dt>جنسیت</dt>
              <dd>{GENDERS[details.gender]}</dd>
            </dl>
          )}
          <button
            type="button"
            onClick={() => {
              setEditing(true);
              setNotice('');
            }}
          >
            ویرایش مشخصات، علایق و کارت‌ها
          </button>
        </>
      )}
      {notice && <p role="status">{notice}</p>}
    </div>
  );
}
