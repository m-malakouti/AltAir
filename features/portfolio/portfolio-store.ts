import {
  readWorkspaceValue,
  writeWorkspaceValue,
  watchWorkspaceValue,
} from '@/lib/browser/workspace-storage';
import { parsePortfolio, parseQuantity, type Portfolio } from './portfolio-model';

export const PORTFOLIO_KEY = 'altAir.portfolio.v1';
export const readPortfolio = async () => parsePortfolio(await readWorkspaceValue(PORTFOLIO_KEY));
export const watchPortfolio = (listener: () => void) =>
  watchWorkspaceValue(PORTFOLIO_KEY, listener);
export async function updatePortfolio(change: (current: Portfolio) => Portfolio) {
  return navigator.locks.request(PORTFOLIO_KEY, async () => {
    const next = parsePortfolio(change(await readPortfolio()));
    await writeWorkspaceValue(PORTFOLIO_KEY, next);
    return next;
  });
}
export function saveHolding(code: string, input: string, previous: string | null) {
  const quantity = parseQuantity(input, code);
  return updatePortfolio((current) => {
    const existing = current.holdings.find((item) => item.code === code);
    if ((existing?.quantity ?? null) !== previous) throw new Error('portfolio_conflict');
    return {
      ...current,
      holdings: existing
        ? current.holdings.map((item) => (item.code === code ? { code, quantity } : item))
        : [...current.holdings, { code, quantity }],
    };
  });
}
export function removeHolding(code: string, previous: string) {
  return updatePortfolio((current) => {
    if (current.holdings.find((item) => item.code === code)?.quantity !== previous)
      throw new Error('portfolio_conflict');
    return { ...current, holdings: current.holdings.filter((item) => item.code !== code) };
  });
}
