import { leagues, parseScoreboard, shiftDate, tehranDate, type Match } from './score-model';
export interface FeaturedMatch extends Match {
  league: string;
}
export async function fetchFeaturedScores(day: string, signal: AbortSignal) {
  const days = [shiftDate(day, -1), day];
  const results = await Promise.allSettled(
    leagues.map(async (league) => {
      const pages = await Promise.all(
        days.map(async (date) => {
          const response = await fetch(
            `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.id}/scoreboard?dates=${date.replaceAll('-', '')}&limit=100`,
            {
              credentials: 'omit',
              cache: 'no-store',
              signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
            },
          );
          if (!response.ok) throw new Error(`Scores HTTP ${response.status}`);
          return parseScoreboard((await response.json()) as unknown);
        }),
      );
      return pages
        .flat()
        .filter((match) => tehranDate(new Date(match.date)) === day)
        .map((match): FeaturedMatch => ({ ...match, league: league.name }));
    }),
  );
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  const successful = results.filter((result) => result.status === 'fulfilled');
  if (!successful.length) throw new Error('All leagues unavailable');
  const matches = [
    ...new Map(
      successful.flatMap((result) => result.value).map((match) => [match.id, match]),
    ).values(),
  ];
  return { matches, partial: successful.length !== leagues.length };
}
const majorTeams =
  /arsenal|chelsea|liverpool|manchester|tottenham|real madrid|barcelona|atlético|atletico|bayern|dortmund|inter milan|internazionale|ac milan|juventus|napoli|paris saint|benfica|porto|ajax/i;
export function rankMatches(a: FeaturedMatch, b: FeaturedMatch): number {
  const rank = (match: FeaturedMatch) =>
    (match.state === 'in' ? 100 : match.state === 'pre' ? 20 : 0) +
    (majorTeams.test(`${match.home.name} ${match.away.name}`) ? 10 : 0) +
    (match.league === 'لیگ قهرمانان' ? 5 : 0);
  return rank(b) - rank(a) || Date.parse(a.date) - Date.parse(b.date);
}
