import { describe, expect, it } from 'vitest';
import { clampPuffy, parsePuffyPosition } from './puffy-position';
describe('Puffy placement', () => {
  it('keeps the floating character within the viewport after dragging or resizing', () => {
    expect(clampPuffy({ x: 2000, y: 1200 }, { width: 1200, height: 800 })).toEqual({
      x: 828,
      y: 488,
    });
    expect(clampPuffy({ x: -100, y: -20 }, { width: 1200, height: 800 })).toEqual({ x: 12, y: 12 });
    expect(clampPuffy({ x: 800, y: 600 }, { width: 320, height: 400 })).toEqual({ x: 12, y: 88 });
  });
  it('restores only finite coordinates and accepts a home reset', () => {
    expect(parsePuffyPosition({ x: 45, y: 70 })).toEqual({ x: 45, y: 70 });
    for (const value of [null, {}, { x: NaN, y: 4 }, { x: 3, y: Infinity }, { x: '5', y: 2 }])
      expect(parsePuffyPosition(value)).toBeNull();
  });
});
