export const segmentIds = ['bookmarks', 'weather', 'currencies', 'notes'] as const;
export type SegmentId = (typeof segmentIds)[number];
export function parseOrder(value: unknown): SegmentId[] {
  if (!Array.isArray(value)) return [...segmentIds];
  return [
    ...new Set([
      ...value.filter((id): id is SegmentId => segmentIds.includes(id as SegmentId)),
      ...segmentIds,
    ]),
  ];
}
export function moveSegment(order: SegmentId[], from: SegmentId, to: SegmentId): SegmentId[] {
  const result = order.filter((id) => id !== from);
  result.splice(order.indexOf(to), 0, from);
  return result;
}
