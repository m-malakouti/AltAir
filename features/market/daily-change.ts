export function dailyChangePercent(
  price: number,
  change: number | null | undefined,
): number | null {
  if (change == null || !Number.isFinite(price) || !Number.isFinite(change) || price <= 0)
    return null;
  const previous = price - change;
  if (previous <= 0) return null;
  const result = (change / previous) * 100;
  return Number.isFinite(result) ? result : null;
}
