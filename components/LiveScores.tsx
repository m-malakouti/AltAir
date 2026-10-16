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
export function LiveScores({ active = true }: { active?: boolean }) {
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
    if (!active) return;
    const refresh = () => {
      if (!document.hidden && !error) setTick((value) => value + 1);
    };
    const reconnect = () => {
      if (!document.hidden) setTick((value) => value + 1);
    };
    const timer = window.setInterval(refresh, 30_000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('online', reconnect);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('online', reconnect);
    };
  }, [active, error]);
  useEffect(() => {
    if (!active || document.hidden) return;
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
  }, [active, day, key, tick]);
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
        <span className="score-day">
          {new Intl.DateTimeFormat('fa-IR', {
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC',
          }).format(new Date(`${day}T12:00:00Z`))}
        </span>
        <button
          className="icon-button"
          aria-label="بازگشت به امروز"
          title="بازگشت به امروز"
          onClick={() => setDay(tehranDate())}
        >
          <Icon name="calendar" />
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
          aria-label="فقط زنده"
          title="فقط زنده"
          aria-pressed={liveOnly}
          onClick={() => setLiveOnly(!liveOnly)}
        >
          <Icon name="live" />
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
        <button
          className="icon-button"
          title={expanded ? 'نمایش کمتر' : 'نمایش همهٔ مسابقات'}
          aria-label={
            expanded ? 'نمایش کمتر' : `همه مسابقات (${matches.length.toLocaleString('fa-IR')})`
          }
          onClick={() => setExpanded(!expanded)}
        >
          <Icon name={expanded ? 'collapse' : 'expand'} />
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
