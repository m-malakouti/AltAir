import { useEffect, useRef, useState } from 'react';
import { watchWorkspaceValue } from '@/lib/browser/workspace-storage';
import { actOnFocus, FOCUS_KEY, readFocus, reconcileFocus, updateFocus } from './focus-store';
import { emptyFocus, nextPhase, type FocusAction } from './focus-model';

export function useFocus() {
  const [data, setData] = useState(emptyFocus);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now);
  const writing = useRef(false);
  const audio = useRef<AudioContext | null>(null);
  useEffect(() => {
    let alive = true;
    let revision = 0;
    async function load(reconcile = false) {
      const current = ++revision;
      try {
        const next = await (reconcile ? reconcileFocus() : readFocus());
        if (alive && current === revision) {
          setData(next);
          setReady(true);
          setError('');
        }
      } catch {
        if (alive) setError('اطلاعات تمرکز خوانده نشد؛ دوباره تلاش کن.');
      }
    }
    const stop = watchWorkspaceValue(FOCUS_KEY, () => {
      void load();
    });
    const visible = () => {
      setNow(Date.now());
      void load(true);
    };
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    window.addEventListener('focus', visible);
    document.addEventListener('visibilitychange', visible);
    void load(true);
    return () => {
      alive = false;
      revision++;
      stop();
      window.clearInterval(timer);
      window.removeEventListener('focus', visible);
      document.removeEventListener('visibilitychange', visible);
    };
  }, []);
  const session = data.session;
  useEffect(() => {
    if (session?.status === 'running' && session.deadline !== null && now >= session.deadline) {
      void reconcileFocus().catch(() => setError('پایان جلسه ذخیره نشد؛ دوباره تلاش کن.'));
    }
  }, [session, now]);
  useEffect(() => {
    if (
      !ready ||
      session?.status !== 'finished' ||
      now - (session.endedAt ?? 0) > 10_000 ||
      now < (session.endedAt ?? 0)
    )
      return;
    if (
      data.settings.sound &&
      !data.settings.notifications &&
      data.soundedId !== session.id &&
      audio.current?.state === 'running'
    ) {
      let claimed = false;
      void updateFocus((latest) => {
        if (latest.soundedId === session.id || latest.session?.id !== session.id) return latest;
        claimed = true;
        return { ...latest, soundedId: session.id };
      })
        .then(() => {
          const context = audio.current;
          if (!claimed || !context || context.state !== 'running') return;
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.frequency.value = 660;
          gain.gain.setValueAtTime(0.12, context.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.6);
          oscillator.connect(gain).connect(context.destination);
          oscillator.start();
          oscillator.stop(context.currentTime + 0.6);
        })
        .catch(() => setError('صدای پایان جلسه پخش نشد.'));
    }
    if (data.settings.autoStart && !document.hidden && document.hasFocus()) {
      void actOnFocus({
        type: 'start',
        id: crypto.randomUUID(),
        expectedId: session.id,
        phase: nextPhase(data),
        title: session.title,
        taskId: session.taskId,
      }).catch(() => setError('مرحلهٔ بعد شروع نشد؛ دستی شروع کن.'));
    }
  }, [data, session, ready, now]);
  useEffect(
    () => () => {
      void audio.current?.close().catch(() => {});
    },
    [],
  );
  async function unlockSound() {
    try {
      audio.current ??= new AudioContext();
      await audio.current.resume();
    } catch {
      setError('مرورگر اجازهٔ پخش صدا نداد.');
    }
  }
  async function dispatch(action: FocusAction) {
    if (!ready || writing.current) return false;
    writing.current = true;
    setBusy(true);
    try {
      const next = await actOnFocus(action);
      setData(next);
      setNow(Date.now());
      setError('');
      return true;
    } catch {
      setError('تغییر جلسه ذخیره نشد؛ دوباره تلاش کن.');
      return false;
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }
  return { data, ready, busy, error, now, dispatch, unlockSound };
}
