// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
vi.mock('wxt/browser', () => ({ browser: { runtime: {} } }));
import { PuffyCompanion } from '@/components/PuffyCompanion';
import { writeWorkspaceValue } from '@/lib/browser/workspace-storage';
import { TASKS_KEY } from '@/features/tasks/tasks-store';

it('plays a story, reacts to interruptions and passes, celebrates real tasks and cleans up', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.useFakeTimers();
  localStorage.clear();
  const host = document.createElement('div');
  const root = createRoot(host);
  const task = { id: 'one', title: 'کار امروز', done: false, priority: 'normal', due: '' };
  await writeWorkspaceValue(TASKS_KEY, [task]);
  try {
    await act(async () => {
      root.render(<PuffyCompanion />);
      await Promise.resolve();
    });
    const scene = () => host.querySelector<HTMLElement>('[data-scene]')!.dataset.scene;
    const advance = (ms: number) =>
      act(() => {
        vi.advanceTimersByTime(ms);
      });
    expect(scene()).toBe('hello');
    advance(4500);
    expect(scene()).toBe('rest');
    advance(12000);
    expect(scene()).toBe('prepare');
    advance(2000);
    expect(scene()).toBe('juggle');
    act(() => host.querySelector<HTMLButtonElement>('.puffy-interact')!.click());
    expect(scene()).toBe('miss');
    expect(host.textContent).toContain('حواس‌پرت');
    advance(1500);
    expect(scene()).toBe('chase');
    advance(2500);
    expect(scene()).toBe('proud');
    advance(4500);
    expect(scene()).toBe('sleep');
    act(() => host.querySelector<HTMLButtonElement>('.puffy-ball')!.click());
    expect(scene()).toBe('prepare');
    await act(async () => {
      await writeWorkspaceValue(TASKS_KEY, [{ ...task, done: true }]);
    });
    expect(scene()).toBe('celebrate');
    await act(async () => {
      await writeWorkspaceValue(TASKS_KEY, []);
    });
    expect(scene()).toBe('celebrate');
    await act(async () => {
      await writeWorkspaceValue(TASKS_KEY, [task]);
    });
    advance(5000);
    vi.setSystemTime(Date.now() + 60_000);
    advance(12000);
    expect(scene()).toBe('remind');
    expect(host.textContent).toContain('کار امروز');
    const showTask = vi.fn();
    window.addEventListener('altair:show-task', showTask);
    act(() => host.querySelector<HTMLButtonElement>('.puffy-reminder button')!.click());
    expect(showTask).toHaveBeenCalledOnce();
    window.removeEventListener('altair:show-task', showTask);
    expect(scene()).toBe('rest');
    expect(host.querySelector('.puffy-pause')).toBeNull();
    await act(async () => {
      root.render(<PuffyCompanion active={false} />);
      await Promise.resolve();
    });
    expect(host.querySelector('.weather-mascot--paused')).not.toBeNull();
  } finally {
    act(() => root.unmount());
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
  }
});
