import { useId } from 'react';
import { useTheme } from '@/features/appearance/use-theme';
import type { ThemeMode } from '@/features/appearance/theme';

const options: { mode: ThemeMode; label: string; symbol: string }[] = [
  { mode: 'light', label: 'روشن', symbol: '☀' },
  { mode: 'dark', label: 'تیره', symbol: '☾' },
  { mode: 'system', label: 'خودکار', symbol: '◐' },
];
export function ThemeSelector() {
  const { mode, setMode } = useTheme();
  const name = useId();
  return (
    <fieldset className="theme-selector">
      <legend className="sr-only">انتخاب ظاهر</legend>
      {options.map((option) => (
        <label className="theme-option" title={option.label} key={option.mode}>
          <input
            type="radio"
            name={name}
            value={option.mode}
            checked={mode === option.mode}
            onChange={() => setMode(option.mode)}
          />
          <span className="theme-option__content">
            <span className="theme-option__symbol" aria-hidden="true">
              {option.symbol}
            </span>
            <span className="sr-only">{option.label}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
