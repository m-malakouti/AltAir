// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
vi.mock('wxt/browser', () => ({ browser: { runtime: {} } }));
import { SavedCommuteCard } from './SavedCommuteCard';
import { saveCommutePlaces } from '@/lib/browser/commute-storage';
describe('saved commute card', () => {
  it('appears after saving, updates on edit and disappears after deletion', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    localStorage.clear();
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    const open = vi.fn();
    await act(async () => {
      root.render(<SavedCommuteCard onOpen={open} />);
      await Promise.resolve();
    });
    expect(host.querySelector('section')).toBeNull();
    await act(async () => {
      await saveCommutePlaces({ home: 'تهران خانه', work: 'تهران دفتر' });
    });
    expect(host.textContent).toContain('تهران خانه');
    expect(host.textContent).toContain('تهران دفتر');
    expect(host.querySelector('iframe')).toBeNull();
    host.querySelector('button')!.click();
    expect(open).toHaveBeenCalledOnce();
    await act(async () => {
      await saveCommutePlaces({ home: 'تهران خانه جدید', work: 'تهران دفتر' });
    });
    expect(host.textContent).toContain('تهران خانه جدید');
    await act(async () => {
      await saveCommutePlaces(null);
    });
    expect(host.querySelector('section')).toBeNull();
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    host.remove();
    localStorage.clear();
    vi.unstubAllGlobals();
  });
});
