export const leagues = [
  { id: 'eng.1', name: 'لیگ برتر انگلیس' },
  { id: 'esp.1', name: 'لالیگا' },
  { id: 'ita.1', name: 'سری آ' },
  { id: 'ger.1', name: 'بوندس‌لیگا' },
  { id: 'fra.1', name: 'لیگ فرانسه' },
  { id: 'uefa.champions', name: 'لیگ قهرمانان' },
  { id: 'uefa.europa', name: 'لیگ اروپا' },
] as const;
export interface Team {
  name: string;
  logo: string | null;
  score: string | null;
}
export interface Match {
  id: string;
  date: string;
  state: 'pre' | 'in' | 'post';
  status: string;
  clock: string;
  home: Team;
  away: Team;
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid score data');
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Invalid text');
  return value;
}
function team(value: unknown): Team {
  const raw = record(value);
  const info = record(raw.team);
  const name = text(info.displayName);
  const score = typeof raw.score === 'string' && /^\d+$/.test(raw.score) ? raw.score : null;
  let logo = null;
  if (typeof info.logo === 'string') {
    try {
      const url = new URL(info.logo);
      if (url.protocol === 'https:' && url.hostname.endsWith('.espncdn.com')) logo = url.href;
    } catch {
      /* No valid badge. */
    }
  }
  return { name, logo, score };
}
export function parseScoreboard(value: unknown): Match[] {
  const root = record(value);
  if (!Array.isArray(root.events)) throw new Error('Missing events');
  return root.events.map((value: unknown) => {
    const event = record(value);
    const status = record(event.status);
    const type = record(status.type);
    if (!['pre', 'in', 'post'].includes(String(type.state)) || !Array.isArray(event.competitions))
      throw new Error('Invalid match');
    const competition = record(event.competitions[0]);
    if (!Array.isArray(competition.competitors)) throw new Error('Invalid teams');
    const teams = competition.competitors.map(record);
    const home = teams.find((item) => item.homeAway === 'home');
    const away = teams.find((item) => item.homeAway === 'away');
    const date = text(event.date);
    if (!home || !away || !Number.isFinite(Date.parse(date))) throw new Error('Invalid match date');
    return {
      id: text(event.id),
      date,
      state: type.state as Match['state'],
      status: text(type.name),
      clock: typeof status.displayClock === 'string' ? status.displayClock : '',
      home: team(home),
      away: team(away),
    };
  });
}
export function tehranDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  return ['year', 'month', 'day']
    .map((key) => parts.find((part) => part.type === key)?.value)
    .join('-');
}
export function shiftDate(date: string, offset: number): string {
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + offset);
  return next.toISOString().slice(0, 10);
}
