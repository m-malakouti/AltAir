import { readWorkspaceValue, writeWorkspaceValue } from '@/lib/browser/workspace-storage';
import { parseLayout, changeLayout } from './layout-model';
import type { LayoutAction } from './layout-model';
export const LAYOUT_KEY = 'altAir.workspace.layout.v2';
export async function readLayout() {
  const value = await readWorkspaceValue(LAYOUT_KEY);
  return parseLayout(
    value,
    value == null ? await readWorkspaceValue('altAir.workspace.order.v1') : undefined,
  );
}
export async function updateLayout(action: LayoutAction) {
  return navigator.locks.request(LAYOUT_KEY, async () => {
    const next = changeLayout(await readLayout(), action);
    await writeWorkspaceValue(LAYOUT_KEY, next);
    return next;
  });
}
