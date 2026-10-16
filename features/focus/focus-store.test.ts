import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { actOnFocus, FOCUS_KEY, readFocus, reconcileFocus } from './focus-store';
const storage = vi.hoisted((): { value: unknown; fail: boolean } => ({
  value: undefined,
  fail: false,
}));
vi.mock('@/lib/browser/workspace-storage', () => ({
  readWorkspaceValue: vi.fn(() => Promise.resolve(structuredClone(storage.value))),
  writeWorkspaceValue: vi.fn((_key: string, value: unknown) => {
    if (storage.fail) return Promise.reject(new Error('Storage denied'));
    storage.value = structuredClone(value);
    return Promise.resolve();
  }),
}));
describe('shared focus persistence', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  beforeEach(() => {
    storage.value = undefined;
    storage.fail = false;
    let tail: Promise<unknown> = Promise.resolve();
    vi.stubGlobal('navigator', {
      locks: {
        request: (name: string, callback: () => unknown) => {
          expect(name).toBe(FOCUS_KEY);
          const result = tail.then(callback);
          tail = result.catch(() => {});
          return result;
        },
      },
    });
    vi.spyOn(Date, 'now').mockReturnValue(1_790_000_000_000);
  });
  it('serializes simultaneous starts and deadline reconciliation across views', async () => {
    const start = (id: string) =>
      actOnFocus({
        type: 'start',
        id,
        expectedId: null,
        phase: 'focus',
        title: '',
        taskId: null,
        minutes: 1,
      });
    await Promise.all([start('one'), start('two')]);
    expect((await readFocus()).session?.id).toBe('one');
    vi.mocked(Date.now).mockReturnValue(1_790_000_060_000);
    await Promise.all([reconcileFocus(), reconcileFocus(), reconcileFocus()]);
    expect((await readFocus()).history).toHaveLength(1);
    expect((await readFocus()).completed).toBe(1);
  });
  it('reports failed writes without pretending a session was started', async () => {
    storage.fail = true;
    await expect(
      actOnFocus({
        type: 'start',
        id: 'one',
        expectedId: null,
        phase: 'focus',
        title: '',
        taskId: null,
      }),
    ).rejects.toThrow();
    expect((await readFocus()).session).toBeNull();
  });
});
