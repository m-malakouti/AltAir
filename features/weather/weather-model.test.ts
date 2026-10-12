import { describe, expect, it } from 'vitest';
import { parseCity, parseWeather, weatherDescription } from './weather-model';
const now = Date.parse('2026-10-12T10:00:00Z');
const city = {
  id: 112931,
  name: 'Tehran',
  country: 'Iran',
  region: 'Tehran',
  latitude: 35.69,
  longitude: 51.42,
};
const weather = {
  temperature: 22.5,
  code: 0,
  isDay: true,
  observedAt: '2026-10-12T09:45:00Z',
  fetchedAt: '2026-10-12T10:00:00Z',
};
describe('weather contracts', () => {
  it('preserves selected city coordinates and region', () => expect(parseCity(city)).toEqual(city));
  it.each([{ latitude: 91 }, { longitude: NaN }, { id: 0 }, { name: '' }])(
    'rejects invalid cities %j',
    (change) => expect(() => parseCity({ ...city, ...change })).toThrow(),
  );
  it('accepts a valid current report', () => expect(parseWeather(weather, now)).toEqual(weather));
  it.each([
    { temperature: null },
    { temperature: 80 },
    { code: 100 },
    { isDay: 1 },
    { observedAt: 'bad' },
    { fetchedAt: '2027-01-01T00:00:00Z' },
  ])('rejects invalid weather %j', (change) =>
    expect(() => parseWeather({ ...weather, ...change }, now)).toThrow(),
  );
  it('distinguishes night, rain, snow, and unknown codes', () => {
    expect(weatherDescription(0, false).symbol).toBe('☾');
    expect(weatherDescription(61, true).text).toBe('بارانی');
    expect(weatherDescription(75, true).text).toBe('برفی');
    expect(weatherDescription(10, true).text).toBe('وضعیت نامشخص');
  });
});
