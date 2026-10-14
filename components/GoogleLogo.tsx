import { useEffect, useState } from 'react';

type Logo = { image: string; title: string; href: string };
const fallback: Logo = {
  image: '/google-logo.png',
  title: 'Google',
  href: 'https://www.google.com/',
};
function googleUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value, 'https://www.google.com/');
    return url.protocol === 'https:' &&
      (url.hostname === 'google.com' ||
        url.hostname.endsWith('.google.com') ||
        url.hostname.endsWith('.gstatic.com'))
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function GoogleLogo() {
  const [logo, setLogo] = useState(fallback);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch('https://www.google.com/async/ddljson?async=ntp:1', {
          credentials: 'omit',
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]),
        });
        if (!response.ok) return;
        const text = await response.text();
        const parsed: unknown = JSON.parse(text.replace(/^\)\]\}'\s*/, ''));
        if (!parsed || typeof parsed !== 'object' || !('ddljson' in parsed)) return;
        const doodle = parsed.ddljson;
        if (!doodle || typeof doodle !== 'object') return;
        const large = 'large_image' in doodle ? doodle.large_image : null;
        const image = googleUrl(
          large && typeof large === 'object' && 'url' in large
            ? large.url
            : 'image_url' in doodle
              ? doodle.image_url
              : null,
        );
        if (!image || controller.signal.aborted) return;
        setLogo({
          image,
          href: googleUrl('target_url' in doodle ? doodle.target_url : null) ?? fallback.href,
          title:
            'alt_text' in doodle && typeof doodle.alt_text === 'string'
              ? doodle.alt_text
              : 'Google Doodle',
        });
      } catch {
        /* Keep the local logo when Google is unavailable or has no doodle. */
      }
    }
    void load();
    return () => controller.abort();
  }, []);
  return (
    <a
      className="google-logo"
      href={logo.href}
      target="_blank"
      rel="noopener noreferrer"
      title={logo.title}
    >
      <img
        src={logo.image}
        alt={logo.title}
        onError={() => {
          if (logo.image !== fallback.image) setLogo(fallback);
        }}
      />
    </a>
  );
}
