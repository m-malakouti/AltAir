import { useId, useSyncExternalStore } from 'react';
import { backgroundOptions } from '@/features/appearance/background';
import {
  getBackground,
  setBackground,
  subscribeBackground,
} from '@/features/appearance/background-store';
import { Notice } from './ui/Notice';
import { backgroundPhotos } from '@/features/appearance/background-photos';
import { Icon } from './ui/Icon';

export function BackgroundSelector() {
  const preference = useSyncExternalStore(subscribeBackground, getBackground);
  const name = useId();
  return (
    <div className="background-settings">
      <fieldset className="background-selector">
        <legend>پس‌زمینه</legend>
        {backgroundOptions.map(({ id, label }) => (
          <label key={id} className="background-option">
            <input
              type="radio"
              name={name}
              checked={preference.id === id}
              onChange={() => setBackground({ id, color: preference.color })}
            />
            <span
              className={`background-preview background-preview--${id}`}
              style={
                backgroundPhotos.some((photo) => photo.id === id)
                  ? { background: `url("/backgrounds/${id}-thumb.jpg") center / cover` }
                  : id === 'custom'
                    ? { background: preference.color }
                    : undefined
              }
              aria-hidden="true"
            />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>
      <p className="helper-text">چهار منظرهٔ ایران، آماده و آفلاین.</p>
      <details className="background-credits">
        <summary
          className="icon-button"
          aria-label="عکاس‌ها و منبع تصاویر"
          title="عکاس‌ها و منبع تصاویر"
        >
          <Icon name="info" />
        </summary>
        <ul>
          {backgroundPhotos.map((photo) => (
            <li key={photo.id}>
              <a href={photo.source} target="_blank" rel="noopener noreferrer">
                {photo.label}
              </a>
              {' · '}
              {photo.author}
              {' · '}
              <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer">
                {photo.license}
              </a>
            </li>
          ))}
        </ul>
        <p>
          تصاویر برای حجم کمتر تغییر اندازه و فشرده شده‌اند؛ نمایش پس‌زمینه با برش متناسب با صفحه و
          لایهٔ خوانایی انجام می‌شود.
        </p>
      </details>
      <label className="background-color">
        رنگ دلخواه
        <input
          type="color"
          value={preference.color}
          onChange={(event) => setBackground({ id: 'custom', color: event.target.value })}
        />
      </label>
      {preference.error && <Notice>{preference.error}</Notice>}
    </div>
  );
}
