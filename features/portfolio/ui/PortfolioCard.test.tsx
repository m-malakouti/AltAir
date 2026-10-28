// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { testNow, testPortfolio, testQuote } from '../test-fixtures';

const state: {
  saved: unknown;
  readFail: boolean;
  writeFail: boolean;
  listeners: Set<() => void>;
  writes: ReturnType<typeof vi.fn<(key: string, value: unknown) => void>>;
  refreshMarket: ReturnType<typeof vi.fn<() => Promise<void>>>;
  market: object;
} = vi.hoisted(() => ({
  saved: undefined,
  readFail: false,
  writeFail: false,
  listeners: new Set<() => void>(),
  writes: vi.fn<(key: string, value: unknown) => void>(),
  refreshMarket: vi.fn<() => Promise<void>>(),
  market: {},
}));
vi.mock('@/lib/browser/workspace-storage', () => ({
  readWorkspaceValue: () =>
    state.readFail
      ? Promise.reject(new Error('read'))
      : Promise.resolve(structuredClone(state.saved)),
  writeWorkspaceValue: (key: string, value: unknown) => {
    if (state.writeFail) return Promise.reject(new Error('write'));
    state.saved = structuredClone(value);
    state.writes(key, value);
    state.listeners.forEach((listener) => listener());
    return Promise.resolve();
  },
  watchWorkspaceValue: (_key: string, listener: () => void) => {
    state.listeners.add(listener);
    return () => state.listeners.delete(listener);
  },
}));
vi.mock('@/features/market/market-store', () => ({
  subscribeMarket: () => () => {},
  getMarketSnapshot: () => state.market,
  refreshMarket: state.refreshMarket,
}));
import { PortfolioCard } from './PortfolioCard';
import { PORTFOLIO_KEY } from '../portfolio-store';
import { parsePortfolio } from '../portfolio-model';

let roots: Root[];
let hosts: HTMLDivElement[];
async function run(action: () => void) {
  await act(async () => {
    action();
    await Promise.resolve();
    await Promise.resolve();
  });
}
async function mount() {
  const host = document.createElement('div');
  document.body.append(host);
  hosts.push(host);
  const root = createRoot(host);
  roots.push(root);
  await run(() => root.render(<PortfolioCard />));
  return host;
}
async function click(host: HTMLElement, name: string) {
  const button = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
    (item) => item.getAttribute('aria-label') === name || item.textContent?.trim() === name,
  );
  expect(button, name).toBeTruthy();
  await run(() => button!.click());
}
async function amount(host: HTMLElement, value: string) {
  const input = host.querySelector('input')!;
  await run(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function submit(host: HTMLElement) {
  await run(() =>
    host
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
  );
}
beforeEach(() => {
  roots = [];
  hosts = [];
  state.saved = undefined;
  state.readFail = false;
  state.writeFail = false;
  state.writes.mockClear();
  state.refreshMarket.mockReset().mockResolvedValue();
  state.listeners.clear();
  state.market = { status: 'ready', quote: testQuote(), error: null };
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.spyOn(Date, 'now').mockReturnValue(testNow);
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new Error('No private network calls'))),
  );
  vi.stubGlobal('matchMedia', () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: { request: (_key: string, action: () => Promise<unknown>) => action() },
  });
});
afterEach(async () => {
  await run(() => roots.forEach((root) => root.unmount()));
  hosts.forEach((host) => host.remove());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('adds and edits a local holding, converts totals, validates amounts and confirms deletion', async () => {
  const host = await mount();
  await click(host, 'افزودن دارایی');
  expect(document.activeElement).toBe(host.querySelector('input'));
  await amount(host, '-2');
  await submit(host);
  expect(state.writes).not.toHaveBeenCalled();
  expect(host.querySelector('[role="alert"]')).not.toBeNull();
  await amount(host, '۰٫۰۲');
  await submit(host);
  expect(parsePortfolio(state.saved).holdings).toEqual([{ code: 'BTC', quantity: '0.02' }]);
  expect(document.activeElement?.textContent).toContain('افزودن دارایی');
  expect(host.querySelector('.portfolio-total-number')!.textContent).toContain('20,000,000');
  await click(host, 'ویرایش بیت‌کوین');
  await amount(host, '0.03');
  await submit(host);
  expect(parsePortfolio(state.saved).holdings[0]?.quantity).toBe('0.03');
  expect(document.activeElement?.textContent).toContain('افزودن دارایی');
  const select = host.querySelector<HTMLSelectElement>('[aria-label="واحد نمایش ارزش سبد"]')!;
  await run(() => {
    select.value = 'USD';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  expect(parsePortfolio(state.saved).unit).toBe('USD');
  expect(host.querySelector('.portfolio-total-number')!.textContent).toContain('300');
  await click(host, 'حذف بیت‌کوین');
  expect(parsePortfolio(state.saved).holdings).toHaveLength(1);
  await click(host, 'حذف');
  expect(parsePortfolio(state.saved).holdings).toHaveLength(0);
  expect(state.writes.mock.calls.every(([key]) => key === PORTFOLIO_KEY)).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
});

it('retries the shared market without sending holdings and preserves privacy', async () => {
  state.saved = { ...testPortfolio(), hidden: true };
  state.market = { status: 'error', quote: testQuote(), error: 'قیمت تازه دریافت نشد.' };
  const host = await mount();
  await click(host, 'تازه‌سازی قیمت‌های سبد');
  expect(state.refreshMarket).toHaveBeenCalledExactlyOnceWith();
  expect(host.querySelector('.portfolio-total-number')!.textContent).toBe('****');
  expect(parsePortfolio(state.saved)).toEqual({ ...testPortfolio(), hidden: true });
  expect(state.writes).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});

it('masks private numbers and form values across open views, persists privacy and survives a failed hide write', async () => {
  state.saved = testPortfolio();
  const first = await mount();
  const second = await mount();
  await click(first, 'ویرایش بیت‌کوین');
  expect(first.querySelector('input')!.value).toBe('0.02');
  await click(second, 'پنهان‌کردن اعداد سبد');
  for (const host of [first, second]) {
    expect(host.querySelector('input')).toBeNull();
    expect(host.innerHTML).not.toContain('56,500,000');
    expect(host.innerHTML).not.toContain('0.02');
    expect(host.querySelector('.portfolio-total-number')!.textContent).toBe('****');
    expect(host.textContent).toContain('بیت‌کوین');
  }
  expect(parsePortfolio(state.saved).hidden).toBe(true);
  const third = await mount();
  expect(third.querySelector('.portfolio-total-number')!.textContent).toBe('****');
  await click(second, 'نمایش اعداد سبد');
  expect(second.querySelector('.portfolio-total-number')!.textContent).toContain('56,500,000');
  state.writeFail = true;
  await click(second, 'پنهان‌کردن اعداد سبد');
  expect(second.querySelector('.portfolio-total-number')!.textContent).toBe('****');
  expect(second.innerHTML).not.toContain('56,500,000');
});

it('reports partial or old prices and preserves holdings when market data is unavailable', async () => {
  state.saved = testPortfolio();
  const quote = testQuote();
  quote.assets = quote.assets?.filter((asset) => asset.id !== 'btc');
  quote.fetchFailed = true;
  state.market = { status: 'error', quote, error: 'قیمت تازه دریافت نشد.' };
  const host = await mount();
  expect(host.textContent).toContain('مجموع ناقص');
  expect(host.textContent).toContain('قدیمی');
  expect(host.querySelector('.portfolio-total-number')!.textContent).toContain('36,500,000');
  expect(parsePortfolio(state.saved)).toEqual(testPortfolio());
});

it('does not overwrite corrupt storage and lets the user retry loading', async () => {
  state.saved = { version: 99 };
  const host = await mount();
  expect(host.querySelector('.portfolio-total-number')).toBeNull();
  expect(state.writes).not.toHaveBeenCalled();
  state.saved = testPortfolio();
  await click(host, 'تازه‌سازی سبد دارایی');
  expect(host.querySelector('.portfolio-total-number')!.textContent).toContain('56,500,000');
});
