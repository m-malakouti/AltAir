export interface CastboxItem {
  id: string;
  channel: string;
  episode: string | null;
  title: string;
}
export interface CastboxLibrary {
  version: 1;
  items: CastboxItem[];
  selected: string | null;
  showEpisodes: boolean;
  restorePlayer: boolean;
}
export function emptyLibrary(): CastboxLibrary {
  return { version: 1, items: [], selected: null, showEpisodes: true, restorePlayer: false };
}
const validId = (value: unknown): value is string =>
  typeof value === 'string' && /^[1-9]\d{0,14}$/.test(value);
export function parseCastboxLink(input: string): Omit<CastboxItem, 'title'> {
  let source = input.trim();
  if (source.length > 12000) throw new Error('لینک یا کد اشتراک‌گذاری بیش از حد طولانی است.');
  if (source.startsWith('<')) {
    const match = /^<iframe\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i.exec(source);
    if (!match?.[1]) throw new Error('لینک کانال، اپیزود یا کد Embed رسمی Castbox را وارد کن.');
    source = match[1].replaceAll('&amp;', '&');
  }
  let url: URL;
  try {
    url = new URL(source);
  } catch {
    throw new Error('آدرس کامل با https://castbox.fm را وارد کن.');
  }
  if (
    url.protocol !== 'https:' ||
    !['castbox.fm', 'www.castbox.fm'].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.port
  ) {
    throw new Error('فقط لینک امن و مستقیم castbox.fm پذیرفته می‌شود.');
  }
  const path = url.pathname.replace(/\/$/, '');
  let channel: string | undefined;
  let episode: string | null = null;
  if (path.startsWith('/app/castbox/player/')) {
    const match = /^\/app\/castbox\/player\/id(\d+)(?:\/id(\d+))?$/.exec(path);
    channel = match?.[1];
    episode = match?.[2] ?? null;
  } else if (path.startsWith('/channel/')) {
    channel = /(?:-id|\/id|\/)(\d+)$/.exec(path)?.[1];
  } else if (path.startsWith('/episode/')) {
    const match = /-id(\d+)-id(\d+)$/.exec(path);
    channel = match?.[1];
    episode = match?.[2] ?? null;
  }
  if (!validId(channel) || (episode !== null && !validId(episode))) {
    throw new Error(
      'لینک کوتاه یا صفحهٔ عمومی کافی نیست؛ لینک کانال یا کد Embed را از Share در سایت Castbox کپی کن.',
    );
  }
  return { id: `${channel}:${episode ?? 'channel'}`, channel, episode };
}
export function castboxPage(item: CastboxItem): string {
  return item.episode
    ? `https://castbox.fm/episode/episode-id${item.channel}-id${item.episode}`
    : `https://castbox.fm/channel/id${item.channel}`;
}
export function castboxPlayer(item: CastboxItem, showEpisodes: boolean): string {
  return `https://castbox.fm/app/castbox/player/id${item.channel}${item.episode ? `/id${item.episode}` : ''}?autoplay=0&hide_list=${showEpisodes ? 0 : 1}`;
}
export function parseLibrary(value: unknown): CastboxLibrary {
  if (value == null) return emptyLibrary();
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error('کتابخانه نامعتبر است.');
  const raw = value as Record<string, unknown>;
  if (
    raw.version !== 1 ||
    !Array.isArray(raw.items) ||
    raw.items.length > 50 ||
    typeof raw.showEpisodes !== 'boolean' ||
    typeof raw.restorePlayer !== 'boolean'
  )
    throw new Error('نسخه یا تنظیمات کتابخانه معتبر نیست.');
  const ids = new Set<string>();
  const items = raw.items.map((value: unknown): CastboxItem => {
    if (!value || typeof value !== 'object') throw new Error('پادکست نامعتبر است.');
    const item = value as Record<string, unknown>;
    if (
      !validId(item.channel) ||
      (item.episode !== null && !validId(item.episode)) ||
      typeof item.title !== 'string' ||
      !item.title.trim() ||
      item.title.length > 120
    )
      throw new Error('اطلاعات پادکست معتبر نیست.');
    const id = `${item.channel}:${item.episode ?? 'channel'}`;
    if (item.id !== id || ids.has(id)) throw new Error('شناسهٔ تکراری یا نامعتبر.');
    ids.add(id);
    return { id, channel: item.channel, episode: item.episode, title: item.title.trim() };
  });
  if (raw.selected !== null && (typeof raw.selected !== 'string' || !ids.has(raw.selected)))
    throw new Error('انتخاب ذخیره‌شده معتبر نیست.');
  return {
    version: 1,
    items,
    selected: raw.selected,
    showEpisodes: raw.showEpisodes,
    restorePlayer: raw.restorePlayer,
  };
}
