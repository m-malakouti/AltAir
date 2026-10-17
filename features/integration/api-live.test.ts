import { describe, expect, it } from 'vitest';
import { fetchDollarQuote } from '@/features/market/market-client';
import { parseCity, parseWeather } from '@/features/weather/weather-model';
import { parseWeatherDay } from '@/features/weather/weather-day';
import { fetchFeaturedScores } from '@/features/scores/score-client';
import { tehranDate } from '@/features/scores/score-model';
import { parseChallenge, parseSession, parseProfileResult } from '@/features/auth/auth-model';

// Explicit opt-in: these checks call real providers and can consume provider quota.
const configured = process.env.ALTAIR_LIVE_API_URL;
const root = new URL(configured || 'http://127.0.0.1:5279');
if (configured && !['127.0.0.1', 'localhost', '[::1]'].includes(root.hostname))
  throw new Error('Live audit only supports the local development backend.');
async function request(path: string, body?: unknown, token?: string) {
  return fetch(new URL(path, root), {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(40_000),
    redirect: 'error',
    credentials: 'omit',
    cache: 'no-store',
  });
}
async function json(path: string) {
  const response = await request(path);
  if (!response.ok) throw new Error(`${path.split('?')[0]} HTTP ${response.status}`);
  return (await response.json()) as unknown;
}
describe.skipIf(!configured)('live API audit (explicit opt-in)', () => {
  it('backend health is ready', async () => {
    expect(await json('/health')).toEqual({ status: 'ok' });
  });
  it('market response passes the actual frontend parser, including crypto', async () => {
    const quote = await fetchDollarQuote(new URL('/api/market/usd', root));
    expect(quote.rates?.length).toBeGreaterThan(0);
    expect(quote.cryptoRates?.length).toBeGreaterThan(0);
    expect(quote.fetchFailed).toBe(false);
  }, 45000);
  it('city search passes the actual frontend parser', async () => {
    const result = await json('/api/weather/cities?name=Tehran');
    if (!Array.isArray(result)) throw new Error('Invalid city results');
    expect(result.map(parseCity).length).toBeGreaterThan(0);
  }, 45000);
  it('current and hourly weather pass the actual frontend parser', async () => {
    const weather = parseWeather(
      await json('/api/weather/current?latitude=35.6892&longitude=51.389'),
    );
    expect(weather.hourly?.length).toBeGreaterThan(0);
  }, 45000);
  it('daily weather passes the actual frontend parser', async () => {
    const date = tehranDate(new Date());
    expect(
      parseWeatherDay(
        await json(`/api/weather/day?latitude=35.6892&longitude=51.389&date=${date}`),
        date,
      ).date,
    ).toBe(date);
  }, 45000);
  it('historical weather passes the actual frontend parser', async () => {
    const date = tehranDate(new Date(Date.now() - 10 * 86400000));
    expect(
      parseWeatherDay(
        await json(`/api/weather/day?latitude=35.6892&longitude=51.389&date=${date}`),
        date,
      ).historical,
    ).toBe(true);
  }, 45000);
  it('weather endpoints reject invalid input', async () => {
    expect((await request('/api/weather/current?latitude=999&longitude=51')).status).toBe(400);
    expect(
      (await request('/api/weather/day?latitude=35&longitude=51&date=not-a-date')).status,
    ).toBe(400);
  });
  it('local development OTP verifies and logout invalidates the session (no SMS)', async () => {
    expect((await request('/api/auth/me')).status).toBe(401);
    const response = await request('/api/auth/request', { phone: '09000000000' });
    expect(response.status).toBe(200);
    const challenge = parseChallenge(await response.json());
    if (!challenge.developmentCode)
      throw new Error('Development-only audit requires a local test code');
    const verified = await request('/api/auth/verify', {
      challengeId: challenge.challengeId,
      code: challenge.developmentCode,
    });
    expect(verified.status).toBe(200);
    const session = parseSession(await verified.json());
    try {
      const me = await request('/api/auth/me', undefined, session.token);
      expect(me.status).toBe(200);
      expect(parseProfileResult(await me.json())).toBeNull();
    } finally {
      expect((await request('/api/auth/logout', {}, session.token)).status).toBe(200);
    }
    expect((await request('/api/auth/me', undefined, session.token)).status).toBe(401);
  });
  it('ESPN results pass the actual client across all configured leagues', async () => {
    const result = await fetchFeaturedScores(tehranDate(new Date()), AbortSignal.timeout(110_000));
    expect(result.partial).toBe(false);
    expect(Array.isArray(result.matches)).toBe(true);
  }, 115000);
  it('Google UserInfo is reachable and rejects an unauthenticated request', async () => {
    const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      signal: AbortSignal.timeout(15000),
      redirect: 'error',
    });
    expect(response.status).toBe(401);
  }, 20000);
  it.each(['https://www.gstatic.com/generate_204', 'https://cp.cloudflare.com/generate_204'])(
    'connectivity endpoint works: %s',
    async (url) => {
      const response = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: 'error' });
      expect(response.status).toBe(204);
    },
    20000,
  );
});
