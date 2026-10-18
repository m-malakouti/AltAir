import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { PuffyCompanion } from './PuffyCompanion';
import { Icon } from './ui/Icon';
import {
  readWorkspaceValue,
  watchWorkspaceValue,
  writeWorkspaceValue,
} from '@/lib/browser/workspace-storage';
import {
  clampPuffy,
  parsePuffyPosition,
  PUFFY_POSITION_KEY,
  type PuffyPosition,
} from '@/features/workspace/puffy-position';

const viewport = () => ({ width: window.innerWidth, height: window.innerHeight });
export function PuffyHabitat({ active = true }: { active?: boolean }) {
  const [position, setPosition] = useState<PuffyPosition | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ offsetX: number; offsetY: number; position: PuffyPosition } | null>(null);
  const homeButton = useRef<HTMLButtonElement>(null);
  const grip = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const found = parsePuffyPosition(await readWorkspaceValue(PUFFY_POSITION_KEY));
        if (alive && !drag.current) setPosition(found ? clampPuffy(found, viewport()) : null);
      } catch {
        if (alive) setError('جای پوفی ذخیره نشده؛ دوباره جابه‌جایش کن.');
      }
    };
    void load();
    const stop = watchWorkspaceValue(PUFFY_POSITION_KEY, () => {
      void load();
    });
    const resize = () =>
      setPosition((current) => (current ? clampPuffy(current, viewport()) : null));
    window.addEventListener('resize', resize);
    return () => {
      alive = false;
      stop();
      window.removeEventListener('resize', resize);
    };
  }, []);
  const save = useCallback(async (next: PuffyPosition | null) => {
    try {
      await writeWorkspaceValue(PUFFY_POSITION_KEY, next);
      setError('');
    } catch {
      setError('جای پوفی ذخیره نشد؛ دوباره تلاش کن.');
    }
  }, []);
  useEffect(() => {
    if (!dragging) return;
    const move = (event: globalThis.PointerEvent) => {
      if (!drag.current) return;
      const next = clampPuffy(
        { x: event.clientX - drag.current.offsetX, y: event.clientY - drag.current.offsetY },
        viewport(),
      );
      drag.current.position = next;
      setPosition(next);
    };
    const end = () => {
      const next = drag.current?.position;
      drag.current = null;
      setDragging(false);
      if (next) void save(next);
      grip.current?.focus();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, [dragging, save]);
  const start = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || !frame.current) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = frame.current.getBoundingClientRect();
    const next = clampPuffy(position ?? { x: rect.left, y: rect.top }, viewport());
    drag.current = {
      offsetX: event.clientX - next.x,
      offsetY: event.clientY - next.y,
      position: next,
    };
    setPosition(next);
    setDragging(true);
  };
  const dock = () => {
    drag.current = null;
    setDragging(false);
    setPosition(null);
    void save(null);
    queueMicrotask(() => grip.current?.focus());
  };
  const keyboard = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape' || event.key === 'Home') {
      event.preventDefault();
      event.stopPropagation();
      dock();
      return;
    }
    const directions: Record<string, PuffyPosition> = {
      ArrowLeft: { x: -24, y: 0 },
      ArrowRight: { x: 24, y: 0 },
      ArrowUp: { x: 0, y: -24 },
      ArrowDown: { x: 0, y: 24 },
    };
    const delta = directions[event.key];
    if (!delta || !frame.current) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = frame.current.getBoundingClientRect();
    const previous = position ?? { x: rect.left, y: rect.top };
    const next = clampPuffy({ x: previous.x + delta.x, y: previous.y + delta.y }, viewport());
    setPosition(next);
    void save(next);
    queueMicrotask(() => grip.current?.focus());
  };
  const character = (
    <div
      ref={frame}
      className={`puffy-habitat${position ? ' puffy-habitat--floating' : ''}${dragging ? ' puffy-habitat--dragging' : ''}`}
      style={position ? { left: position.x, top: position.y } : undefined}
      hidden={!active}
    >
      <div className="puffy-habitat-toolbar">
        <span>
          پوفی <small>رفیق فضای تو</small>
        </span>
        <div>
          <button
            ref={grip}
            type="button"
            onPointerDown={start}
            onKeyDown={keyboard}
            title="جابه‌جایی پوفی؛ بکش یا از کلیدهای جهت استفاده کن"
            aria-label="جابه‌جایی پوفی"
          >
            <Icon name="grip" />
          </button>
          {position && (
            <button
              type="button"
              onClick={dock}
              title="برگشت پوفی کنار جستجو"
              aria-label="بازگشت پوفی به خانه"
            >
              <Icon name="home" />
            </button>
          )}
        </div>
      </div>
      <PuffyCompanion active={active && !dragging} />
      {error && (
        <p className="puffy-position-error" role="status">
          {error}
        </p>
      )}
    </div>
  );
  return (
    <div className={`puffy-home${position ? ' puffy-home--away' : ''}`}>
      {position ? (
        <>
          <button ref={homeButton} className="puffy-call-home" type="button" onClick={dock}>
            <Icon name="home" />
            <span>پوفی، بیا اینجا!</span>
          </button>
          {createPortal(character, document.body)}
        </>
      ) : (
        character
      )}
    </div>
  );
}
