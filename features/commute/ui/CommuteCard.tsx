import { useCallback, useEffect, useRef, useState } from 'react';
import { ActionButton } from '@/components/ui/ActionButton';
import { Icon } from '@/components/ui/Icon';
import { Notice } from '@/components/ui/Notice';
import {
  readCommutePlaces,
  saveCommutePlaces,
  watchCommutePlaces,
} from '@/lib/browser/commute-storage';
import {
  checkCommuteService,
  commuteBackendConfigured,
  fetchCommuteRoute,
} from '../commute-client';
import { parsePlaces, ROUTE_FRESH_MS, routeEndpoints, trafficImpact } from '../commute-model';
import type { CommuteDirection, CommutePlaces, CommuteRoute } from '../commute-model';
import { NeshanMap, neshanMapKey } from './NeshanMap';

const numbers = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 });
function routeError(error: unknown) {
  const code = error instanceof Error ? error.message : '';
  if (code === 'commute_rate_limited') return 'کمی صبر کن و دوباره مسیر را به‌روز کن.';
  if (code === 'commute_no_route')
    return 'برای این دو آدرس مسیری پیدا نشد؛ شهر و آدرس دقیق‌تر را وارد کن.';
  if (code === 'commute_ambiguous_address')
    return 'آدرس به یک نقطهٔ مشخص نرسید؛ آدرس دقیق‌تر وارد کن یا مکان را روی نقشه انتخاب کن.';
  return 'دریافت زمان مسیر از نشان انجام نشد. دوباره تلاش کن.';
}

export function CommuteCard({ active }: { active: boolean }) {
  const [places, setPlaces] = useState<CommutePlaces | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [home, setHome] = useState('');
  const [work, setWork] = useState('');
  const [storageError, setStorageError] = useState('');
  const [saving, setSaving] = useState(false);
  const [direction, setDirection] = useState<CommuteDirection>('toWork');
  const [service, setService] = useState<'checking' | 'ready' | 'unconfigured' | 'error'>(
    commuteBackendConfigured ? 'checking' : 'unconfigured',
  );
  const [retry, setRetry] = useState(0);
  const [route, setRoute] = useState<{ key: string; value: CommuteRoute } | null>(null);
  const [request, setRequest] = useState<{ key: string; busy: boolean; error: string }>({
    key: '',
    busy: false,
    error: '',
  });
  const [now, setNow] = useState(Date.now);
  const lastAttempt = useRef(0);
  const [cooldown, setCooldown] = useState(0);
  const [notice, setNotice] = useState('');
  const [pick, setPick] = useState<'home' | 'work'>('home');
  const selectPoint = useCallback(
    (latitude: number, longitude: number) => {
      const value = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
      if (pick === 'home') {
        setHome(value);
        setPick('work');
      } else setWork(value);
    },
    [pick],
  );

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const saved = await readCommutePlaces();
        if (!alive) return;
        setPlaces(saved);
        setLoaded(true);
        setStorageError('');
      } catch {
        if (alive) {
          setStorageError('خواندن آدرس‌ها انجام نشد. صفحه را دوباره باز کن.');
          setLoaded(true);
        }
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
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => {
      setNow(Date.now());
      setCooldown(Math.max(0, Math.ceil((lastAttempt.current + 60_000 - Date.now()) / 1000)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  useEffect(() => {
    if (!active || !commuteBackendConfigured) return;
    const controller = new AbortController();
    void checkCommuteService(AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]))
      .then((ready) => {
        if (!controller.signal.aborted) setService(ready ? 'ready' : 'unconfigured');
      })
      .catch(() => {
        if (!controller.signal.aborted) setService('error');
      });
    return () => controller.abort();
  }, [active, retry]);
  const endpoints = places ? routeEndpoints(places, direction) : null;
  const requestKey = endpoints ? JSON.stringify(endpoints) : '';
  useEffect(() => {
    if (!active || !requestKey || service !== 'ready') return;
    const endpoints = JSON.parse(requestKey) as { origin: string; destination: string };
    const controller = new AbortController();
    // Request only on entry, direction/address change or explicit refresh. No background polling.
    void (async () => {
      setRequest({ key: requestKey, busy: true, error: '' });
      try {
        const value = await fetchCommuteRoute(
          endpoints.origin,
          endpoints.destination,
          AbortSignal.any([controller.signal, AbortSignal.timeout(35_000)]),
        );
        if (!controller.signal.aborted) {
          setRoute({ key: requestKey, value });
          setNow(Date.now());
        }
      } catch (error) {
        if (!controller.signal.aborted)
          setRequest({ key: requestKey, busy: false, error: routeError(error) });
        return;
      }
      if (!controller.signal.aborted) setRequest({ key: requestKey, busy: false, error: '' });
    })();
    return () => controller.abort();
  }, [active, requestKey, service, retry]);
  const current = route?.key === requestKey ? route.value : null;
  const busy = request.key === requestKey && request.busy;
  const error = request.key === requestKey ? request.error : '';
  const stale = current ? now - Date.parse(current.fetchedAt) > ROUTE_FRESH_MS : false;
  const impact = current ? trafficImpact(current) : null;
  const edit = () => {
    setHome(places?.home ?? '');
    setWork(places?.work ?? '');
    setEditing(true);
    setNotice('');
  };
  const refresh = () => {
    lastAttempt.current = Date.now();
    setCooldown(60);
    setRetry((value) => value + 1);
  };
  return (
    <section className="commute-card glass-card" aria-label="رفت‌وآمد خانه و محل کار">
      <header className="commute-header">
        <span className="commute-symbol">
          <Icon name="route" />
        </span>
        <div>
          <h2>مسیر هر روزت، یک نگاه</h2>
          <p>خانه، محل کار و زمان رسیدن</p>
        </div>
        {places && !editing && (
          <ActionButton
            icon="settings"
            label="ویرایش آدرس‌های رفت‌وآمد"
            variant="ghost"
            onClick={edit}
          />
        )}
      </header>
      <NeshanMap
        active={active}
        encodedPolyline={editing ? undefined : current?.encodedPolyline}
        pick={editing || !places ? pick : null}
        onPick={selectPoint}
      />
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
              {neshanMapKey && (
                <div className="commute-map-picker" role="group" aria-label="انتخاب مکان از نقشه">
                  <span>انتخاب روی نقشه</span>
                  <ActionButton
                    icon="home"
                    label="انتخاب خانه از نقشه"
                    variant="secondary"
                    aria-pressed={pick === 'home'}
                    onClick={() => setPick('home')}
                  />
                  <ActionButton
                    icon="work"
                    label="انتخاب محل کار از نقشه"
                    variant="secondary"
                    aria-pressed={pick === 'work'}
                    onClick={() => setPick('work')}
                  />
                </div>
              )}
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
                  آدرس‌ها روی همین مرورگر ذخیره می‌شوند. هنگام دریافت مسیر، مبدأ و مقصد برای نشان
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
                    <small>مبدأ · {direction === 'toWork' ? 'خانه' : 'محل کار'}</small>
                    <strong>{endpoints?.origin}</strong>
                  </span>
                </div>
                <span className="commute-connection" aria-hidden="true" />
                <ActionButton
                  icon="swap"
                  label={direction === 'toWork' ? 'مسیر محل کار به خانه' : 'مسیر خانه به محل کار'}
                  variant="secondary"
                  disabled={busy}
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
                    <small>مقصد · {direction === 'toWork' ? 'محل کار' : 'خانه'}</small>
                    <strong>{endpoints?.destination}</strong>
                  </span>
                </div>
              </div>
              <div className="commute-result" aria-live="polite" aria-busy={busy}>
                {current ? (
                  <>
                    <div className="commute-metrics">
                      <div className="commute-duration">
                        <small>{stale ? 'آخرین برآورد · قدیمی' : 'زمان مسیر با ترافیک'}</small>
                        <strong>
                          {numbers.format(Math.ceil(current.durationSeconds / 60))}
                          <span>دقیقه</span>
                        </strong>
                      </div>
                      <div>
                        <small>رسیدن، با حرکت در زمان دریافت</small>
                        <strong>
                          {new Intl.DateTimeFormat('fa-IR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          }).format(
                            new Date(
                              Date.parse(current.fetchedAt) + current.durationSeconds * 1000,
                            ),
                          )}
                        </strong>
                      </div>
                      <div>
                        <small>مسافت</small>
                        <strong>
                          {numbers.format(current.distanceMeters / 1000)}
                          <span>کیلومتر</span>
                        </strong>
                      </div>
                    </div>
                    {impact && (
                      <div
                        className={`commute-impact commute-impact--${stale ? 'stale' : impact.level}`}
                      >
                        <span />
                        <strong>{stale ? 'برای ترافیک فعلی، به‌روز کن' : impact.label}</strong>
                        <small>
                          {numbers.format(impact.delayMinutes)} دقیقه بیشتر از مسیر پیشنهادی بدون
                          ترافیک
                        </small>
                      </div>
                    )}
                    {current.description && (
                      <p className="commute-description">{current.description}</p>
                    )}
                    {current.warnings.map((warning, index) => (
                      <p className="commute-warning" key={index}>
                        {warning}
                      </p>
                    ))}
                  </>
                ) : (
                  <div className={`commute-empty ${busy ? 'commute-empty--loading' : ''}`}>
                    <Icon name={busy ? 'refresh' : 'clock'} />
                    <div>
                      <strong>{busy ? 'در حال بررسی مسیر و ترافیک…' : 'چه زمانی می‌رسی؟'}</strong>
                      <p>
                        {service === 'unconfigured'
                          ? 'نمایش زمان زنده پس از فعال‌سازی اتصال مسیریابی نشان در دسترس است.'
                          : service === 'error'
                            ? 'اتصال به نشان برقرار نشد؛ دوباره تلاش کن.'
                            : service === 'checking'
                              ? 'در حال بررسی اتصال…'
                              : 'زمان رسیدن پس از دریافت مسیر نمایش داده می‌شود.'}
                      </p>
                    </div>
                  </div>
                )}
                {error && <Notice>{error}</Notice>}
              </div>
              <div className="commute-actions">
                <span>نقشه و مسیریابی با نشان</span>
                {service !== 'unconfigured' && (
                  <ActionButton
                    icon="refresh"
                    variant="secondary"
                    label={
                      cooldown > 0
                        ? `به‌روزرسانی مسیر؛ ${numbers.format(cooldown)} ثانیه دیگر`
                        : 'به‌روزرسانی مسیر و ترافیک'
                    }
                    disabled={busy || cooldown > 0 || service === 'checking'}
                    onClick={refresh}
                  />
                )}
              </div>
              {current && (
                <footer className="commute-source">
                  <a href="https://neshan.org" target="_blank" rel="noopener noreferrer">
                    نشان
                  </a>
                  <time dateTime={current.fetchedAt}>
                    دریافت{' '}
                    {new Intl.DateTimeFormat('fa-IR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(current.fetchedAt))}
                  </time>
                </footer>
              )}
            </>
          )}
          {notice && (
            <p className="commute-notice" role="status">
              {notice}
            </p>
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
                    setRoute(null);
                    setNotice('آدرس‌ها حذف شدند.');
                  })
                  .catch(() => setNotice('حذف آدرس‌ها انجام نشد.'))
                  .finally(() => setSaving(false));
              }}
            />
          )}
        </>
      )}
    </section>
  );
}
