import { useEffect, useId, useRef, useState } from 'react';
import { WorkspaceClock } from '@/components/WorkspaceClock';
import { ActionButton } from '@/components/ui/ActionButton';
import { Icon } from '@/components/ui/Icon';
import { readTasks, TASKS_KEY, type Task } from '@/features/tasks/tasks-store';
import { watchWorkspaceValue } from '@/lib/browser/workspace-storage';
import { focusExtensionAvailable, requestFocusNotifications } from '@/lib/browser/focus-alerts';
import { activeSession, nextPhase, remaining, todayFocus, type FocusPhase } from '../focus-model';
import { useFocus } from '../use-focus';

const labels: Record<FocusPhase, string> = {
  focus: 'تمرکز',
  short: 'استراحت کوتاه',
  long: 'استراحت بلند',
};
const fa = (value: number) => value.toLocaleString('fa-IR');
export function FocusClock({
  requestedTask,
  quiet = false,
  onQuietChange,
}: {
  requestedTask?: Task | null;
  quiet?: boolean;
  onQuietChange?: (value: boolean) => void;
}) {
  const { data, ready, busy, error, now, dispatch, unlockSound } = useFocus();
  const [setup, setSetup] = useState(false);
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState(25);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskError, setTaskError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [durations, setDurations] = useState({ focus: 25, short: 5, long: 15 });
  const card = useRef<HTMLElement>(null);
  const presetName = useId();
  const session = data.session;
  const active = activeSession(data);
  const finished = session?.status === 'finished';
  const suggested = nextPhase(data);
  const left = session ? remaining(session, now) : 0;
  const seconds = Math.ceil(left / 1000);
  const time = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const today = todayFocus(data, now);
  const [previousRequest, setPreviousRequest] = useState(requestedTask);
  if (requestedTask !== previousRequest) {
    setPreviousRequest(requestedTask);
    if (requestedTask && !active) {
      setTitle(requestedTask.title);
      setTaskId(requestedTask.id);
      setSetup(true);
      setMinutes(data.settings.focus);
    } else if (requestedTask && active) {
      setNotice('یک جلسه در جریان است؛ ابتدا آن را پایان بده یا ادامه بده.');
    }
  }
  useEffect(() => {
    if (!requestedTask) return;
    card.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [requestedTask]);
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const next = await readTasks();
        if (alive) {
          setTasks(next.filter((task) => !task.done));
          setTaskError('');
        }
      } catch {
        if (alive) setTaskError('فهرست کارها خوانده نشد؛ می‌توانی عنوان را خودت وارد کنی.');
      }
    }
    void load();
    const stop = watchWorkspaceValue(TASKS_KEY, () => {
      void load();
    });
    return () => {
      alive = false;
      stop();
    };
  }, []);
  function start(phase: FocusPhase) {
    if (data.settings.sound) void unlockSound();
    void dispatch({
      type: 'start',
      expectedId: session?.id ?? null,
      id: crypto.randomUUID(),
      phase,
      title: setup ? title : (session?.title ?? title),
      taskId: setup ? taskId : (session?.taskId ?? taskId),
      ...(setup && phase === 'focus' ? { minutes } : {}),
    });
    setSetup(false);
    setConfirmation(null);
  }
  return (
    <section
      ref={card}
      className={`focus-clock ${active ? 'focus-clock--active' : ''}`}
      aria-label="زمان تمرکز"
    >
      <div className="focus-topline">
        <span>
          {active && session
            ? labels[session.phase]
            : finished
              ? 'مرحله تمام شد'
              : 'زمانی برای تمرکز'}
        </span>
        <ActionButton
          icon="settings"
          label="تنظیمات تمرکز"
          variant="ghost"
          aria-expanded={settingsOpen}
          onClick={() => {
            setDurations({
              focus: data.settings.focus,
              short: data.settings.short,
              long: data.settings.long,
            });
            setSettingsOpen(!settingsOpen);
          }}
        />
      </div>
      {active && session ? (
        <>
          <p className="focus-task-title">{session.title || 'یک کار، با تمام توجه'}</p>
          <div className={`focus-ring focus-ring--${session.phase}`}>
            <svg className="focus-ring-art" viewBox="0 0 200 200" aria-hidden="true">
              <circle className="focus-ring-track" cx="100" cy="100" r="94" />
              <circle
                className="focus-ring-progress"
                cx="100"
                cy="100"
                r="94"
                pathLength="100"
                strokeDasharray={`${Math.max(0, Math.min(100, (1 - left / session.durationMs) * 100))} 100`}
              />
            </svg>
            <div>
              <span
                className="focus-timer"
                role="timer"
                aria-label={`زمان باقی‌ماندهٔ ${labels[session.phase]}`}
                dir="ltr"
              >
                {time}
              </span>
              <span className="focus-status">
                {session.status === 'paused' ? 'مکث شده' : labels[session.phase]}
              </span>
            </div>
          </div>
          <div className="focus-controls">
            <ActionButton
              icon={session.status === 'paused' ? 'play' : 'pause'}
              label={session.status === 'paused' ? 'ادامه' : 'مکث'}
              disabled={busy || !ready}
              onClick={() => {
                if (data.settings.sound) void unlockSound();
                void dispatch({
                  type: session.status === 'paused' ? 'resume' : 'pause',
                  id: session.id,
                });
              }}
            />
            <ActionButton
              icon="stop"
              label="پایان"
              variant="ghost"
              disabled={busy}
              onClick={() => setConfirmation(session.id)}
            />
          </div>
          <div className="focus-session-meta">
            <span>
              جلسهٔ{' '}
              {fa(
                session.phase === 'focus'
                  ? (data.completed % 4) + 1
                  : ((data.completed - 1) % 4) + 1,
              )}{' '}
              از ۴
            </span>
            <time>
              {new Date(now).toLocaleTimeString('fa-IR', {
                timeZone: 'Asia/Tehran',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </time>
          </div>
        </>
      ) : (
        <>
          {!setup && finished ? (
            <div className="focus-finished" role="status">
              <span aria-hidden="true">✓</span>
              <strong>
                {session.phase === 'focus' ? 'یک قدم جلوتر رفتی' : 'آمادهٔ شروع دوباره‌ای؟'}
              </strong>
              <p>
                {session.phase === 'focus'
                  ? 'جلسه ثبت شد. وقت یک استراحت است.'
                  : 'استراحت تمام شد؛ با انتخاب خودت ادامه بده.'}
              </p>
            </div>
          ) : !setup ? (
            <WorkspaceClock />
          ) : null}
        </>
      )}
      {setup && !active && (
        <form
          className="focus-setup"
          onSubmit={(event) => {
            event.preventDefault();
            start('focus');
          }}
        >
          <label>
            روی چه کاری تمرکز داری؟
            <select
              aria-label="انتخاب کار برای تمرکز"
              value={tasks.some((task) => task.id === taskId) ? (taskId ?? '') : ''}
              onChange={(event) => {
                const task = tasks.find((item) => item.id === event.target.value);
                setTaskId(task?.id ?? null);
                setTitle(task?.title ?? '');
              }}
            >
              <option value="">عنوان دلخواه / بدون کار</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          </label>
          <input
            aria-label="عنوان جلسهٔ تمرکز"
            placeholder="مثلاً مطالعهٔ فصل اول"
            maxLength={300}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setTaskId(null);
            }}
          />
          {taskError && <p className="helper-text">{taskError}</p>}
          <div className="focus-presets" role="group" aria-label="مدت تمرکز">
            {[25, 45, 60].map((value) => (
              <label key={value} className="focus-duration-option">
                <input
                  type="radio"
                  name={presetName}
                  value={value}
                  checked={minutes === value}
                  disabled={busy}
                  onChange={() => setMinutes(value)}
                />
                <span>{fa(value)} دقیقه</span>
              </label>
            ))}
          </div>
          <label>
            زمان دلخواه (۱ تا ۱۸۰ دقیقه)
            <input
              type="number"
              aria-label="مدت دلخواه تمرکز"
              min={1}
              max={180}
              required
              value={minutes || ''}
              disabled={busy}
              onChange={(event) => setMinutes(Number(event.target.value))}
            />
          </label>
          <div className="focus-controls">
            <ActionButton
              icon="play"
              label={`شروع ${fa(minutes)} دقیقه تمرکز`}
              type="submit"
              disabled={
                !ready || busy || minutes < 1 || minutes > 180 || !Number.isInteger(minutes)
              }
            />
            <ActionButton
              icon="close"
              label="بستن"
              variant="ghost"
              onClick={() => setSetup(false)}
            />
          </div>
        </form>
      )}
      {confirmation && active && (
        <div className="focus-confirm" role="alertdialog" aria-label="پایان زودهنگام جلسه">
          <p>
            {session?.phase === 'focus'
              ? 'جلسه را پایان می‌دهی؟ زمان سپری‌شده ثبت می‌شود؛ جلسه کامل محسوب نمی‌شود.'
              : 'استراحت را پایان می‌دهی؟ پس از آن می‌توانی جلسهٔ تمرکز بعدی را شروع کنی.'}
          </p>
          <div className="focus-controls">
            <ActionButton
              icon="stop"
              label="پایان جلسه"
              disabled={busy}
              onClick={() => {
                void dispatch({ type: 'cancel', id: confirmation });
                setConfirmation(null);
              }}
            />
            <ActionButton
              icon="undo"
              label="برگشت به جلسه"
              variant="ghost"
              onClick={() => setConfirmation(null)}
            />
          </div>
        </div>
      )}
      <div className="focus-footer">
        <p className="focus-daily">
          امروز: {fa(today.completed)} جلسهٔ کامل · {fa(today.minutes)} دقیقه تمرکز
        </p>
        <div className="focus-footer-actions">
          {!active && (
            <>
              {!setup && (
                <ActionButton
                  icon={finished && suggested !== 'focus' ? 'coffee' : 'play'}
                  label={finished ? `شروع ${labels[suggested]}` : 'شروع تمرکز'}
                  disabled={!ready || busy}
                  onClick={() => {
                    if (finished) start(suggested);
                    else {
                      setMinutes(data.settings.focus);
                      setSetup(true);
                    }
                  }}
                />
              )}
              {finished && !setup && (
                <ActionButton
                  icon="skip"
                  variant="ghost"
                  label={suggested !== 'focus' ? 'رد کردن استراحت و انتخاب کار' : 'انتخاب کار بعدی'}
                  disabled={busy}
                  onClick={() => {
                    setMinutes(data.settings.focus);
                    setSetup(true);
                  }}
                />
              )}
            </>
          )}
          {onQuietChange && (
            <ActionButton
              icon={quiet ? 'grid' : 'focus'}
              variant="ghost"
              label={quiet ? 'بازگشت به فضای کار' : 'نمای تمرکز'}
              className="focus-quiet-toggle"
              aria-pressed={quiet}
              onClick={() => onQuietChange(!quiet)}
            />
          )}
        </div>
      </div>
      {settingsOpen && (
        <div className="focus-settings">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void dispatch({ type: 'settings', settings: durations }).then((saved) => {
                if (saved) setNotice('زمان‌ها ذخیره شدند؛ جلسهٔ جاری تغییر نمی‌کند.');
              });
            }}
          >
            {(['focus', 'short', 'long'] as const).map((phase) => (
              <label key={phase}>
                {labels[phase]} (دقیقه)
                <input
                  type="number"
                  required
                  min={1}
                  max={phase === 'focus' ? 180 : phase === 'short' ? 60 : 120}
                  value={durations[phase]}
                  onChange={(event) =>
                    setDurations({ ...durations, [phase]: Number(event.target.value) })
                  }
                />
              </label>
            ))}
            <ActionButton
              icon="save"
              label="ذخیرهٔ زمان‌ها"
              type="submit"
              variant="secondary"
              disabled={!ready || busy}
            />
          </form>
          <label className="focus-check">
            <input
              type="checkbox"
              checked={data.settings.autoStart}
              disabled={!ready || busy}
              onChange={(event) => {
                void dispatch({ type: 'settings', settings: { autoStart: event.target.checked } });
              }}
            />
            شروع خودکار مرحلهٔ بعد
          </label>
          <p className="helper-text">
            فقط وقتی این صفحه جلوی چشم تو باز است؛ بعد از خواب سیستم یا بازگشت دیرهنگام، شروع دستی
            است.
          </p>
          <label className="focus-check">
            <input
              type="checkbox"
              checked={data.settings.sound}
              disabled={!ready || busy}
              onChange={(event) => {
                if (event.target.checked) void unlockSound();
                void dispatch({ type: 'settings', settings: { sound: event.target.checked } });
              }}
            />
            صدای پایان
          </label>
          <p className="helper-text">
            صدای داخل صفحه با تب باز پخش می‌شود؛ صدای اعلان به تنظیمات سیستم بستگی دارد.
          </p>
          <label className="focus-check">
            <input
              type="checkbox"
              checked={data.settings.notifications}
              disabled={!ready || busy || !focusExtensionAvailable()}
              onChange={(event) => {
                if (!event.target.checked) {
                  void dispatch({ type: 'settings', settings: { notifications: false } });
                  return;
                }
                void requestFocusNotifications()
                  .then((allowed) => {
                    if (allowed)
                      void dispatch({ type: 'settings', settings: { notifications: true } });
                    else setNotice('مجوز اعلان داده نشد؛ تایمر همچنان کار می‌کند.');
                  })
                  .catch(() => setNotice('فعال‌سازی اعلان انجام نشد.'));
              }}
            />
            اعلان مرورگر
          </label>
          {!focusExtensionAvailable() && (
            <p className="helper-text">اعلان پس‌زمینه در نسخهٔ نصب‌شدهٔ افزونه فعال می‌شود.</p>
          )}
          <p className="helper-text">پس از هر چهار جلسهٔ کامل، استراحت بلند پیشنهاد می‌شود.</p>
          <details className="focus-history">
            <summary className="icon-button" aria-label="جلسه‌های اخیر" title="جلسه‌های اخیر">
              <Icon name="clock" />
            </summary>
            {data.history.length ? (
              <ul>
                {data.history
                  .slice(-5)
                  .reverse()
                  .map((item) => (
                    <li key={item.id}>
                      <span>{item.title || 'تمرکز آزاد'}</span>
                      <small>
                        {fa(Math.floor(item.focusedMs / 60_000))} دقیقه ·{' '}
                        {item.completed ? 'کامل' : 'پایان زودهنگام'}
                      </small>
                    </li>
                  ))}
              </ul>
            ) : (
              <p>هنوز جلسه‌ای ثبت نشده.</p>
            )}
          </details>
        </div>
      )}
      {notice && (
        <p className="helper-text" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="focus-error" role="alert">
          {error}{' '}
          <ActionButton
            icon="refresh"
            label="بارگذاری دوباره"
            variant="ghost"
            onClick={() => window.location.reload()}
          />
        </p>
      )}
    </section>
  );
}
