import { AccountCard } from '@/features/auth/ui/AccountCard';
import { useState, type ReactNode } from 'react';
import { CalendarHero } from '@/features/calendar/ui/CalendarHero';
import { WeatherCard } from '@/features/weather/ui/WeatherCard';
import { CurrencyBoard } from '@/features/market/ui/CurrencyBoard';
import { PortfolioCard } from '@/features/portfolio/ui/PortfolioCard';
import { StickyNotes } from '@/features/notes/ui/StickyNotes';
import { WorkspaceCarousel } from './WorkspaceCarousel';
import { FocusClock } from '@/features/focus/ui/FocusClock';
import type { Task } from '@/features/tasks/tasks-store';
import { TodoList } from './TodoList';
import { LiveScores } from './LiveScores';
import { CastboxCard } from './CastboxCard';
import { AmbientView } from './AmbientView';
import { SponsoredAds } from '@/features/ads/ui/SponsoredAds';
import { useCardChoices } from '@/features/workspace/personalization-store';
function Slot({
  area,
  title,
  children,
  hidden = false,
}: {
  area: string;
  title: string;
  children: ReactNode;
  hidden?: boolean;
}) {
  return (
    <section className={`sketch-card sketch-${area}`} aria-label={title} hidden={hidden}>
      {!['weather', 'month', 'date', 'market'].includes(area) && (
        <h2 className="sketch-heading">{title}</h2>
      )}
      {children}
    </section>
  );
}
export function SketchWorkspace({
  ambient = false,
  active = true,
}: {
  ambient?: boolean;
  active?: boolean;
}) {
  const [weatherDate, setWeatherDate] = useState<string | null>(null);
  const cards = useCardChoices();
  const [quiet, setQuiet] = useState(false);
  const [focusTask, setFocusTask] = useState<Task | null>(null);
  return (
    <div
      className={`sketch-workspace ${quiet && !ambient ? 'sketch-workspace--quiet' : ''} ${ambient ? 'sketch-workspace--ambient' : ''}`}
    >
      {ambient && <AmbientView />}
      <div className="sketch-clock-stack">
        <Slot area="date" title="امروز" hidden={!cards.calendar}>
          <CalendarHero variant="date" />
        </Slot>
        <Slot area="clock" title="ساعت" hidden={!cards.clock}>
          <FocusClock requestedTask={focusTask} quiet={quiet} onQuietChange={setQuiet} />
        </Slot>
        <aside className="sketch-left">
          <Slot area="tasks" title="کارهای من" hidden={!cards.tasks}>
            <TodoList onFocusTask={(task) => setFocusTask({ ...task })} />
          </Slot>
          {!ambient && !quiet && <SponsoredAds placement="sidebar" />}
        </aside>
      </div>
      <aside className="sketch-right">
        <Slot area="account" title="حساب کاربری">
          <AccountCard />
        </Slot>
        <Slot area="market" title="نرخ بازار" hidden={!cards.currencies}>
          <CurrencyBoard />
        </Slot>
        <section className="sketch-card sketch-portfolio" hidden={!cards.portfolio}>
          <PortfolioCard />
        </section>
        <Slot area="podcast" title="Castbox" hidden={!cards.podcast}>
          <CastboxCard />
        </Slot>
      </aside>
      <div className="sketch-main">
        <WorkspaceCarousel
          companionActive={active && !ambient && !quiet}
          bookmarksVisible={cards.bookmarks}
        />
        <div className="sketch-widgets">
          <section className="sketch-notes" aria-label="یادداشت‌ها" hidden={!cards.notes}>
            <StickyNotes />
          </section>
          <Slot area="month" title="تقویم" hidden={!cards.calendar}>
            <CalendarHero
              variant="month"
              onSelectDate={(date) =>
                setWeatherDate(
                  date
                    ? new Intl.DateTimeFormat('en-CA', {
                        timeZone: 'Asia/Tehran',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                      }).format(date)
                    : null,
                )
              }
            />
          </Slot>
          <Slot area="weather" title="آب‌وهوا" hidden={!cards.weather}>
            <WeatherCard selectedDate={ambient ? null : weatherDate} compact={ambient} />
          </Slot>
        </div>
        <div className="sketch-bottom">
          <Slot area="scores" title="نتایج زنده" hidden={!cards.scores}>
            <LiveScores active={!ambient && cards.scores} />
          </Slot>
          {!ambient && !quiet && <SponsoredAds placement="footer" />}
        </div>
      </div>
    </div>
  );
}
