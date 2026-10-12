import { useSyncExternalStore } from 'react';
import { getThemeSnapshot, setThemeMode, subscribeTheme } from './theme-store';

export function useTheme() {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot);
  return { ...theme, setMode: setThemeMode };
}
