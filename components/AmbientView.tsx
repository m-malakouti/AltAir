import { useEffect, useState } from 'react';
import { getAmbientPhoto } from '@/features/appearance/ambient-photos';
import { CountUpTime } from './CountUpTime';
import { OfflineScene } from './OfflineScene';
import { useConnectivity } from '@/features/workspace/use-connectivity';
import type { ConnectionSnapshot } from '@/lib/browser/connectivity';

const clock = new Intl.DateTimeFormat('en-GB', {
  numberingSystem: 'latn',
  timeZone: 'Asia/Tehran',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function AmbientView() {
  const connection = useConnectivity();
  return <AmbientSurface connection={connection} />;
}

export function AmbientSurface({
  connection,
}: {
  connection: ConnectionSnapshot & { retry: () => void };
}) {
  const [now, setNow] = useState(() => new Date());
  const offline = connection.status !== 'online';
  const photo = getAmbientPhoto(now.getTime());
  useEffect(() => {
    const update = () => setNow(new Date());
    const timer = window.setInterval(update, 1000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return (
    <section
      className={`ambient-view ${offline ? 'ambient-view--offline' : ''}`}
      aria-label="نمای آرام"
    >
      <div
        className="ambient-backdrop"
        style={{ '--ambient-photo': `url("/backgrounds/${photo.id}.jpg")` } as React.CSSProperties}
        aria-hidden="true"
      />
      <div className="ambient-brand" lang="en" dir="ltr">
        AltAir<span>360</span>
      </div>
      <div className="ambient-center">
        <div className="ambient-clock-content">
          <time
            className="ambient-clock"
            dateTime={now.toISOString()}
            aria-label={`ساعت ${clock.format(now)} به وقت تهران`}
            dir="ltr"
          >
            <CountUpTime value={clock.format(now)} />
          </time>
        </div>
        {offline && (
          <OfflineScene
            confirmed={connection.status === 'offline'}
            checking={connection.checking}
            onRetry={connection.retry}
          />
        )}
      </div>
      {!offline && (
        <a
          className="ambient-photo-credit"
          href={photo.source}
          target="_blank"
          rel="noopener noreferrer"
          title={`عکس: ${photo.author} · ${photo.license} · برش متناسب با صفحه و لایهٔ خوانایی`}
        >
          {photo.label}
          <span>
            عکس: <bdi>{photo.author}</bdi> · {photo.license}
          </span>
        </a>
      )}
      {!offline && (
        <a
          className="ambient-photo-license"
          href={photo.licenseUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`مجوز عکس: ${photo.license}`}
        >
          مجوز عکس
        </a>
      )}
    </section>
  );
}
