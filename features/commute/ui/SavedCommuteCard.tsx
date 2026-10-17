import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { readCommutePlaces, watchCommutePlaces } from '@/lib/browser/commute-storage';
import type { CommutePlaces } from '../commute-model';

export function SavedCommuteCard({ onOpen }: { onOpen: () => void }) {
  const [places, setPlaces] = useState<CommutePlaces | null>(null);
  useEffect(() => {
    let alive = true;
    let revision = 0;
    const load = async () => {
      const current = ++revision;
      try {
        const saved = await readCommutePlaces();
        if (alive && current === revision) setPlaces(saved);
      } catch {
        if (alive && current === revision) setPlaces(null);
      }
    };
    void load();
    const stop = watchCommutePlaces(() => {
      void load();
    });
    return () => {
      alive = false;
      stop();
    };
  }, []);
  if (!places) return null;
  return (
    <section className="sketch-card saved-commute-card" aria-label="کارت مسیر رفت‌وآمد ذخیره‌شده">
      <header>
        <span className="commute-symbol">
          <Icon name="route" />
        </span>
        <div>
          <h2>رفت‌وآمد من</h2>
          <span className="saved-commute-status">مسیر ذخیره‌شده</span>
        </div>
      </header>
      <div className="saved-commute-points">
        <div>
          <Icon name="home" />
          <span>
            <small>خانه</small>
            <strong>{places.home}</strong>
          </span>
        </div>
        <span className="saved-commute-connector" aria-hidden="true" />
        <div>
          <Icon name="work" />
          <span>
            <small>محل کار</small>
            <strong>{places.work}</strong>
          </span>
        </div>
      </div>
      <button type="button" className="saved-commute-open" onClick={onOpen}>
        نمایش و ویرایش مسیر <Icon name="previous" />
      </button>
    </section>
  );
}
