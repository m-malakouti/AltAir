import { AccountCard } from '@/features/auth/ui/AccountCard';
import { useState, type ReactNode } from 'react';
import { CalendarHero } from '@/features/calendar/ui/CalendarHero';
import { WeatherCard } from '@/features/weather/ui/WeatherCard';
import { CurrencyBoard } from '@/features/market/ui/CurrencyBoard';
import { StickyNotes } from '@/features/notes/ui/StickyNotes';
import { WorkspaceCarousel } from './WorkspaceCarousel';
import { FocusClock } from '@/features/focus/ui/FocusClock';
import type { Task } from '@/features/tasks/tasks-store';
import { TodoList } from './TodoList';
import { LiveScores } from './LiveScores';
import { CastboxCard } from './CastboxCard';
import { AmbientView } from './AmbientView';
import { SponsoredAds } from '@/features/ads/ui/SponsoredAds';
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
export function SketchWorkspace({
  ambient = false,
  active = true,
}: {
  ambient?: boolean;
  active?: boolean;
}) {
  const [weatherDate, setWeatherDate] = useState<string | null>(null);
  const [quiet, setQuiet] = useState(false);
  const [focusTask, setFocusTask] = useState<Task | null>(null);
  return (
    <div
      className={`sketch-workspace ${quiet && !ambient ? 'sketch-workspace--quiet' : ''} ${ambient ? 'sketch-workspace--ambient' : ''}`}
    >
      {ambient && <AmbientView />}
      <div className="sketch-clock-stack">
        <Slot area="date" title="امروز">
          <CalendarHero variant="date" />
        </Slot>
        <Slot area="clock" title="ساعت">
          <FocusClock requestedTask={focusTask} quiet={quiet} onQuietChange={setQuiet} />
        </Slot>
        <aside className="sketch-left">
          <Slot area="tasks" title="کارهای من">
            <TodoList onFocusTask={(task) => setFocusTask({ ...task })} />
          </Slot>
          {!ambient && !quiet && <SponsoredAds placement="sidebar" />}
        </aside>
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
      <div className="sketch-main">
        <WorkspaceCarousel companionActive={active && !ambient && !quiet} />
        <div className="sketch-widgets">
          <section className="sketch-notes" aria-label="یادداشت‌ها">
            <StickyNotes />
          </section>
          <Slot area="month" title="تقویم">
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
          <Slot area="weather" title="آب‌وهوا">
            <WeatherCard selectedDate={ambient ? null : weatherDate} compact={ambient} />
          </Slot>
        </div>
        <div className="sketch-bottom">
          <Slot area="scores" title="نتایج زنده">
            <LiveScores active={!ambient} />
          </Slot>
          {!ambient && !quiet && <SponsoredAds placement="footer" />}
        </div>
      </div>
    </div>
  );
}
