import { ThemeSelector } from './ThemeSelector';
import { GlassCard } from './ui/GlassCard';

export function AppearanceCard() {
  return (
    <GlassCard className="appearance-card" aria-labelledby="appearance-heading">
      <div className="section-heading">
        <div>
          <h3 id="appearance-heading">رنگ‌وبوی فضای تو</h3>
          <p className="description">روشن، تیره یا هماهنگ با دستگاه.</p>
        </div>
        <span className="section-symbol" aria-hidden="true">
          ◐
        </span>
      </div>
      <ThemeSelector />
      <p className="helper-text">انتخابت برای دفعهٔ بعد نگه داشته می‌شود.</p>
    </GlassCard>
  );
}
