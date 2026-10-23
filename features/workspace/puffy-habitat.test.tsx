// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
vi.mock('wxt/browser', () => ({ browser: { runtime: {} } }));
import { PuffyHabitat } from '@/components/PuffyHabitat';

it('contains direct dragging, releases on cancel, supports keys and ignores old floating placement', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  localStorage.setItem('altAir.puffy.position.v1', JSON.stringify({ x: 900, y: 700 }));
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => {
      root.render(<PuffyHabitat />);
      await Promise.resolve();
    });
    const area = host.querySelector<HTMLElement>('.puffy-companion')!;
    const actor = host.querySelector<HTMLElement>('.puffy-actor')!;
    const button = host.querySelector<HTMLButtonElement>('.puffy-interact')!;
    Object.defineProperties(area, { clientWidth: { value: 360 }, clientHeight: { value: 220 } });
    Object.defineProperties(actor, { offsetWidth: { value: 160 }, offsetHeight: { value: 148 } });
    vi.spyOn(area, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 360,
      height: 220,
    } as DOMRect);
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
      left: 12,
      top: 60,
      width: 160,
      height: 148,
    } as DOMRect);
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    const pointer = (target: EventTarget, type: string, x: number, y: number, id = 1) =>
      act(() => {
        const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y });
        Object.defineProperty(event, 'pointerId', { value: id });
        target.dispatchEvent(event);
      });
    expect(document.querySelector('.puffy-habitat--floating')).toBeNull();
    expect(host.querySelector('figcaption')).toBeNull();
    pointer(button, 'pointerdown', 90, 90);
    expect(area.classList.contains('puffy-companion--held')).toBe(true);
    pointer(window, 'pointermove', 2000, -200);
    expect(actor.style.left).toBe('188px');
    expect(actor.style.top).toBe('12px');
    pointer(window, 'pointerup', 2000, -200, 2);
    expect(area.classList.contains('puffy-companion--held')).toBe(true);
    pointer(window, 'pointerup', 2000, -200);
    expect(area.classList.contains('puffy-companion--held')).toBe(false);
    expect(actor.style.top).toBe('60px');
    act(() => button.click());
    expect(area.dataset.scene).toBe('rest');
    act(() => {
      button.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    });
    expect(actor.style.left).toBe('168px');
    pointer(button, 'pointerdown', 90, 90);
    pointer(window, 'pointercancel', 90, 90);
    expect(area.classList.contains('puffy-companion--held')).toBe(false);
    pointer(button, 'pointerdown', 90, 90);
    await act(async () => {
      root.render(<PuffyHabitat active={false} />);
      await Promise.resolve();
    });
    expect(host.querySelector<HTMLElement>('.puffy-habitat')!.hidden).toBe(true);
    expect(area.classList.contains('puffy-companion--held')).toBe(false);
  } finally {
    act(() => root.unmount());
    host.remove();
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }
});
