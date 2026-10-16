export type FocusPhase = 'focus' | 'short' | 'long';
export interface FocusSettings {
  focus: number;
  short: number;
  long: number;
  autoStart: boolean;
  sound: boolean;
  notifications: boolean;
}
export interface FocusSession {
  id: string;
  phase: FocusPhase;
  status: 'running' | 'paused' | 'finished' | 'cancelled';
  title: string;
  taskId: string | null;
  durationMs: number;
  remainingMs: number;
  deadline: number | null;
  startedAt: number;
  endedAt: number | null;
}
export interface FocusResult {
  id: string;
  title: string;
  taskId: string | null;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  focusedMs: number;
  completed: boolean;
}
export interface FocusData {
  version: 1;
  settings: FocusSettings;
  session: FocusSession | null;
  completed: number;
  history: FocusResult[];
  notifiedId: string | null;
  soundedId: string | null;
}
export const defaultFocusSettings: FocusSettings = {
  focus: 25,
  short: 5,
  long: 15,
  autoStart: false,
  sound: false,
  notifications: false,
};
export function emptyFocus(): FocusData {
  return {
    version: 1,
    settings: { ...defaultFocusSettings },
    session: null,
    completed: 0,
    history: [],
    notifiedId: null,
    soundedId: null,
  };
}
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
const integer = (value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
const title = (value: unknown): value is string => typeof value === 'string' && value.length <= 300;
const id = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 100;
const optionalId = (value: unknown) => value === null || id(value);
const phase = (value: unknown) => ['focus', 'short', 'long'].includes(String(value));
export function parseFocus(value: unknown): FocusData {
  if (value == null) return emptyFocus();
  if (!object(value) || value.version !== 1 || !object(value.settings))
    throw new Error('Invalid focus data');
  const settings = value.settings;
  if (
    !integer(settings.focus, 1, 180) ||
    !integer(settings.short, 1, 60) ||
    !integer(settings.long, 1, 120) ||
    typeof settings.autoStart !== 'boolean' ||
    typeof settings.sound !== 'boolean' ||
    typeof settings.notifications !== 'boolean' ||
    !integer(value.completed, 0) ||
    !optionalId(value.notifiedId) ||
    !optionalId(value.soundedId) ||
    !Array.isArray(value.history) ||
    value.history.length > 2000
  )
    throw new Error('Invalid focus settings');
  const session = value.session;
  if (
    session !== null &&
    (!object(session) ||
      !id(session.id) ||
      !phase(session.phase) ||
      !['running', 'paused', 'finished', 'cancelled'].includes(String(session.status)) ||
      !title(session.title) ||
      !optionalId(session.taskId) ||
      !integer(session.durationMs, 60_000, 10_800_000) ||
      !integer(session.remainingMs, 0, session.durationMs) ||
      !integer(session.startedAt, 0) ||
      (session.endedAt !== null && !integer(session.endedAt, session.startedAt)) ||
      (session.status === 'running'
        ? !integer(session.deadline, 0) || session.endedAt !== null
        : session.deadline !== null) ||
      (session.status === 'paused' && session.endedAt !== null) ||
      (['finished', 'cancelled'].includes(String(session.status)) && session.endedAt === null))
  )
    throw new Error('Invalid focus session');
  const seen = new Set<string>();
  for (const item of value.history as unknown[]) {
    if (
      !object(item) ||
      !id(item.id) ||
      seen.has(item.id) ||
      !title(item.title) ||
      !optionalId(item.taskId) ||
      !integer(item.startedAt, 0) ||
      !integer(item.endedAt, item.startedAt) ||
      !integer(item.durationMs, 60_000, 10_800_000) ||
      !integer(item.focusedMs, 0, item.durationMs) ||
      typeof item.completed !== 'boolean'
    )
      throw new Error('Invalid focus history');
    seen.add(item.id);
  }
  return structuredClone(value) as unknown as FocusData;
}
export function remaining(session: FocusSession, now: number): number {
  return session.status === 'running' && session.deadline !== null
    ? Math.max(0, Math.min(session.remainingMs, session.deadline - now))
    : session.remainingMs;
}
export function activeSession(data: FocusData) {
  return data.session?.status === 'running' || data.session?.status === 'paused';
}
export function nextPhase(data: FocusData): FocusPhase {
  return data.session?.status === 'finished' && data.session.phase === 'focus'
    ? data.completed % 4 === 0
      ? 'long'
      : 'short'
    : 'focus';
}
function finish(data: FocusData, now: number, completed: boolean): FocusData {
  const session = data.session;
  if (!session || !activeSession(data)) return data;
  const endedAt = Math.max(session.startedAt, completed ? (session.deadline ?? now) : now);
  const left = completed ? 0 : remaining(session, now);
  return {
    ...data,
    session: {
      ...session,
      status: completed ? 'finished' : 'cancelled',
      deadline: null,
      remainingMs: left,
      endedAt,
    },
    completed: data.completed + (completed && session.phase === 'focus' ? 1 : 0),
    history:
      session.phase === 'focus'
        ? [
            ...data.history,
            {
              id: session.id,
              title: session.title,
              taskId: session.taskId,
              startedAt: session.startedAt,
              endedAt,
              durationMs: session.durationMs,
              focusedMs: session.durationMs - left,
              completed,
            },
          ].slice(-2000)
        : data.history,
  };
}
export function settleFocus(data: FocusData, now: number): FocusData {
  return data.session?.status === 'running' && remaining(data.session, now) === 0
    ? finish(data, now, true)
    : data;
}
export type FocusAction =
  | {
      type: 'start';
      expectedId: string | null;
      id: string;
      phase: FocusPhase;
      title: string;
      taskId: string | null;
      minutes?: number;
    }
  | { type: 'pause' | 'resume' | 'cancel'; id: string }
  | { type: 'settings'; settings: Partial<FocusSettings> };
export function changeFocus(original: FocusData, action: FocusAction, now: number): FocusData {
  const data = settleFocus(original, now);
  if (action.type === 'settings')
    return parseFocus({ ...data, settings: { ...data.settings, ...action.settings } });
  if (action.type === 'start') {
    if (activeSession(data) || (data.session?.id ?? null) !== action.expectedId) return data;
    const settings = {
      ...data.settings,
      ...(action.phase === 'focus' && action.minutes !== undefined
        ? { focus: action.minutes }
        : {}),
    };
    const durationMs = settings[action.phase] * 60_000;
    return parseFocus({
      ...data,
      settings,
      session: {
        id: action.id,
        phase: action.phase,
        status: 'running',
        title: action.title.trim(),
        taskId: action.taskId,
        durationMs,
        remainingMs: durationMs,
        deadline: now + durationMs,
        startedAt: now,
        endedAt: null,
      },
    });
  }
  const session = data.session;
  if (!session || session.id !== action.id || !activeSession(data)) return data;
  if (action.type === 'cancel') return finish(data, now, false);
  if (action.type === 'pause' && session.status === 'running')
    return {
      ...data,
      session: {
        ...session,
        status: 'paused',
        remainingMs: remaining(session, now),
        deadline: null,
      },
    };
  if (action.type === 'resume' && session.status === 'paused')
    return {
      ...data,
      session: { ...session, status: 'running', deadline: now + session.remainingMs },
    };
  return data;
}
const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tehran',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
export const focusDay = (time: number) => dayFormatter.format(time);
export function todayFocus(data: FocusData, now: number) {
  const day = focusDay(now);
  const today = data.history.filter((item) => focusDay(item.endedAt) === day);
  return {
    completed: today.filter((item) => item.completed).length,
    minutes: Math.floor(today.reduce((sum, item) => sum + item.focusedMs, 0) / 60_000),
  };
}
