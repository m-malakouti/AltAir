import { describe, expect, it } from 'vitest';
import {
  holidayFor,
  HOLIDAYS,
  monthDays,
  persianDay,
  shiftMonth,
  yearDays,
} from './calendar-model';
describe('Persian calendar and official 1405 holidays', () => {
  it('switches days at Tehran midnight, regardless of system timezone', () => {
    expect(persianDay(new Date('2026-10-12T20:29:59Z'))).toEqual({ year: 1405, month: 7, day: 20 });
    expect(persianDay(new Date('2026-10-12T20:30:00Z'))).toEqual({ year: 1405, month: 7, day: 21 });
  });
  it('matches the official year boundaries and Saturday start', () => {
    const days = yearDays(1405);
    expect(days).toHaveLength(365);
    expect(days[0]).toMatchObject({ month: 1, day: 1, weekday: 0 });
    expect(days[0]?.date.toISOString().slice(0, 10)).toBe('2026-03-21');
    expect(days.at(-1)?.date.toISOString().slice(0, 10)).toBe('2027-03-20');
  });
  it('handles leap Esfand and navigation across Nowruz', () => {
    expect(monthDays(1403, 12)).toHaveLength(30);
    expect(monthDays(1404, 12)).toHaveLength(29);
    expect(shiftMonth(1405, 1, -1)).toEqual({ year: 1404, month: 12 });
    expect(shiftMonth(1405, 12, 1)).toEqual({ year: 1406, month: 1 });
  });
  it('includes all 26 official holiday dates, including overlapping holidays', () => {
    expect(Object.keys(HOLIDAYS)).toHaveLength(26);
    expect(yearDays(1405).filter((day) => day.holiday)).toHaveLength(26);
    expect(holidayFor({ year: 1405, month: 3, day: 14 })).toContain('غدیر');
    expect(holidayFor({ year: 1405, month: 4, day: 3 })).toBe('تاسوعا');
    expect(holidayFor({ year: 1405, month: 12, day: 19 })).toBe('عید فطر');
  });
  it('does not label normal observances or unverified years as official holidays', () => {
    expect(holidayFor({ year: 1405, month: 2, day: 9 })).toBeUndefined();
    expect(holidayFor({ year: 1405, month: 9, day: 30 })).toBeUndefined();
    expect(holidayFor({ year: 1406, month: 1, day: 1 })).toBeUndefined();
  });
});
