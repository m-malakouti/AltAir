import { useTheme } from '@/features/appearance/use-theme';
import { Button } from './ui/Button';
import type { ReactNode } from 'react';
import { Icon } from './ui/Icon';

export function BrandHeader({
  navigation,
  compact = false,
}: {
  navigation?: ReactNode;
  compact?: boolean;
}) {
  const { resolved, setMode } = useTheme();
  const next = resolved === 'dark' ? 'light' : 'dark';
  return (
    <header className="brand-header">
      {!compact && (
        <div className="brand-identity">
          <img className="brand-mark" src="/altair-logo.svg" alt="" aria-hidden="true" />
          <div>
            <h1 lang="en" dir="ltr">
              AltAir360
            </h1>
            <p lang="en" dir="ltr">
              Your Space. Your Tools.
            </p>
          </div>
        </div>
      )}
      {compact && (
        <span className="brand-wordmark" lang="en" dir="ltr">
          AltAir<span>360</span>
        </span>
      )}
      <div className="brand-controls">
        <Button
          variant="ghost"
          className="theme-toggle"
          aria-label={next === 'light' ? 'تغییر به حالت روشن' : 'تغییر به حالت تیره'}
          title={next === 'light' ? 'تغییر به حالت روشن' : 'تغییر به حالت تیره'}
          onClick={() => setMode(next)}
        >
          <Icon name={resolved === 'dark' ? 'sun' : 'moon'} />
        </Button>
        {navigation}
      </div>
    </header>
  );
}
