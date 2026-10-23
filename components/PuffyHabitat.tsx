import { PuffyCompanion } from './PuffyCompanion';
import type { CompanionSettings } from '@/features/workspace/companion-settings';

export function PuffyHabitat({
  active = true,
  settings,
}: {
  active?: boolean;
  settings?: CompanionSettings;
}) {
  return (
    <div className="puffy-home">
      <div className="puffy-habitat" aria-label="خانهٔ پوفی" hidden={!active}>
        <PuffyCompanion
          active={active}
          motionEnabled={settings?.motionEnabled}
          dragEnabled={settings?.dragEnabled}
          horizontalRange={settings?.horizontalRange}
        />
      </div>
    </div>
  );
}
