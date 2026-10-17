import { useEffect, useState } from 'react';
import { ActionButton } from '@/components/ui/ActionButton';
import { Icon } from '@/components/ui/Icon';
import { Notice } from '@/components/ui/Notice';
import {
  readCommutePlaces,
  saveCommutePlaces,
  watchCommutePlaces,
} from '@/lib/browser/commute-storage';
import {
  parsePlaces,
  routeEndpoints,
  type CommuteDirection,
  type CommutePlaces,
} from '../commute-model';
import { GoogleMap } from './GoogleMap';

export function CommuteCard({ active }: { active: boolean }) {
  const [places, setPlaces] = useState<CommutePlaces | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [home, setHome] = useState('');
  const [work, setWork] = useState('');
  const [storageError, setStorageError] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [direction, setDirection] = useState<CommuteDirection>('toWork');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const saved = await readCommutePlaces();
        if (alive) {
          setPlaces(saved);
          setStorageError('');
        }
      } catch {
        if (alive) setStorageError('خواندن آدرس‌ها انجام نشد. صفحه را دوباره باز کن.');
      } finally {
        if (alive) setLoaded(true);
      }
    };
    void load();
    const unsubscribe = watchCommutePlaces(() => {
      void load();
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);
  const endpoints = places ? routeEndpoints(places, direction) : null;
  return (
    <section className="commute-card" aria-label="رفت‌وآمد روزانه">
      <header className="commute-header">
        <span className="commute-symbol">
          <Icon name="route" />
        </span>
        <div>
          <h2>مسیر هر روزت، یک نگاه</h2>
          <p>خانه، محل کار و مسیر در Google Maps</p>
        </div>
        {places && !editing && (
          <ActionButton
            icon="settings"
            label="ویرایش آدرس‌های رفت‌وآمد"
            variant="ghost"
            onClick={() => {
              setHome(places.home);
              setWork(places.work);
              setEditing(true);
              setNotice('');
            }}
          />
        )}
      </header>
      {loaded && <GoogleMap active={active} endpoints={endpoints} revision={revision} />}
      {!loaded ? (
        <p role="status">در حال خواندن آدرس‌ها…</p>
      ) : (
        <>
          {storageError && <Notice>{storageError}</Notice>}
          {!places || editing ? (
            <form
              className="commute-form"
              onSubmit={(event) => {
                event.preventDefault();
                const value = parsePlaces({ home, work });
                if (!value) {
                  setNotice('دو آدرس متفاوت با حداقل ۳ نویسه وارد کن.');
                  return;
                }
                setSaving(true);
                setNotice('');
                void saveCommutePlaces(value)
                  .then(() => {
                    setPlaces(value);
                    setEditing(false);
                    setNotice('آدرس‌ها ذخیره شدند.');
                  })
                  .catch(() => setNotice('ذخیره انجام نشد. دوباره تلاش کن.'))
                  .finally(() => setSaving(false));
              }}
            >
              <div className="commute-fields">
                <label>
                  <span>
                    <Icon name="home" />
                    خانه
                  </span>
                  <input
                    aria-label="آدرس خانه"
                    value={home}
                    onChange={(event) => setHome(event.target.value)}
                    placeholder="شهر، محله، خیابان یا مختصات"
                    minLength={3}
                    maxLength={240}
                    required
                    disabled={saving}
                    autoComplete="off"
                  />
                </label>
                <span className="commute-field-connector" aria-hidden="true" />
                <label>
                  <span>
                    <Icon name="work" />
                    محل کار
                  </span>
                  <input
                    aria-label="آدرس محل کار"
                    value={work}
                    onChange={(event) => setWork(event.target.value)}
                    placeholder="شهر، نام ساختمان یا مختصات"
                    minLength={3}
                    maxLength={240}
                    required
                    disabled={saving}
                    autoComplete="off"
                  />
                </label>
              </div>
              <div className="commute-form-footer">
                <p>
                  آدرس‌ها روی همین مرورگر ذخیره می‌شوند. برای نمایش مسیر، مبدأ و مقصد به Google Maps
                  ارسال می‌شوند.
                </p>
                {editing && (
                  <ActionButton
                    icon="close"
                    label="انصراف از ویرایش آدرس‌ها"
                    variant="ghost"
                    disabled={saving}
                    onClick={() => setEditing(false)}
                  />
                )}
                <ActionButton
                  icon="check"
                  label="ذخیرهٔ آدرس‌ها"
                  type="submit"
                  disabled={saving || Boolean(storageError)}
                />
              </div>
            </form>
          ) : (
            <>
              <div className="commute-route-points">
                <div>
                  <span className="commute-point-icon">
                    <Icon name={direction === 'toWork' ? 'home' : 'work'} />
                  </span>
                  <span>
                    <small>مبدأ</small>
                    <strong>{endpoints?.origin}</strong>
                  </span>
                </div>
                <ActionButton
                  icon="swap"
                  label={direction === 'toWork' ? 'مسیر محل کار به خانه' : 'مسیر خانه به محل کار'}
                  variant="secondary"
                  onClick={() => {
                    setDirection(direction === 'toWork' ? 'toHome' : 'toWork');
                    setNotice('');
                  }}
                />
                <div>
                  <span className="commute-point-icon commute-point-icon--destination">
                    <Icon name={direction === 'toWork' ? 'work' : 'home'} />
                  </span>
                  <span>
                    <small>مقصد</small>
                    <strong>{endpoints?.destination}</strong>
                  </span>
                </div>
              </div>
              <div className="commute-actions">
                <span>مسیر و زمان سفر در نقشهٔ گوگل نمایش داده می‌شود.</span>
                <ActionButton
                  icon="refresh"
                  label="بارگذاری دوبارهٔ نقشه"
                  variant="secondary"
                  onClick={() => setRevision((value) => value + 1)}
                />
              </div>
            </>
          )}
          {places && editing && (
            <ActionButton
              icon="trash"
              label="حذف آدرس‌های ذخیره‌شده"
              variant="ghost"
              disabled={saving}
              onClick={() => {
                setSaving(true);
                void saveCommutePlaces(null)
                  .then(() => {
                    setPlaces(null);
                    setHome('');
                    setWork('');
                    setEditing(false);
                    setNotice('آدرس‌ها حذف شدند.');
                  })
                  .catch(() => setNotice('حذف آدرس‌ها انجام نشد.'))
                  .finally(() => setSaving(false));
              }}
            />
          )}
          {notice && (
            <p className="commute-notice" role="status">
              {notice}
            </p>
          )}
        </>
      )}
    </section>
  );
}
