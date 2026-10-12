import { describe, expect, it } from 'vitest';
import { parseOrder, moveSegment } from './workspace-model';
describe('workspace order', () => {
  it('recovers missing sections without duplicates or unknown IDs', () => {
    expect(parseOrder(['notes', 'notes', 'unknown'])).toEqual([
      'notes',
      'bookmarks',
      'weather',
      'currencies',
    ]);
  });
  it('moves in both directions and preserves all cards', () => {
    const original = parseOrder(null);
    const moved = moveSegment(original, 'bookmarks', 'notes');
    expect(moved).toEqual(['weather', 'currencies', 'notes', 'bookmarks']);
    expect(moveSegment(moved, 'bookmarks', 'weather')).toEqual(original);
  });
});
