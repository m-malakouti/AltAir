import { SketchWorkspace } from '@/components/SketchWorkspace';
import { WorkspaceSegments } from '@/components/WorkspaceSegments';
import { WebSearch } from '@/components/WebSearch';
import { Icon } from '@/components/ui/Icon';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { WorkspaceShell } from '@/components/WorkspaceShell';
import { AppearanceCard } from '@/components/AppearanceCard';
import { Button } from '@/components/ui/Button';
import { FocusClock } from '@/features/focus/ui/FocusClock';
import { ExchangeView } from '@/features/market/exchange/ui/ExchangeView';
import { SponsoredAds, SponsoredAdsProvider } from '@/features/ads/ui/SponsoredAds';
import { useCardChoices } from '@/features/workspace/personalization-store';
import {
  getViewMode,
  initializeViewMode,
  setViewMode,
  subscribeViewMode,
} from '@/features/workspace/view-mode-store';

export default function App({ surface = 'panel' }: { surface?: 'panel' | 'newtab' }) {
  const [panelView, setPanelView] = useState<'workspace' | 'exchange'>('workspace');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const cards = useCardChoices();
  const preference = useSyncExternalStore(subscribeViewMode, getViewMode);
  const ambient = surface === 'newtab' && preference.mode === 'ambient';
  const view =
    settingsOpen && !ambient
      ? 'appearance'
      : surface === 'newtab'
        ? preference.mode === 'exchange'
          ? 'exchange'
          : 'workspace'
        : panelView;
  const chooseView = (next: 'workspace' | 'exchange') => {
    setSettingsOpen(false);
    if (surface === 'newtab') setViewMode(next);
    else setPanelView(next);
    window.scrollTo({ top: 0 });
  };
  const modeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (surface === 'newtab') initializeViewMode();
  }, [surface]);
  useEffect(() => {
    if (!ambient) return;
    // Another New Tab can change this shared preference while a dialog is open.
    document
      .querySelectorAll<HTMLDialogElement>('dialog[open]')
      .forEach((dialog) => dialog.close());
    modeButton.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (document.fullscreenElement) return;
      // Let an open city picker or other dialog handle Escape first.
      if (document.querySelector('dialog[open], .weather-picker')) return;
      event.preventDefault();
      setViewMode('workspace');
      modeButton.current?.focus();
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [ambient]);
  return (
    <SponsoredAdsProvider active={!ambient && view === 'workspace'}>
      <WorkspaceShell
        surface={surface}
        ambient={ambient}
        navigation={
          <nav className="workspace-navigation" aria-label="بخش‌های فضای کار">
            <Button
              variant="ghost"
              aria-label="فضای کار"
              title="فضای کار"
              aria-pressed={view === 'workspace'}
              onClick={() => chooseView('workspace')}
            >
              <Icon name="grid" />
            </Button>
            <Button
              variant="ghost"
              aria-label="نمای صرافی"
              title="نمای صرافی"
              aria-pressed={view === 'exchange'}
              onClick={() => chooseView('exchange')}
            >
              <Icon name="currency" />
              <span>صرافی</span>
            </Button>
            <Button
              variant="ghost"
              aria-label="تنظیمات"
              title="تنظیمات"
              aria-pressed={view === 'appearance'}
              onClick={() => setSettingsOpen(true)}
            >
              <Icon name="settings" />
            </Button>
          </nav>
        }
      >
        {surface === 'newtab' && (
          <>
            <button
              ref={modeButton}
              type="button"
              className="workspace-mode-toggle"
              aria-pressed={ambient}
              aria-label={ambient ? 'بازگشت به میزکار' : 'نمای آرام'}
              title={ambient ? 'بازگشت به میزکار (Escape)' : 'نمای آرام؛ ساعت و پس‌زمینه'}
              onClick={() => {
                setViewMode(ambient ? 'workspace' : 'ambient');
                setSettingsOpen(false);
                window.scrollTo({ top: 0 });
              }}
            >
              <Icon name={ambient ? 'grid' : 'moon'} />
              <span>{ambient ? 'بازگشت به میزکار' : 'نمای آرام'}</span>
            </button>
            {preference.error && (
              <button
                className="workspace-mode-error"
                type="button"
                role="status"
                onClick={() => setViewMode(preference.mode)}
              >
                {preference.error}
              </button>
            )}
          </>
        )}
        <div className="workspace-view" hidden={view !== 'workspace' && !ambient}>
          {surface === 'newtab' ? (
            <SketchWorkspace ambient={ambient} active={view === 'workspace'} />
          ) : (
            <>
              <div hidden={!cards.clock}>
                <FocusClock />
              </div>
              <WebSearch />
              <WorkspaceSegments />
              <SponsoredAds placement="sidebar" />
            </>
          )}
        </div>
        {view === 'exchange' && !ambient && <ExchangeView />}
        {view === 'appearance' && !ambient && <AppearanceCard />}
      </WorkspaceShell>
    </SponsoredAdsProvider>
  );
}
