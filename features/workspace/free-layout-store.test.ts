import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
  fail: false,
  write: vi.fn<(key: string, value: unknown) => void>(),
}));
vi.mock('@/lib/browser/workspace-storage', () => ({
  readWorkspaceValue: (key: string) => Promise.resolve(structuredClone(state.values.get(key))),
  writeWorkspaceValue: (key: string, value: unknown) => {
    if (state.fail) return Promise.reject(new Error('storage'));
    state.values.set(key, structuredClone(value));
    state.write(key, value);
    return Promise.resolve();
  },
  watchWorkspaceValue: () => () => {},
}));
import { freeLayoutKey, readFreeLayout, resetFreeLayout, saveFreeCard } from './free-layout-store';
import { emptyFreeLayout } from './free-layout-model';
beforeEach(() => {
  state.values.clear();
  state.fail = false;
  state.write.mockClear();
  const queues = new Map<string, Promise<unknown>>();
  vi.stubGlobal('navigator', {
    locks: {
      request: (key: string, action: () => Promise<unknown>) => {
        const result = (queues.get(key) ?? Promise.resolve()).then(action);
        queues.set(
          key,
          result.catch(() => {}),
        );
        return result;
      },
    },
  });
});
afterEach(() => vi.unstubAllGlobals());
it('merges simultaneous independent moves under the same lock', async () => {
  await Promise.all([
    saveFreeCard('newtab', 'wide', 'clock', { x: 0.1, y: 80 }),
    saveFreeCard('newtab', 'wide', 'notes', { x: 0.6, y: 500 }),
  ]);
  const layout = await readFreeLayout('newtab');
  expect(layout.views.wide.clock).toMatchObject({ x: 0.1, y: 80 });
  expect(layout.views.wide.notes).toMatchObject({ x: 0.6, y: 500 });
});
it('resets only positions for the requested surface, preserving content and the other surface', async () => {
  state.values.set('altAir.portfolio.v1', { holdings: ['private'] });
  state.values.set('altAir.workspace.personalization.v1', { cards: { notes: false } });
  await saveFreeCard('panel', 'compact', 'notes', { x: 0, y: 100 });
  await saveFreeCard('newtab', 'wide', 'notes', { x: 0.5, y: 100 });
  state.write.mockClear();
  await resetFreeLayout('newtab');
  expect(await readFreeLayout('newtab')).toEqual(emptyFreeLayout());
  expect((await readFreeLayout('panel')).views.compact.notes?.y).toBe(100);
  expect(state.values.get('altAir.portfolio.v1')).toEqual({ holdings: ['private'] });
  expect(state.values.get('altAir.workspace.personalization.v1')).toEqual({
    cards: { notes: false },
  });
  expect(state.write).toHaveBeenCalledExactlyOnceWith(freeLayoutKey('newtab'), emptyFreeLayout());
});
it('keeps the saved layout on write errors and requires an explicit reset for corrupt data', async () => {
  await saveFreeCard('newtab', 'wide', 'notes', { x: 0.5, y: 100 });
  const before = await readFreeLayout('newtab');
  state.fail = true;
  await expect(saveFreeCard('newtab', 'wide', 'notes', { x: 0.8, y: 400 })).rejects.toThrow();
  expect(await readFreeLayout('newtab')).toEqual(before);
  state.fail = false;
  state.values.set(freeLayoutKey('newtab'), { version: 99 });
  await expect(saveFreeCard('newtab', 'wide', 'notes', { x: 0.5, y: 100 })).rejects.toThrow();
  expect(state.values.get(freeLayoutKey('newtab'))).toEqual({ version: 99 });
  await resetFreeLayout('newtab');
  expect(await readFreeLayout('newtab')).toEqual(emptyFreeLayout());
});
