import { useEffect, useState, useRef } from 'react';
import { TASKS_KEY, readTasks, updateTasks, type Task } from '@/features/tasks/tasks-store';
import { watchWorkspaceValue } from '@/lib/browser/workspace-storage';
import { Icon } from './ui/Icon';

export function TodoList({ onFocusTask }: { onFocusTask?: (task: Task) => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'active' | 'today' | 'done'>('active');
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('normal');
  const [due, setDue] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [removed, setRemoved] = useState<Task | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [today, setToday] = useState(() =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tehran',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()),
  );
  const input = useRef<HTMLInputElement>(null);
  const writing = useRef(false);
  const board = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const show = (event: Event) => {
      const id = (event as CustomEvent<unknown>).detail;
      if (typeof id !== 'string') return;
      setFilter('active');
      setExpanded(true);
      requestAnimationFrame(() => {
        const row = Array.from(
          board.current?.querySelectorAll<HTMLElement>('[data-task-id]') ?? [],
        ).find((node) => node.dataset.taskId === id);
        row?.scrollIntoView({ block: 'center', behavior: 'auto' });
        row?.focus();
      });
    };
    window.addEventListener('altair:show-task', show);
    return () => window.removeEventListener('altair:show-task', show);
  }, []);
  useEffect(() => {
    let alive = true;
    let revision = 0;
    async function load() {
      const current = ++revision;
      try {
        const next = await readTasks();
        if (alive && current === revision) {
          setTasks(next);
          setReady(true);
          setError('');
        }
      } catch {
        if (alive) setError('خواندن کارها انجام نشد. دوباره تلاش کن.');
      }
    }
    void load();
    const stop = watchWorkspaceValue(TASKS_KEY, () => {
      void load();
    });
    const timer = window.setInterval(
      () =>
        setToday(
          new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Tehran',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(new Date()),
        ),
      60_000,
    );
    return () => {
      alive = false;
      revision++;
      stop();
      window.clearInterval(timer);
    };
  }, []);
  async function mutate(change: (tasks: Task[]) => Task[], after?: () => void) {
    if (writing.current) return;
    writing.current = true;
    setBusy(true);
    setError('');
    try {
      setTasks(await updateTasks(change));
      after?.();
    } catch {
      setError('تغییرات ذخیره نشد. دوباره تلاش کن.');
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }
  function reset() {
    setEditing(null);
    setTitle('');
    setPriority('normal');
    setDue('');
  }
  const active = tasks.filter((task) => !task.done);
  const completed = tasks.length - active.length;
  const visible = tasks
    .filter((task) =>
      filter === 'done'
        ? task.done
        : !task.done && (filter !== 'today' || Boolean(task.due && task.due <= today)),
    )
    .sort(
      (a, b) =>
        Number(b.priority === 'high') - Number(a.priority === 'high') ||
        (a.due || '9999').localeCompare(b.due || '9999'),
    );
  return (
    <div className="todo-board" ref={board}>
      <div className="todo-summary">
        <span>{active.length.toLocaleString('fa-IR')} کار باقی‌مانده</span>
        <span>{completed.toLocaleString('fa-IR')} انجام‌شده</span>
      </div>
      <progress
        className="todo-progress"
        max={Math.max(tasks.length, 1)}
        value={completed}
        aria-label="پیشرفت کارها"
      />
      <form
        className="todo-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim()) return;
          const item: Task = {
            id: editing ?? crypto.randomUUID(),
            title: title.trim(),
            done: false,
            priority,
            due,
          };
          void mutate((current) => {
            if (!editing) return [...current, item];
            if (!current.some((task) => task.id === editing)) throw new Error('Task deleted');
            return current.map((task) =>
              task.id === editing ? { ...item, done: task.done } : task,
            );
          }, reset);
        }}
      >
        <div className="todo-entry">
          <input
            ref={input}
            aria-label="عنوان کار"
            placeholder={editing ? 'ویرایش کار…' : 'کار بعدی چیه؟'}
            value={title}
            maxLength={300}
            required
            disabled={!ready || busy}
            onChange={(event) => setTitle(event.target.value)}
          />
          <button
            className="icon-button"
            type="submit"
            title={editing ? 'ذخیره کار' : 'افزودن کار'}
            aria-label={editing ? 'ذخیره کار' : 'افزودن کار'}
            disabled={!ready || busy || !title.trim() || (!editing && tasks.length >= 500)}
          >
            <Icon name={editing ? 'check' : 'plus'} />
          </button>
        </div>
        <details className="todo-options" open={editing ? true : undefined}>
          <summary className="icon-button" aria-label="اولویت و موعد" title="اولویت و موعد">
            <Icon name="settings" />
          </summary>
          <div>
            <label>
              اولویت
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value as Task['priority'])}
                disabled={busy}
              >
                <option value="normal">عادی</option>
                <option value="high">مهم</option>
              </select>
            </label>
            <label>
              موعد (میلادی)
              <input
                type="date"
                value={due}
                onChange={(event) => setDue(event.target.value)}
                disabled={busy}
              />
            </label>
          </div>
        </details>
        {editing && (
          <button
            className="icon-button"
            type="button"
            aria-label="انصراف از ویرایش"
            title="انصراف از ویرایش"
            onClick={reset}
          >
            <Icon name="close" />
          </button>
        )}
      </form>
      <div className="todo-filters" role="group" aria-label="فیلتر کارها">
        {(
          [
            ['active', 'در جریان'],
            ['today', 'امروز'],
            ['done', 'انجام‌شده'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            aria-label={label}
            title={label}
            aria-pressed={filter === value}
            onClick={() => {
              setFilter(value);
              setExpanded(false);
            }}
          >
            <Icon name={value === 'active' ? 'list' : value === 'today' ? 'calendar' : 'check'} />
          </button>
        ))}
      </div>
      {error && (
        <p className="todo-error" role="alert">
          {error}{' '}
          {!ready && (
            <button
              className="icon-button"
              aria-label="تلاش دوباره"
              title="تلاش دوباره"
              onClick={() => {
                void readTasks()
                  .then((next) => {
                    setTasks(next);
                    setReady(true);
                    setError('');
                  })
                  .catch(() => setError('خواندن کارها انجام نشد.'));
              }}
            >
              <Icon name="refresh" />
            </button>
          )}
        </p>
      )}
      <ul className="todo-list">
        {(expanded ? visible : visible.slice(0, 6)).map((task) => (
          <li
            key={task.id}
            data-task-id={task.id}
            tabIndex={-1}
            className={task.done ? 'is-done' : ''}
          >
            <label className="todo-task">
              <input
                type="checkbox"
                checked={task.done}
                disabled={busy}
                aria-label={`انجام ${task.title}`}
                onChange={() => {
                  void mutate((current) =>
                    current.map((item) =>
                      item.id === task.id ? { ...item, done: !item.done } : item,
                    ),
                  );
                }}
              />
              <span>
                {task.title}
                <small>
                  {task.priority === 'high' && <b>مهم</b>}
                  {task.due && (
                    <span className={!task.done && task.due < today ? 'is-overdue' : ''}>
                      {new Intl.DateTimeFormat('fa-IR', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        timeZone: 'UTC',
                      }).format(new Date(`${task.due}T00:00:00Z`))}
                      {!task.done && task.due < today ? ' · عقب‌افتاده' : ''}
                    </span>
                  )}
                </small>
              </span>
            </label>
            <div className="todo-tools">
              {!task.done && onFocusTask && (
                <button
                  className="icon-button"
                  title={`تمرکز روی ${task.title}`}
                  aria-label={`تمرکز روی ${task.title}`}
                  onClick={() => onFocusTask(task)}
                >
                  <Icon name="play" />
                </button>
              )}
              <button
                className="icon-button"
                title="ویرایش"
                aria-label={`ویرایش ${task.title}`}
                disabled={busy}
                onClick={() => {
                  setEditing(task.id);
                  setTitle(task.title);
                  setPriority(task.priority);
                  setDue(task.due);
                  input.current?.focus();
                }}
              >
                <Icon name="edit" />
              </button>
              <button
                className="icon-button"
                title="حذف"
                aria-label={`حذف ${task.title}`}
                disabled={busy}
                onClick={() => {
                  void mutate(
                    (current) => current.filter((item) => item.id !== task.id),
                    () => {
                      setRemoved(task);
                      if (editing === task.id) reset();
                    },
                  );
                }}
              >
                <Icon name="trash" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      {ready && !visible.length && (
        <p className="todo-empty">
          {filter === 'done'
            ? 'کارهای انجام‌شده اینجا دیده می‌شوند.'
            : filter === 'today'
              ? 'برای امروز کاری با موعد ثبت نشده.'
              : 'ذهن خلوت، شروع تازه. اولین کارت را اضافه کن.'}
        </p>
      )}
      {visible.length > 6 && (
        <button
          className="icon-button"
          aria-label={
            expanded ? 'نمایش کمتر' : `نمایش همه (${visible.length.toLocaleString('fa-IR')})`
          }
          title={expanded ? 'نمایش کمتر' : 'نمایش همهٔ کارها'}
          onClick={() => setExpanded(!expanded)}
        >
          <Icon name={expanded ? 'collapse' : 'expand'} />
        </button>
      )}
      {removed && (
        <div className="todo-undo" role="status">
          کار حذف شد.
          <button
            className="icon-button"
            aria-label="بازگردانی کار حذف‌شده"
            title="بازگردانی کار حذف‌شده"
            disabled={busy}
            onClick={() => {
              void mutate(
                (current) =>
                  current.some((task) => task.id === removed.id) ? current : [...current, removed],
                () => setRemoved(null),
              );
            }}
          >
            <Icon name="undo" />
          </button>
        </div>
      )}
    </div>
  );
}
