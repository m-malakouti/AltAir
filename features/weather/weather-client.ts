import { parseMarketEndpoint } from '@/features/market/market-endpoint';
import { parseCity, parseWeather } from './weather-model';
import type { WeatherCity, WeatherNow } from './weather-model';
import { parseWeatherDay } from './weather-day';
const configured: unknown = import.meta.env.WXT_MARKET_API_URL;
const endpoint = parseMarketEndpoint(configured);
export const weatherConfigured = Boolean(endpoint);
async function request(
  path: string,
  parameters: Record<string, string>,
  signal: AbortSignal,
): Promise<unknown> {
  if (!endpoint) throw new Error('Weather service unavailable.');
  const url = new URL('/api/weather/' + path, endpoint);
  url.search = new URLSearchParams(parameters).toString();
  const response = await fetch(url, {
    signal,
    credentials: 'omit',
    redirect: 'error',
    cache: 'no-store',
  });
  if (response.status === 422) throw new Error('date_out_of_range');
  if (!response.ok) throw new Error('Weather service unavailable.');
  return (await response.json()) as unknown;
}
export async function searchCities(name: string, signal: AbortSignal): Promise<WeatherCity[]> {
  const result = await request('cities', { name }, signal);
  if (!Array.isArray(result) || result.length > 10) throw new Error('Invalid city results.');
  return result.map(parseCity);
}
export async function fetchWeather(city: WeatherCity, signal: AbortSignal): Promise<WeatherNow> {
  return parseWeather(
    await request(
      'current',
      { latitude: String(city.latitude), longitude: String(city.longitude) },
      signal,
    ),
  );
}
export async function fetchWeatherDay(city: WeatherCity, date: string, signal: AbortSignal) {
  return parseWeatherDay(
    await request(
      'day',
      { latitude: String(city.latitude), longitude: String(city.longitude), date },
      signal,
    ),
    date,
  );
}
