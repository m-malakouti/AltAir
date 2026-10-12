import { describe, expect, it } from 'vitest';
import { parseNotes } from './notes-store';
describe('saved notes validation', () => {
  it('preserves text literally', () => {
    const note = { id: 'one', text: '<script>hello</script>\nیادداشت', color: 'yellow' };
    expect(parseNotes([note])).toEqual([note]);
  });
  it('rejects corrupted data instead of overwriting it', () => {
    expect(() => parseNotes([{ id: 'one', text: 123, color: 'yellow' }])).toThrow();
    expect(() =>
      parseNotes([
        { id: 'one', text: 'a', color: 'yellow' },
        { id: 'one', text: 'b', color: 'blue' },
      ]),
    ).toThrow();
  });
});
