import { useState } from 'react';

export function BookmarkPreview({ url, title }: { url: string; title: string }) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const address = new URL(url);
  const initial =
    Array.from(title.trim() || address.hostname)[0]?.toLocaleUpperCase('fa-IR') ?? '↗';
  const tone = Array.from(address.hostname).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 4;
  const paths = ['/favicon.ico', '/apple-touch-icon.png'];
  const path = paths[attempt];
  return (
    <div className={`bookmark-preview bookmark-preview--${tone}`} aria-hidden="true">
      <span className="bookmark-preview-orbit" />
      <span className="bookmark-preview-icon">
        <span className={loaded ? 'bookmark-initial bookmark-initial--hidden' : 'bookmark-initial'}>
          {initial}
        </span>
        {path && address.protocol === 'https:' && (
          <img
            key={path}
            src={`${address.origin}${path}`}
            alt=""
            className={loaded ? 'bookmark-favicon bookmark-favicon--loaded' : 'bookmark-favicon'}
            referrerPolicy="no-referrer"
            onLoad={(event) => {
              if (event.currentTarget.naturalWidth > 1 && event.currentTarget.naturalHeight > 1)
                setLoaded(true);
              else {
                setLoaded(false);
                setAttempt((value) => value + 1);
              }
            }}
            onError={() => {
              setLoaded(false);
              setAttempt((value) => value + 1);
            }}
          />
        )}
      </span>
    </div>
  );
}
