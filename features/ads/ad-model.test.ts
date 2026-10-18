import { describe, expect, it } from 'vitest';
import { eligibleAds, parseAds } from './ad-model';
const campaign = {
  id: 'b99d406b-1f84-42ac-9179-d3bbf279e614',
  brandId: 'brand-one',
  brand: 'برند',
  title: 'پیشنهاد',
  destinationUrl: 'https://example.com/',
  placement: 'sidebar',
  mode: 'slider',
  slides: [{ mediaId: 'b99d406b-1f84-42ac-9179-d3bbf279e615', altText: 'تصویر' }],
  intervalSeconds: 8,
  startsAt: null,
  endsAt: null,
};
describe('ad catalog', () => {
  it('keeps dismissed brands hidden across different campaigns and filters placement and expiration', () => {
    const ads = parseAds({
      campaigns: [campaign, { ...campaign, id: 'b99d406b-1f84-42ac-9179-d3bbf279e616' }],
    });
    expect(eligibleAds(ads, 'sidebar', [])).toHaveLength(2);
    expect(eligibleAds(ads, 'sidebar', ['brand-one'])).toEqual([]);
    expect(eligibleAds(ads, 'footer', [])).toEqual([]);
    const timed = parseAds({
      campaigns: [
        { ...campaign, startsAt: '2026-10-18T10:00:00Z', endsAt: '2026-10-18T11:00:00Z' },
      ],
    });
    expect(eligibleAds(timed, 'sidebar', [], Date.parse('2026-10-18T09:59:59Z'))).toEqual([]);
    expect(eligibleAds(timed, 'sidebar', [], Date.parse('2026-10-18T10:00:00Z'))).toHaveLength(1);
    expect(eligibleAds(timed, 'sidebar', [], Date.parse('2026-10-18T11:00:00Z'))).toEqual([]);
  });
  it.each([
    { ...campaign, destinationUrl: 'javascript:alert(1)' },
    { ...campaign, destinationUrl: 'https://user:pass@example.com/' },
    { ...campaign, slides: [{ mediaId: '../../secret', altText: '' }] },
    { ...campaign, intervalSeconds: 0 },
    { ...campaign, endsAt: 'invalid' },
    { ...campaign, mode: 'single', slides: [...campaign.slides, ...campaign.slides] },
  ])('rejects unsafe or malformed catalog entries', (invalid) => {
    expect(() => parseAds({ campaigns: [invalid] })).toThrow();
  });
});
