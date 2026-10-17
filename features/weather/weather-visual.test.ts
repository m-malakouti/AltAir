import { describe, expect, it } from 'vitest';
import { weatherVisual } from './weather-visual';
describe('ambient weather conditions', () => {
  it('uses the moon for a clear night', () => {
    expect(weatherVisual(0, false)).toBe('moon');
    expect(weatherVisual(0, true)).toBe('sun');
  });
  it.each([71, 73, 75, 77, 85, 86])('uses snow for code %s', (code) =>
    expect(weatherVisual(code, true)).toBe('snow'),
  );
  it.each([51, 56, 61, 65, 67, 80, 82])('uses rain for code %s', (code) =>
    expect(weatherVisual(code, false)).toBe('rain'),
  );
  it('distinguishes storms, fog and missing weather', () => {
    expect(weatherVisual(95, true)).toBe('storm');
    expect(weatherVisual(48, true)).toBe('fog');
    expect(weatherVisual(-1, true)).toBe('unknown');
  });
});
