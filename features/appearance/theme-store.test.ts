import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ThemePreference } from './theme';

const adapter = vi.hoisted(() => ({
  cacheThemePreference: vi.fn(),
  loadThemePreference: vi.fn<() => Promise<unknown>>(),
  readThemeCache: vi.fn<() => unknown>(),
  saveThemePreference: vi.fn<(value: ThemePreference) => Promise<void>>(),
  watchThemePreference: vi.fn<(listener: (value: unknown) => void) => () => void>(),
}));
vi.mock('@/lib/browser/theme-preference', () => adapter);

describe('theme store', () => {
  let media: { matches: boolean; addEventListener: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    adapter.loadThemePreference.mockResolvedValue({ version: 1, mode: 'system' });
    adapter.saveThemePreference.mockResolvedValue(undefined);
    adapter.watchThemePreference.mockReturnValue(() => {});
    media = { matches: false, addEventListener: vi.fn() };
    vi.stubGlobal('window', { matchMedia: () => media });
    vi.stubGlobal('document', { documentElement: { dataset: {} } });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it('restores the stored choice and applies it to the document', async () => {
    adapter.loadThemePreference.mockResolvedValue({ version: 1, mode: 'dark' });
    const store = await import('./theme-store');
    store.initializeTheme();
    await vi.waitFor(() => expect(store.getThemeSnapshot().resolved).toBe('dark'));
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
  it('does not let a slow startup read overwrite a user selection', async () => {
    let finishRead: (value: unknown) => void = () => {};
    adapter.loadThemePreference.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishRead = resolve;
        }),
    );
    const store = await import('./theme-store');
    store.initializeTheme();
    store.setThemeMode('dark');
    finishRead({ version: 1, mode: 'light' });
    await vi.waitFor(() => expect(adapter.saveThemePreference).toHaveBeenCalled());
    expect(store.getThemeSnapshot().mode).toBe('dark');
  });
  it('serializes rapid choices so the final selection remains saved', async () => {
    let finishSave: () => void = () => {};
    adapter.saveThemePreference.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishSave = resolve;
        }),
    );
    const store = await import('./theme-store');
    store.initializeTheme();
    await vi.waitFor(() => expect(store.getThemeSnapshot().resolved).toBe('light'));
    store.setThemeMode('dark');
    store.setThemeMode('light');
    await vi.waitFor(() => expect(adapter.saveThemePreference).toHaveBeenCalledTimes(1));
    finishSave();
    await vi.waitFor(() => expect(adapter.saveThemePreference).toHaveBeenCalledTimes(2));
    expect(adapter.saveThemePreference).toHaveBeenLastCalledWith({ version: 1, mode: 'light' });
    expect(store.getThemeSnapshot().mode).toBe('light');
  });
  it('reports saving errors and permits retrying the same selection', async () => {
    adapter.saveThemePreference.mockRejectedValueOnce(new Error('Failed'));
    const store = await import('./theme-store');
    store.initializeTheme();
    store.setThemeMode('dark');
    await vi.waitFor(() => expect(store.getThemeSnapshot().error).not.toBeNull());
    store.setThemeMode('dark');
    await vi.waitFor(() => expect(store.getThemeSnapshot().error).toBeNull());
    expect(adapter.saveThemePreference).toHaveBeenCalledTimes(2);
  });
  it('follows device changes only while in system mode', async () => {
    const store = await import('./theme-store');
    store.initializeTheme();
    const onChange = media.addEventListener.mock.calls[0]?.[1] as () => void;
    media.matches = true;
    onChange();
    expect(store.getThemeSnapshot().resolved).toBe('dark');
    store.setThemeMode('light');
    onChange();
    expect(store.getThemeSnapshot().resolved).toBe('light');
    await vi.waitFor(() => expect(adapter.saveThemePreference).toHaveBeenCalled());
  });
  it('accepts another surface changing or clearing the preference', async () => {
    const store = await import('./theme-store');
    store.initializeTheme();
    const onChange = adapter.watchThemePreference.mock.calls[0]?.[0];
    onChange?.({ version: 1, mode: 'dark' });
    expect(store.getThemeSnapshot().mode).toBe('dark');
    onChange?.(undefined);
    expect(store.getThemeSnapshot().mode).toBe('system');
    expect(adapter.cacheThemePreference).toHaveBeenLastCalledWith({ version: 1, mode: 'system' });
  });
});
