import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const storage: {
  value: unknown;
  fail: boolean;
  writes: ReturnType<typeof vi.fn<(key: string, value: unknown) => void>>;
} = vi.hoisted(() => ({
  value: undefined,
  fail: false,
  writes: vi.fn<(key: string, value: unknown) => void>(),
}));
vi.mock('@/lib/browser/workspace-storage', () => ({
  readWorkspaceValue: () => Promise.resolve(structuredClone(storage.value)),
  writeWorkspaceValue: (key: string, value: unknown) => {
    if (storage.fail) return Promise.reject(new Error('unavailable'));
    storage.value = structuredClone(value);
    storage.writes(key, value);
    return Promise.resolve();
  },
  watchWorkspaceValue: () => () => {},
}));
import {
  PORTFOLIO_KEY,
  readPortfolio,
  saveHolding,
  removeHolding,
  updatePortfolio,
} from './portfolio-store';
import { testPortfolio } from './test-fixtures';

beforeEach(() => {
  storage.value = undefined;
  storage.fail = false;
  storage.writes.mockClear();
  let queue = Promise.resolve();
  vi.stubGlobal('navigator', {
    locks: {
      request: (_key: string, action: () => Promise<unknown>) => {
        const result = queue.then(action);
        queue = result.then(
          () => undefined,
          () => undefined,
        );
        return result;
      },
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('local portfolio persistence', () => {
  it('merges independent changes from concurrent views under the write lock', async () => {
    await Promise.all([saveHolding('BTC', '0.02', null), saveHolding('GOLD_18', '5.5', null)]);
    const result = await readPortfolio();
    expect(result.holdings).toEqual([
      { code: 'BTC', quantity: '0.02' },
      { code: 'GOLD_18', quantity: '5.5' },
    ]);
    expect(storage.writes.mock.calls.every(([key]) => key === PORTFOLIO_KEY)).toBe(true);
  });
  it('preserves privacy and display preferences when editing and deleting', async () => {
    storage.value = { ...testPortfolio(), hidden: true, unit: 'BTC' };
    await saveHolding('BTC', '0.03', '0.02');
    await removeHolding('XRP', '150');
    const result = await readPortfolio();
    expect(result.hidden).toBe(true);
    expect(result.unit).toBe('BTC');
    expect(result.holdings).toHaveLength(3);
    expect(result.holdings[0]?.quantity).toBe('0.03');
  });
  it('rejects duplicate additions and stale edits or deletes instead of overwriting another view', async () => {
    await saveHolding('BTC', '0.02', null);
    await expect(saveHolding('BTC', '1', null)).rejects.toThrow('portfolio_conflict');
    await saveHolding('BTC', '0.03', '0.02');
    await expect(saveHolding('BTC', '2', '0.02')).rejects.toThrow('portfolio_conflict');
    await expect(removeHolding('BTC', '0.02')).rejects.toThrow('portfolio_conflict');
    expect((await readPortfolio()).holdings[0]?.quantity).toBe('0.03');
  });
  it('does not replace corrupt storage or discard existing data when a write fails', async () => {
    storage.value = { version: 99 };
    await expect(saveHolding('BTC', '1', null)).rejects.toThrow();
    expect(storage.value).toEqual({ version: 99 });
    storage.value = testPortfolio();
    storage.fail = true;
    await expect(updatePortfolio((current) => ({ ...current, hidden: true }))).rejects.toThrow();
    expect(storage.value).toEqual(testPortfolio());
  });
});
