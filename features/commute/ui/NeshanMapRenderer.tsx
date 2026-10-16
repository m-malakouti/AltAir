import { useEffect, useRef, useState } from 'react';
import Map from '@neshan-maps-platform/ol/Map';
import View from '@neshan-maps-platform/ol/View';
import Feature from '@neshan-maps-platform/ol/Feature';
import LineString from '@neshan-maps-platform/ol/geom/LineString';
import Point from '@neshan-maps-platform/ol/geom/Point';
import VectorLayer from '@neshan-maps-platform/ol/layer/Vector';
import VectorSource from '@neshan-maps-platform/ol/source/Vector';
import Style from '@neshan-maps-platform/ol/style/Style';
import Stroke from '@neshan-maps-platform/ol/style/Stroke';
import Circle from '@neshan-maps-platform/ol/style/Circle';
import Fill from '@neshan-maps-platform/ol/style/Fill';
import { fromLonLat, toLonLat } from '@neshan-maps-platform/ol/proj';
import '@neshan-maps-platform/ol/ol.css';
import { decodeRoutePolyline } from '../commute-model';
import type { NeshanMapProps } from './NeshanMap';
import { ActionButton } from '@/components/ui/ActionButton';

export default function NeshanMapRenderer({
  mapKey,
  encodedPolyline,
  pick,
  onPick,
}: NeshanMapProps & { mapKey: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const selection = useRef({ pick, onPick });
  useEffect(() => {
    selection.current = { pick, onPick };
  }, [pick, onPick]);
  useEffect(() => {
    const target = container.current;
    if (!target) return;
    let map: Map | undefined;
    let observer: ResizeObserver | undefined;
    let theme: MutationObserver | undefined;
    let timer: number | undefined;
    try {
      const dark = () => document.documentElement.dataset.theme !== 'light';
      map = new Map({
        target,
        key: mapKey,
        mapType: dark() ? 'standard-night' : 'dreamy',
        traffic: false,
        poi: false,
        view: new View({ center: fromLonLat([51.389, 35.6892]), zoom: 12 }),
      });
      const current = map;
      observer = new ResizeObserver(() => current.updateSize());
      observer.observe(target);
      theme = new MutationObserver(() => current.setMapType(dark() ? 'standard-night' : 'dreamy'));
      theme.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      });
      timer = window.setTimeout(() => setFailed(true), 15_000);
      current.once('rendercomplete', () => {
        window.clearTimeout(timer);
        setFailed(false);
      });
      if (encodedPolyline) {
        const coordinates = decodeRoutePolyline(encodedPolyline).map((point) => fromLonLat(point));
        const line = new Feature(new LineString(coordinates));
        line.setStyle([
          new Style({ stroke: new Stroke({ color: '#fff', width: 7 }) }),
          new Style({ stroke: new Stroke({ color: '#5869ef', width: 4 }) }),
        ]);
        const origin = new Feature(new Point(coordinates[0]!));
        const destination = new Feature(new Point(coordinates[coordinates.length - 1]!));
        const marker = (color: string) =>
          new Style({
            image: new Circle({
              radius: 7,
              fill: new Fill({ color }),
              stroke: new Stroke({ color: '#fff', width: 2 }),
            }),
          });
        origin.setStyle(marker('#23855e'));
        destination.setStyle(marker('#5869ef'));
        current.addLayer(
          new VectorLayer({
            source: new VectorSource<LineString | Point>({ features: [line, origin, destination] }),
          }),
        );
        current
          .getView()
          .fit(line.getGeometry()!.getExtent(), { padding: [34, 34, 34, 34], maxZoom: 16 });
      }
      current.on('singleclick', (event) => {
        if (!selection.current.pick) return;
        const [longitude, latitude] = toLonLat(event.coordinate);
        if (
          typeof latitude === 'number' &&
          typeof longitude === 'number' &&
          Number.isFinite(latitude) &&
          Number.isFinite(longitude) &&
          Math.abs(latitude) <= 90 &&
          Math.abs(longitude) <= 180
        )
          selection.current.onPick(latitude, longitude);
      });
    } catch {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setFailed(true), 0);
    }
    return () => {
      window.clearTimeout(timer);
      observer?.disconnect();
      theme?.disconnect();
      map?.setTarget(undefined);
      map?.dispose();
    };
  }, [mapKey, encodedPolyline, revision]);
  return (
    <div className={`commute-map-live ${pick ? 'commute-map-live--pick' : ''}`}>
      <div
        ref={container}
        className="commute-map-canvas"
        tabIndex={0}
        role="region"
        aria-label="نقشهٔ تعاملی نشان؛ بزرگ‌نمایی با کنترل‌های نقشه"
      />
      {pick && (
        <span className="commute-map-hint">
          برای انتخاب {pick === 'home' ? 'خانه' : 'محل کار'} روی نقشه بزن
        </span>
      )}
      {failed && (
        <div className="commute-map-failed" role="status">
          <span>نقشه بارگذاری نشد؛ اتصال و دسترسی نشان را بررسی کن.</span>
          <ActionButton
            icon="refresh"
            label="بارگذاری دوبارهٔ نقشه"
            onClick={() => {
              setFailed(false);
              setRevision((value) => value + 1);
            }}
          />
        </div>
      )}
      <a
        className="commute-map-credit"
        href="https://neshan.org"
        target="_blank"
        rel="noopener noreferrer"
      >
        © نشان
      </a>
    </div>
  );
}
