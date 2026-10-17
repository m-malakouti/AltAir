import { describe, expect, it } from 'vitest';
import { pickerIsoDate, persianPickerValue } from '@/components/ui/PersianDatePicker';
describe('Persian birthday conversion', () => {
  it('converts Nowruz and restores the original ISO date without mutating the picker', () => {
    const value = persianPickerValue('2024-03-20')!;
    expect(value.year).toBe(1403);
    expect(value.month.number).toBe(1);
    expect(value.day).toBe(1);
    expect(pickerIsoDate(value)).toBe('2024-03-20');
    expect(value.year).toBe(1403);
  });
  it('keeps a leap-day birthday when editing', () => {
    expect(pickerIsoDate(persianPickerValue('2000-02-29'))).toBe('2000-02-29');
  });
  it('supports an empty selection', () => {
    expect(persianPickerValue('')).toBeNull();
    expect(pickerIsoDate(null)).toBe('');
  });
});
