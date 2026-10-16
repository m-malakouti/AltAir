import { describe, expect, it } from 'vitest';
import { parseBackground } from './background';

describe('background preference', () => {
  it.each(['damavand', 'hyrcanian', 'lut', 'hormuz'])(
    'restores the bundled %s photo selection',
    (id) => {
      expect(
        parseBackground(JSON.parse(JSON.stringify({ id, color: '#182341' })) as unknown),
      ).toEqual({ id, color: '#182341' });
    },
  );
  it('defaults missing or invalid persisted values', () => {
    for (const value of [null, undefined, 42, { id: 'unknown', color: 'url(bad)' }]) {
      expect(parseBackground(value)).toEqual({ id: 'sky', color: '#182341' });
    }
  });
  it('preserves a selected background and validates custom colors', () => {
    expect(parseBackground({ id: 'custom', color: '#Ab12ef' })).toEqual({
      id: 'custom',
      color: '#Ab12ef',
    });
    expect(parseBackground({ id: 'plain', color: '#fff' })).toEqual({
      id: 'plain',
      color: '#182341',
    });
  });
});
