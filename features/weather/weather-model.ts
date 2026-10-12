export interface WeatherCity {
  id: number;
  name: string;
  country: string;
  region: string;
  latitude: number;
  longitude: number;
}
export interface WeatherNow {
  temperature: number;
  code: number;
  isDay: boolean;
  observedAt: string;
  fetchedAt: string;
}
function object(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) throw new Error('Invalid weather data.');
  return value as Record<string, unknown>;
}
export function parseCity(value: unknown): WeatherCity {
  const city = object(value);
  if (
    typeof city.id !== 'number' ||
    !Number.isSafeInteger(city.id) ||
    city.id <= 0 ||
    typeof city.name !== 'string' ||
    !city.name.trim() ||
    city.name.length > 200 ||
    typeof city.country !== 'string' ||
    typeof city.region !== 'string' ||
    typeof city.latitude !== 'number' ||
    !Number.isFinite(city.latitude) ||
    Math.abs(city.latitude) > 90 ||
    typeof city.longitude !== 'number' ||
    !Number.isFinite(city.longitude) ||
    Math.abs(city.longitude) > 180
  )
    throw new Error('Invalid city.');
  return {
    id: city.id,
    name: city.name,
    country: city.country,
    region: city.region,
    latitude: city.latitude,
    longitude: city.longitude,
  };
}
export function parseWeather(value: unknown, now = Date.now()): WeatherNow {
  const data = object(value);
  if (
    typeof data.temperature !== 'number' ||
    !Number.isFinite(data.temperature) ||
    data.temperature < -100 ||
    data.temperature > 70 ||
    typeof data.code !== 'number' ||
    !Number.isInteger(data.code) ||
    data.code < 0 ||
    data.code > 99 ||
    typeof data.isDay !== 'boolean' ||
    typeof data.observedAt !== 'string' ||
    !Number.isFinite(Date.parse(data.observedAt)) ||
    Date.parse(data.observedAt) > now + 600_000 ||
    typeof data.fetchedAt !== 'string' ||
    !Number.isFinite(Date.parse(data.fetchedAt)) ||
    Date.parse(data.fetchedAt) > now + 600_000
  )
    throw new Error('Invalid weather.');
  return {
    temperature: data.temperature,
    code: data.code,
    isDay: data.isDay,
    observedAt: data.observedAt,
    fetchedAt: data.fetchedAt,
  };
}
export function weatherDescription(code: number, isDay: boolean): { symbol: string; text: string } {
  if (code === 0) return { symbol: isDay ? '☀' : '☾', text: 'صاف' };
  if (code <= 3) return { symbol: '☁', text: 'ابری' };
  if (code === 45 || code === 48) return { symbol: '≋', text: 'مه‌آلود' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { symbol: '❄', text: 'برفی' };
  if ([95, 96, 99].includes(code)) return { symbol: 'ϟ', text: 'رعدوبرق' };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code))
    return { symbol: '☂', text: 'بارانی' };
  return { symbol: '◌', text: 'وضعیت نامشخص' };
}
