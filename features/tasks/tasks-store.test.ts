import { describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/browser/workspace-storage', () => ({
  readWorkspaceValue: vi.fn(),
  writeWorkspaceValue: vi.fn(),
}));
import { parseTasks } from './tasks-store';
const task = { id: 'one', title: 'Review', done: false, priority: 'high', due: '2026-10-14' };
describe('task persistence validation', () => {
  it('accepts empty storage and preserves valid tasks', () => {
    expect(parseTasks(null)).toEqual([]);
    expect(parseTasks([{ ...task, title: ' Review ' }])).toEqual([task]);
  });
  it('rejects corruption without silently losing stored tasks', () => {
    for (const value of [
      {},
      [task, task],
      [{ ...task, title: ' ' }],
      [{ ...task, due: '2026-02-30' }],
      [{ ...task, priority: 'invalid' }],
      [{ ...task, done: 'false' }],
    ])
      expect(() => parseTasks(value)).toThrow();
  });
});
