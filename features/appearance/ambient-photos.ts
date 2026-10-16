import { backgroundPhotos } from './background-photos';

export const AMBIENT_PHOTO_INTERVAL = 2 * 60 * 60 * 1000;

export const ambientNightPhotos = [
  {
    id: 'damavand-night',
    label: 'راه شیری بر فراز دماوند',
    author: 'Salehi1990mohsen',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    source: 'https://commons.wikimedia.org/wiki/File:Arch_of_Milkyway.jpg',
  },
  {
    id: 'lut-night',
    label: 'راه شیری بر فراز کویر لوت',
    author: 'Salehi1990mohsen',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    source: 'https://commons.wikimedia.org/wiki/File:Pre-Dawn_Milky_Way_over_Lut_Desert.jpg',
  },
] as const;

// Wall-clock slots survive reloads, sleeping tabs and separate New Tab pages.
// Each group contains three Iranian landscapes followed by one night sky.
export function getAmbientPhoto(timestamp: number) {
  const slot = Math.floor(
    Math.max(0, Number.isFinite(timestamp) ? timestamp : 0) / AMBIENT_PHOTO_INTERVAL,
  );
  const group = Math.floor(slot / 4);
  const position = slot % 4;
  return position === 3
    ? (ambientNightPhotos[group % ambientNightPhotos.length] ?? ambientNightPhotos[0])
    : (backgroundPhotos[(group * 3 + position) % backgroundPhotos.length] ?? backgroundPhotos[0]);
}
