import { Icon } from '@/components/ui/Icon';
import { googleMapUrl } from '../google-map-url';

const configured: unknown = import.meta.env.WXT_GOOGLE_MAPS_EMBED_KEY;
const key = typeof configured === 'string' ? configured.trim() : '';

export function GoogleMap({
  active,
  endpoints,
  revision,
}: {
  active: boolean;
  endpoints: { origin: string; destination: string } | null;
  revision: number;
}) {
  const src = googleMapUrl(key, endpoints);
  return (
    <div className="commute-map-frame" aria-label="نقشهٔ گوگل">
      {active && src ? (
        <iframe
          key={`${src}:${revision}`}
          className="commute-google-map"
          title="نقشه و مسیر رفت‌وآمد در Google Maps"
          src={src}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <div className="commute-map-placeholder">
          <Icon name="route" />
          <strong>Google Maps، همین‌جا</strong>
          <p>{src ? 'برای نمایش نقشه وارد بخش مسیر شو.' : 'نقشهٔ گوگل هنوز فعال نشده است.'}</p>
          <small>خانه ↔ محل کار</small>
        </div>
      )}
    </div>
  );
}
