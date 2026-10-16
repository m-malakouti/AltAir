import { useId, useLayoutEffect, useRef, useState } from 'react';
import { BookmarkManager } from '@/features/bookmarks/ui/BookmarkManager';
import { CommuteCard } from '@/features/commute/ui/CommuteCard';
import { GoogleLogo } from './GoogleLogo';
import { WebSearch } from './WebSearch';
import { Icon } from './ui/Icon';
import { ActionButton } from './ui/ActionButton';

const slides = [
  { label: 'جست‌وجو و بوکمارک‌ها', icon: 'search' },
  { label: 'رفت‌وآمد من', icon: 'route' },
] as const;

export function WorkspaceCarousel() {
  const [active, setActive] = useState(0);
  const [height, setHeight] = useState<number>();
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const id = useId();
  useLayoutEffect(() => {
    const panel = panels.current[active];
    if (!panel) return;
    const measure = () => setHeight(panel.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [active]);
  const select = (index: number, focus = false) => {
    setActive(index);
    if (focus) tabs.current[index]?.focus();
  };
  return (
    <section
      className="workspace-carousel"
      aria-label="جست‌وجو و رفت‌وآمد"
      aria-roledescription="اسلایدر"
    >
      <div className="carousel-toolbar">
        <div
          className="carousel-tabs"
          role="tablist"
          aria-label="صفحه‌های اسلایدر"
          onKeyDown={(event) => {
            let next: number | undefined;
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') next = 1 - active;
            if (event.key === 'Home') next = 0;
            if (event.key === 'End') next = 1;
            if (next !== undefined) {
              event.preventDefault();
              select(next, true);
            }
          }}
        >
          <span
            className="carousel-tab-indicator"
            style={{ transform: `translateX(${-active * 100}%)` }}
            aria-hidden="true"
          />
          {slides.map((slide, index) => (
            <button
              key={slide.icon}
              type="button"
              role="tab"
              id={`${id}-tab-${index}`}
              ref={(node) => {
                tabs.current[index] = node;
              }}
              aria-label={slide.label}
              title={slide.label}
              aria-selected={active === index}
              aria-controls={`${id}-panel-${index}`}
              tabIndex={active === index ? 0 : -1}
              onClick={() => select(index)}
            >
              <Icon name={slide.icon} />
            </button>
          ))}
        </div>
        <span className="carousel-caption">
          {slides[active]?.label}
          <small>{active === 0 ? '۰۱' : '۰۲'} / ۰۲</small>
        </span>
        <ActionButton
          icon={active === 0 ? 'previous' : 'next'}
          variant="ghost"
          label={active === 0 ? 'نمایش رفت‌وآمد' : 'بازگشت به جست‌وجو'}
          onClick={() => select(1 - active)}
        />
      </div>
      <div
        className="carousel-viewport"
        style={{ height }}
        onTouchStart={(event) => {
          touch.current = null;
          if (
            event.target instanceof Element &&
            event.target.closest('input,textarea,button,a,select,[role="dialog"]')
          )
            return;
          const point = event.touches[0];
          touch.current = point ? { x: point.clientX, y: point.clientY } : null;
        }}
        onTouchCancel={() => {
          touch.current = null;
        }}
        onTouchEnd={(event) => {
          const start = touch.current;
          touch.current = null;
          const end = event.changedTouches[0];
          if (!start || !end) return;
          const dx = end.clientX - start.x;
          if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(end.clientY - start.y) * 1.5)
            select(dx > 0 ? 1 : 0);
        }}
      >
        <div className="carousel-track" style={{ transform: `translateX(${active * 100}%)` }}>
          {slides.map((slide, index) => (
            <div
              key={slide.icon}
              className="carousel-panel"
              ref={(node) => {
                panels.current[index] = node;
              }}
              id={`${id}-panel-${index}`}
              role="tabpanel"
              aria-labelledby={`${id}-tab-${index}`}
              aria-hidden={active !== index}
              inert={active !== index}
            >
              {index === 0 ? (
                <div className="sketch-center">
                  <section className="sketch-search" aria-label="جست‌وجو در گوگل">
                    <GoogleLogo />
                    <WebSearch />
                  </section>
                  <section className="sketch-card sketch-bookmarks" aria-label="بوکمارک‌ها">
                    <BookmarkManager />
                  </section>
                </div>
              ) : (
                <CommuteCard active={active === 1} />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
