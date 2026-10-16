import { lazy, Suspense } from 'react';
import { Icon } from '@/components/ui/Icon';

const Renderer = lazy(() => import('./NeshanMapRenderer'));
const configured: unknown = import.meta.env.WXT_NESHAN_MAP_KEY;
export const neshanMapKey = typeof configured === 'string' ? configured.trim() : '';
export interface NeshanMapProps {
  active: boolean;
  encodedPolyline?: string;
  pick: 'home' | 'work' | null;
  onPick: (latitude: number, longitude: number) => void;
}
export function NeshanMap(props: NeshanMapProps) {
  const placeholder = (
    <div className="commute-map-placeholder">
      <Icon name="route" />
      <strong>نقشهٔ نشان، همین‌جا</strong>
      <p>
        {neshanMapKey
          ? 'در حال آماده‌سازی نقشه…'
          : 'نمایش نقشه و مسیر پس از فعال‌سازی اتصال نشان در دسترس است.'}
      </p>
      <small>خانه ↔ محل کار</small>
    </div>
  );
  return (
    <div className="commute-map-frame" aria-label="نقشهٔ مسیر نشان">
      {props.active && neshanMapKey ? (
        <Suspense fallback={placeholder}>
          <Renderer {...props} mapKey={neshanMapKey} />
        </Suspense>
      ) : (
        placeholder
      )}
    </div>
  );
}
