import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { BookmarkManager } from '@/features/bookmarks/ui/BookmarkManager';
import { WeatherCard } from '@/features/weather/ui/WeatherCard';
import { CurrencyBoard } from '@/features/market/ui/CurrencyBoard';
import { StickyNotes } from '@/features/notes/ui/StickyNotes';
import { CalendarHero } from '@/features/calendar/ui/CalendarHero';
import { defaultLayout } from '@/features/workspace/layout-model';
import type { WidgetId, LayoutAction } from '@/features/workspace/layout-model';
import { LAYOUT_KEY, readLayout, updateLayout } from '@/features/workspace/layout-store';
import { watchWorkspaceValue } from '@/lib/browser/workspace-storage';
import { Icon } from './ui/Icon';
import type { IconName } from './ui/Icon';
import { useCardChoices, setCardVisibility } from '@/features/workspace/personalization-store';
const titles = {
  calendar: 'تقویم',
  bookmarks: 'بوکمارک‌ها',
  weather: 'آب‌وهوا',
  currencies: 'نرخ بازار',
  notes: 'یادداشت‌ها',
};
const icons: Record<WidgetId, IconName> = {
  calendar: 'calendar',
  bookmarks: 'bookmark',
  weather: 'weather',
  currencies: 'currency',
  notes: 'note',
};
export function WorkspaceSegments() {
  const cardChoices = useCardChoices();
  const [layout, setLayout] = useState(defaultLayout);
  const [editing, setEditing] = useState(false);
  const [dragging, setDragging] = useState<WidgetId | null>(null);
  const [target, setTarget] = useState<WidgetId | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  useEffect(() => {
    let alive = true;
    let revision = 0;
    async function load() {
      const current = ++revision;
      try {
        const value = await readLayout();
        if (alive && current === revision) {
          setLayout(value);
          setReady(true);
        }
      } catch {
        if (alive) setError('خواندن چیدمان انجام نشد؛ صفحه را دوباره باز کن.');
      }
    }
    void load();
    const stop = watchWorkspaceValue(LAYOUT_KEY, () => {
      void load();
    });
    return () => {
      alive = false;
      stop();
    };
  }, []);
  async function change(action: LayoutAction) {
    if (!ready || busy) return;
    setBusy(true);
    try {
      if (action.type === 'visibility') await setCardVisibility(action.id, !cardChoices[action.id]);
      else {
        setLayout(await updateLayout(action));
        if (action.type === 'reset') {
          for (const widget of defaultLayout().widgets) await setCardVisibility(widget.id, true);
        }
      }
      setError('');
      setStatus('چیدمان ذخیره شد.');
    } catch {
      setError('چیدمان ذخیره نشد؛ دوباره تلاش کن.');
    } finally {
      setBusy(false);
      setDragging(null);
      setTarget(null);
    }
  }
  const cards = {
    calendar: <CalendarHero />,
    bookmarks: <BookmarkManager />,
    weather: <WeatherCard />,
    currencies: <CurrencyBoard />,
    notes: <StickyNotes />,
  };
  const displayedWidgets = layout.widgets.map((w) => ({ ...w, hidden: !cardChoices[w.id] }));
  const visible = displayedWidgets.filter((w) => !w.hidden);
  return (
    <div className={`workspace-layout ${editing ? 'is-editing' : ''}`}>
      <div className="layout-toolbar">
        <div>
          <span className="eyebrow">فضای شخصی تو</span>
          <p className="helper-text">
            {editing
              ? 'کارت‌ها را جابه‌جا کن و اندازهٔ دلخواهت را انتخاب کن.'
              : 'همه‌چیز، به سلیقهٔ خودت.'}
          </p>
        </div>
        <div className="layout-actions">
          {editing && (
            <>
              {displayedWidgets.map((w) => (
                <button
                  key={w.id}
                  className="icon-button"
                  disabled={!ready || busy}
                  aria-pressed={!w.hidden}
                  aria-label={`${w.hidden ? 'نمایش' : 'پنهان‌کردن'} ${titles[w.id]}`}
                  title={`${w.hidden ? 'نمایش' : 'پنهان‌کردن'} ${titles[w.id]}`}
                  onClick={() => {
                    void change({ type: 'visibility', id: w.id });
                  }}
                >
                  <Icon name={icons[w.id]} />
                </button>
              ))}
              <button
                className="icon-button"
                disabled={!ready || busy}
                aria-label="بازنشانی چیدمان"
                title="بازنشانی چیدمان"
                onClick={() => {
                  void change({ type: 'reset' });
                }}
              >
                <Icon name="refresh" />
              </button>
            </>
          )}
          <button
            className="icon-button layout-edit"
            disabled={!ready || busy}
            aria-pressed={editing}
            aria-label={editing ? 'پایان شخصی‌سازی' : 'شخصی‌سازی صفحه'}
            title={editing ? 'پایان شخصی‌سازی' : 'شخصی‌سازی صفحه'}
            onClick={() => setEditing(!editing)}
          >
            <Icon name={editing ? 'check' : 'settings'} />
          </button>
        </div>
      </div>
      {error && <p role="alert">{error}</p>}
      <span className="sr-only" role="status">
        {status}
      </span>
      {visible.length === 0 && (
        <p className="helper-text">
          همهٔ بخش‌ها پنهان‌اند؛ از شخصی‌سازی، بخش دلخواهت را نمایش بده.
        </p>
      )}
      <div className="workspace-segments">
        {displayedWidgets.map((w) => {
          const index = visible.findIndex((v) => v.id === w.id);
          const controlsDisabled = !ready || busy;
          return (
            <section
              key={w.id}
              hidden={w.hidden}
              className={`workspace-segment widget-${w.id} ${w.tall ? 'widget-tall' : ''} ${dragging === w.id ? 'is-dragging' : ''} ${target === w.id ? 'is-drop-target' : ''}`}
              style={{ '--widget-span': w.width } as CSSProperties}
              aria-label={titles[w.id]}
              onDragOver={(event) => {
                if (editing && dragging && dragging !== w.id) {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                  setTarget(w.id);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (editing && dragging) void change({ type: 'move', from: dragging, to: w.id });
              }}
            >
              <header className="segment-header">
                <Icon name={icons[w.id]} />
                <h2>{titles[w.id]}</h2>
                {editing && (
                  <div className="segment-controls">
                    <button
                      className="icon-button segment-grip"
                      draggable={!controlsDisabled}
                      disabled={controlsDisabled}
                      aria-label={`جابه‌جایی ${titles[w.id]}`}
                      title="بکش و روی کارت مقصد رها کن"
                      onDragStart={(event) => {
                        setDragging(w.id);
                        event.dataTransfer.setData('text/plain', w.id);
                        event.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragEnd={() => {
                        setDragging(null);
                        setTarget(null);
                      }}
                    >
                      <Icon name="grip" />
                    </button>
                    <button
                      className="icon-button"
                      disabled={controlsDisabled || index === 0}
                      aria-label={`${titles[w.id]} به قبل`}
                      title="جابه‌جایی به قبل"
                      onClick={() => {
                        void change({
                          type: 'move',
                          from: w.id,
                          to: visible[index - 1]?.id ?? w.id,
                        });
                      }}
                    >
                      <Icon name="up" />
                    </button>
                    <button
                      className="icon-button"
                      disabled={controlsDisabled || index === visible.length - 1}
                      aria-label={`${titles[w.id]} به بعد`}
                      title="جابه‌جایی به بعد"
                      onClick={() => {
                        void change({
                          type: 'move',
                          from: w.id,
                          to: visible[index + 1]?.id ?? w.id,
                        });
                      }}
                    >
                      <Icon name="down" />
                    </button>
                    <button
                      className="icon-button"
                      disabled={controlsDisabled}
                      aria-label={`تغییر عرض ${titles[w.id]}`}
                      title={`تغییر عرض؛ اکنون ${w.width === 12 ? 'تمام صفحه' : w.width === 8 ? 'دو سوم' : w.width === 6 ? 'نصف' : 'یک سوم'}`}
                      onClick={() => {
                        void change({ type: 'width', id: w.id });
                      }}
                    >
                      <Icon name="resize" />
                    </button>
                    <button
                      className="icon-button"
                      disabled={controlsDisabled}
                      aria-pressed={w.tall}
                      aria-label={`تغییر ارتفاع ${titles[w.id]}`}
                      title="تغییر ارتفاع کارت"
                      onClick={() => {
                        void change({ type: 'height', id: w.id });
                      }}
                    >
                      <Icon name="height" />
                    </button>
                  </div>
                )}
              </header>
              <div className="segment-body">{cards[w.id]}</div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
