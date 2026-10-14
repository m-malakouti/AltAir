import { useEffect, useState, type CSSProperties } from 'react';

const formatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Tehran',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

// Original implementation inspired by https://codepen.io/anon/pen/NWGromV.
export function WorkspaceClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const update = () => setNow(new Date());
    const timer = window.setInterval(update, 60_000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  const parts = formatter.formatToParts(now);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  const hour = read('hour');
  const minute = read('minute');
  const second = read('second') + now.getMilliseconds() / 1000;
  const elapsed = (hour % 12) * 3600 + minute * 60 + second;
  const style = {
    '--hour-delay': `${-elapsed}s`,
    '--minute-delay': `${-(minute * 60 + second)}s`,
    '--second-delay': `${-second}s`,
    '--hour-sector': `${(hour % 12) * 30}deg`,
  } as CSSProperties;
  return (
    <div className="workspace-clock">
      <div
        key={now.getTime()}
        className="grid-clock"
        style={style}
        role="img"
        aria-label={`ساعت ${hour}:${String(minute).padStart(2, '0')} به وقت تهران`}
      >
        <div className="grid-clock-sector" aria-hidden="true">
          <span style={{ transform: `rotate(${-((hour % 12) * 30)}deg)` }}>
            {String(hour % 12 || 12).padStart(2, '0')}
          </span>
        </div>
        <span className="grid-clock-hand grid-clock-hand--hour" aria-hidden="true" />
        <span className="grid-clock-hand grid-clock-hand--minute" aria-hidden="true" />
        <span className="grid-clock-hand grid-clock-hand--second" aria-hidden="true" />
        <span className="grid-clock-pin" aria-hidden="true" />
      </div>
    </div>
  );
}
