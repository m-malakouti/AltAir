import { parseOrder } from './workspace-model';
export const widgetIds = ['calendar', 'bookmarks', 'weather', 'currencies', 'notes'] as const;
export type WidgetId = (typeof widgetIds)[number];
export const widths = [4, 6, 8, 12] as const;
export type Width = (typeof widths)[number];
export interface WidgetLayout {
  id: WidgetId;
  width: Width;
  tall: boolean;
  hidden: boolean;
}
export interface Layout {
  version: 2;
  widgets: WidgetLayout[];
}
const defaults: Record<WidgetId, Width> = {
  calendar: 8,
  bookmarks: 4,
  weather: 4,
  currencies: 4,
  notes: 4,
};
export function defaultLayout(): Layout {
  return {
    version: 2,
    widgets: widgetIds.map((id) => ({ id, width: defaults[id], tall: false, hidden: false })),
  };
}
export function parseLayout(value: unknown, legacy?: unknown): Layout {
  if (value == null) {
    const order: WidgetId[] = ['calendar', ...parseOrder(legacy)];
    return {
      version: 2,
      widgets: order.map((id) => ({ id, width: defaults[id], tall: false, hidden: false })),
    };
  }
  if (
    typeof value !== 'object' ||
    !('version' in value) ||
    value.version !== 2 ||
    !('widgets' in value) ||
    !Array.isArray(value.widgets)
  )
    throw new Error('Invalid workspace layout');
  const result: WidgetLayout[] = [];
  for (const raw of value.widgets as unknown[]) {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid widget');
    const item = raw as Record<string, unknown>;
    if (!widgetIds.includes(item.id as WidgetId) || result.some((w) => w.id === item.id)) continue;
    result.push({
      id: item.id as WidgetId,
      width: widths.includes(item.width as Width)
        ? (item.width as Width)
        : defaults[item.id as WidgetId],
      tall: item.tall === true,
      hidden: item.hidden === true,
    });
  }
  for (const widget of defaultLayout().widgets)
    if (!result.some((w) => w.id === widget.id)) result.push(widget);
  return { version: 2, widgets: result };
}
export type LayoutAction =
  | { type: 'move'; from: WidgetId; to: WidgetId }
  | { type: 'width' | 'height' | 'visibility'; id: WidgetId }
  | { type: 'reset' };
export function changeLayout(layout: Layout, action: LayoutAction): Layout {
  if (action.type === 'reset') return defaultLayout();
  if (action.type === 'move') {
    const from = layout.widgets.find((w) => w.id === action.from);
    if (!from || action.from === action.to) return layout;
    const widgets = layout.widgets.filter((w) => w.id !== action.from);
    widgets.splice(
      layout.widgets.findIndex((w) => w.id === action.to),
      0,
      from,
    );
    return { version: 2, widgets };
  }
  return {
    version: 2,
    widgets: layout.widgets.map((w) =>
      w.id !== action.id
        ? w
        : action.type === 'width'
          ? { ...w, width: widths[(widths.indexOf(w.width) + 1) % widths.length] ?? 4 }
          : action.type === 'height'
            ? { ...w, tall: !w.tall }
            : { ...w, hidden: !w.hidden },
    ),
  };
}
