import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { changeFocus, emptyFocus, settleFocus, type FocusData } from '@/features/focus/focus-model';
import { initializeFocusBackground } from './focus-background';
const mocks = vi.hoisted(() => ({
  createAlarm: vi.fn(),
  clearAlarm: vi.fn(),
  getAlarm: vi.fn(),
  createNotification: vi.fn(),
  hasPermission: vi.fn(),
  alarmListener: vi.fn(),
  changedListener: vi.fn(),
  data: null as FocusData | null,
}));
vi.mock('wxt/browser', () => ({
  browser: {
    alarms: {
      create: mocks.createAlarm,
      clear: mocks.clearAlarm,
      get: mocks.getAlarm,
      onAlarm: { addListener: mocks.alarmListener },
    },
    storage: { onChanged: { addListener: mocks.changedListener } },
    runtime: {
      getURL: (path: string) => `chrome-extension://test${path}`,
      onStartup: { addListener: vi.fn() },
      onInstalled: { addListener: vi.fn() },
    },
    permissions: {
      contains: mocks.hasPermission,
      onRemoved: { addListener: vi.fn() },
      onAdded: { addListener: vi.fn() },
    },
    notifications: {
      create: mocks.createNotification,
      clear: vi.fn(),
      onClicked: { addListener: vi.fn() },
    },
    tabs: { create: vi.fn() },
  },
}));
vi.mock('@/features/focus/focus-store', () => ({
  FOCUS_KEY: 'altAir.focus.v1',
  readFocus: () => Promise.resolve(mocks.data),
  reconcileFocus: () => Promise.resolve(mocks.data),
  updateFocus: (change: (data: FocusData) => FocusData) => {
    mocks.data = change(mocks.data!);
    return Promise.resolve(mocks.data);
  },
}));
const now = 1_790_000_000_000;
describe('focus background reminders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const tails = new Map<string, Promise<unknown>>();
    vi.stubGlobal('navigator', {
      locks: {
        request: (key: string, callback: () => unknown) => {
          const result = (tails.get(key) ?? Promise.resolve()).then(callback);
          tails.set(
            key,
            result.catch(() => {}),
          );
          return result;
        },
      },
    });
    mocks.createAlarm.mockResolvedValue(undefined);
    mocks.clearAlarm.mockResolvedValue(true);
    mocks.getAlarm.mockResolvedValue(undefined);
    mocks.createNotification.mockResolvedValue('notification');
    mocks.hasPermission.mockResolvedValue(true);
    mocks.data = changeFocus(
      emptyFocus(),
      {
        type: 'start',
        expectedId: null,
        id: 'session',
        phase: 'focus',
        title: '',
        taskId: null,
        minutes: 1,
      },
      now,
    );
  });
  afterEach(() => vi.unstubAllGlobals());
  it('recreates the deadline alarm after worker startup', async () => {
    initializeFocusBackground();
    await vi.waitFor(() =>
      expect(mocks.createAlarm).toHaveBeenCalledWith('altAir.focus.deadline', {
        when: now + 60_000,
      }),
    );
    expect(mocks.createNotification).not.toHaveBeenCalled();
  });
  it('clears alarms for paused sessions', async () => {
    mocks.data = changeFocus(mocks.data!, { type: 'pause', id: 'session' }, now);
    initializeFocusBackground();
    await vi.waitFor(() => expect(mocks.clearAlarm).toHaveBeenCalled());
    expect(mocks.createAlarm).not.toHaveBeenCalled();
  });
  it('delivers one notification even when alarm events overlap', async () => {
    mocks.data = settleFocus(mocks.data!, now + 60_000);
    mocks.data.settings.notifications = true;
    vi.mocked(Date.now).mockReturnValue(now + 60_000);
    initializeFocusBackground();
    await vi.waitFor(() => expect(mocks.createNotification).toHaveBeenCalledTimes(1));
    const listener = mocks.alarmListener.mock.calls[0]?.[0] as
      ((alarm: { name: string }) => void) | undefined;
    listener?.({ name: 'altAir.focus.deadline' });
    listener?.({ name: 'altAir.focus.deadline' });
    await vi.waitFor(() => expect(mocks.clearAlarm).toHaveBeenCalledTimes(3));
    expect(mocks.createNotification).toHaveBeenCalledTimes(1);
  });
  it('does not request permissions or notify if access was not granted', async () => {
    mocks.data = settleFocus(mocks.data!, now + 60_000);
    mocks.data.settings.notifications = true;
    mocks.hasPermission.mockResolvedValue(false);
    vi.mocked(Date.now).mockReturnValue(now + 60_000);
    initializeFocusBackground();
    await vi.waitFor(() => expect(mocks.hasPermission).toHaveBeenCalled());
    expect(mocks.createNotification).not.toHaveBeenCalled();
  });
  it('does not replay old completion notifications after a long absence', async () => {
    mocks.data = settleFocus(mocks.data!, now + 60_000);
    mocks.data.settings.notifications = true;
    vi.mocked(Date.now).mockReturnValue(now + 3_600_000);
    initializeFocusBackground();
    await vi.waitFor(() => expect(mocks.clearAlarm).toHaveBeenCalled());
    expect(mocks.createNotification).not.toHaveBeenCalled();
  });
});
