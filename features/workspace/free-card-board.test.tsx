// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
  value: new Map<string, unknown>(),
  fail: false,
  listeners: new Map<string, Set<() => void>>(),
  write: vi.fn<(key: string, value: unknown) => void>(),
}));
vi.mock('@/lib/browser/workspace-storage', () => ({
  readWorkspaceValue: (key: string) => Promise.resolve(structuredClone(state.value.get(key))),
  writeWorkspaceValue: (key: string, value: unknown) => {
    if (state.fail) return Promise.reject(new Error('storage'));
    state.value.set(key, structuredClone(value));
    state.write(key, value);
    state.listeners.get(key)?.forEach((listener) => listener());
    return Promise.resolve();
  },
  watchWorkspaceValue: (key: string, listener: () => void) => {
    const listeners = state.listeners.get(key) ?? new Set<() => void>();
    listeners.add(listener);
    state.listeners.set(key, listeners);
    return () => listeners.delete(listener);
  },
}));
import { FreeCardBoard, type FreeBoardCard } from '@/components/FreeCardBoard';
import { freeLayoutKey } from './free-layout-store';
import { parseFreeLayout } from './free-layout-model';
let roots: Root[], hosts: HTMLDivElement[], width: number;
const cards: FreeBoardCard[] = [
  { id: 'clock', title: 'ساعت', content: <input aria-label="پیش‌نویس" defaultValue="" /> },
  { id: 'notes', title: 'یادداشت‌ها', content: <p>یادداشت ذخیره‌شده</p> },
  { id: 'weather', title: 'آب‌وهوا', content: <p>تهران</p> },
];
async function run(action: () => void) {
  await act(async () => {
    action();
    for (let i = 0; i < 8; i++) await Promise.resolve();
  });
}
async function mount() {
  const host = document.createElement('div');
  document.body.append(host);
  hosts.push(host);
  const root = createRoot(host);
  roots.push(root);
  await run(() => root.render(<FreeCardBoard cards={cards} />));
  return host;
}
function grip(host: HTMLElement, id = 'clock') {
  return host.querySelector<HTMLButtonElement>(`[data-card-id="${id}"] .free-card-grip`)!;
}
function frame(host: HTMLElement, id = 'clock') {
  return host.querySelector<HTMLElement>(`[data-card-id="${id}"]`)!;
}
async function key(host: HTMLElement, key: string) {
  await run(() => grip(host).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })));
}
async function pointer(host: HTMLElement, type: string, x: number, y: number, pointerId = 1) {
  await run(() => {
    const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y });
    Object.defineProperty(event, 'pointerId', { value: pointerId });
    grip(host).dispatchEvent(event);
  });
}
beforeEach(() => {
  roots = [];
  hosts = [];
  width = 1280;
  state.value.clear();
  state.listeners.clear();
  state.fail = false;
  state.write.mockClear();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (
    this: HTMLElement,
  ) {
    return this.classList.contains('free-board') ? width : 100;
  });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    height: 120,
  } as DOMRect);
  vi.stubGlobal('scrollBy', vi.fn());
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
it('moves horizontally and vertically by pointer, writes only on release and restores on remount', async () => {
  const host = await mount();
  const before = frame(host).style.top;
  await pointer(host, 'pointerdown', 20, 100);
  await pointer(host, 'pointermove', 220, 260);
  expect(frame(host).style.left).toBe('200px');
  expect(state.write).not.toHaveBeenCalled();
  await pointer(host, 'pointerup', 220, 260, 2);
  expect(state.write).not.toHaveBeenCalled();
  await pointer(host, 'pointerup', 220, 260);
  expect(frame(host).style.top).not.toBe(before);
  expect(state.write).toHaveBeenCalledOnce();
  const next = await mount();
  expect(frame(next).style.top).toBe(frame(host).style.top);
  expect(parseFloat(frame(next).style.left)).toBeCloseTo(200, 0);
});
it('cancels drags on Escape and pointer cancellation without persisting a move', async () => {
  const host = await mount();
  const before = frame(host).style.top;
  await pointer(host, 'pointerdown', 20, 100);
  await pointer(host, 'pointermove', 220, 260);
  await key(host, 'Escape');
  expect(frame(host).style.top).toBe(before);
  expect(state.write).not.toHaveBeenCalled();
  await pointer(host, 'pointerdown', 20, 100);
  await pointer(host, 'pointermove', 220, 260);
  await pointer(host, 'pointercancel', 220, 260);
  expect(frame(host).style.top).toBe(before);
  expect(state.write).not.toHaveBeenCalled();
});
it('synchronizes keyboard moves across views and resets positions without remounting drafts', async () => {
  const host = await mount();
  const other = await mount();
  const input = host.querySelector('input')!;
  input.value = 'متن ذخیره‌نشده';
  const before = frame(host).style.top;
  await key(host, 'ArrowDown');
  expect(frame(other).style.top).toBe(frame(host).style.top);
  expect(frame(host).style.top).not.toBe(before);
  const reset = [...host.querySelectorAll('button')].find((b) =>
    b.textContent?.includes('بازگشت به چیدمان اولیه'),
  )!;
  await run(() => reset.click());
  expect(frame(host).style.top).toBe(before);
  expect(frame(other).style.top).toBe(before);
  expect(host.querySelector('input')).toBe(input);
  expect(input.value).toBe('متن ذخیره‌نشده');
});
it('preserves the previous position on storage failure and uses separate layouts after resizing', async () => {
  const host = await mount();
  await key(host, 'ArrowDown');
  const before = frame(host).style.top;
  state.fail = true;
  await key(host, 'ArrowDown');
  expect(frame(host).style.top).toBe(before);
  expect(host.querySelector('[role="alert"]')).not.toBeNull();
  state.fail = false;
  width = 390;
  await run(() => window.dispatchEvent(new Event('resize')));
  expect(frame(host).style.left).toBe('0px');
  await key(host, 'ArrowDown');
  const layout = parseFreeLayout(state.value.get(freeLayoutKey('newtab')));
  expect(layout.views.compact.clock).toBeDefined();
  expect(layout.views.wide.clock).toBeDefined();
});
