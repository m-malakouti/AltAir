import { describe, expect, it } from 'vitest';
import { nextDigitPosition } from './clock-digits';

describe('clock digit count up', () => {
  it.each([
    [0, 7, 7],
    [4, 5, 5],
    [9, 0, 10],
    [5, 0, 10],
    [3, 2, 12],
    [7, 7, 7],
  ])('counts forward from %i to %i at reel row %i', (previous, next, expected) => {
    expect(nextDigitPosition(previous, next)).toBe(expected);
  });
});
