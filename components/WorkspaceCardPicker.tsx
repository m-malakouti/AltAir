import { useState } from 'react';
import { cardCatalog, type CardChoices, type CardId } from '@/features/workspace/card-catalog';
import { setCardVisibility } from '@/features/workspace/personalization-store';
import { Icon } from './ui/Icon';

export function WorkspaceCardPicker({
  choices,
  available,
}: {
  choices: CardChoices;
  available: string[];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function change(id: CardId, enabled: boolean) {
    setBusy(true);
    try {
      await setCardVisibility(id, enabled);
      setError('');
    } catch {
      setError('انتخاب کارت ذخیره نشد؛ دوباره تلاش کن.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="free-card-picker">
      <summary className="button button--ghost">
        <Icon name="grid" />
        نمایش کارت‌ها
      </summary>
      <div className="free-card-picker-menu">
        {cardCatalog
          .filter((card) => available.includes(card.id))
          .map((card) => (
            <label key={card.id}>
              <input
                type="checkbox"
                checked={choices[card.id]}
                disabled={busy}
                onChange={(event) => void change(card.id, event.target.checked)}
              />
              {card.title}
            </label>
          ))}
        {error && <p role="alert">{error}</p>}
      </div>
    </details>
  );
}
