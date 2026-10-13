import { useCallback, useEffect, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import {
  readWorkspaceValue,
  watchWorkspaceValue,
  writeWorkspaceValue,
} from '@/lib/browser/workspace-storage';
import { parseHiddenSites, siteKey } from './top-sites';
const KEY = 'altAir.topSites.hidden';
const permission = { permissions: ['topSites' as const] };
export function useTopSites() {
  const supported = Boolean(browser.runtime?.id && browser.topSites && browser.permissions);
  const [enabled, setEnabled] = useState(false);
  const [sites, setSites] = useState<unknown>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const alive = useRef(false);
  const revision = useRef(0);
  const reload = useCallback(async () => {
    const current = ++revision.current;
    try {
      const allowed = supported && (await browser.permissions.contains(permission));
      const excluded = parseHiddenSites(await readWorkspaceValue(KEY));
      const next: unknown = allowed ? await browser.topSites.get() : [];
      // Recheck after the asynchronous read so revocation never leaves stale history visible.
      const stillAllowed = allowed && (await browser.permissions.contains(permission));
      if (alive.current && current === revision.current) {
        setEnabled(Boolean(stillAllowed));
        setSites(stillAllowed ? next : []);
        setHidden(excluded);
        setError('');
      }
    } catch {
      if (alive.current && current === revision.current) {
        setSites([]);
        setError('خواندن سایت‌های پرتکرار انجام نشد؛ دوباره تلاش کن.');
      }
    }
  }, [supported]);
  useEffect(() => {
    alive.current = true;
    const refresh = () => {
      void reload();
    };
    const revoked = () => {
      ++revision.current;
      setSites([]);
      setEnabled(false);
      refresh();
    };
    const stop = watchWorkspaceValue(KEY, refresh);
    if (supported) {
      browser.permissions.onAdded.addListener(refresh);
      browser.permissions.onRemoved.addListener(revoked);
    }
    window.addEventListener('focus', refresh);
    refresh();
    return () => {
      alive.current = false;
      ++revision.current;
      stop();
      window.removeEventListener('focus', refresh);
      if (supported) {
        browser.permissions.onAdded.removeListener(refresh);
        browser.permissions.onRemoved.removeListener(revoked);
      }
    };
  }, [reload, supported]);
  async function toggle() {
    if (!supported || busy) return;
    setBusy(true);
    setError('');
    try {
      // Request is called directly from the click handler, before any await.
      if (enabled) {
        await browser.permissions.remove(permission);
        setSites([]);
        setEnabled(false);
      } else {
        const granted = await browser.permissions.request(permission);
        if (granted !== true) {
          setError('اجازه داده نشد؛ بوکمارک‌های دستی همچنان در دسترس‌اند.');
          return;
        }
      }
      await reload();
    } catch {
      setError('تغییر دسترسی انجام نشد؛ دوباره تلاش کن.');
    } finally {
      setBusy(false);
    }
  }
  async function changeHidden(url?: string) {
    setBusy(true);
    setError('');
    try {
      await navigator.locks.request(KEY, async () => {
        const previous = parseHiddenSites(await readWorkspaceValue(KEY));
        const next = url ? [...new Set([...previous, siteKey(url)])] : [];
        if (next.length > 1000) throw new Error('Hidden list full');
        await writeWorkspaceValue(KEY, next);
      });
      await reload();
    } catch {
      setError('ذخیرهٔ سایت‌های پنهان‌شده انجام نشد.');
    } finally {
      setBusy(false);
    }
  }
  return { supported, enabled, sites, hidden, error, busy, toggle, changeHidden, reload };
}
