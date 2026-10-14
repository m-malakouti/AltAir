import { useId, useSyncExternalStore } from 'react';
import { backgroundOptions } from '@/features/appearance/background';
import {
  getBackground,
  setBackground,
  subscribeBackground,
} from '@/features/appearance/background-store';
import { Notice } from './ui/Notice';

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
              style={id === 'custom' ? { background: preference.color } : undefined}
              aria-hidden="true"
            />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>
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
