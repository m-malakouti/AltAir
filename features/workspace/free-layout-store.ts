import {
  readWorkspaceValue,
  writeWorkspaceValue,
  watchWorkspaceValue,
} from '@/lib/browser/workspace-storage';
import {
  emptyFreeLayout,
  moveFreeCard,
  parseFreeLayout,
  type BoardSize,
  type BoardSurface,
  type FreeCardId,
  type CardPosition,
} from './free-layout-model';

export const freeLayoutKey = (surface: BoardSurface) =>
  `altAir.workspace.free-layout.${surface}.v1`;
export const readFreeLayout = async (surface: BoardSurface) =>
  parseFreeLayout(await readWorkspaceValue(freeLayoutKey(surface)));
export const watchFreeLayout = (surface: BoardSurface, listener: () => void) =>
  watchWorkspaceValue(freeLayoutKey(surface), listener);
export async function saveFreeCard(
  surface: BoardSurface,
  size: BoardSize,
  id: FreeCardId,
  position: Pick<CardPosition, 'x' | 'y'> | null,
) {
  const key = freeLayoutKey(surface);
  return navigator.locks.request(key, async () => {
    const next = moveFreeCard(await readFreeLayout(surface), size, id, position);
    await writeWorkspaceValue(key, next);
  });
}
export async function resetFreeLayout(surface: BoardSurface) {
  const key = freeLayoutKey(surface);
  return navigator.locks.request(key, () => writeWorkspaceValue(key, emptyFreeLayout()));
}
