import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { AMBIENT_PHOTO_INTERVAL, ambientNightPhotos, getAmbientPhoto } from './ambient-photos';

describe('ambient photo rotation', () => {
  it('holds each photo for two hours, including across reloads', () => {
    const start = Date.UTC(2026, 9, 16);
    expect(AMBIENT_PHOTO_INTERVAL).toBe(7_200_000);
    expect(getAmbientPhoto(start)).toBe(getAmbientPhoto(start + AMBIENT_PHOTO_INTERVAL - 1));
    expect(getAmbientPhoto(start + AMBIENT_PHOTO_INTERVAL)).not.toBe(getAmbientPhoto(start));
  });

  it('shows exactly one night sky in every four consecutive slots', () => {
    for (let start = 0; start < 48; start++) {
      const photos = Array.from({ length: 4 }, (_, offset) =>
        getAmbientPhoto((start + offset) * AMBIENT_PHOTO_INTERVAL),
      );
      expect(
        photos.filter((photo) => ambientNightPhotos.some((night) => night.id === photo.id)),
      ).toHaveLength(1);
    }
  });

  it('uses every bundled scene and catches up directly after a sleeping tab', () => {
    const photos = Array.from({ length: 16 }, (_, slot) =>
      getAmbientPhoto(slot * AMBIENT_PHOTO_INTERVAL),
    );
    expect(new Set(photos.map((photo) => photo.id)).size).toBe(6);
    for (const photo of photos) {
      expect(existsSync(`public/backgrounds/${photo.id}.jpg`)).toBe(true);
    }
    expect(getAmbientPhoto(100 * AMBIENT_PHOTO_INTERVAL + 5000)).toBe(
      getAmbientPhoto(100 * AMBIENT_PHOTO_INTERVAL),
    );
  });
});
