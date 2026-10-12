import { expect, it } from 'vitest';
import { dailyChangePercent } from './daily-change';
it.each([
  [110, 10, 10],
  [90, -10, -10],
  [100, 0, 0],
  [263500, -1500, (-1500 / 265000) * 100],
])('uses the previous price for %s and %s', (price, change, expected) => {
  expect(dailyChangePercent(price, change)).toBeCloseTo(expected);
});
it.each([null, undefined, NaN, Infinity, 100, 200])(
  'does not invent a percent for invalid change %s',
  (change) => {
    expect(dailyChangePercent(100, change)).toBeNull();
  },
);
