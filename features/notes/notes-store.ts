import { readWorkspaceValue, writeWorkspaceValue } from '@/lib/browser/workspace-storage';
export const NOTES_KEY = 'altAir.notes.v1';
export interface Note {
  id: string;
  text: string;
  color: 'yellow' | 'pink' | 'blue';
}
export function parseNotes(value: unknown): Note[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 100) throw new Error('Invalid notes');
  const ids = new Set<string>();
  return value.map((raw: unknown) => {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid note');
    const n = raw as Record<string, unknown>;
    if (
      typeof n.id !== 'string' ||
      !n.id ||
      ids.has(n.id) ||
      typeof n.text !== 'string' ||
      n.text.length > 5000 ||
      !['yellow', 'pink', 'blue'].includes(String(n.color))
    )
      throw new Error('Invalid note');
    ids.add(n.id);
    return { id: n.id, text: n.text, color: n.color as Note['color'] };
  });
}
export async function readNotes() {
  return parseNotes(await readWorkspaceValue(NOTES_KEY));
}
export async function saveNote(note: Note, creating = false) {
  return navigator.locks.request(NOTES_KEY, async () => {
    const notes = await readNotes();
    if (!creating && !notes.some((n) => n.id === note.id)) throw new Error('Note deleted');
    const next = creating ? [...notes, note] : notes.map((n) => (n.id === note.id ? note : n));
    await writeWorkspaceValue(NOTES_KEY, parseNotes(next));
  });
}
export async function deleteNote(id: string) {
  return navigator.locks.request(NOTES_KEY, async () => {
    await writeWorkspaceValue(
      NOTES_KEY,
      (await readNotes()).filter((n) => n.id !== id),
    );
  });
}
