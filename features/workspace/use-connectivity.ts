import { useEffect, useRef, useState } from 'react';
import {
  browserOnline,
  monitorConnectivity,
  type ConnectionSnapshot,
} from '@/lib/browser/connectivity';

export function useConnectivity() {
  const [connection, setConnection] = useState<ConnectionSnapshot>(() => ({
    status: browserOnline() ? 'online' : 'offline',
    checking: false,
  }));
  const monitor = useRef<ReturnType<typeof monitorConnectivity> | null>(null);
  useEffect(() => {
    const current = monitorConnectivity(setConnection);
    monitor.current = current;
    return () => {
      current.stop();
      monitor.current = null;
    };
  }, []);
  return { ...connection, retry: () => monitor.current?.retry() };
}
