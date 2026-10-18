export type Placement = 'sidebar' | 'footer';
export interface AdCampaign {
  id: string;
  brandId: string;
  brand: string;
  title: string;
  destinationUrl: string;
  placement: Placement;
  mode: 'single' | 'slider';
  slides: { mediaId: string; altText: string }[];
  intervalSeconds: number;
  endsAt: string | null;
  startsAt: string | null;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parseAds(value: unknown): AdCampaign[] {
  if (
    !value ||
    typeof value !== 'object' ||
    !('campaigns' in value) ||
    !Array.isArray(value.campaigns) ||
    value.campaigns.length > 50
  )
    throw new Error('Invalid ads');
  return value.campaigns.map((raw: unknown) => {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid campaign');
    const c = raw as Record<string, unknown>;
    for (const [key, max] of [
      ['id', 36],
      ['brandId', 60],
      ['brand', 80],
      ['title', 120],
      ['destinationUrl', 2048],
    ] as const) {
      if (typeof c[key] !== 'string' || !c[key] || c[key].length > max)
        throw new Error('Invalid ad field');
    }
    const url = new URL(c.destinationUrl as string);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      !uuid.test(c.id as string) ||
      !/^[a-z0-9_-]{2,60}$/.test(c.brandId as string)
    )
      throw new Error('Invalid ad URL or ID');
    if (
      !['sidebar', 'footer'].includes(String(c.placement)) ||
      !['single', 'slider'].includes(String(c.mode)) ||
      !Number.isInteger(c.intervalSeconds) ||
      Number(c.intervalSeconds) < 5 ||
      Number(c.intervalSeconds) > 60
    )
      throw new Error('Invalid placement');
    if (
      !Array.isArray(c.slides) ||
      !c.slides.length ||
      c.slides.length > 8 ||
      (c.mode === 'single' && c.slides.length !== 1)
    )
      throw new Error('Invalid slides');
    const slides = c.slides.map((slide: unknown) => {
      if (
        !slide ||
        typeof slide !== 'object' ||
        !('mediaId' in slide) ||
        typeof slide.mediaId !== 'string' ||
        !uuid.test(slide.mediaId) ||
        !('altText' in slide) ||
        typeof slide.altText !== 'string' ||
        slide.altText.length > 200
      )
        throw new Error('Invalid slide');
      return { mediaId: slide.mediaId, altText: slide.altText };
    });
    for (const key of ['startsAt', 'endsAt'])
      if (c[key] !== null && (typeof c[key] !== 'string' || !Number.isFinite(Date.parse(c[key]))))
        throw new Error('Invalid schedule');
    return {
      id: c.id as string,
      brandId: c.brandId as string,
      brand: c.brand as string,
      title: c.title as string,
      destinationUrl: url.href,
      placement: c.placement as Placement,
      mode: c.mode as 'single' | 'slider',
      slides,
      intervalSeconds: c.intervalSeconds as number,
      startsAt: c.startsAt as string | null,
      endsAt: c.endsAt as string | null,
    };
  });
}
export function eligibleAds(
  campaigns: AdCampaign[],
  placement: Placement,
  dismissed: string[],
  now = Date.now(),
) {
  return campaigns.filter(
    (c) =>
      c.placement === placement &&
      !dismissed.includes(c.brandId) &&
      (!c.startsAt || Date.parse(c.startsAt) <= now) &&
      (!c.endsAt || Date.parse(c.endsAt) > now),
  );
}
