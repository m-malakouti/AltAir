import { describe, expect, it } from 'vitest';
import { parseThemePreference, resolveTheme } from './theme';

describe('theme preferences', () => {
  it.each(['light', 'dark', 'system'] as const)('accepts a versioned %s preference', (mode) => {
    expect(parseThemePreference({ version: 1, mode })).toEqual({ version: 1, mode });
  });
  it.each([
    undefined,
    null,
    'dark',
    {},
    { version: 2, mode: 'dark' },
    { version: 1, mode: 'invalid' },
  ])('falls back to system for invalid or unsupported data: %j', (value) => {
    expect(parseThemePreference(value)).toEqual({ version: 1, mode: 'system' });
  });
  it('follows the device only in system mode', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
});
