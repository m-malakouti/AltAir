import {
  readWorkspaceValue,
  watchWorkspaceValue,
  writeWorkspaceValue,
} from '@/lib/browser/workspace-storage';

export const VIEW_MODE_KEY = 'altAir.workspace.view.v1';
export type ViewMode = 'workspace' | 'ambient' | 'exchange';
const listeners = new Set<() => void>();
let snapshot: { mode: ViewMode; error: string } = { mode: 'workspace', error: '' };
let initialized = false;
let revision = 0;
let pending = 0;
let queue = Promise.resolve();

function publish(mode: ViewMode, error = '') {
  snapshot = { mode, error };
  listeners.forEach((listener) => listener());
}
export function initializeViewMode() {
  if (initialized) return;
  initialized = true;
  const refresh = async () => {
    const current = revision;
    try {
      const value = await readWorkspaceValue(VIEW_MODE_KEY);
      if (current === revision && !pending)
        publish(value === 'ambient' || value === 'exchange' ? value : 'workspace');
    } catch {
      if (current === revision && !pending)
        publish(snapshot.mode, 'خواندن نمای ذخیره‌شده انجام نشد.');
    }
  };
  watchWorkspaceValue(VIEW_MODE_KEY, () => {
    if (!pending) {
      revision++;
      void refresh();
    }
  });
  void refresh();
}
export function setViewMode(mode: ViewMode) {
  const current = ++revision;
  publish(mode);
  pending++;
  queue = queue.then(async () => {
    try {
      await writeWorkspaceValue(VIEW_MODE_KEY, mode);
    } catch {
      if (current === revision)
        publish(mode, 'نما تغییر کرد، اما ذخیره نشد. برای تلاش دوباره اینجا بزن.');
    } finally {
      pending--;
    }
  });
}
export const getViewMode = () => snapshot;
export function subscribeViewMode(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
