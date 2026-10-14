import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { fetchWeatherDay } from '../weather-client';
import { weatherDescription, type WeatherCity } from '../weather-model';
import type { WeatherDay } from '../weather-day';
export function WeatherDateCard({
  city,
  date,
  onChangeCity,
}: {
  city: WeatherCity;
  date: string;
  onChangeCity: () => void;
}) {
  const key = `${city.latitude},${city.longitude}:${date}`;
  const [result, setResult] = useState<{
    key: string;
    weather?: WeatherDay;
    error?: string;
  } | null>(null);
  const [retry, setRetry] = useState(0);
  const weather = result?.key === key ? result.weather : undefined;
  const error = result?.key === key ? result.error : undefined;
  useEffect(() => {
    const controller = new AbortController();
    void fetchWeatherDay(
      city,
      date,
      AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
    )
      .then((weather) => {
        if (!controller.signal.aborted) setResult({ key, weather });
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setResult({
            key,
            error:
              cause instanceof Error && cause.message === 'date_out_of_range'
                ? 'این تاریخ خارج از پوشش منبع است؛ پیش‌بینی تا ۱۵ روز آینده و سابقه از ۱۹۴۰ موجود است.'
                : 'آب‌وهوای این روز دریافت نشد؛ دوباره تلاش کن.',
          });
      });
    return () => controller.abort();
  }, [city, date, key, retry]);
  const label = new Date(`${date}T12:00:00Z`).toLocaleDateString('fa-IR', {
    timeZone: 'Asia/Tehran',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return (
    <div className="weather-day-card">
      <div className="weather-day-header">
        <strong>{city.name}</strong>
        <button
          className="icon-button"
          title="تغییر شهر"
          aria-label="تغییر شهر"
          onClick={onChangeCity}
        >
          <Icon name="edit" />
        </button>
        <button
          className="icon-button"
          title="تازه‌سازی روز انتخاب‌شده"
          aria-label="تازه‌سازی روز انتخاب‌شده"
          onClick={() => setRetry((value) => value + 1)}
        >
          <Icon name="refresh" />
        </button>
      </div>
      <p className="weather-day-label">
        {label} {weather && <small>· {weather.historical ? 'سابقهٔ هوا' : 'پیش‌بینی'}</small>}
      </p>
      {!weather && !error && (
        <p className="helper-text" role="status">
          دریافت آب‌وهوای این روز…
        </p>
      )}
      {error && (
        <p className="helper-text" role="status">
          {error}
        </p>
      )}
      {weather && (
        <>
          <div className="weather-day-range">
            <span className="weather-condition" title={weatherDescription(weather.code, true).text}>
              {weatherDescription(weather.code, true).symbol}
            </span>
            <span>
              کمینه <strong dir="ltr">{Math.round(weather.minimum)}°</strong>
            </span>
            <span>
              بیشینه <strong dir="ltr">{Math.round(weather.maximum)}°</strong>
            </span>
          </div>
          <div className="hourly-forecast">
            <div
              className="hourly-strip"
              tabIndex={0}
              role="region"
              aria-label={`آب‌وهوای ساعتی ${label}`}
            >
              {weather.hourly?.map((hour) => (
                <div className="hourly-item" key={hour.time}>
                  <time dateTime={hour.time}>
                    {new Date(hour.time).toLocaleTimeString('fa-IR', {
                      timeZone: weather.timezone,
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })}
                  </time>
                  <span
                    className="weather-condition"
                    aria-label={weatherDescription(hour.code, hour.isDay).text}
                  >
                    {weatherDescription(hour.code, hour.isDay).symbol}
                  </span>
                  <strong dir="ltr">{Math.round(hour.temperature)}°</strong>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
