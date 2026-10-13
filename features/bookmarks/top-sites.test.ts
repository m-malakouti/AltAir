import { describe, expect, it } from 'vitest';
import { parseHiddenSites, selectTopSites } from './top-sites';
describe('top site selection', () => {
  const candidates = Array.from({ length: 10 }, (_, i) => ({
    url: 'https://site' + i + '.test/',
    title: 'Site ' + i,
  }));
  it('preserves browser ranking and caps at six', () =>
    expect(selectTopSites(candidates, [], [])).toEqual(candidates.slice(0, 6)));
  it('excludes bookmarked and hidden domains, backfilling the six slots', () => {
    const result = selectTopSites(
      candidates,
      [{ url: 'http://www.site0.test/path' }],
      ['site1.test'],
    );
    expect(result).toEqual(candidates.slice(2, 8));
  });
  it('deduplicates multiple pages and www variants', () =>
    expect(
      selectTopSites(
        [
          { url: 'https://www.example.com/a', title: 'first' },
          { url: 'http://example.com/b', title: 'second' },
        ],
        [],
        [],
      ),
    ).toHaveLength(1));
  it('rejects internal, credentialed, malformed and executable URLs', () =>
    expect(
      selectTopSites(
        [
          { url: 'chrome://settings' },
          { url: 'javascript:alert(1)' },
          { url: 'https://user:pass@example.com' },
          { url: 12 },
          null,
          { url: 'not a URL' },
        ],
        [],
        [],
      ),
    ).toEqual([]));
  it('uses hostname when title missing and handles fewer than six', () =>
    expect(selectTopSites([{ url: 'https://example.com' }], [], [])).toEqual([
      { url: 'https://example.com/', title: 'example.com' },
    ]));
  it('searches the selected six without exposing other history', () => {
    expect(selectTopSites(candidates, [], [], 'Site 2')).toEqual([candidates[2]]);
    expect(selectTopSites(candidates, [], [], 'Site 9')).toEqual([]);
  });
  it('does not overwrite corrupt hide preferences', () => {
    expect(parseHiddenSites(null)).toEqual([]);
    expect(() => parseHiddenSites({})).toThrow();
    expect(() => parseHiddenSites([1])).toThrow();
  });
});
