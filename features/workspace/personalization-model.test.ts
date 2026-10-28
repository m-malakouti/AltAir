import { describe, expect, it } from 'vitest';
import {
  defaultCardChoices,
  parseCardChoices,
  parseInterests,
  suggestedCards,
} from './card-catalog';
import { defaultCompanionSettings, parseCompanionSettings } from './companion-settings';
describe('workspace personalization', () => {
  it('keeps an intentionally empty workspace and drops unknown interests', () => {
    const cards = defaultCardChoices();
    for (const key of Object.keys(cards) as (keyof typeof cards)[]) cards[key] = false;
    expect(parseCardChoices(cards)).toEqual(cards);
    const legacy = Object.fromEntries(Object.entries(cards).filter(([id]) => id !== 'portfolio'));
    expect(parseCardChoices(legacy).portfolio).toBe(false);
    expect(parseInterests(['sports', 'sports', 'unknown', 'finance'])).toEqual([
      'finance',
      'sports',
    ]);
  });
  it('suggests relevant cards only when requested', () => {
    const cards = suggestedCards(['sports']);
    expect(cards.scores).toBe(true);
    expect(cards.currencies).toBe(false);
    expect(suggestedCards([])).toEqual(defaultCardChoices());
  });
  it('keeps Puffy disabled on absent or malformed policy', () => {
    expect(defaultCompanionSettings.enabled).toBe(false);
    for (const raw of [
      null,
      {},
      { ...defaultCompanionSettings, enabled: true, horizontalRange: 1000 },
    ])
      expect(parseCompanionSettings(raw).enabled).toBe(false);
    expect(
      parseCompanionSettings({ ...defaultCompanionSettings, enabled: true, horizontalRange: 0 }),
    ).toMatchObject({ enabled: true, horizontalRange: 0 });
  });
});
