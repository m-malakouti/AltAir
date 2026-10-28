import { useLayoutEffect, useRef } from 'react';

const duration = 800;

export function AnimatedPrice({
  value,
  valueKey,
  format,
}: {
  value: number;
  valueKey: string;
  format: (value: number) => string;
}) {
  const visual = useRef<HTMLSpanElement>(null);
  const displayed = useRef(0);
  const previousKey = useRef(valueKey);
  const formatter = useRef(format);
  const valid = Number.isFinite(value);

  useLayoutEffect(() => {
    formatter.current = format;
  }, [format]);

  useLayoutEffect(() => {
    const element = visual.current;
    if (!element) return;
    let frame = 0;
    const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const changedIdentity = previousKey.current !== valueKey;
    previousKey.current = valueKey;
    const write = (number: number) => {
      displayed.current = number;
      element.textContent = formatter.current(number);
    };
    const finish = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      if (valid) write(value);
      else {
        displayed.current = 0;
        element.textContent = '—';
      }
    };
    const shouldSkip = () =>
      document.hidden || motion?.matches || element.closest('[hidden], [inert]') !== null;
    const start = () => {
      if (document.documentElement.hasAttribute('data-starting')) return;
      const bounds = element.getBoundingClientRect();
      if (
        !valid ||
        changedIdentity ||
        shouldSkip() ||
        displayed.current === value ||
        bounds.bottom < 0 ||
        bounds.top > window.innerHeight
      ) {
        finish();
        return;
      }
      const from = displayed.current;
      const startedAt = performance.now();
      write(from);
      const tick = (now: number) => {
        const progress = Math.min(1, Math.max(0, (now - startedAt) / duration));
        if (progress === 1 || shouldSkip()) {
          finish();
          return;
        }
        const eased = 1 - (1 - progress) ** 3;
        write(from * (1 - eased) + value * eased);
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    const stopWhenHidden = () => {
      if (document.hidden) finish();
    };
    const stopWhenReduced = () => {
      if (motion?.matches) finish();
    };
    // Cached prices can mount while New Tab's startup screen is still hidden.
    const startup = new MutationObserver(() => {
      if (!document.documentElement.hasAttribute('data-starting')) {
        startup.disconnect();
        start();
      }
    });
    startup.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-starting'],
    });
    element.textContent = valid ? formatter.current(value) : '—';
    start();
    motion?.addEventListener('change', stopWhenReduced);
    document.addEventListener('visibilitychange', stopWhenHidden);
    return () => {
      cancelAnimationFrame(frame);
      startup.disconnect();
      motion?.removeEventListener('change', stopWhenReduced);
      document.removeEventListener('visibilitychange', stopWhenHidden);
    };
  }, [value, valueKey, valid]);

  return (
    <span className="animated-price" dir="ltr">
      <span ref={visual} aria-hidden="true" />
      <span className="sr-only">{valid ? format(value) : '—'}</span>
    </span>
  );
}
