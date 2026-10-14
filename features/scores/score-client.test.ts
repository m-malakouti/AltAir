import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchFeaturedScores, rankMatches, type FeaturedMatch } from './score-client';
afterEach(() => vi.unstubAllGlobals());
describe('featured score requests', () => {
  it('uses single-day requests instead of the rejected date range', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({ events: [] }) });
    vi.stubGlobal('fetch', fetcher);
    const result = await fetchFeaturedScores('2026-10-14', new AbortController().signal);
    expect(result).toEqual({ matches: [], partial: false });
    expect(fetcher).toHaveBeenCalledTimes(14);
    for (const [url] of fetcher.mock.calls as [string][])
      expect(new URL(url).searchParams.get('dates')).toMatch(/^\d{8}$/);
  });
  it('keeps successful leagues when another league fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve({
          ok: !url.includes('/eng.1/'),
          status: 503,
          json: () => Promise.resolve({ events: [] }),
        }),
      ),
    );
    expect((await fetchFeaturedScores('2026-10-14', new AbortController().signal)).partial).toBe(
      true,
    );
  });
  it('reports failure when every source fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Offline')));
    await expect(fetchFeaturedScores('2026-10-14', new AbortController().signal)).rejects.toThrow(
      'All leagues',
    );
  });
  it('puts live games ahead of big-team scheduled games', () => {
    const match: FeaturedMatch = {
      id: '1',
      date: '2026-10-14T18:00:00Z',
      state: 'pre',
      status: 'STATUS_SCHEDULED',
      clock: '',
      league: 'لیگ برتر انگلیس',
      home: { name: 'Liverpool', logo: null, score: null },
      away: { name: 'Arsenal', logo: null, score: null },
    };
    expect(
      rankMatches(
        {
          ...match,
          state: 'in',
          home: { ...match.home, name: 'Other' },
          away: { ...match.away, name: 'Other' },
        },
        match,
      ),
    ).toBeLessThan(0);
  });
});
