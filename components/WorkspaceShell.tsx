import { AccountCard } from '@/features/auth/ui/AccountCard';
import { Icon } from './ui/Icon';
import type { ReactNode } from 'react';
import { useTheme } from '@/features/appearance/use-theme';
import { BrandHeader } from './BrandHeader';
import { Notice } from './ui/Notice';
import { Button } from './ui/Button';
import { initializeBackground } from '@/features/appearance/background-store';

initializeBackground();

export function WorkspaceShell({
  children,
  surface,
  navigation,
  ambient = false,
}: {
  children: ReactNode;
  surface: 'popup' | 'panel' | 'newtab';
  navigation?: ReactNode;
  ambient?: boolean;
}) {
  const { error, mode, setMode } = useTheme();
  return (
    <div className={`workspace workspace--${surface} ${ambient ? 'workspace--ambient' : ''}`}>
      <BrandHeader navigation={navigation} compact={surface === 'newtab'} />
      <main className="workspace-content">
        {surface !== 'newtab' && <AccountCard />}
        {children}
      </main>
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
