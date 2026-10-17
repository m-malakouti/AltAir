export function googleMapUrl(
  key: string,
  endpoints: { origin: string; destination: string } | null,
) {
  if (!key.trim()) return null;
  const url = new URL(`https://www.google.com/maps/embed/v1/${endpoints ? 'directions' : 'view'}`);
  url.searchParams.set('key', key.trim());
  url.searchParams.set('language', 'fa');
  if (endpoints) {
    url.searchParams.set('origin', endpoints.origin);
    url.searchParams.set('destination', endpoints.destination);
    url.searchParams.set('mode', 'driving');
    url.searchParams.set('units', 'metric');
  } else {
    url.searchParams.set('center', '35.6892,51.3890');
    url.searchParams.set('zoom', '12');
  }
  return url.href;
}
