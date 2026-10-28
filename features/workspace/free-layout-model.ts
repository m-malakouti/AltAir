export const freeCardIds = [
  'date',
  'clock',
  'tasks',
  'search',
  'bookmarks',
  'notes',
  'calendar',
  'weather',
  'scores',
  'account',
  'currencies',
  'portfolio',
  'podcast',
  'sidebarAds',
  'footerAds',
] as const;
export type FreeCardId = (typeof freeCardIds)[number];
export type BoardSize = 'wide' | 'medium' | 'compact';
export type BoardSurface = 'newtab' | 'panel';
export interface CardPosition {
  x: number;
  y: number;
  z: number;
}
export interface FreeLayout {
  version: 1;
  views: Record<BoardSize, Partial<Record<FreeCardId, CardPosition>>>;
}
export interface CardBox {
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
}
export const emptyFreeLayout = (): FreeLayout => ({
  version: 1,
  views: { wide: {}, medium: {}, compact: {} },
});
export const boardSize = (width: number): BoardSize =>
  width >= 1150 ? 'wide' : width >= 760 ? 'medium' : 'compact';
export const maxCardY = 20000;

export function parseFreeLayout(value: unknown): FreeLayout {
  if (value == null) return emptyFreeLayout();
  if (typeof value !== 'object') throw new Error('invalid_free_layout');
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1 || !raw.views || typeof raw.views !== 'object')
    throw new Error('invalid_free_layout');
  const views = raw.views as Record<string, unknown>;
  const result = emptyFreeLayout();
  for (const size of ['wide', 'medium', 'compact'] as const) {
    const view = views[size];
    if (!view || typeof view !== 'object' || Array.isArray(view))
      throw new Error('invalid_free_layout');
    for (const id of freeCardIds) {
      if (!Object.hasOwn(view, id)) continue;
      const position = (view as Record<string, unknown>)[id];
      if (!position || typeof position !== 'object') throw new Error('invalid_card_position');
      const p = position as Record<string, unknown>;
      if (
        typeof p.x !== 'number' ||
        !Number.isFinite(p.x) ||
        p.x < 0 ||
        p.x > 1 ||
        typeof p.y !== 'number' ||
        !Number.isFinite(p.y) ||
        p.y < 24 ||
        p.y > maxCardY ||
        typeof p.z !== 'number' ||
        !Number.isInteger(p.z) ||
        p.z < 1 ||
        p.z > freeCardIds.length
      )
        throw new Error('invalid_card_position');
      result.views[size][id] = { x: p.x, y: p.y, z: p.z };
    }
  }
  return result;
}

export function moveFreeCard(
  layout: FreeLayout,
  size: BoardSize,
  id: FreeCardId,
  position: Pick<CardPosition, 'x' | 'y'> | null,
): FreeLayout {
  const view = { ...layout.views[size] };
  delete view[id];
  const ordered = freeCardIds.filter((key) => view[key]).sort((a, b) => view[a]!.z - view[b]!.z);
  ordered.forEach((key, index) => {
    view[key] = { ...view[key]!, z: index + 1 };
  });
  if (position) view[id] = { ...position, z: ordered.length + 1 };
  return parseFreeLayout({ ...layout, views: { ...layout.views, [size]: view } });
}

export function clampCard(point: { x: number; y: number }, width: number, cardWidth: number) {
  return {
    x: Math.max(0, Math.min(Math.max(0, width - cardWidth), point.x)),
    y: Math.max(24, Math.min(maxCardY, point.y)),
  };
}
export function relativePosition(
  point: { x: number; y: number },
  width: number,
  cardWidth: number,
) {
  const safe = clampCard(point, width, cardWidth);
  return {
    x: Math.round((safe.x / Math.max(1, width - cardWidth)) * 10000) / 10000,
    y: Math.round(safe.y),
  };
}

/** Default independent columns; saved positions are applied after measuring card content. */
export function defaultCardBoxes(
  width: number,
  heights: Partial<Record<FreeCardId, number>>,
  visible: FreeCardId[],
  surface: BoardSurface,
): Partial<Record<FreeCardId, CardBox>> {
  const boxes: Partial<Record<FreeCardId, CardBox>> = {};
  const gap = 32;
  const height = (id: FreeCardId) => heights[id] ?? (id === 'currencies' ? 380 : 160);
  const stack = (ids: FreeCardId[], x: number, y: number, w: number) => {
    for (const id of ids) {
      if (!visible.includes(id)) continue;
      const h = height(id);
      if (id.endsWith('Ads') && h === 0) continue;
      boxes[id] = { x, y, width: w, height: h, z: 0 };
      y += h + gap;
    }
    return y;
  };
  const center: FreeCardId[] = ['search', 'bookmarks'];
  const small: FreeCardId[] = ['notes', 'calendar', 'weather'];
  const left: FreeCardId[] = ['date', 'clock', 'tasks', 'sidebarAds'];
  const right: FreeCardId[] = ['account', 'currencies', 'portfolio', 'podcast'];
  const end: FreeCardId[] = ['scores', 'footerAds'];
  if (surface === 'panel' || boardSize(width) === 'compact') {
    stack(
      surface === 'panel' ? visible : [...center, ...small, ...end, ...left, ...right],
      0,
      24,
      width,
    );
    return boxes;
  }
  const leftWidth = Math.max(190, width * 0.17);
  const rightWidth = boardSize(width) === 'wide' ? Math.max(270, width * 0.22) : 0;
  const centerX = leftWidth + 16;
  const centerWidth = width - centerX - (rightWidth ? rightWidth + 16 : 0);
  stack(left, 0, 24, leftWidth);
  let y = stack(center, centerX, 24, centerWidth);
  const columns = centerWidth < 660 ? 2 : 3;
  const smallWidth = (centerWidth - 12 * (columns - 1)) / columns;
  let bottom = y;
  let column = 0;
  for (const id of small) {
    if (!visible.includes(id)) continue;
    if (column === columns) {
      y = bottom;
      column = 0;
    }
    boxes[id] = {
      x: centerX + column * (smallWidth + 12),
      y,
      width: columns === 2 && id === 'weather' ? centerWidth : smallWidth,
      height: height(id),
      z: 0,
    };
    bottom = Math.max(bottom, y + height(id) + gap);
    column++;
  }
  y = stack(end, centerX, bottom, centerWidth);
  stack(
    right,
    rightWidth ? width - rightWidth : centerX,
    rightWidth ? 24 : y,
    rightWidth || centerWidth,
  );
  return boxes;
}

export function placedCardBoxes(
  defaults: Partial<Record<FreeCardId, CardBox>>,
  saved: FreeLayout['views'][BoardSize],
  width: number,
) {
  const result = { ...defaults };
  for (const id of freeCardIds) {
    const box = defaults[id];
    const position = saved[id];
    if (box && position)
      result[id] = {
        ...box,
        x: position.x * Math.max(0, width - box.width),
        y: position.y,
        z: position.z,
      };
  }
  return result;
}
