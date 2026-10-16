import { describe, expect, it } from 'vitest';
import {
  changeFocus,
  emptyFocus,
  nextPhase,
  parseFocus,
  remaining,
  settleFocus,
  todayFocus,
  type FocusData,
} from './focus-model';
const now = Date.parse('2026-10-15T08:00:00Z');
function start(data = emptyFocus(), at = now, minutes = 25) {
  return changeFocus(
    data,
    {
      type: 'start',
      expectedId: data.session?.id ?? null,
      id: `session-${at}`,
      phase: 'focus',
      title: 'مطالعه',
      taskId: 'task-1',
      minutes,
    },
    at,
  );
}
describe('focus session lifecycle', () => {
  it('starts an optional task without depending on a ticking counter', () => {
    const data = start();
    expect(data.session?.deadline).toBe(now + 25 * 60_000);
    expect(remaining(data.session!, now + 5 * 60_000)).toBe(20 * 60_000);
    expect(parseFocus(JSON.parse(JSON.stringify(data)) as unknown)).toEqual(data);
    expect(data.session?.taskId).toBe('task-1');
    expect(data.history).toEqual([]);
  });
  it('excludes paused time and restores the remaining duration after reopening', () => {
    const paused = changeFocus(start(), { type: 'pause', id: `session-${now}` }, now + 60_000);
    expect(remaining(paused.session!, now + 3_600_000)).toBe(24 * 60_000);
    const resumed = changeFocus(
      parseFocus(paused),
      { type: 'resume', id: paused.session!.id },
      now + 3_600_000,
    );
    const finished = settleFocus(resumed, now + 3_600_000 + 24 * 60_000);
    expect(finished.history[0]?.focusedMs).toBe(25 * 60_000);
    expect(finished.history[0]?.completed).toBe(true);
  });
  it('records one completion after sleep and never starts unattended phases', () => {
    const original = changeFocus(start(), { type: 'settings', settings: { autoStart: true } }, now);
    const data = settleFocus(original, now + 24 * 3_600_000);
    expect(data.completed).toBe(1);
    expect(data.session?.status).toBe('finished');
    expect(data.history[0]?.endedAt).toBe(now + 25 * 60_000);
    expect(settleFocus(data, now + 48 * 3_600_000)).toBe(data);
    expect(nextPhase(data)).toBe('short');
  });
  it('protects a new session from stale tab controls and competing starts', () => {
    const first = start();
    const ignored = changeFocus(
      first,
      { type: 'start', expectedId: null, id: 'racing', phase: 'focus', title: '', taskId: null },
      now,
    );
    expect(ignored).toBe(first);
    expect(changeFocus(first, { type: 'cancel', id: 'old-session' }, now)).toBe(first);
    const done = settleFocus(first, now + 25 * 60_000);
    const second = start(done, now + 30 * 60_000);
    expect(changeFocus(second, { type: 'pause', id: first.session!.id }, now + 31 * 60_000)).toBe(
      second,
    );
  });
  it('counts cancelled focus as time, never as a complete session', () => {
    const data = changeFocus(start(), { type: 'cancel', id: `session-${now}` }, now + 90_000);
    expect(data.completed).toBe(0);
    expect(data.history[0]).toMatchObject({ completed: false, focusedMs: 90_000 });
    expect(todayFocus(data, now + 90_000)).toEqual({ completed: 0, minutes: 1 });
    expect(nextPhase(data)).toBe('focus');
  });
  it('handles a pause arriving after the deadline as completion', () => {
    const data = changeFocus(start(), { type: 'pause', id: `session-${now}` }, now + 26 * 60_000);
    expect(data.session?.status).toBe('finished');
    expect(data.completed).toBe(1);
  });
  it('suggests a long break every four focus sessions and excludes breaks from totals', () => {
    let data: FocusData = emptyFocus();
    for (let index = 0; index < 4; index++) {
      const at = now + index * 3_600_000;
      data = settleFocus(start(data, at), at + 25 * 60_000);
    }
    expect(nextPhase(data)).toBe('long');
    const pause = changeFocus(
      data,
      {
        type: 'start',
        id: 'break',
        expectedId: data.session!.id,
        phase: 'long',
        title: '',
        taskId: null,
      },
      now + 4 * 3_600_000,
    );
    const done = settleFocus(pause, now + 5 * 3_600_000);
    expect(done.completed).toBe(4);
    expect(done.history).toHaveLength(4);
    expect(nextPhase(done)).toBe('focus');
  });
  it('updates future durations without changing an active timer or other settings', () => {
    const data = changeFocus(
      start(),
      { type: 'settings', settings: { focus: 45, sound: true } },
      now,
    );
    expect(data.session?.durationMs).toBe(25 * 60_000);
    expect(data.settings.focus).toBe(45);
    const updated = changeFocus(data, { type: 'settings', settings: { short: 10 } }, now);
    expect(updated.settings.sound).toBe(true);
  });
  it('uses Tehran dates and the actual deadline when restoring a session on another day', () => {
    const at = Date.parse('2026-10-15T19:00:00Z');
    const data = settleFocus(start(emptyFocus(), at), at + 2 * 3_600_000);
    expect(todayFocus(data, Date.parse('2026-10-15T20:29:00Z')).completed).toBe(1);
    expect(todayFocus(data, Date.parse('2026-10-15T20:31:00Z')).completed).toBe(0);
  });
  it('bounds remaining time when the system clock moves backwards', () => {
    const data = start();
    expect(remaining(data.session!, now - 3_600_000)).toBe(25 * 60_000);
  });
  it('rejects corrupt storage and invalid durations without resetting existing history', () => {
    expect(parseFocus(null)).toEqual(emptyFocus());
    expect(() => parseFocus({ ...emptyFocus(), version: 2 })).toThrow();
    expect(() => start(emptyFocus(), now, 0)).toThrow();
    expect(() => start(emptyFocus(), now, 181)).toThrow();
    const data = settleFocus(start(), now + 25 * 60_000);
    expect(() => parseFocus({ ...data, history: [...data.history, ...data.history] })).toThrow();
    expect(() =>
      parseFocus({ ...data, session: { ...data.session, status: 'running', deadline: null } }),
    ).toThrow();
  });
});
