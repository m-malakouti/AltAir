import { AccountCard } from '@/features/auth/ui/AccountCard';
import type { ReactNode } from 'react';
import { CalendarHero } from '@/features/calendar/ui/CalendarHero';
import { WeatherCard } from '@/features/weather/ui/WeatherCard';
import { CurrencyBoard } from '@/features/market/ui/CurrencyBoard';
import { BookmarkManager } from '@/features/bookmarks/ui/BookmarkManager';
import { StickyNotes } from '@/features/notes/ui/StickyNotes';
import { WebSearch } from './WebSearch';
function Slot({ area, title, children }: { area: string; title: string; children: ReactNode }) {
  return (
    <section className={`sketch-card sketch-${area}`} aria-label={title}>
      <h2 className="sketch-heading">{title}</h2>
      {children}
    </section>
  );
}
function Placeholder({ lines = 3 }: { lines?: number }) {
  return (
    <div className="sketch-placeholder">
      <span>به‌زودی</span>
      <div aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => (
          <i key={i} />
        ))}
      </div>
    </div>
  );
}
export function SketchWorkspace() {
  return (
    <div className="sketch-workspace">
      <Slot area="clock" title="ساعت">
        <div className="sketch-clock-placeholder" aria-hidden="true">
          ◷
        </div>
        <Placeholder lines={0} />
      </Slot>
      <Slot area="weather" title="آب‌وهوا">
        <WeatherCard />
      </Slot>
      <Slot area="month" title="تقویم">
        <CalendarHero variant="month" />
      </Slot>
      <Slot area="date" title="امروز">
        <CalendarHero variant="date" />
      </Slot>
      <aside className="sketch-right">
        <Slot area="account" title="حساب کاربری">
          <AccountCard />
        </Slot>
        <Slot area="market" title="نرخ بازار">
          <CurrencyBoard />
          <div className="sketch-stocks">
            <h3>سهام</h3>
            <Placeholder />
          </div>
        </Slot>
        <Slot area="podcast" title="Castbox">
          <Placeholder lines={1} />
        </Slot>
      </aside>
      <aside className="sketch-left">
        <Slot area="tasks" title="To-do list">
          <Placeholder lines={5} />
        </Slot>
        <Slot area="notes" title="یادداشت‌ها">
          <StickyNotes />
        </Slot>
      </aside>
      <div className="sketch-center">
        <section className="sketch-search" aria-label="جست‌وجو در گوگل">
          <span dir="ltr">Google</span>
          <WebSearch />
        </section>
        <Slot area="bookmarks" title="بوکمارک‌ها">
          <BookmarkManager />
        </Slot>
        <div className="sketch-bottom">
          <Slot area="scores" title="نتایج زنده">
            <Placeholder lines={4} />
          </Slot>
          <Slot area="ads" title="تبلیغات">
            <Placeholder lines={0} />
          </Slot>
        </div>
      </div>
    </div>
  );
}
