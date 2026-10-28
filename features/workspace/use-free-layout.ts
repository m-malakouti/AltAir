import { useCallback, useEffect, useRef, useState } from 'react';
import { emptyFreeLayout, type BoardSurface } from './free-layout-model';
import { readFreeLayout, watchFreeLayout } from './free-layout-store';

export function useFreeLayout(surface: BoardSurface) {
  const [layout, setLayout] = useState(emptyFreeLayout);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const alive = useRef(false);
  const revision = useRef(0);
  const saving = useRef(false);
  const reload = useCallback(async () => {
    const current = ++revision.current;
    try {
      const next = await readFreeLayout(surface);
      if (alive.current && current === revision.current) {
        setLayout(next);
        setReady(true);
        setError('');
      }
    } catch {
      if (alive.current && current === revision.current) {
        setReady(false);
        setError('خواندن چیدمان انجام نشد. دوباره تلاش کن یا به چیدمان اولیه برگرد.');
      }
    }
  }, [surface]);
  useEffect(() => {
    alive.current = true;
    const stop = watchFreeLayout(surface, () => void reload());
    void reload();
    return () => {
      alive.current = false;
      revision.current++;
      stop();
    };
  }, [surface, reload]);
  async function save(action: () => Promise<void>) {
    if (saving.current) return false;
    saving.current = true;
    setBusy(true);
    try {
      await action();
      if (alive.current) await reload();
      return true;
    } catch {
      if (alive.current) setError('چیدمان ذخیره نشد؛ جای قبلی کارت حفظ شد. دوباره تلاش کن.');
      return false;
    } finally {
      saving.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return { layout, ready, busy, error, reload, save };
}
