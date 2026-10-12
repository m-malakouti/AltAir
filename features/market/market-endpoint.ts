export function parseMarketEndpoint(value: unknown): URL | null {
  if (value === undefined || value === '') return null;
  if (typeof value !== 'string') throw new Error('Invalid market endpoint.');
  const url = new URL(value);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (
    (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error('Invalid market endpoint.');
  return url;
}
