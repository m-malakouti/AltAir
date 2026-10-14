import { parseWeather, type WeatherNow } from './weather-model';
export interface WeatherDay extends WeatherNow {
  date: string;
  minimum: number;
  maximum: number;
  historical: boolean;
}
export function parseWeatherDay(value: unknown, date: string): WeatherDay {
  if (!value || typeof value !== 'object') throw new Error('Invalid day weather');
  const raw = value as Record<string, unknown>;
  if (
    raw.date !== date ||
    typeof raw.minimum !== 'number' ||
    typeof raw.maximum !== 'number' ||
    !Number.isFinite(raw.minimum) ||
    !Number.isFinite(raw.maximum) ||
    raw.minimum < -100 ||
    raw.maximum > 70 ||
    raw.minimum > raw.maximum ||
    typeof raw.historical !== 'boolean' ||
    typeof raw.timezone !== 'string'
  )
    throw new Error('Invalid day weather');
  const weather = parseWeather({
    ...raw,
    temperature: raw.maximum,
    isDay: true,
    observedAt: raw.fetchedAt,
  });
  if (
    !weather.hourly?.length ||
    weather.hourly.some(
      (hour) =>
        new Intl.DateTimeFormat('en-CA', {
          timeZone: raw.timezone as string,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date(hour.time)) !== date,
    )
  )
    throw new Error('Wrong weather date');
  return {
    ...weather,
    date,
    minimum: raw.minimum,
    maximum: raw.maximum,
    historical: raw.historical,
  };
}
