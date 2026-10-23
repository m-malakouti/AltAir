import { useEffect, useState } from 'react';
import {
  readWorkspaceValue,
  writeWorkspaceValue,
  watchWorkspaceValue,
} from '@/lib/browser/workspace-storage';
import { LAYOUT_KEY, readLayout } from './layout-store';
import {
  defaultCardChoices,
  parseCardChoices,
  parseInterests,
  type CardChoices,
  type CardId,
  type InterestId,
} from './card-catalog';
export const PERSONALIZATION_KEY = 'altAir.workspace.personalization.v1';
interface Personalization {
  cards: CardChoices;
  accounts: Record<string, { interests: InterestId[]; completed: boolean }>;
}
export async function readPersonalization(): Promise<Personalization> {
  const raw = await readWorkspaceValue(PERSONALIZATION_KEY);
  const fallback = defaultCardChoices();
  const layout = await readLayout();
  for (const widget of layout.widgets) fallback[widget.id] = !widget.hidden;
  const item = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const accounts: Personalization['accounts'] = {};
  if (item.accounts && typeof item.accounts === 'object') {
    for (const [key, value] of Object.entries(item.accounts)) {
      if (!value || typeof value !== 'object' || key === '__proto__') continue;
      const account = value as Record<string, unknown>;
      accounts[key] = {
        interests: parseInterests(account.interests),
        completed: account.completed === true,
      };
    }
  }
  return { cards: parseCardChoices(item.cards, fallback), accounts };
}
export async function savePersonalization(
  account: string,
  interests: InterestId[],
  cards: CardChoices,
) {
  await navigator.locks.request(PERSONALIZATION_KEY, async () => {
    const current = await readPersonalization();
    await writeWorkspaceValue(PERSONALIZATION_KEY, {
      cards: parseCardChoices(cards),
      accounts: {
        ...current.accounts,
        [account]: { interests: parseInterests(interests), completed: true },
      },
    });
  });
}
export async function setCardVisibility(id: CardId, enabled: boolean) {
  await navigator.locks.request(PERSONALIZATION_KEY, async () => {
    const current = await readPersonalization();
    await writeWorkspaceValue(PERSONALIZATION_KEY, {
      ...current,
      cards: { ...current.cards, [id]: enabled },
    });
  });
}
export function useCardChoices() {
  const [cards, setCards] = useState(defaultCardChoices);
  useEffect(() => {
    let alive = true;
    let revision = 0;
    const load = async () => {
      const current = ++revision;
      try {
        const saved = await readPersonalization();
        if (alive && current === revision) setCards(saved.cards);
      } catch {
        /* Keep current display until storage recovers. */
      }
    };
    const refresh = () => {
      void load();
    };
    refresh();
    const stop = watchWorkspaceValue(PERSONALIZATION_KEY, refresh);
    const stopLayout = watchWorkspaceValue(LAYOUT_KEY, refresh);
    return () => {
      alive = false;
      stop();
      stopLayout();
    };
  }, []);
  return cards;
}
