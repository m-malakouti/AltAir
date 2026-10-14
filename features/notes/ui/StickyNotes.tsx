import { Icon } from '@/components/ui/Icon';
import { useEffect, useState, type ReactNode } from 'react';
import { NOTES_KEY, readNotes, saveNote, deleteNote } from '../notes-store';
import type { Note } from '../notes-store';
import { watchWorkspaceValue } from '@/lib/browser/workspace-storage';

function NoteCard({
  note,
  remove,
  addControl,
}: {
  note: Note;
  remove: () => void;
  addControl?: ReactNode;
}) {
  const [draft, setDraft] = useState(note);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const shown = editing ? draft : note;
  async function save() {
    setBusy(true);
    try {
      await saveNote(draft);
      setEditing(false);
      setStatus('ذخیره شد');
    } catch {
      setStatus('ذخیره نشد؛ متن را نگه دار و دوباره تلاش کن.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="sticky-note">
      {addControl}
      <textarea
        aria-label="متن یادداشت"
        placeholder="ایده‌ای برای امروز…"
        maxLength={5000}
        value={shown.text}
        disabled={busy}
        onChange={(event) => {
          setDraft({ ...shown, text: event.target.value });
          setEditing(true);
          setStatus('تغییرات ذخیره نشده');
        }}
      />
      <div className="note-tools">
        <button
          className="icon-button"
          aria-label="ذخیره یادداشت"
          title="ذخیره یادداشت"
          disabled={busy || !editing}
          onClick={() => {
            void save();
          }}
        >
          <Icon name="check" />
        </button>
        <button
          disabled={busy}
          className="icon-button"
          aria-label="حذف یادداشت"
          title="حذف یادداشت"
          onClick={() => {
            if (window.confirm('این یادداشت حذف شود؟')) remove();
          }}
        >
          <Icon name="trash" />
        </button>
      </div>
      <small role="status">{status || 'ذخیره‌شده روی این دستگاه'}</small>
    </article>
  );
}
export function StickyNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const next = await readNotes();
        if (alive) {
          setNotes(next);
          setReady(true);
        }
      } catch {
        if (alive) setError('خواندن یادداشت‌ها انجام نشد. پنل را دوباره باز کن.');
      }
    }
    void load();
    const stop = watchWorkspaceValue(NOTES_KEY, () => {
      void load();
    });
    return () => {
      alive = false;
      stop();
    };
  }, []);
  async function mutate(operation: () => Promise<void>) {
    setBusy(true);
    try {
      await operation();
      setNotes(await readNotes());
      setError('');
    } catch {
      setError('تغییر یادداشت ذخیره نشد؛ دوباره تلاش کن.');
    } finally {
      setBusy(false);
    }
  }
  const addControl = (
    <button
      className="icon-button note-add"
      aria-label="یادداشت جدید"
      title="یادداشت جدید"
      disabled={!ready || busy || notes.length >= 100}
      onClick={() => {
        void mutate(() => saveNote({ id: crypto.randomUUID(), text: '', color: 'yellow' }, true));
      }}
    >
      <Icon name="plus" />
    </button>
  );
  return (
    <div className="notes-board">
      {error && <p role="status">{error}</p>}
      <div className="notes-grid">
        {notes.length === 0 && (
          <div className="sticky-note note-empty">
            {addControl}
            <p className="helper-text">فکرها، کارها و یادآوری‌هایت را اینجا بنویس.</p>
          </div>
        )}
        {notes.map((note, index) => (
          <NoteCard
            key={note.id}
            note={note}
            addControl={index === 0 ? addControl : undefined}
            remove={() => {
              void mutate(() => deleteNote(note.id));
            }}
          />
        ))}
      </div>
    </div>
  );
}
