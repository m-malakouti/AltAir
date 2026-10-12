import { useTheme } from '@/features/appearance/use-theme';
import { Button } from './ui/Button';

export function BrandHeader() {
  const { resolved, setMode } = useTheme();
  const next = resolved === 'dark' ? 'light' : 'dark';
  return (
    <header className="brand-header">
      <div className="brand-identity">
        <img className="brand-mark" src="/altair-logo.svg" alt="" aria-hidden="true" />
        <div>
          <h1 lang="en" dir="ltr">
            Alt Air
          </h1>
          <p lang="en" dir="ltr">
            Your Space. Your Tools.
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        className="theme-toggle"
        aria-label={next === 'light' ? 'تغییر به حالت روشن' : 'تغییر به حالت تیره'}
        onClick={() => setMode(next)}
      >
        <span aria-hidden="true">{resolved === 'dark' ? '☀' : '☾'}</span>
      </Button>
    </header>
  );
}
