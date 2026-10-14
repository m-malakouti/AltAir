import { useEffect, useState } from 'react';
import { shiftDate, tehranDate, type Match, type Team } from '@/features/scores/score-model';
import { Icon } from './ui/Icon';
import {
  fetchFeaturedScores,
  rankMatches,
  type FeaturedMatch,
} from '@/features/scores/score-client';

function Badge({ team }: { team: Team }) {
  const [failed, setFailed] = useState(false);
  return team.logo && !failed ? (
    <img src={team.logo} alt="" loading="lazy" onError={() => setFailed(true)} />
  ) : (
    <span className="score-badge-fallback" aria-hidden="true">
      {team.name.slice(0, 1)}
    </span>
  );
}
function matchStatus(match: Match) {
  if (match.status === 'STATUS_POSTPONED') return 'به تعویق افتاده';
  if (match.status === 'STATUS_CANCELED') return 'لغو شده';
  if (match.status === 'STATUS_HALFTIME') return 'بین دو نیمه';
  if (match.state === 'post') return 'پایان بازی';
  if (match.state === 'in') return match.clock || 'در حال برگزاری';
  return new Intl.DateTimeFormat('fa-IR', {
    timeZone: 'Asia/Tehran',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(match.date));
}
export function LiveScores() {
  const [day, setDay] = useState(tehranDate);
  const [liveOnly, setLiveOnly] = useState(false);
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    matches: FeaturedMatch[];
    at: number;
    partial: boolean;
  } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const key = day;
  const current = result?.key === key ? result : null;
  useEffect(() => {
    const refresh = () => {
      if (!document.hidden) setTick((value) => value + 1);
    };
    const timer = window.setInterval(refresh, 30_000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);

      try {
        const { matches, partial } = await fetchFeaturedScores(day, controller.signal);
        if (!controller.signal.aborted) {
          setError('');
          setResult({ key, matches, partial, at: Date.now() });
        }
      } catch {
        if (!controller.signal.aborted)
          setError('دریافت نتایج انجام نشد؛ برای تلاش دوباره ↻ را بزن.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [day, key, tick]);
  const matches = (current?.matches ?? [])
    .filter((match) => !liveOnly || match.state === 'in')
    .sort(rankMatches);
  return (
    <div className="live-scores">
      <div className="scores-toolbar">
        <span className="scores-featured-heading">بازی‌های مهم اروپا</span>
        <button
          className="icon-button"
          title="به‌روزرسانی"
          aria-label="به‌روزرسانی نتایج"
          disabled={loading}
          onClick={() => setTick((value) => value + 1)}
        >
          <Icon name="refresh" />
        </button>
      </div>
      <div className="scores-date">
        <button
          className="icon-button"
          aria-label="روز قبل"
          onClick={() => {
            setDay(shiftDate(day, -1));
            setExpanded(false);
          }}
        >
          <Icon name="previous" />
        </button>
        <button className="score-day" title="بازگشت به امروز" onClick={() => setDay(tehranDate())}>
          {new Intl.DateTimeFormat('fa-IR', {
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC',
          }).format(new Date(`${day}T12:00:00Z`))}
        </button>
        <button
          className="icon-button"
          aria-label="روز بعد"
          onClick={() => {
            setDay(shiftDate(day, 1));
            setExpanded(false);
          }}
        >
          <Icon name="next" />
        </button>
        <button
          className="scores-live-filter"
          aria-pressed={liveOnly}
          onClick={() => setLiveOnly(!liveOnly)}
        >
          فقط زنده
        </button>
      </div>
      {error && (
        <p className="scores-error" role="alert">
          {error}
        </p>
      )}
      {current?.partial && <p className="scores-error">نتایج بعضی لیگ‌ها موقتاً در دسترس نیست.</p>}
      {loading && !current && (
        <p className="scores-empty" role="status">
          دریافت مسابقات…
        </p>
      )}
      <ul className="scores-list">
        {(expanded ? matches : matches.slice(0, 5)).map((match) => (
          <li key={match.id} className={match.state === 'in' && !error ? 'is-live' : ''}>
            <div className="score-match-status">
              {match.state === 'in' && !error && <span className="score-live-dot" />}
              <span>
                {match.league} · {matchStatus(match)}
              </span>
            </div>
            <div className="score-match">
              <div className="score-team">
                <Badge key={match.home.logo} team={match.home} />
                <span>{match.home.name}</span>
              </div>
              <strong
                dir="ltr"
                aria-label={`نتیجه ${match.home.name} ${match.home.score ?? '-'} به ${match.away.score ?? '-'} ${match.away.name}`}
              >
                {match.state === 'pre'
                  ? '—'
                  : `${match.home.score ?? '—'} : ${match.away.score ?? '—'}`}
              </strong>
              <div className="score-team">
                <Badge key={match.away.logo} team={match.away} />
                <span>{match.away.name}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {current && !loading && !matches.length && (
        <p className="scores-empty">
          {liveOnly
            ? 'بازی در حال برگزاری در لیگ‌های منتخب نیست.'
            : 'مسابقه‌ای برای این روز ثبت نشده است.'}
        </p>
      )}
      {matches.length > 5 && (
        <button className="todo-text-button" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'نمایش کمتر' : `همه مسابقات (${matches.length.toLocaleString('fa-IR')})`}
        </button>
      )}
      <footer className="scores-footer">
        <a href="https://www.espn.com/soccer/scoreboard" target="_blank" rel="noopener noreferrer">
          ESPN
        </a>
        <span>
          {current
            ? `آخرین دریافت ${new Intl.DateTimeFormat('fa-IR', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(current.at)}`
            : 'به‌روزرسانی هر ۳۰ ثانیه'}
        </span>
      </footer>
    </div>
  );
}
