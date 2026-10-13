import { describe, expect, it } from 'vitest';
import {
  latinDigits,
  normalizePhone,
  parseChallenge,
  parseProfileResult,
  parseSession,
} from './auth-model';
describe('auth boundaries', () => {
  it.each(['۰۹۱۲۳۴۵۶۷۸۹', '٠٩١٢٣٤٥٦٧٨٩', '+98 912 345 6789', '0912-345-6789'])(
    'normalizes %s',
    (phone) => expect(normalizePhone(phone)).toBe('09123456789'),
  );
  it.each(['123', '02123456789', '+12025550123', '091234567890', '<script>'])(
    'rejects %s',
    (phone) => expect(() => normalizePhone(phone)).toThrow(),
  );
  it('converts Persian OTP digits', () => expect(latinDigits('۱۲٣۴۵۶')).toBe('123456'));
  it('rejects malformed tokens and dates', () => {
    expect(() => parseSession({ token: 'short', expiresAt: '2026-10-13' })).toThrow();
    expect(() => parseSession({ token: 'A'.repeat(64), expiresAt: 'bad' })).toThrow();
  });
  it('accepts a bounded development challenge', () => {
    const challenge = {
      challengeId: 'A'.repeat(64),
      expiresAt: '2026-10-13T12:00:00Z',
      retryAfterSeconds: 60,
      developmentCode: '123456',
    };
    expect(parseChallenge(challenge)).toEqual(challenge);
    expect(() => parseChallenge({ ...challenge, developmentCode: '<bad>' })).toThrow();
    expect(() => parseChallenge({ ...challenge, retryAfterSeconds: -1 })).toThrow();
  });
  it('distinguishes a new account from invalid profile data', () => {
    expect(parseProfileResult({ user: null })).toBeNull();
    expect(() => parseProfileResult({ user: {} })).toThrow();
    expect(() => parseProfileResult({})).toThrow();
  });
});
