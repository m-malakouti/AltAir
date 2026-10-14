import { describe, expect, it } from 'vitest';
import { parseWeatherDay } from './weather-day';
const fixture = {
  date: '2026-10-15',
  minimum: 18,
  maximum: 29,
  code: 0,
  historical: false,
  timezone: 'Asia/Tehran',
  fetchedAt: new Date().toISOString(),
  hourly: [
    {
      time: '2026-10-15T08:30:00Z',
      temperature: 27,
      code: 0,
      isDay: true,
      precipitationProbability: null,
    },
  ],
};
describe('selected date weather', () => {
  it('accepts future hourly data for exactly the requested local date', () => {
    expect(parseWeatherDay(fixture, '2026-10-15').maximum).toBe(29);
  });
  it('rejects the wrong day and invalid temperature ranges', () => {
    expect(() => parseWeatherDay(fixture, '2026-10-16')).toThrow();
    expect(() => parseWeatherDay({ ...fixture, minimum: 30 }, '2026-10-15')).toThrow();
    expect(() =>
      parseWeatherDay(
        { ...fixture, hourly: [{ ...fixture.hourly[0], time: '2026-10-16T08:30:00Z' }] },
        '2026-10-15',
      ),
    ).toThrow();
  });
});
