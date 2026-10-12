import { beforeEach, describe, expect, it, vi } from 'vitest';
import { openSidePanel } from './side-panel';

const { browserMock, getCurrent, open } = vi.hoisted(() => {
  const getCurrent = vi.fn<() => Promise<{ id?: number }>>();
  const open = vi.fn<(options: { windowId: number }) => Promise<void>>();
  const browserMock: {
    windows: { getCurrent: typeof getCurrent };
    sidePanel?: { open?: typeof open };
  } = { windows: { getCurrent }, sidePanel: { open } };
  return { browserMock, getCurrent, open };
});

vi.mock('wxt/browser', () => ({ browser: browserMock }));

describe('openSidePanel', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    browserMock.sidePanel = { open };
    getCurrent.mockResolvedValue({ id: 42 });
    open.mockResolvedValue(undefined);
  });

  it('opens the global panel in the current window', async () => {
    await openSidePanel();
    expect(open).toHaveBeenCalledExactlyOnceWith({ windowId: 42 });
  });

  it('rejects when the Side Panel API is unavailable', async () => {
    browserMock.sidePanel = undefined;
    await expect(openSidePanel()).rejects.toThrow('Side Panel API is unavailable.');
    expect(getCurrent).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });

  it('rejects when the browser does not support opening the panel', async () => {
    browserMock.sidePanel = {};
    await expect(openSidePanel()).rejects.toThrow('Side Panel API is unavailable.');
    expect(getCurrent).not.toHaveBeenCalled();
  });

  it('does not open the panel if the current window has no ID', async () => {
    getCurrent.mockResolvedValue({});
    await expect(openSidePanel()).rejects.toThrow('Current browser window is unavailable.');
    expect(open).not.toHaveBeenCalled();
  });

  it('propagates a window lookup failure without opening the panel', async () => {
    const error = new Error('Window lookup failed.');
    getCurrent.mockRejectedValue(error);
    await expect(openSidePanel()).rejects.toBe(error);
    expect(open).not.toHaveBeenCalled();
  });

  it('propagates a panel rejection so the UI can show an error', async () => {
    const error = new Error('User gesture required.');
    open.mockRejectedValue(error);
    await expect(openSidePanel()).rejects.toBe(error);
  });
});
