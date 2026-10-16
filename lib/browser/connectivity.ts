export const CONNECTIVITY_ORIGINS = [
  'https://www.gstatic.com',
  'https://cp.cloudflare.com',
] as const;
export type ConnectionStatus = 'online' | 'offline' | 'unreachable';
export interface ConnectionSnapshot {
  status: ConnectionStatus;
  checking: boolean;
}

export const browserOnline = () => navigator.onLine !== false;

/** A single reachable endpoint suffices; a blocked provider is not an outage. */
export async function probeInternet(signal: AbortSignal): Promise<boolean> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal.addEventListener('abort', cancel, { once: true });
  if (signal.aborted) cancel();
  const timeout = window.setTimeout(() => controller.abort(), 6000);
  try {
    await Promise.any(
      CONNECTIVITY_ORIGINS.map(async (origin) => {
        const response = await fetch(`${origin}/generate_204`, {
          method: 'GET',
          mode: 'no-cors',
          credentials: 'omit',
          cache: 'no-store',
          redirect: 'error',
          referrerPolicy: 'no-referrer',
          signal: controller.signal,
        });
        // Previews receive an opaque response; extension host permissions expose status.
        if (response.type !== 'opaque' && response.status !== 204)
          throw new Error('Connectivity endpoint unavailable');
      }),
    );
    return true;
  } catch {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    return false;
  } finally {
    window.clearTimeout(timeout);
    signal.removeEventListener('abort', cancel);
    controller.abort();
  }
}

export function monitorConnectivity(onChange: (value: ConnectionSnapshot) => void) {
  let snapshot: ConnectionSnapshot = {
    status: browserOnline() ? 'online' : 'offline',
    checking: false,
  };
  let stopped = false;
  let pending: AbortController | null = null;
  let failures = 0;
  let confirmation: number | undefined;
  const publish = (status: ConnectionStatus, checking = false) => {
    snapshot = { status, checking };
    onChange(snapshot);
  };
  const check = async (force = false) => {
    if (stopped || pending || document.hidden) return;
    window.clearTimeout(confirmation);
    if (!force && !browserOnline()) {
      publish('offline');
      return;
    }
    const controller = new AbortController();
    pending = controller;
    publish(snapshot.status, true);
    try {
      const reachable = await probeInternet(controller.signal);
      if (stopped || controller.signal.aborted) return;
      if (reachable) {
        failures = 0;
        publish('online');
      } else if (!browserOnline()) {
        publish('offline');
      } else {
        failures++;
        // Confirm transient failures before changing the whole scene.
        publish(failures >= 2 ? 'unreachable' : snapshot.status);
        if (failures < 2)
          confirmation = window.setTimeout(() => {
            void check();
          }, 3000);
      }
    } catch {
      // Cancellation on hide, offline, or unmount must not publish stale state.
    } finally {
      if (pending === controller) pending = null;
    }
  };
  const offline = () => {
    pending?.abort();
    pending = null;
    failures = 0;
    window.clearTimeout(confirmation);
    publish('offline');
  };
  const reconnect = () => {
    void check(true);
  };
  const visibility = () => {
    if (document.hidden) {
      pending?.abort();
      pending = null;
      window.clearTimeout(confirmation);
      if (snapshot.checking) publish(snapshot.status);
    } else void check(true);
  };
  window.addEventListener('offline', offline);
  window.addEventListener('online', reconnect);
  document.addEventListener('visibilitychange', visibility);
  const timer = window.setInterval(() => {
    void check();
  }, 30_000);
  onChange(snapshot);
  void check();
  return {
    retry: reconnect,
    stop() {
      stopped = true;
      pending?.abort();
      window.clearTimeout(confirmation);
      window.clearInterval(timer);
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', reconnect);
      document.removeEventListener('visibilitychange', visibility);
    },
  };
}
