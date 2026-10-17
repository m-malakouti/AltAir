import { useEffect, useRef, useState } from 'react';
import { Icon } from './ui/Icon';

export function AmbientFullscreen() {
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const owned = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const changed = () => {
      setFullscreen(Boolean(document.fullscreenElement));
      if (!document.fullscreenElement) owned.current = false;
    };
    document.addEventListener('fullscreenchange', changed);
    return () => {
      mounted.current = false;
      document.removeEventListener('fullscreenchange', changed);
      if (owned.current && document.fullscreenElement === document.documentElement)
        void document.exitFullscreen().catch(() => {});
    };
  }, []);
  async function toggle() {
    setBusy(true);
    setError('');
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else {
        await document.documentElement.requestFullscreen();
        owned.current = true;
        if (!mounted.current) {
          await document.exitFullscreen();
          return;
        }
      }
    } catch {
      if (mounted.current)
        setError('تمام‌صفحه در این پنجره در دسترس نیست. در تب جدید دوباره امتحان کن.');
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <>
      <button
        type="button"
        className="ambient-fullscreen"
        disabled={busy || !document.fullscreenEnabled}
        aria-label={fullscreen ? 'خروج از تمام‌صفحه' : 'نمای آرام تمام‌صفحه'}
        title={fullscreen ? 'خروج از تمام‌صفحه (Esc)' : 'نمای آرام تمام‌صفحه'}
        aria-pressed={fullscreen}
        onClick={() => {
          void toggle();
        }}
      >
        <Icon name={fullscreen ? 'fullscreenExit' : 'fullscreen'} />
      </button>
      {error && (
        <p className="ambient-fullscreen-error" role="status">
          {error}
        </p>
      )}
    </>
  );
}
