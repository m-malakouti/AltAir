import { useEffect, useRef, useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Icon } from '@/components/ui/Icon';
import { Notice } from '@/components/ui/Notice';
import {
  readWeatherCity,
  saveWeatherCity,
  readWeatherCache,
  saveWeatherCache,
  watchWeatherCity,
} from '@/lib/browser/weather-storage';
import { parseCity, parseWeather, weatherDescription } from '../weather-model';
import type { WeatherCity, WeatherNow } from '../weather-model';
import { searchCities, fetchWeather, weatherConfigured } from '../weather-client';

export function WeatherCard() {
  const [city, setCity] = useState<WeatherCity | null>(null);
  const [ready, setReady] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WeatherCity[]>([]);
  const [chosen, setChosen] = useState('');
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectionError, setSelectionError] = useState('');
  const [weatherError, setWeatherError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ key: string; weather: WeatherNow } | null>(null);
  const [tick, setTick] = useState(0);
  const [now, setNow] = useState(Date.now);
  const searchAbort = useRef<AbortController | null>(null);
  const key = city ? `${city.latitude},${city.longitude}` : '';
  const weather = result?.key === key ? result.weather : null;
  const stale =
    weather && (now - Date.parse(weather.observedAt) > 3_600_000 || Boolean(weatherError));

  useEffect(() => {
    let alive = true;
    let revision = 0;
    async function load() {
      const current = ++revision;
      try {
        const raw = await readWeatherCity();
        const saved = raw == null ? null : parseCity(raw);
        if (alive && current === revision) {
          setCity(saved);
          setReady(true);
          setSelectionError('');
        }
      } catch {
        if (alive) setSelectionError('خواندن شهر ذخیره‌شده انجام نشد. پنل را دوباره باز کن.');
      }
    }
    const stop = watchWeatherCity(() => {
      void load();
    });
    void load();
    return () => {
      alive = false;
      stop();
      searchAbort.current?.abort();
    };
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setTick((value) => value + 1);
      setNow(Date.now());
    }, 900_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!city) return;
    const controller = new AbortController();
    const activeCity = city;
    async function load() {
      setLoading(true);
      setWeatherError('');
      try {
        const cached = await readWeatherCache();
        if (
          typeof cached === 'object' &&
          cached !== null &&
          'key' in cached &&
          cached.key === key &&
          'weather' in cached
        ) {
          const valid = parseWeather(cached.weather);
          if (!controller.signal.aborted) setResult({ key, weather: valid });
          if (
            Date.now() - Date.parse(valid.fetchedAt) < 900_000 &&
            valid.hourly !== undefined &&
            tick === 0 &&
            Date.now() - Date.parse(valid.observedAt) < 3_600_000
          )
            return;
        }
      } catch {
        /* An invalid cache is not a weather report. */
      }
      try {
        const next = await fetchWeather(
          activeCity,
          AbortSignal.any([controller.signal, AbortSignal.timeout(12_000)]),
        );
        if (controller.signal.aborted) return;
        setResult({ key, weather: next });
        try {
          await saveWeatherCache({ key, weather: next });
        } catch {
          if (!controller.signal.aborted)
            setWeatherError('هوا دریافت شد؛ ذخیرهٔ آفلاین انجام نشد.');
        }
      } catch {
        if (!controller.signal.aborted)
          setWeatherError('دریافت آب‌وهوا انجام نشد؛ در صورت وجود، آخرین داده نمایش داده می‌شود.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load().finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [city, key, tick]);
  async function search() {
    searchAbort.current?.abort();
    const controller = new AbortController();
    searchAbort.current = controller;
    setSearching(true);
    setSelectionError('');
    setResults([]);
    setChosen('');
    setSearched(false);
    try {
      const cities = await searchCities(
        query.trim(),
        AbortSignal.any([controller.signal, AbortSignal.timeout(12_000)]),
      );
      if (!controller.signal.aborted) {
        setResults(cities);
        setSearched(true);
      }
    } catch {
      if (!controller.signal.aborted) setSelectionError('جست‌وجوی شهر انجام نشد. دوباره تلاش کن.');
    } finally {
      if (!controller.signal.aborted) setSearching(false);
    }
  }
  async function choose() {
    const next = results.find((item) => String(item.id) === chosen);
    if (!next) return;
    setSaving(true);
    setSelectionError('');
    try {
      await saveWeatherCity(next);
      setCity(next);
      setChoosing(false);
      setResults([]);
      setQuery('');
      setSearched(false);
    } catch {
      setSelectionError('انتخاب شهر ذخیره نشد. دوباره تلاش کن.');
    } finally {
      setSaving(false);
    }
  }
  const condition = weather ? weatherDescription(weather.code, weather.isDay) : null;
  return (
    <GlassCard className="weather-card" aria-label="آب‌وهوا">
      {!weatherConfigured && <p className="helper-text">سرویس آب‌وهوا هنوز تنظیم نشده است.</p>}
      {city && (
        <details>
          <summary className="weather-row" title="جزئیات آب‌وهوا">
            <span className="weather-city">{city.name}</span>
            <span
              className="weather-condition"
              title={condition?.text}
              aria-label={condition?.text}
            >
              {condition?.symbol ?? '◌'}
            </span>
            <strong dir="ltr">
              {weather ? `${Math.round(weather.temperature)}°C` : loading ? '…' : '—'}
            </strong>
            <span
              className={stale ? 'currency-indicator--stale' : ''}
              title={stale ? 'دادهٔ قدیمی یا تأییدنشده' : 'جزئیات'}
            >
              {stale ? '!' : '⌄'}
            </span>
          </summary>
          <div className="weather-extra">
            {condition && (
              <p>
                {condition.text}
                {stale ? ' · دادهٔ قدیمی / تأییدنشده' : ''}
              </p>
            )}
            {weather && (
              <time dateTime={weather.observedAt}>
                {new Date(weather.observedAt).toLocaleString('fa-IR')}
              </time>
            )}
            {weatherError && <p role="status">{weatherError}</p>}
            <div className="weather-tools">
              <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
                Open-Meteo
              </a>
              <button
                className="icon-button"
                aria-label="تغییر شهر"
                title="تغییر شهر"
                onClick={() => setChoosing(true)}
              >
                <Icon name="edit" />
              </button>
              <button
                className="icon-button"
                disabled={loading}
                aria-label="تازه‌سازی آب‌وهوا"
                title="تازه‌سازی"
                onClick={() => setTick((value) => value + 1)}
              >
                <Icon name="refresh" />
              </button>
            </div>
          </div>
        </details>
      )}
      {weather && (
        <div className="hourly-forecast">
          <h3>پیش‌بینی ۲۴ ساعت آینده</h3>
          <p className="helper-text">
            ساعت محلی شهر انتخاب‌شده{stale ? ' · دادهٔ قدیمی / تأییدنشده' : ''}
          </p>
          {weather.hourly?.some((hour) => Date.parse(hour.time) > now) ? (
            <div
              className="hourly-strip"
              tabIndex={0}
              role="region"
              aria-label="پیش‌بینی ساعتی؛ برای ساعت‌های بعد پیمایش کن"
            >
              {weather.hourly
                .filter((hour) => Date.parse(hour.time) > now)
                .map((hour) => {
                  const description = weatherDescription(hour.code, hour.isDay);
                  return (
                    <div className="hourly-item" key={hour.time}>
                      <time dateTime={hour.time}>
                        {new Date(hour.time).toLocaleString('fa-IR', {
                          timeZone: weather.timezone ?? 'UTC',
                          weekday: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        })}
                      </time>
                      <span className="weather-condition" aria-label={description.text}>
                        {description.symbol}
                      </span>
                      <strong dir="ltr">{Math.round(hour.temperature)}°C</strong>
                      <span>{description.text}</span>
                      <small>
                        بارش{' '}
                        {hour.precipitationProbability === null
                          ? '—'
                          : `${hour.precipitationProbability}٪`}
                      </small>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="helper-text">پیش‌بینی ساعتی در دسترس نیست؛ آب‌وهوا را تازه‌سازی کن.</p>
          )}
        </div>
      )}
      {ready && (!city || choosing) && (
        <div className="weather-picker">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void search();
            }}
          >
            <label className="sr-only" htmlFor="weather-city-query">
              نام شهر
            </label>
            <input
              id="weather-city-query"
              required
              minLength={2}
              maxLength={80}
              placeholder="نام شهر…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              disabled={saving}
            />
            <button
              className="icon-button"
              type="submit"
              disabled={searching || saving || !weatherConfigured}
              aria-label="جست‌وجوی شهر"
              title="جست‌وجوی شهر"
            >
              <Icon name="search" />
            </button>
            {city && (
              <button
                className="icon-button"
                type="button"
                disabled={saving}
                aria-label="انصراف"
                title="انصراف"
                onClick={() => {
                  searchAbort.current?.abort();
                  setSearching(false);
                  setChoosing(false);
                }}
              >
                <Icon name="close" />
              </button>
            )}
          </form>
          {searching && <p role="status">در حال جست‌وجو…</p>}
          {searched && results.length === 0 && (
            <p role="status">شهری پیدا نشد؛ نام انگلیسی را هم امتحان کن.</p>
          )}
          {results.length > 0 && (
            <div className="weather-results">
              <label className="sr-only" htmlFor="weather-city-results">
                انتخاب شهر
              </label>
              <select
                id="weather-city-results"
                value={chosen}
                disabled={saving}
                onChange={(event) => setChosen(event.target.value)}
              >
                <option value="">انتخاب شهر</option>
                {results.map((item) => (
                  <option key={item.id} value={item.id}>
                    {[item.name, item.region, item.country].filter(Boolean).join('، ')}
                  </option>
                ))}
              </select>
              <button
                className="icon-button"
                disabled={!chosen || saving}
                aria-label="ذخیرهٔ شهر"
                title="ذخیرهٔ شهر"
                onClick={() => {
                  void choose();
                }}
              >
                <Icon name="check" />
              </button>
            </div>
          )}
        </div>
      )}
      {selectionError && <Notice>{selectionError}</Notice>}
      {!city && !ready && !selectionError && <span className="helper-text">در حال خواندن…</span>}
    </GlassCard>
  );
}
