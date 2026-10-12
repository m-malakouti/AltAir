import { Icon } from './ui/Icon';
import type { ReactNode } from 'react';
import { useTheme } from '@/features/appearance/use-theme';
import { BrandHeader } from './BrandHeader';
import { Notice } from './ui/Notice';
import { Button } from './ui/Button';

export function WorkspaceShell({
  children,
  surface,
}: {
  children: ReactNode;
  surface: 'popup' | 'panel' | 'newtab';
}) {
  const { error, mode, setMode } = useTheme();
  return (
    <div className={`workspace workspace--${surface}`}>
      <BrandHeader />
      <main className="workspace-content">{children}</main>
      {error && (
        <Notice>
          {error}
          <Button
            variant="ghost"
            aria-label="تلاش دوباره"
            title="تلاش دوباره"
            onClick={() => setMode(mode)}
          >
            <Icon name="refresh" />
          </Button>
        </Notice>
      )}
      <footer className="workspace-footer">
        <span>فضای تو، به سبک تو</span>
        <span className="version" dir="ltr">
          v0.1.0
        </span>
      </footer>
    </div>
  );
}
