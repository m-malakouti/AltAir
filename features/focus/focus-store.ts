import { readWorkspaceValue, writeWorkspaceValue } from '@/lib/browser/workspace-storage';
import {
  changeFocus,
  parseFocus,
  settleFocus,
  type FocusAction,
  type FocusData,
} from './focus-model';
export const FOCUS_KEY = 'altAir.focus.v1';
export async function readFocus() {
  return parseFocus(await readWorkspaceValue(FOCUS_KEY));
}
export async function updateFocus(change: (data: FocusData) => FocusData) {
  return navigator.locks.request(FOCUS_KEY, async () => {
    const current = await readFocus();
    const next = change(current);
    if (next !== current) await writeWorkspaceValue(FOCUS_KEY, parseFocus(next));
    return next;
  });
}
export function actOnFocus(action: FocusAction) {
  return updateFocus((data) => changeFocus(data, action, Date.now()));
}
export function reconcileFocus() {
  return updateFocus((data) => settleFocus(data, Date.now()));
}
