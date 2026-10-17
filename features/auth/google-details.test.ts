import { describe, expect, it, vi } from 'vitest';
vi.mock('wxt/browser', () => ({ browser: {} }));
import { parseGoogleDetails } from './google-details';
import { parseGoogleProfile } from './google-auth';
const now = new Date('2026-10-17T12:00:00Z');
describe('Google account details', () => {
  it('accepts a leap birthday and the option not to disclose gender', () => {
    expect(parseGoogleDetails({ birthDate: '2000-02-29', gender: 'undisclosed' }, now).gender).toBe(
      'undisclosed',
    );
  });
  it.each(['2023-02-29', '2027-01-01', '1890-01-01', 'invalid'])(
    'rejects invalid or out of range birthdays: %s',
    (birthDate) => {
      expect(() => parseGoogleDetails({ birthDate, gender: 'male' }, now)).toThrow();
    },
  );
  it('rejects unknown gender values', () => {
    expect(() =>
      parseGoogleDetails({ birthDate: '2000-01-01', gender: 'toString' }, now),
    ).toThrow();
  });
  it('only accepts HTTPS Google photo URLs', () => {
    const base = { sub: '123', email: 'a@example.com', email_verified: true };
    expect(
      parseGoogleProfile({ ...base, picture: 'https://lh3.googleusercontent.com/a/photo' }).picture,
    ).toBe('https://lh3.googleusercontent.com/a/photo');
    for (const picture of [
      'javascript:alert(1)',
      'https://example.com/photo',
      'https://googleusercontent.com.evil.com/a',
    ]) {
      expect(parseGoogleProfile({ ...base, picture }).picture).toBeUndefined();
    }
  });
});
