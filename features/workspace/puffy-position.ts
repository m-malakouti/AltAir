export const PUFFY_POSITION_KEY = 'altAir.puffy.position.v1';
export type PuffyPosition = { x: number; y: number };
export function clampPuffy(
  position: PuffyPosition,
  viewport: { width: number; height: number },
): PuffyPosition {
  const width = Math.min(360, Math.max(0, viewport.width - 24));
  const height = Math.min(300, Math.max(0, viewport.height - 24));
  return {
    x: Math.max(12, Math.min(position.x, viewport.width - width - 12)),
    y: Math.max(12, Math.min(position.y, viewport.height - height - 12)),
  };
}
export function parsePuffyPosition(raw: unknown): PuffyPosition | null {
  if (
    !raw ||
    typeof raw !== 'object' ||
    !('x' in raw) ||
    !('y' in raw) ||
    typeof raw.x !== 'number' ||
    typeof raw.y !== 'number' ||
    !Number.isFinite(raw.x) ||
    !Number.isFinite(raw.y)
  )
    return null;
  return { x: raw.x, y: raw.y };
}
