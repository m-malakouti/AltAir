import { useCallback, useEffect, useRef, useState } from 'react';
import { readPortfolio, watchPortfolio } from './portfolio-store';
import type { Portfolio } from './portfolio-model';

export function usePortfolio() {
  const [data, setData] = useState<Portfolio | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const alive = useRef(false);
  const revision = useRef(0);
  const reload = useCallback(async () => {
    const current = ++revision.current;
    try {
      const next = await readPortfolio();
      if (alive.current && revision.current === current) {
        setData(next);
        setError('');
      }
    } catch {
      if (alive.current && revision.current === current) {
        setData(null);
        setError('خواندن سبد انجام نشد. اطلاعات ذخیره‌شده تغییر نکرده است.');
      }
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    void reload();
    const stop = watchPortfolio(() => void reload());
    return () => {
      alive.current = false;
      revision.current++;
      stop();
    };
  }, [reload]);
  const saving = useRef(false);
  const save = async (action: () => Promise<Portfolio>) => {
    if (saving.current) return false;
    saving.current = true;
    setBusy(true);
    try {
      await action();
      // Re-read after the lock is released so a newer write from another view wins.
      if (alive.current) await reload();
      return true;
    } catch (cause) {
      if (alive.current)
        setError(
          cause instanceof Error && cause.message === 'portfolio_conflict'
            ? 'این دارایی در نمای دیگری تغییر کرده؛ فرم را ببند، سبد را تازه‌سازی و دوباره ویرایش کن.'
            : 'ذخیرهٔ سبد انجام نشد؛ دوباره تلاش کن.',
        );
      return false;
    } finally {
      saving.current = false;
      if (alive.current) setBusy(false);
    }
  };
  return { data, error, busy, reload, save };
}
