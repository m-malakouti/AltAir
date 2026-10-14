import { readWorkspaceValue, writeWorkspaceValue } from '@/lib/browser/workspace-storage';
import { parseLibrary, type CastboxLibrary } from './castbox-model';
export const CASTBOX_KEY = 'altAir.castbox.v1';
export async function readCastbox() {
  return parseLibrary(await readWorkspaceValue(CASTBOX_KEY));
}
export async function updateCastbox(change: (current: CastboxLibrary) => CastboxLibrary) {
  return navigator.locks.request(CASTBOX_KEY, async () => {
    const next = parseLibrary(change(await readCastbox()));
    await writeWorkspaceValue(CASTBOX_KEY, next);
    return next;
  });
}
