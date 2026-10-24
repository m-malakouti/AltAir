// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import type { ExchangeAsset } from '../exchange-model';
const state = vi.hoisted(() => ({
  stored: new Map<string, unknown>(),
  refresh: vi.fn(),
  quote: {},
}));
vi.mock('@/lib/browser/workspace-storage', () => ({
  readWorkspaceValue: (key: string) => Promise.resolve(state.stored.get(key)),
  writeWorkspaceValue: (key: string, value: unknown) => {
    state.stored.set(key, value);
    return Promise.resolve();
  },
  watchWorkspaceValue: () => () => {},
}));
vi.mock('../../market-store', () => ({
  subscribeMarket: () => () => {},
  getMarketSnapshot: () => state.quote,
  refreshMarket: state.refresh,
}));
import { ExchangeView } from './ExchangeView';
async function run(action: () => void) {
  await act(async () => {
    action();
    await Promise.resolve();
  });
}

it('filters real assets, saves favorites, caps comparison and switches independent local data in details', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: { request: (_key: string, callback: () => Promise<void>) => callback() },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = true;
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.open = false;
    },
  });
  const time = new Date().toISOString();
  const assets: ExchangeAsset[] = Array.from({ length: 5 }, (_, index) => ({
    id: index === 0 ? 'btc' : `coin${index}`,
    symbol: index === 0 ? 'BTC' : `C${index}`,
    name: index === 0 ? 'بیت‌کوین' : `کوین ${index}`,
    category: 'crypto',
    basis: 'هر واحد',
    price: 100 + index,
    unit: 'USD',
    updatedAt: time,
    percent: 1,
    change: 1,
    changePeriod: '24h',
    variant: false,
    unitVerified: true,
    ...(index === 0
      ? { priceToman: 9000000, tomanUpdatedAt: time, percentToman: -2, changeToman: -100 }
      : {}),
  }));
  state.quote = {
    status: 'ready',
    error: null,
    quote: { source: 'نوسان', fetchedAt: time, staleAfterSeconds: 7200, assets },
  };
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const click = async (label: string) => {
    const button = [...host.querySelectorAll('button')].find(
      (element) => element.getAttribute('aria-label') === label || element.textContent === label,
    );
    expect(button, label).toBeTruthy();
    await run(() => button!.click());
  };
  try {
    await run(() => root.render(<ExchangeView />));
    expect(host.querySelectorAll('.ex-tile')).toHaveLength(5);
    await click('افزودن به دلخواه‌ها: کوین 1');
    expect(
      (state.stored.get('altAir.exchange.preferences.v1') as { favorites: string[] }).favorites,
    ).toContain('coin1');
    for (const asset of assets) await click(`مقایسهٔ ${asset.name}`);
    expect(host.querySelectorAll('.ex-comparison-grid article')).toHaveLength(4);
    expect(host.textContent).toContain('حداکثر چهار');
    const local = host.querySelectorAll('select')[1]!;
    await run(() => {
      local.value = 'toman';
      local.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const btc = host.querySelector<HTMLButtonElement>('.ex-tile-open')!;
    expect(btc.getAttribute('aria-label')).toContain('9,000,000 تومان');
    expect(btc.getAttribute('aria-label')).toContain('-2.00%');
    await run(() => btc.click());
    expect(host.querySelector('dialog')!.open).toBe(true);
    expect(host.querySelector('.ex-chart-empty')).not.toBeNull();
    expect(host.querySelector('.ex-trend')).toBeNull();
    await click('بستن جزئیات');
    await click('فهرست');
    expect(host.querySelectorAll('tbody tr')).toHaveLength(5);
    const search = host.querySelector<HTMLInputElement>('.ex-search input')!;
    await run(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
        search,
        'بیت',
      );
      search.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(host.querySelectorAll('tbody tr')).toHaveLength(1);
  } finally {
    await run(() => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  }
});
