import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { monitorConnectivity, probeInternet, type ConnectionSnapshot } from './connectivity';

let network: { onLine: boolean };
let page: EventTarget & { hidden: boolean };
let events: EventTarget;
const monitors: ReturnType<typeof monitorConnectivity>[] = [];
const fetcher = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.useFakeTimers();
  fetcher.mockReset();
  fetcher.mockResolvedValue(new Response(null, { status: 204 }));
  events = new EventTarget();
  page = Object.assign(new EventTarget(), { hidden: false });
  network = { onLine: true };
  vi.stubGlobal(
    'window',
    Object.assign(events, { setTimeout, clearTimeout, setInterval, clearInterval }),
  );
  vi.stubGlobal('document', page);
  vi.stubGlobal('navigator', network);
  vi.stubGlobal('fetch', fetcher);
});
afterEach(() => {
  monitors.splice(0).forEach((monitor) => monitor.stop());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function observe() {
  const snapshots: ConnectionSnapshot[] = [];
  const monitor = monitorConnectivity((snapshot) => snapshots.push(snapshot));
  monitors.push(monitor);
  return { monitor, snapshots, latest: () => snapshots.at(-1) };
}

describe('ambient internet connectivity', () => {
  it('accepts one reachable endpoint even if the other provider is blocked', async () => {
    fetcher.mockRejectedValueOnce(new TypeError('Blocked'));
    expect(await probeInternet(new AbortController().signal)).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
    });
  });

  it('shows browser-reported offline immediately without network requests', () => {
    network.onLine = false;
    const state = observe();
    expect(state.latest()).toEqual({ status: 'offline', checking: false });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('requires two failed rounds and distinguishes unreachable from a disconnected device', async () => {
    fetcher.mockRejectedValue(new TypeError('Network unavailable'));
    const state = observe();
    await vi.advanceTimersByTimeAsync(0);
    expect(state.latest()?.status).toBe('online');
    await vi.advanceTimersByTimeAsync(3000);
    expect(state.latest()).toEqual({ status: 'unreachable', checking: false });
    expect(fetcher).toHaveBeenCalledTimes(4);
    fetcher.mockResolvedValue(new Response(null, { status: 204 }));
    await vi.advanceTimersByTimeAsync(27_000);
    expect(state.latest()?.status).toBe('online');
  });

  it('recovers automatically after an online event', async () => {
    network.onLine = false;
    const state = observe();
    network.onLine = true;
    events.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(0);
    expect(state.latest()).toEqual({ status: 'online', checking: false });
  });

  it('does not let a pending success overwrite a newer offline event', async () => {
    let finish: (value: Response) => void = () => {};
    const request = new Promise<Response>((resolve) => {
      finish = resolve;
    });
    fetcher.mockReturnValue(request);
    const state = observe();
    network.onLine = false;
    events.dispatchEvent(new Event('offline'));
    finish(new Response(null, { status: 204 }));
    await vi.advanceTimersByTimeAsync(0);
    expect(state.latest()).toEqual({ status: 'offline', checking: false });
  });

  it('pauses while the page is hidden and checks again when visible', async () => {
    page.hidden = true;
    const state = observe();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetcher).not.toHaveBeenCalled();
    page.hidden = false;
    page.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(state.latest()?.status).toBe('online');
  });

  it('stops checks and event handling after leaving ambient view', async () => {
    const state = observe();
    await vi.advanceTimersByTimeAsync(0);
    state.monitor.stop();
    const count = state.snapshots.length;
    events.dispatchEvent(new Event('offline'));
    events.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(state.snapshots).toHaveLength(count);
  });
});
