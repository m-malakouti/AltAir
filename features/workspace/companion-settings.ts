import { useEffect, useState } from 'react';
import { parseMarketEndpoint } from '@/features/market/market-endpoint';
export interface CompanionSettings {
  enabled: boolean;
  motionEnabled: boolean;
  dragEnabled: boolean;
  horizontalRange: number;
}
export const defaultCompanionSettings: CompanionSettings = {
  enabled: false,
  motionEnabled: true,
  dragEnabled: true,
  horizontalRange: 48,
};
export function parseCompanionSettings(value: unknown): CompanionSettings {
  if (!value || typeof value !== 'object') return defaultCompanionSettings;
  const item = value as Record<string, unknown>;
  if (
    typeof item.enabled !== 'boolean' ||
    typeof item.motionEnabled !== 'boolean' ||
    typeof item.dragEnabled !== 'boolean' ||
    typeof item.horizontalRange !== 'number' ||
    !Number.isInteger(item.horizontalRange) ||
    item.horizontalRange < 0 ||
    item.horizontalRange > 64
  )
    return defaultCompanionSettings;
  return item as unknown as CompanionSettings;
}
export function useCompanionSettings(active: boolean) {
  const [settings, setSettings] = useState(defaultCompanionSettings);
  useEffect(() => {
    const endpoint = parseMarketEndpoint(import.meta.env.WXT_MARKET_API_URL as unknown);
    if (!endpoint || !active) return;
    let alive = true;
    let revision = 0;
    const refresh = async () => {
      if (document.hidden) return;
      const current = ++revision;
      let next = defaultCompanionSettings;
      try {
        const response = await fetch(new URL('/api/workspace/companion', endpoint), {
          cache: 'no-store',
          credentials: 'omit',
          redirect: 'error',
          signal: AbortSignal.timeout(8000),
        });
        if (response.ok) next = parseCompanionSettings(await response.json());
      } catch {
        /* Unavailable settings keep the companion disabled. */
      }
      if (alive && current === revision) setSettings(next);
    };
    const update = () => {
      void refresh();
    };
    update();
    const timer = window.setInterval(update, 60000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [active]);
  return settings;
}
