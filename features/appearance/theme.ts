export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';
export interface ThemePreference {
  version: 1;
  mode: ThemeMode;
}

export function parseThemePreference(value: unknown): ThemePreference {
  if (
    typeof value === 'object' &&
    value !== null &&
    'version' in value &&
    value.version === 1 &&
    'mode' in value &&
    (value.mode === 'light' || value.mode === 'dark' || value.mode === 'system')
  ) {
    return { version: 1, mode: value.mode };
  }
  return { version: 1, mode: 'system' };
}

export function resolveTheme(mode: ThemeMode, prefersDark: boolean): ResolvedTheme {
  return mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode;
}
