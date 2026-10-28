// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AnimatedPrice } from './AnimatedPrice';

vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 });
const format = (value: number) => numberFormat.format(value);
let host: HTMLDivElement;
let root: Root;
let now: number;
let nextFrame: number;
let frames: Map<number, FrameRequestCallback>;
let motion: EventTarget & { matches: boolean };

beforeEach(() => {
  now = 0;
  nextFrame = 0;
  frames = new Map();
  motion = Object.assign(new EventTarget(), { matches: false });
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => motion),
  );
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

async function run(action: () => void) {
  await act(async () => {
    action();
    await Promise.resolve();
  });
}

async function render(value: number, valueKey = 'USD:toman', formatter = format) {
  await run(() =>
    root.render(<AnimatedPrice value={value} valueKey={valueKey} format={formatter} />),
  );
}

async function advance(milliseconds: number) {
  now += milliseconds;
  const pending = [...frames.values()];
  frames.clear();
  await run(() => pending.forEach((callback) => callback(now)));
}

function visual() {
  return host.querySelector('[aria-hidden="true"]')!.textContent;
}

afterEach(async () => {
  await run(() => root.unmount());
  document.documentElement.removeAttribute('data-starting');
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('counts up on entry while exposing only the exact target to screen readers', async () => {
  await render(1000);
  expect(visual()).toBe('0');
  expect(host.querySelector('.sr-only')!.textContent).toBe('1,000');
  await advance(400);
  expect(visual()).toBe('875');
  await advance(400);
  expect(visual()).toBe('1,000');
  expect(frames.size).toBe(0);
});

it('counts down from the last displayed price and ends on the exact fractional target', async () => {
  await render(100);
  await advance(800);
  await render(80.125);
  expect(visual()).toBe('100');
  await advance(400);
  expect(Number(visual())).toBeGreaterThan(80.125);
  expect(Number(visual())).toBeLessThan(100);
  await advance(400);
  expect(visual()).toBe('80.125');
});

it('retargets a running animation from its current value without jumping', async () => {
  await render(100);
  await advance(400);
  expect(visual()).toBe('87.5');
  await render(200);
  expect(visual()).toBe('87.5');
  expect(frames.size).toBe(1);
  await advance(800);
  expect(visual()).toBe('200');
});

it('does not animate unchanged data or interpolate between different units or assets', async () => {
  await render(100);
  await advance(800);
  await render(100);
  expect(frames.size).toBe(0);
  await render(0.000123, 'BTC:USD');
  expect(visual()).toBe('0.000123');
  expect(frames.size).toBe(0);
});

it('shows prices immediately with reduced motion and stops when it is enabled mid-animation', async () => {
  motion.matches = true;
  await render(100);
  expect(visual()).toBe('100');
  expect(frames.size).toBe(0);
  motion.matches = false;
  await render(200);
  await advance(400);
  motion.matches = true;
  await run(() => motion.dispatchEvent(new Event('change')));
  expect(visual()).toBe('200');
  expect(frames.size).toBe(0);
});

it('finishes on the target when the tab becomes hidden', async () => {
  await render(100);
  await advance(200);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
  await run(() => document.dispatchEvent(new Event('visibilitychange')));
  expect(visual()).toBe('100');
  expect(frames.size).toBe(0);
});

it('waits for New Tab to reveal before starting and skips hidden workspaces', async () => {
  document.documentElement.setAttribute('data-starting', 'true');
  await render(100);
  expect(frames.size).toBe(0);
  await run(() => document.documentElement.removeAttribute('data-starting'));
  expect(visual()).toBe('0');
  await advance(800);
  host.hidden = true;
  await render(200);
  expect(visual()).toBe('200');
  expect(frames.size).toBe(0);
});

it('preserves the supplied precision and does not animate invalid prices', async () => {
  await render(0.000123);
  await advance(800);
  expect(visual()).toBe('0.000123');
  await render(Number.NaN);
  expect(visual()).toBe('—');
  expect(frames.size).toBe(0);
});

it('cancels pending work when unmounted', async () => {
  await render(100);
  expect(frames.size).toBe(1);
  await run(() => root.render(null));
  expect(frames.size).toBe(0);
});
