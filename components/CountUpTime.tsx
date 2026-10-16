import { useLayoutEffect, useRef } from 'react';
import { nextDigitPosition } from '@/features/workspace/clock-digits';

const reel = Array.from({ length: 20 }, (_, index) => index % 10);

function CountUpDigit({ digit }: { digit: number }) {
  const track = useRef<HTMLSpanElement>(null);
  const previous = useRef(0);
  useLayoutEffect(() => {
    const element = track.current;
    const from = previous.current;
    previous.current = digit;
    if (!element || from === digit) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches) return;
    const animation = element.animate(
      [
        { transform: `translateY(${-from * 1.15}em)` },
        { transform: `translateY(${-nextDigitPosition(from, digit) * 1.15}em)` },
      ],
      { duration: 850, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    );
    const stop = () => {
      if (motion.matches || document.hidden) animation.cancel();
    };
    motion.addEventListener('change', stop);
    document.addEventListener('visibilitychange', stop);
    return () => {
      animation.cancel();
      motion.removeEventListener('change', stop);
      document.removeEventListener('visibilitychange', stop);
    };
  }, [digit]);
  return (
    <span className="count-up-digit" data-digit={digit}>
      <span
        ref={track}
        className="count-up-reel"
        style={{ transform: `translateY(${-digit * 1.15}em)` }}
      >
        {reel.map((value, index) => (
          <span key={index}>{value}</span>
        ))}
      </span>
    </span>
  );
}

export function CountUpTime({ value }: { value: string }) {
  return (
    <span className="count-up-time" aria-hidden="true">
      {Array.from(value, (character, index) =>
        character === ':' ? (
          <span key={index} className="count-up-separator">
            :
          </span>
        ) : (
          <CountUpDigit key={index} digit={Number(character)} />
        ),
      )}
    </span>
  );
}
