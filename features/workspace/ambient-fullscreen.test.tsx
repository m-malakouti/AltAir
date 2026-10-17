// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AmbientFullscreen } from '@/components/AmbientFullscreen';
vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});
describe('ambient fullscreen', () => {
  it('enters fullscreen on click, follows browser exit and exits on unmount', async () => {
    let current: Element | null = null;
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true });
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => current,
    });
    const enter = vi.fn(() => {
      current = document.documentElement;
      document.dispatchEvent(new Event('fullscreenchange'));
      return Promise.resolve();
    });
    const exit = vi.fn(() => {
      current = null;
      document.dispatchEvent(new Event('fullscreenchange'));
      return Promise.resolve();
    });
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: enter,
    });
    Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exit });
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(<AmbientFullscreen />);
      await Promise.resolve();
    });
    const button = host.querySelector('button')!;
    await act(async () => {
      button.click();
      await Promise.resolve();
    });
    expect(enter).toHaveBeenCalledOnce();
    expect(button.getAttribute('aria-pressed')).toBe('true');
    await act(async () => {
      await exit();
    });
    expect(button.getAttribute('aria-pressed')).toBe('false');
    await act(async () => {
      button.click();
      await Promise.resolve();
    });
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    expect(exit).toHaveBeenCalledTimes(2);
  });
  it('shows a useful message when the browser denies fullscreen', async () => {
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null });
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true });
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: vi.fn().mockRejectedValue(new Error('denied')),
    });
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(<AmbientFullscreen />);
      await Promise.resolve();
    });
    await act(async () => {
      host.querySelector('button')!.click();
      await Promise.resolve();
    });
    expect(host.querySelector('[role="status"]')?.textContent).toContain('در دسترس نیست');
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
  });
});
