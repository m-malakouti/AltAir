import { AccountCard } from '@/features/auth/ui/AccountCard';
import type { ReactNode } from 'react';
import { CalendarHero } from '@/features/calendar/ui/CalendarHero';
import { WeatherCard } from '@/features/weather/ui/WeatherCard';
import { CurrencyBoard } from '@/features/market/ui/CurrencyBoard';
import { BookmarkManager } from '@/features/bookmarks/ui/BookmarkManager';
import { StickyNotes } from '@/features/notes/ui/StickyNotes';
import { WebSearch } from './WebSearch';
import { WorkspaceClock } from './WorkspaceClock';
import { GoogleLogo } from './GoogleLogo';
import { TodoList } from './TodoList';
import { LiveScores } from './LiveScores';
import { CastboxCard } from './CastboxCard';
function Slot({ area, title, children }: { area: string; title: string; children: ReactNode }) {
  return (
    <section className={`sketch-card sketch-${area}`} aria-label={title}>
      {!['weather', 'month', 'date', 'market'].includes(area) && (
        <h2 className="sketch-heading">{title}</h2>
      )}
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
        <WorkspaceClock />
      </Slot>
      <section className="sketch-notes" aria-label="یادداشت‌ها">
        <StickyNotes />
      </section>
      <Slot area="month" title="تقویم">
        <CalendarHero variant="month" />
      </Slot>
      <div className="sketch-today-stack">
        <Slot area="date" title="امروز">
          <CalendarHero variant="date" />
        </Slot>
        <Slot area="weather" title="آب‌وهوا">
          <WeatherCard />
        </Slot>
      </div>
      <aside className="sketch-right">
        <Slot area="account" title="حساب کاربری">
          <AccountCard />
        </Slot>
        <Slot area="market" title="نرخ بازار">
          <CurrencyBoard />
        </Slot>
        <Slot area="podcast" title="Castbox">
          <CastboxCard />
        </Slot>
      </aside>
      <aside className="sketch-left">
        <Slot area="ad-one" title="تبلیغات ۱">
          <div className="advertisement-placeholder">فضای تبلیغاتی</div>
        </Slot>
        <Slot area="tasks" title="کارهای من">
          <TodoList />
        </Slot>
        <Slot area="ad-two" title="تبلیغات ۲">
          <div className="advertisement-placeholder">فضای تبلیغاتی</div>
        </Slot>
      </aside>
      <div className="sketch-center">
        <section className="sketch-search" aria-label="جست‌وجو در گوگل">
          <GoogleLogo />
          <WebSearch />
        </section>
        <Slot area="bookmarks" title="بوکمارک‌ها">
          <BookmarkManager />
        </Slot>
      </div>
      <div className="sketch-bottom">
        <Slot area="scores" title="نتایج زنده">
          <LiveScores />
        </Slot>
        <Slot area="ads" title="تبلیغات">
          <Placeholder lines={0} />
        </Slot>
      </div>
    </div>
  );
}
