// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as AdsModule from './ui/SponsoredAds';
const storage = vi.hoisted<{ value: unknown }>(() => ({ value: null }));
vi.mock('@/lib/browser/workspace-storage', () => ({
  readWorkspaceValue: () => Promise.resolve(storage.value),
  writeWorkspaceValue: (_key: string, value: unknown) => {
    storage.value = value;
    return Promise.resolve();
  },
  watchWorkspaceValue: () => () => {},
}));
let Ads: typeof AdsModule;
let root: Root;
let host: HTMLDivElement;
const campaign = {
  id: 'b99d406b-1f84-42ac-9179-d3bbf279e614',
  brandId: 'test-brand',
  brand: 'برند آزمایشی',
  title: 'پیشنهاد',
  destinationUrl: 'https://example.com/',
  placement: 'sidebar',
  mode: 'slider',
  slides: [
    { mediaId: 'b99d406b-1f84-42ac-9179-d3bbf279e615', altText: 'تصویر اول' },
    { mediaId: 'b99d406b-1f84-42ac-9179-d3bbf279e616', altText: 'تصویر دوم' },
  ],
  intervalSeconds: 8,
  startsAt: null,
  endsAt: null,
};
beforeAll(async () => {
  vi.stubEnv('WXT_MARKET_API_URL', 'http://127.0.0.1:5279');
  Ads = await import('./ui/SponsoredAds');
});
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(JSON.stringify({ campaigns: [campaign] })))),
  );
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  storage.value = null;
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
async function render(active = true, children?: ReactNode) {
  await act(async () => {
    root.render(
      <Ads.SponsoredAdsProvider active={active}>
        {children ?? (
          <>
            <Ads.SponsoredAds placement="sidebar" />
            <Ads.AdsPreferences />
          </>
        )}
      </Ads.SponsoredAdsProvider>,
    );
    await Promise.resolve();
  });
}
describe('sponsored placements', () => {
  it('shows five compact sidebar campaigns at the same time', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          campaigns: Array.from({ length: 6 }, (_, i) => ({
            ...campaign,
            id: `b99d406b-1f84-42ac-9179-d3bbf279e61${i}`,
            brandId: `demo-brand-${i}`,
          })),
        }),
      ),
    );
    await render();
    expect(host.querySelectorAll('.sponsored-placement--sidebar')).toHaveLength(5);
  });
  it('labels ads, respects reduced motion, supports manual slides and persists brand dismissal', async () => {
    await render();
    expect(host.textContent).toContain('تبلیغ · برند آزمایشی');
    expect(host.querySelector('canvas')?.getAttribute('aria-label')).toBe('تصویر اول');
    expect(host.querySelector('a')?.getAttribute('rel')).toContain('sponsored');
    act(() => host.querySelector<HTMLButtonElement>('[aria-label="اسلاید بعدی"]')!.click());
    expect(host.querySelector('canvas')?.getAttribute('aria-label')).toBe('تصویر دوم');
    await act(async () => {
      host
        .querySelector<HTMLButtonElement>('[aria-label="پنهان‌کردن تبلیغات برند آزمایشی"]')!
        .click();
      await Promise.resolve();
    });
    expect(host.querySelector('.sponsored-ad')).toBeNull();
    expect(storage.value).toEqual({ disabled: false, dismissed: ['test-brand'] });
  });
  it('does not fetch in ambient mode or when disabled and removes ads offline', async () => {
    await render(false);
    expect(fetch).not.toHaveBeenCalled();
    await render();
    expect(host.querySelector('.sponsored-ad')).not.toBeNull();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(host.querySelector('.sponsored-ad')).toBeNull();
  });
  it('honors the persisted global off switch without fetching', async () => {
    storage.value = { disabled: true, dismissed: [] };
    await render();
    expect(fetch).not.toHaveBeenCalled();
    expect(host.querySelector('.sponsored-ad')).toBeNull();
  });
});
