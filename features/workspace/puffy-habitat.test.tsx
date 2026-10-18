// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
vi.mock('wxt/browser', () => ({ browser: { runtime: {} } }));
vi.mock('@/components/PuffyCompanion', () => ({
  PuffyCompanion: ({ active }: { active: boolean }) => <div data-active={active}>پوفی</div>,
}));
import { PuffyHabitat } from '@/components/PuffyHabitat';
import { PUFFY_POSITION_KEY } from './puffy-position';

it('restores a floating position, supports keyboard movement, hides outside the workspace and returns home', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  localStorage.setItem(PUFFY_POSITION_KEY, JSON.stringify({ x: 40, y: 50 }));
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => {
      root.render(<PuffyHabitat />);
      await Promise.resolve();
    });
    let floating = document.querySelector<HTMLElement>('.puffy-habitat--floating')!;
    expect(floating.style.left).toBe('40px');
    expect(host.contains(floating)).toBe(false);
    await act(async () => {
      floating
        .querySelector<HTMLButtonElement>('[aria-label="جابه‌جایی پوفی"]')!
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await Promise.resolve();
    });
    expect(JSON.parse(localStorage.getItem(PUFFY_POSITION_KEY)!) as unknown).toEqual({
      x: 64,
      y: 50,
    });
    await act(async () => {
      root.render(<PuffyHabitat active={false} />);
      await Promise.resolve();
    });
    floating = document.querySelector<HTMLElement>('.puffy-habitat--floating')!;
    expect(floating.hidden).toBe(true);
    await act(async () => {
      root.render(<PuffyHabitat />);
      await Promise.resolve();
    });
    await act(async () => {
      document.querySelector<HTMLButtonElement>('[aria-label="بازگشت پوفی به خانه"]')!.click();
      await Promise.resolve();
    });
    expect(document.querySelector('.puffy-habitat--floating')).toBeNull();
    expect(host.querySelector('.puffy-habitat')).not.toBeNull();
    expect(localStorage.getItem(PUFFY_POSITION_KEY)).toBe('null');
  } finally {
    act(() => root.unmount());
    host.remove();
    localStorage.clear();
    vi.unstubAllGlobals();
  }
});
