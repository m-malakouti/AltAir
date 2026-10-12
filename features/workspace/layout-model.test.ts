import { describe, expect, it } from 'vitest';
import { changeLayout, defaultLayout, parseLayout } from './layout-model';
describe('custom workspace layout', () => {
  it('migrates saved order and adds the calendar hero', () => {
    expect(
      parseLayout(null, ['notes', 'weather', 'currencies', 'bookmarks']).widgets.map((w) => w.id),
    ).toEqual(['calendar', 'notes', 'weather', 'currencies', 'bookmarks']);
  });
  it('normalizes duplicate widgets and unsafe width values', () => {
    const layout = parseLayout({
      version: 2,
      widgets: [
        { id: 'notes', width: 999 },
        { id: 'notes', width: 6 },
        { id: 'invalid', width: 4 },
      ],
    });
    expect(layout.widgets).toHaveLength(5);
    expect(layout.widgets[0]).toMatchObject({ id: 'notes', width: 4 });
  });
  it('preserves sizes and visibility when moving cards', () => {
    let layout = changeLayout(defaultLayout(), { type: 'width', id: 'notes' });
    layout = changeLayout(layout, { type: 'visibility', id: 'weather' });
    layout = changeLayout(layout, { type: 'move', from: 'notes', to: 'calendar' });
    expect(layout.widgets[0]).toMatchObject({ id: 'notes', width: 6 });
    expect(layout.widgets.find((w) => w.id === 'weather')?.hidden).toBe(true);
  });
  it('cycles width, toggles height and restores defaults', () => {
    let layout = defaultLayout();
    for (let i = 0; i < 4; i++) layout = changeLayout(layout, { type: 'width', id: 'calendar' });
    expect(layout).toEqual(defaultLayout());
    layout = changeLayout(layout, { type: 'height', id: 'calendar' });
    expect(layout.widgets[0]?.tall).toBe(true);
    expect(changeLayout(layout, { type: 'reset' })).toEqual(defaultLayout());
  });
  it('preserves an intentionally all-hidden layout across reloads', () => {
    const layout = defaultLayout();
    layout.widgets.forEach((w) => {
      w.hidden = true;
    });
    expect(parseLayout(layout).widgets.every((w) => w.hidden)).toBe(true);
    expect(() => parseLayout({ version: 99, widgets: [] })).toThrow();
  });
});
