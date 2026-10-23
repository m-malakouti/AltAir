import { useEffect, useRef, useState, type PointerEvent, type KeyboardEvent } from 'react';

/** Keep the character inside its card; the pointer is the suspension pivot. */
export function usePuffyDrag(active: boolean, onRelease: () => void, horizontalRange = 48) {
  const stage = useRef<HTMLDivElement>(null);
  const actor = useRef<HTMLDivElement>(null);
  const [held, setHeld] = useState(false);
  const gesture = useRef<{
    id: number;
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
    lastX: number;
    moved: boolean;
    previousLeft: string;
    previousTop: string;
  } | null>(null);
  const suppressClick = useRef(false);
  const release = useRef(onRelease);
  useEffect(() => {
    release.current = onRelease;
  }, [onRelease]);

  useEffect(() => {
    const area = stage.current;
    const character = actor.current;
    if (!area || !character) return;
    const measure = () => {
      const width = area.clientWidth;
      const room = Math.max(0, width - character.offsetWidth - 24);
      const x = Math.max(12, Math.min(parseFloat(character.style.left) || 12, room + 12));
      character.style.left = `${x}px`;
      character.style.top = `${Math.max(12, area.clientHeight - character.offsetHeight - 12)}px`;
      area.style.setProperty(
        '--roam-range',
        `${Math.min(horizontalRange, Math.max(0, room + 12 - x))}px`,
      );
      area.style.setProperty('--travel', `${Math.min(36, Math.max(0, room + 12 - x))}px`);
    };
    const end = () => {
      const drag = gesture.current;
      if (!drag) return;
      suppressClick.current = drag.moved;
      gesture.current = null;
      setHeld(false);
      if (drag.moved) {
        measure();
        release.current();
      } else {
        character.style.left = drag.previousLeft;
        character.style.top = drag.previousTop;
      }
    };
    const move = (event: globalThis.PointerEvent) => {
      const drag = gesture.current;
      if (!drag || event.pointerId !== drag.id) return;
      const box = area.getBoundingClientRect();
      drag.moved ||= Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 4;
      const x = Math.max(
        12,
        Math.min(event.clientX - box.left - drag.offsetX, box.width - character.offsetWidth - 12),
      );
      const y = Math.max(
        12,
        Math.min(event.clientY - box.top - drag.offsetY, box.height - character.offsetHeight - 12),
      );
      character.style.left = `${x}px`;
      character.style.top = `${y}px`;
      character.style.setProperty(
        '--hang-angle',
        `${Math.max(-16, Math.min(16, (drag.lastX - event.clientX) * 0.7))}deg`,
      );
      drag.lastX = event.clientX;
    };
    const pointerEnd = (event: globalThis.PointerEvent) => {
      if (event.pointerId === gesture.current?.id) end();
    };
    const key = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && gesture.current) {
        event.preventDefault();
        end();
      }
    };
    const visibility = () => {
      if (document.hidden) end();
    };
    const resize = () => {
      end();
      measure();
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    observer?.observe(area);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', pointerEnd);
    window.addEventListener('pointercancel', pointerEnd);
    window.addEventListener('blur', end);
    window.addEventListener('keydown', key);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      end();
      observer?.disconnect();
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', pointerEnd);
      window.removeEventListener('pointercancel', pointerEnd);
      window.removeEventListener('blur', end);
      window.removeEventListener('keydown', key);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [active, horizontalRange]);

  const start = (event: PointerEvent<HTMLButtonElement>) => {
    if (!active || event.button !== 0 || gesture.current || !actor.current || !stage.current)
      return;
    event.stopPropagation();
    const motion = event.currentTarget.getBoundingClientRect();
    const area = stage.current.getBoundingClientRect();
    const offsetX = event.clientX - motion.left;
    const offsetY = event.clientY - motion.top;
    const previousLeft = actor.current.style.left;
    const previousTop = actor.current.style.top;
    actor.current.style.left = `${motion.left - area.left}px`;
    actor.current.style.top = `${motion.top - area.top}px`;
    actor.current.style.setProperty('--grip-x', `${offsetX}px`);
    actor.current.style.setProperty('--grip-y', `${offsetY}px`);
    actor.current.style.setProperty('--hang-angle', '0deg');
    gesture.current = {
      id: event.pointerId,
      offsetX,
      offsetY,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      moved: false,
      previousLeft,
      previousTop,
    };
    suppressClick.current = false;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setHeld(true);
  };
  const keyboard = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (
      !active ||
      !actor.current ||
      !stage.current ||
      !['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key)
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    const room = Math.max(12, stage.current.clientWidth - actor.current.offsetWidth - 12);
    const current = parseFloat(actor.current.style.left) || 12;
    const x =
      event.key === 'Home'
        ? 12
        : Math.max(12, Math.min(room, current + (event.key === 'ArrowLeft' ? -20 : 20)));
    actor.current.style.left = `${x}px`;
    stage.current.style.setProperty(
      '--roam-range',
      `${Math.min(horizontalRange, Math.max(0, room - x))}px`,
    );
    stage.current.style.setProperty('--travel', `${Math.min(36, Math.max(0, room - x))}px`);
    release.current();
  };
  const consumeDragClick = () => {
    const consumed = suppressClick.current;
    suppressClick.current = false;
    return consumed;
  };
  return { stage, actor, held, start, keyboard, consumeDragClick };
}
