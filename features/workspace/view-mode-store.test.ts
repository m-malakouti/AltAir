import { beforeEach, describe, expect, it, vi } from 'vitest';

const adapter = vi.hoisted(() => ({
  readWorkspaceValue: vi.fn<() => Promise<unknown>>(),
  writeWorkspaceValue: vi.fn<(key: string, value: unknown) => Promise<void>>(),
  watchWorkspaceValue: vi.fn<(key: string, callback: () => void) => () => void>(),
}));
vi.mock('@/lib/browser/workspace-storage', () => adapter);

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  adapter.readWorkspaceValue.mockResolvedValue(null);
  adapter.writeWorkspaceValue.mockResolvedValue(undefined);
  adapter.watchWorkspaceValue.mockReturnValue(() => {});
});

describe('new tab view preference', () => {
  it('restores ambient mode and follows changes from another tab', async () => {
    adapter.readWorkspaceValue.mockResolvedValue('ambient');
    const store = await import('./view-mode-store');
    store.initializeViewMode();
    await vi.waitFor(() => expect(store.getViewMode().mode).toBe('ambient'));
    adapter.readWorkspaceValue.mockResolvedValue('workspace');
    const onChange = adapter.watchWorkspaceValue.mock.calls[0]?.[1];
    expect(onChange).toBeTypeOf('function');
    onChange?.();
    await vi.waitFor(() => expect(store.getViewMode().mode).toBe('workspace'));
  });

  it('does not let a slow startup read override an explicit choice', async () => {
    let resolveRead: (value: unknown) => void = () => {};
    adapter.readWorkspaceValue.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRead = resolve;
        }),
    );
    const store = await import('./view-mode-store');
    store.initializeViewMode();
    store.setViewMode('ambient');
    resolveRead('workspace');
    await vi.waitFor(() => expect(adapter.writeWorkspaceValue).toHaveBeenCalled());
    expect(store.getViewMode().mode).toBe('ambient');
  });

  it('serializes quick toggles so the final choice is persisted last', async () => {
    let finishWrite = () => {};
    adapter.writeWorkspaceValue.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishWrite = resolve;
        }),
    );
    const store = await import('./view-mode-store');
    store.setViewMode('ambient');
    store.setViewMode('workspace');
    await vi.waitFor(() => expect(adapter.writeWorkspaceValue).toHaveBeenCalledTimes(1));
    finishWrite();
    await vi.waitFor(() => expect(adapter.writeWorkspaceValue).toHaveBeenCalledTimes(2));
    expect(adapter.writeWorkspaceValue).toHaveBeenLastCalledWith(store.VIEW_MODE_KEY, 'workspace');
  });

  it('keeps the chosen view usable after a write failure and allows retry', async () => {
    adapter.writeWorkspaceValue.mockRejectedValueOnce(new Error('Quota exceeded'));
    const store = await import('./view-mode-store');
    store.setViewMode('ambient');
    await vi.waitFor(() => expect(store.getViewMode().error).not.toBe(''));
    expect(store.getViewMode().mode).toBe('ambient');
    store.setViewMode('ambient');
    await vi.waitFor(() => expect(adapter.writeWorkspaceValue).toHaveBeenCalledTimes(2));
    expect(store.getViewMode().error).toBe('');
  });
});
