import { describe, expect, it } from 'vitest';
import {
  boardSize,
  clampCard,
  defaultCardBoxes,
  emptyFreeLayout,
  freeCardIds,
  moveFreeCard,
  parseFreeLayout,
  placedCardBoxes,
  relativePosition,
} from './free-layout-model';

describe('free card positions', () => {
  it('validates saved positions and never silently replaces an unknown version', () => {
    expect(parseFreeLayout(null)).toEqual(emptyFreeLayout());
    expect(() => parseFreeLayout({ version: 2, views: {} })).toThrow();
    for (const position of [
      { x: NaN, y: 24, z: 1 },
      { x: 2, y: 24, z: 1 },
      { x: 0, y: -1, z: 1 },
      { x: 0, y: 24, z: 100 },
    ]) {
      expect(() =>
        parseFreeLayout({
          ...emptyFreeLayout(),
          views: {
            ...emptyFreeLayout().views,
            wide: { notes: position },
          },
        }),
      ).toThrow();
    }
  });
  it('keeps horizontal placement responsive and bounds cards inside the board', () => {
    const position = relativePosition({ x: 400, y: 300 }, 1000, 200);
    expect(position).toEqual({ x: 0.5, y: 300 });
    const defaults = { notes: { x: 0, y: 24, width: 100, height: 80, z: 0 } };
    expect(placedCardBoxes(defaults, { notes: { ...position, z: 1 } }, 500).notes?.x).toBe(200);
    expect(clampCard({ x: -50, y: -20 }, 400, 450)).toEqual({ x: 0, y: 24 });
    expect(relativePosition({ x: 9999, y: 99999 }, 400, 200)).toEqual({ x: 1, y: 20000 });
  });
  it('merges a single move, preserves other screen sizes and keeps stacking bounded', () => {
    let layout = moveFreeCard(emptyFreeLayout(), 'compact', 'clock', { x: 0, y: 400 });
    for (let i = 0; i < 100; i++)
      layout = moveFreeCard(layout, 'wide', freeCardIds[i % freeCardIds.length]!, {
        x: 0.5,
        y: 100 + i,
      });
    expect(layout.views.compact.clock?.y).toBe(400);
    expect(Math.max(...Object.values(layout.views.wide).map((p) => p.z))).toBeLessThanOrEqual(
      freeCardIds.length,
    );
    const removed = moveFreeCard(layout, 'wide', 'clock', null);
    expect(removed.views.wide.clock).toBeUndefined();
    expect(removed.views.compact.clock).toEqual(layout.views.compact.clock);
    expect(layout.views.wide.clock).toBeDefined();
  });
});

describe('default card geometry', () => {
  it.each([390, 760, 900, 1280, 1600])('fits every default card at width %s', (width) => {
    const boxes = defaultCardBoxes(width, {}, [...freeCardIds], 'newtab');
    expect(Object.keys(boxes)).toHaveLength(freeCardIds.length);
    for (const box of Object.values(boxes)) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width + 0.001);
      expect(box.y).toBeGreaterThanOrEqual(24);
      expect(box.width).toBeGreaterThan(0);
    }
  });
  it('lays out changing card heights without overlap and excludes hidden or empty cards', () => {
    const boxes = defaultCardBoxes(
      1280,
      { account: 90, currencies: 800, sidebarAds: 0 },
      [...freeCardIds].filter((id) => id !== 'notes'),
      'newtab',
    );
    expect(boxes.notes).toBeUndefined();
    expect(boxes.sidebarAds).toBeUndefined();
    expect(boxes.portfolio!.y).toBeGreaterThan(boxes.currencies!.y + 800);
    const all = Object.values(boxes);
    for (let i = 0; i < all.length; i++)
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i]!,
          b = all[j]!;
        expect(
          a.x + a.width <= b.x + 0.001 ||
            b.x + b.width <= a.x + 0.001 ||
            a.y + a.height <= b.y ||
            b.y + b.height <= a.y,
        ).toBe(true);
      }
  });
  it('uses the caller order in the panel and distinct responsive presets', () => {
    const boxes = defaultCardBoxes(390, {}, ['portfolio', 'clock'], 'panel');
    expect(boxes.portfolio!.y).toBeLessThan(boxes.clock!.y);
    expect([390, 900, 1280].map(boardSize)).toEqual(['compact', 'medium', 'wide']);
  });
});
