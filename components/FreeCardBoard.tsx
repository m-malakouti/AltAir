import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent,
  type KeyboardEvent,
} from 'react';
import { Icon } from './ui/Icon';
import { useFreeLayout } from '@/features/workspace/use-free-layout';
import { saveFreeCard, resetFreeLayout } from '@/features/workspace/free-layout-store';
import {
  boardSize,
  clampCard,
  defaultCardBoxes,
  placedCardBoxes,
  relativePosition,
  type BoardSurface,
  type FreeCardId,
} from '@/features/workspace/free-layout-model';
import './free-card-board.css';

export interface FreeBoardCard {
  id: FreeCardId;
  title: string;
  hidden?: boolean;
  content: ReactNode;
}
type Point = { x: number; y: number };

export function FreeCardBoard({
  cards,
  surface = 'newtab',
  quiet = false,
  ambient = false,
  active = true,
  controls,
}: {
  cards: FreeBoardCard[];
  surface?: BoardSurface;
  quiet?: boolean;
  ambient?: boolean;
  active?: boolean;
  controls?: ReactNode;
}) {
  const { layout, ready, busy, error, reload, save } = useFreeLayout(surface);
  const board = useRef<HTMLDivElement>(null);
  const nodes = useRef(new Map<FreeCardId, HTMLDivElement>());
  const [width, setWidth] = useState(0);
  const [heights, setHeights] = useState<Partial<Record<FreeCardId, number>>>({});
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState<{ id: FreeCardId; point: Point } | null>(null);
  const [message, setMessage] = useState('');
  const gesture = useRef<{
    id: FreeCardId;
    pointer: number;
    start: Point;
    origin: Point;
    scrollY: number;
    width: number;
    boardWidth: number;
    moved: boolean;
    point: Point;
  } | null>(null);
  const instructions = useId();
  const size = boardSize(width);
  const visible = cards
    .filter(
      (card) =>
        !card.hidden && (!quiet || card.id === 'clock') && (!ambient || card.id === 'weather'),
    )
    .map((card) => card.id);
  const defaults = defaultCardBoxes(width, heights, visible, surface);
  const boxes = placedCardBoxes(defaults, quiet || ambient ? {} : layout.views[size], width);
  if (quiet && boxes.clock)
    boxes.clock = {
      ...boxes.clock,
      x: Math.max(0, (width - 460) / 2),
      y: 24,
      width: Math.min(460, width),
    };
  if (preview && boxes[preview.id])
    boxes[preview.id] = { ...boxes[preview.id]!, ...preview.point, z: 30 };
  const extent = Math.max(80, ...Object.values(boxes).map((box) => box.y + box.height + 32));
  const enabled = active && !quiet && !ambient && ready && !busy;
  const cardKey = cards.map((card) => `${card.id}:${Boolean(card.hidden)}`).join('|');

  useLayoutEffect(() => {
    const element = board.current;
    if (!element) return;
    const measure = () => {
      const nextWidth = element.clientWidth;
      if (nextWidth > 0) setWidth(nextWidth);
      const next: Partial<Record<FreeCardId, number>> = {};
      for (const [id, node] of nodes.current) {
        if (node.closest('[hidden]')) continue;
        next[id] = Math.ceil(node.getBoundingClientRect().height);
      }
      setHeights((previous) =>
        Object.entries(next).every(([id, value]) => previous[id as FreeCardId] === value)
          ? previous
          : { ...previous, ...next },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    nodes.current.forEach((node) => observer.observe(node));
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [cardKey, quiet]);

  const cancel = useCallback(() => {
    gesture.current = null;
    setPreview(null);
  }, []);
  useEffect(() => {
    const stop = () => cancel();
    const key = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && gesture.current) {
        event.preventDefault();
        cancel();
      }
    };
    window.addEventListener('blur', stop);
    window.addEventListener('resize', stop);
    window.addEventListener('keydown', key);
    document.addEventListener('visibilitychange', stop);
    return () => {
      if (gesture.current) cancel();
      window.removeEventListener('blur', stop);
      window.removeEventListener('resize', stop);
      window.removeEventListener('keydown', key);
      document.removeEventListener('visibilitychange', stop);
    };
  }, [active, quiet, cancel]);

  async function commit(id: FreeCardId, point: Point | null) {
    const box = boxes[id];
    if (!box || !enabled) {
      cancel();
      return;
    }
    const succeeded = await save(() =>
      saveFreeCard(surface, size, id, point ? relativePosition(point, width, box.width) : null),
    );
    setPreview(null);
    if (succeeded)
      setMessage(`جای ${cards.find((card) => card.id === id)?.title ?? 'کارت'} ذخیره شد.`);
  }
  function start(event: PointerEvent<HTMLButtonElement>, id: FreeCardId) {
    const box = boxes[id];
    if (!enabled || !box || gesture.current || event.button !== 0 || event.isPrimary === false)
      return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    gesture.current = {
      id,
      pointer: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      origin: { x: box.x, y: box.y },
      scrollY: window.scrollY,
      width: box.width,
      boardWidth: width,
      moved: false,
      point: { x: box.x, y: box.y },
    };
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const drag = gesture.current;
    if (!drag || drag.pointer !== event.pointerId) return;
    const dx = event.clientX - drag.start.x;
    const dy = event.clientY - drag.start.y + window.scrollY - drag.scrollY;
    drag.moved ||= Math.hypot(dx, dy) > 4;
    if (!drag.moved) return;
    drag.point = clampCard(
      { x: drag.origin.x + dx, y: drag.origin.y + dy },
      drag.boardWidth,
      drag.width,
    );
    setPreview({ id: drag.id, point: drag.point });
    if (event.clientY > window.innerHeight - 56) window.scrollBy(0, 20);
    else if (event.clientY < 56) window.scrollBy(0, -20);
  }
  function end(event: PointerEvent<HTMLButtonElement>) {
    const drag = gesture.current;
    if (!drag || drag.pointer !== event.pointerId) return;
    gesture.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (drag.moved) void commit(drag.id, drag.point);
    else setPreview(null);
  }
  function keyboard(event: KeyboardEvent<HTMLButtonElement>, id: FreeCardId) {
    if (!enabled || gesture.current) return;
    const box = boxes[id];
    if (!box || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key))
      return;
    event.preventDefault();
    event.stopPropagation();
    const step = event.shiftKey ? 40 : 8;
    void commit(
      id,
      event.key === 'Home'
        ? null
        : {
            x: box.x + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0),
            y: box.y + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0),
          },
    );
  }
  async function reset() {
    cancel();
    if (await save(() => resetFreeLayout(surface))) setMessage('چیدمان اولیه برگشت.');
  }

  return (
    <div
      className={`free-layout ${editing ? 'free-layout--editing' : ''} ${quiet ? 'free-layout--quiet' : ''} ${ambient ? 'free-layout--ambient' : ''}`}
    >
      <div className="free-layout-toolbar" hidden={quiet || ambient}>
        <button
          className="button button--ghost"
          type="button"
          aria-pressed={editing}
          disabled={!ready || busy}
          onClick={() => setEditing((value) => !value)}
        >
          <Icon name={editing ? 'check' : 'grip'} />
          {editing ? 'پایان جابه‌جایی' : 'جابه‌جایی کارت‌ها'}
        </button>
        <button
          className="button button--ghost"
          type="button"
          disabled={busy}
          onClick={() => void reset()}
        >
          <Icon name="undo" />
          بازگشت به چیدمان اولیه
        </button>
        {controls}
        <span role="status" className="free-layout-status">
          {busy ? 'در حال ذخیره…' : message}
        </span>
      </div>
      <p
        id={instructions}
        className={editing ? 'free-layout-help' : 'sr-only'}
        hidden={quiet || ambient}
      >
        کارت را از دستگیره بکش؛ با کلیدهای جهت‌دار هم جابه‌جا می‌شود. Shift حرکت بزرگ‌تر، Home جای
        اولیه و Escape لغو کشیدن است.
      </p>
      {error && !ambient && (
        <p className="free-layout-error" role="alert">
          {error}{' '}
          <button type="button" className="button button--ghost" onClick={() => void reload()}>
            تلاش دوباره
          </button>
        </p>
      )}
      <div
        ref={board}
        className="free-board"
        style={{ height: extent }}
        aria-label="چیدمان کارت‌های میزکار"
      >
        {cards.map((card) => {
          const box = boxes[card.id];
          return (
            <section
              key={card.id}
              data-card-id={card.id}
              aria-label={card.title}
              hidden={
                card.hidden || (quiet && card.id !== 'clock') || (ambient && card.id !== 'weather')
              }
              className={`free-card ${preview?.id === card.id ? 'free-card--dragging' : ''}`}
              style={{
                left: box?.x ?? 0,
                top: box?.y ?? 24,
                width: box?.width ?? '100%',
                zIndex: box?.z ?? 0,
                visibility: width ? undefined : 'hidden',
              }}
            >
              <button
                type="button"
                className="free-card-grip"
                disabled={!enabled}
                hidden={quiet || ambient || !box || box.height === 0}
                aria-label={`جابه‌جایی ${card.title}`}
                aria-describedby={instructions}
                title={`جابه‌جایی ${card.title}`}
                onPointerDown={(event) => start(event, card.id)}
                onPointerMove={move}
                onPointerUp={end}
                onPointerCancel={cancel}
                onLostPointerCapture={() => {
                  if (gesture.current) cancel();
                }}
                onKeyDown={(event) => keyboard(event, card.id)}
              >
                <Icon name="grip" />
                <span>{card.title}</span>
              </button>
              <div
                ref={(node) => {
                  if (node) nodes.current.set(card.id, node);
                  else nodes.current.delete(card.id);
                }}
                className="free-card-content"
              >
                {card.content}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
