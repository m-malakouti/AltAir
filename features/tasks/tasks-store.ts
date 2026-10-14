import { readWorkspaceValue, writeWorkspaceValue } from '@/lib/browser/workspace-storage';
export const TASKS_KEY = 'altAir.tasks.v1';
export interface Task {
  id: string;
  title: string;
  done: boolean;
  priority: 'normal' | 'high';
  due: string;
}
export function parseTasks(value: unknown): Task[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 500) throw new Error('Invalid tasks');
  const ids = new Set<string>();
  return value.map((raw: unknown) => {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid task');
    const task = raw as Record<string, unknown>;
    if (
      typeof task.id !== 'string' ||
      !task.id ||
      ids.has(task.id) ||
      typeof task.title !== 'string' ||
      !task.title.trim() ||
      task.title.length > 300 ||
      typeof task.done !== 'boolean' ||
      !['normal', 'high'].includes(String(task.priority)) ||
      typeof task.due !== 'string' ||
      (task.due !== '' &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(task.due) ||
          Number.isNaN(Date.parse(task.due)) ||
          new Date(task.due).toISOString().slice(0, 10) !== task.due))
    )
      throw new Error('Invalid task');
    ids.add(task.id);
    return {
      id: task.id,
      title: task.title.trim(),
      done: task.done,
      priority: task.priority as Task['priority'],
      due: task.due,
    };
  });
}
export async function readTasks() {
  return parseTasks(await readWorkspaceValue(TASKS_KEY));
}
export async function updateTasks(change: (tasks: Task[]) => Task[]) {
  return navigator.locks.request(TASKS_KEY, async () => {
    const next = parseTasks(change(await readTasks()));
    await writeWorkspaceValue(TASKS_KEY, next);
    return next;
  });
}
