import { WeatherCard } from '@/features/weather/ui/WeatherCard';
import { Icon } from '@/components/ui/Icon';
import { useState } from 'react';
import { WorkspaceShell } from '@/components/WorkspaceShell';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Notice } from '@/components/ui/Notice';
import { CurrencyBoard } from '@/features/market/ui/CurrencyBoard';
import { openSidePanel } from '@/lib/browser/side-panel';

export default function App() {
  const [error, setError] = useState('');
  const [isOpening, setIsOpening] = useState(false);
  async function handleOpenSidePanel() {
    setError('');
    setIsOpening(true);
    try {
      await openSidePanel();
      window.close();
    } catch {
      setError('پنل باز نشد. افزونه را در Chrome یا Edge باز کنید و دوباره تلاش کنید.');
    } finally {
      setIsOpening(false);
    }
  }
  return (
    <WorkspaceShell surface="popup">
      <GlassCard className="quick-workspace" aria-labelledby="quick-heading">
        <span className="eyebrow">دسترسی سریع</span>
        <h2 id="quick-heading">فضای تو، همین نزدیکی.</h2>
        <p className="description">برای دسترسی به ابزارها و تنظیمات، پنل کناری را باز کن.</p>
        <Button
          className="icon-button"
          aria-label="باز کردن پنل"
          title="باز کردن پنل"
          disabled={isOpening}
          onClick={() => {
            void handleOpenSidePanel();
          }}
        >
          <Icon name="panel" />
        </Button>
      </GlassCard>
      <WeatherCard />
      <CurrencyBoard />
      {error && <Notice>{error}</Notice>}
    </WorkspaceShell>
  );
}
