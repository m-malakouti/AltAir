import { WeatherCard } from '@/features/weather/ui/WeatherCard';
import { Icon } from '@/components/ui/Icon';
import { useState } from 'react';
import { WorkspaceShell } from '@/components/WorkspaceShell';
import { AppearanceCard } from '@/components/AppearanceCard';
import { Button } from '@/components/ui/Button';
import { BookmarkManager } from '@/features/bookmarks/ui/BookmarkManager';
import { CurrencyBoard } from '@/features/market/ui/CurrencyBoard';

export default function App({ surface = 'panel' }: { surface?: 'panel' | 'newtab' }) {
  const [view, setView] = useState<'workspace' | 'appearance'>('workspace');
  return (
    <WorkspaceShell surface={surface}>
      <nav className="workspace-navigation" aria-label="بخش‌های فضای کار">
        <Button
          variant="ghost"
          aria-label="فضای کار"
          title="فضای کار"
          aria-pressed={view === 'workspace'}
          onClick={() => setView('workspace')}
        >
          <Icon name="grid" />
        </Button>
        <Button
          variant="ghost"
          aria-label="تنظیمات"
          title="تنظیمات"
          aria-pressed={view === 'appearance'}
          onClick={() => setView('appearance')}
        >
          <Icon name="settings" />
        </Button>
      </nav>
      {view === 'workspace' ? (
        <>
          <BookmarkManager />
          <WeatherCard />
          <CurrencyBoard />
        </>
      ) : (
        <>
          <AppearanceCard />
        </>
      )}
    </WorkspaceShell>
  );
}
