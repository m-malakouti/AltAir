import { SketchWorkspace } from '@/components/SketchWorkspace';
import { WorkspaceSegments } from '@/components/WorkspaceSegments';
import { WebSearch } from '@/components/WebSearch';
import { Icon } from '@/components/ui/Icon';
import { useState } from 'react';
import { WorkspaceShell } from '@/components/WorkspaceShell';
import { AppearanceCard } from '@/components/AppearanceCard';
import { Button } from '@/components/ui/Button';

export default function App({ surface = 'panel' }: { surface?: 'panel' | 'newtab' }) {
  const [view, setView] = useState<'workspace' | 'appearance'>('workspace');
  return (
    <WorkspaceShell
      surface={surface}
      navigation={
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
      }
    >
      {view === 'workspace' ? (
        <>
          <>
            {surface === 'newtab' ? <SketchWorkspace /> : <WebSearch />}
            {surface !== 'newtab' && <WorkspaceSegments />}
          </>
        </>
      ) : (
        <>
          <AppearanceCard />
        </>
      )}
    </WorkspaceShell>
  );
}
