import { normalizeBookmarkUrl, searchText } from './bookmark-model';
export interface TopSite {
  title: string;
  url: string;
}
export function siteKey(url: string): string {
  return new URL(normalizeBookmarkUrl(url)).hostname.replace(/^www\./, '');
}
export function selectTopSites(
  raw: unknown,
  bookmarks: readonly { url: string }[],
  hidden: readonly string[],
  query = '',
): TopSite[] {
  if (!Array.isArray(raw)) return [];
  const excluded = new Set(hidden);
  for (const item of bookmarks) {
    try {
      excluded.add(siteKey(item.url));
    } catch {
      /* Invalid entries never become links. */
    }
  }
  const sites: TopSite[] = [];
  for (const item of raw as unknown[]) {
    if (!item || typeof item !== 'object' || !('url' in item) || typeof item.url !== 'string')
      continue;
    try {
      const url = normalizeBookmarkUrl(item.url);
      const key = siteKey(url);
      if (excluded.has(key)) continue;
      excluded.add(key);
      const title =
        ('title' in item && typeof item.title === 'string' ? item.title.trim() : '').slice(
          0,
          300,
        ) || new URL(url).hostname;
      sites.push({ url, title });
      if (sites.length === 6) break;
    } catch {
      /* Ignore browser-internal and malformed URLs. */
    }
  }
  return sites.filter((site) =>
    searchText(site.title + ' ' + site.url).includes(searchText(query)),
  );
}
export function parseHiddenSites(value: unknown): string[] {
  if (value == null) return [];
  if (
    !Array.isArray(value) ||
    value.length > 1000 ||
    value.some((v) => typeof v !== 'string' || v.length > 253)
  )
    throw new Error('Invalid hidden sites');
  return [...new Set(value as string[])];
}
