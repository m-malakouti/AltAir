import { useState, type ReactNode } from 'react';
import { AccountCard } from '@/features/auth/ui/AccountCard';
import { CalendarHero } from '@/features/calendar/ui/CalendarHero';
import { WeatherCard } from '@/features/weather/ui/WeatherCard';
import { CurrencyBoard } from '@/features/market/ui/CurrencyBoard';
import { PortfolioCard } from '@/features/portfolio/ui/PortfolioCard';
import { BookmarkManager } from '@/features/bookmarks/ui/BookmarkManager';
import { StickyNotes } from '@/features/notes/ui/StickyNotes';
import { FocusClock } from '@/features/focus/ui/FocusClock';
import type { Task } from '@/features/tasks/tasks-store';
import { SponsoredAds } from '@/features/ads/ui/SponsoredAds';
import { useCardChoices } from '@/features/workspace/personalization-store';
import type { BoardSurface } from '@/features/workspace/free-layout-model';
import { FreeCardBoard, type FreeBoardCard } from './FreeCardBoard';
import { WorkspaceCarousel } from './WorkspaceCarousel';
import { WebSearch } from './WebSearch';
import { TodoList } from './TodoList';
import { LiveScores } from './LiveScores';
import { CastboxCard } from './CastboxCard';
import { AmbientView } from './AmbientView';
import { WorkspaceCardPicker } from './WorkspaceCardPicker';

function Slot({ area, title, children }: { area: string; title: string; children: ReactNode }) {
  return (
    <section className={`sketch-card sketch-${area}`} aria-label={title}>
      {!['weather', 'month', 'date', 'market', 'portfolio'].includes(area) && (
        <h2 className="sketch-heading">{title}</h2>
      )}
      {children}
    </section>
  );
}

export function SketchWorkspace({
  ambient = false,
  active = true,
  surface = 'newtab',
}: {
  ambient?: boolean;
  active?: boolean;
  surface?: BoardSurface;
}) {
  const [weatherDate, setWeatherDate] = useState<string | null>(null);
  const choices = useCardChoices();
  const [quiet, setQuiet] = useState(false);
  const [focusTask, setFocusTask] = useState<Task | null>(null);
  const cards: FreeBoardCard[] = [
    {
      id: 'date',
      title: 'امروز',
      hidden: !choices.calendar,
      content: (
        <Slot area="date" title="امروز">
          <CalendarHero variant="date" />
        </Slot>
      ),
    },
    {
      id: 'clock',
      title: 'ساعت و تمرکز',
      hidden: !choices.clock,
      content: (
        <Slot area="clock" title="ساعت">
          <FocusClock requestedTask={focusTask} quiet={quiet} onQuietChange={setQuiet} />
        </Slot>
      ),
    },
    {
      id: 'tasks',
      title: 'کارهای من',
      hidden: !choices.tasks,
      content: (
        <Slot area="tasks" title="کارهای من">
          <TodoList onFocusTask={(task) => setFocusTask({ ...task })} />
        </Slot>
      ),
    },
    {
      id: 'search',
      title: surface === 'panel' ? 'جست‌وجوی وب' : 'جست‌وجو و رفت‌وآمد',
      content:
        surface === 'panel' ? (
          <WebSearch />
        ) : (
          <WorkspaceCarousel
            includeBookmarks={false}
            companionActive={active && !ambient && !quiet}
          />
        ),
    },
    {
      id: 'bookmarks',
      title: 'بوکمارک‌ها',
      hidden: !choices.bookmarks,
      content: (
        <Slot area="bookmarks" title="بوکمارک‌ها">
          <BookmarkManager />
        </Slot>
      ),
    },
    {
      id: 'notes',
      title: 'یادداشت‌ها',
      hidden: !choices.notes,
      content: (
        <section className="sketch-notes" aria-label="یادداشت‌ها">
          <StickyNotes />
        </section>
      ),
    },
    {
      id: 'calendar',
      title: 'تقویم',
      hidden: !choices.calendar,
      content: (
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
      ),
    },
    {
      id: 'weather',
      title: 'آب‌وهوا',
      hidden: !choices.weather,
      content: (
        <Slot area="weather" title="آب‌وهوا">
          <WeatherCard selectedDate={ambient ? null : weatherDate} compact={ambient} />
        </Slot>
      ),
    },
    {
      id: 'scores',
      title: 'نتایج زنده',
      hidden: !choices.scores,
      content: (
        <Slot area="scores" title="نتایج زنده">
          <LiveScores active={active && !ambient && choices.scores} />
        </Slot>
      ),
    },
    {
      id: 'account',
      title: 'حساب کاربری',
      content: (
        <Slot area="account" title="حساب کاربری">
          <AccountCard />
        </Slot>
      ),
    },
    {
      id: 'currencies',
      title: 'نرخ بازار',
      hidden: !choices.currencies,
      content: (
        <Slot area="market" title="نرخ بازار">
          <CurrencyBoard />
        </Slot>
      ),
    },
    {
      id: 'portfolio',
      title: 'سبد دارایی من',
      hidden: !choices.portfolio,
      content: (
        <Slot area="portfolio" title="سبد دارایی من">
          <PortfolioCard />
        </Slot>
      ),
    },
    {
      id: 'podcast',
      title: 'پادکست',
      hidden: !choices.podcast,
      content: (
        <Slot area="podcast" title="Castbox">
          <CastboxCard />
        </Slot>
      ),
    },
    { id: 'sidebarAds', title: 'پیشنهادها', content: <SponsoredAds placement="sidebar" /> },
    { id: 'footerAds', title: 'پیشنهادهای میزکار', content: <SponsoredAds placement="footer" /> },
  ];
  const panelOrder = [
    'account',
    'clock',
    'search',
    'calendar',
    'bookmarks',
    'weather',
    'currencies',
    'notes',
    'portfolio',
    'sidebarAds',
  ];
  const displayed =
    surface === 'newtab'
      ? cards
      : panelOrder.flatMap((id) => cards.filter((card) => card.id === id));
  return (
    <div
      className={`sketch-workspace free-workspace ${ambient ? 'sketch-workspace--ambient' : ''} ${quiet && !ambient ? 'free-workspace--quiet' : ''}`}
    >
      {ambient && <AmbientView />}
      <FreeCardBoard
        controls={
          <WorkspaceCardPicker choices={choices} available={displayed.map((card) => card.id)} />
        }
        cards={displayed}
        surface={surface}
        quiet={quiet && !ambient}
        ambient={ambient}
        active={active && !ambient}
      />
    </div>
  );
}
