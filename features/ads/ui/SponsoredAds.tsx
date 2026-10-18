import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { parseMarketEndpoint } from '@/features/market/market-endpoint';
import {
  readWorkspaceValue,
  watchWorkspaceValue,
  writeWorkspaceValue,
} from '@/lib/browser/workspace-storage';
import { eligibleAds, parseAds, type AdCampaign, type Placement } from '../ad-model';
import { Icon } from '@/components/ui/Icon';
import './sponsored-ads.css';

const endpoint = parseMarketEndpoint(import.meta.env.WXT_MARKET_API_URL as unknown);
const key = 'altAir.ads.preferences.v1';
type Preferences = { disabled: boolean; dismissed: string[] };
function parsePreferences(raw: unknown): Preferences {
  if (!raw || typeof raw !== 'object') return { disabled: false, dismissed: [] };
  const value = raw as Record<string, unknown>;
  return {
    disabled: value.disabled === true,
    dismissed: Array.isArray(value.dismissed)
      ? value.dismissed.filter((v): v is string => typeof v === 'string')
      : [],
  };
}
const Context = createContext<{
  campaigns: AdCampaign[];
  preferences: Preferences;
  error: string;
  update: (change: (p: Preferences) => Preferences) => Promise<void>;
} | null>(null);
export function SponsoredAdsProvider({
  children,
  active,
}: {
  children: ReactNode;
  active: boolean;
}) {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [preferences, setPreferences] = useState<Preferences>({ disabled: false, dismissed: [] });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const value = parsePreferences(await readWorkspaceValue(key));
        if (alive) {
          setPreferences(value);
          setReady(true);
        }
      } catch {
        if (alive) setError('خواندن تنظیمات تبلیغات انجام نشد.');
      }
    };
    void load();
    const stop = watchWorkspaceValue(key, () => {
      void load();
    });
    const refresh = () => setOnline(navigator.onLine);
    window.addEventListener('online', refresh);
    window.addEventListener('offline', refresh);
    return () => {
      alive = false;
      stop();
      window.removeEventListener('online', refresh);
      window.removeEventListener('offline', refresh);
    };
  }, []);
  useEffect(() => {
    if (!endpoint || !active || !ready || preferences.disabled || !online) return;
    let alive = true;
    let controller: AbortController | null = null;
    let pending = false;
    const refresh = async () => {
      if (document.visibilityState === 'hidden' || pending) return;
      pending = true;
      controller = new AbortController();
      const timeout = window.setTimeout(() => controller?.abort(), 10000);
      try {
        const response = await fetch(new URL('/api/ads', endpoint), {
          credentials: 'omit',
          redirect: 'error',
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Ads unavailable');
        const data = parseAds(await response.json());
        if (alive) setCampaigns(data);
      } catch {
        if (alive) setCampaigns([]);
      } finally {
        pending = false;
        window.clearTimeout(timeout);
      }
    };
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 60000);
    const visible = () => {
      void refresh();
    };
    document.addEventListener('visibilitychange', visible);
    return () => {
      alive = false;
      controller?.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [active, ready, preferences.disabled, online]);
  async function update(change: (p: Preferences) => Preferences) {
    try {
      const write = async () => {
        const next = change(parsePreferences(await readWorkspaceValue(key)));
        await writeWorkspaceValue(key, next);
        setPreferences(next);
        setError('');
      };
      if (navigator.locks) await navigator.locks.request(key, write);
      else await write();
    } catch {
      setError('ذخیرهٔ تنظیمات تبلیغات انجام نشد؛ دوباره تلاش کنید.');
    }
  }
  return (
    <Context.Provider
      value={{
        campaigns: active && ready && online && !preferences.disabled ? campaigns : [],
        preferences,
        error,
        update,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function AdsPreferences() {
  const context = useContext(Context);
  if (!context) return null;
  return (
    <section className="ads-preferences">
      <h3>تبلیغات همکاران</h3>
      <label>
        <input
          type="checkbox"
          checked={!context.preferences.disabled}
          onChange={(event) => {
            const disabled = !event.target.checked;
            void context.update((p) => ({ ...p, disabled }));
          }}
        />{' '}
        نمایش تبلیغات در میزکار
      </label>
      <p>
        تبلیغات مستقل از اطلاعات شخصی شما انتخاب می‌شوند. پنهان‌کردن برند در همهٔ کمپین‌های همان
        برند حفظ می‌شود.
      </p>
      {!!context.preferences.dismissed.length && (
        <button
          type="button"
          onClick={() => {
            void context.update((p) => ({ ...p, dismissed: [] }));
          }}
        >
          نمایش دوبارهٔ برندهای پنهان‌شده
        </button>
      )}
      {context.error && <p role="status">{context.error}</p>}
    </section>
  );
}
function Creative({ src, alt, playing }: { src: string; alt: string; playing: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (playing) return;
    let alive = true;
    const image = new Image();
    image.onload = () => {
      if (!alive || !canvas.current) return;
      const node = canvas.current;
      const scale = Math.min(1, 1600 / image.naturalWidth, 1600 / image.naturalHeight);
      node.width = Math.max(1, Math.round(image.naturalWidth * scale));
      node.height = Math.max(1, Math.round(image.naturalHeight * scale));
      node.getContext('2d')?.drawImage(image, 0, 0, node.width, node.height);
    };
    image.onerror = () => {
      if (alive) setFailed(true);
    };
    image.referrerPolicy = 'no-referrer';
    image.src = src;
    return () => {
      alive = false;
      image.onload = null;
      image.onerror = null;
    };
  }, [src, playing]);
  if (failed) return <span className="sponsored-unavailable">تصویر در دسترس نیست</span>;
  return playing ? (
    <img src={src} alt={alt} onError={() => setFailed(true)} referrerPolicy="no-referrer" />
  ) : (
    <canvas ref={canvas} role="img" aria-label={alt} />
  );
}
function Campaign({ campaign, onDismiss }: { campaign: AdCampaign; onDismiss: () => void }) {
  const [index, setIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [hover, setHover] = useState(false);
  const [visible, setVisible] = useState(document.visibilityState === 'visible');
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const changed = () => {
      setReducedMotion(media.matches);
    };
    const visibility = () => setVisible(document.visibilityState === 'visible');
    media.addEventListener('change', changed);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      media.removeEventListener('change', changed);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  const running = !reducedMotion && visible && !hover;
  useEffect(() => {
    if (!running || campaign.mode !== 'slider' || campaign.slides.length < 2) return;
    const timer = window.setInterval(
      () => setIndex((i) => (i + 1) % campaign.slides.length),
      campaign.intervalSeconds * 1000,
    );
    return () => window.clearInterval(timer);
  }, [running, campaign]);
  const slide = campaign.slides[index % campaign.slides.length];
  if (!slide) return null;
  return (
    <section
      className="sponsored-ad"
      aria-label={`تبلیغ ${campaign.brand}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocusCapture={() => setHover(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setHover(false);
      }}
    >
      <header className="sponsored-overlay sponsored-header">
        <span className="sponsored-label" title={campaign.title}>
          تبلیغ · {campaign.brand}
        </span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={`پنهان‌کردن تبلیغات ${campaign.brand}`}
          title={`پنهان‌کردن تبلیغات ${campaign.brand}`}
        >
          <Icon name="close" />
        </button>
      </header>
      <a
        href={campaign.destinationUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        referrerPolicy="no-referrer"
        className="sponsored-link"
        aria-label={`${campaign.title} · ${campaign.brand} (تبلیغ؛ بازشدن در تب جدید)`}
      >
        <Creative
          key={slide.mediaId}
          src={new URL('/api/ads/media/' + slide.mediaId, endpoint!).href}
          alt={slide.altText || campaign.title}
          playing={running}
        />
      </a>
      <div className="sponsored-overlay sponsored-controls">
        {campaign.slides.length > 1 && (
          <>
            <button
              type="button"
              aria-label="اسلاید قبلی"
              title="اسلاید قبلی"
              onClick={() => {
                setIndex((i) => (i - 1 + campaign.slides.length) % campaign.slides.length);
              }}
            >
              <Icon name="next" />
            </button>
            <span
              className="sponsored-pagination"
              aria-label={`اسلاید ${(index % campaign.slides.length) + 1} از ${campaign.slides.length}`}
            >
              {campaign.slides.map((_, i) => (
                <i key={i} data-active={i === index % campaign.slides.length} />
              ))}
            </span>
            <button
              type="button"
              aria-label="اسلاید بعدی"
              title="اسلاید بعدی"
              onClick={() => {
                setIndex((i) => (i + 1) % campaign.slides.length);
              }}
            >
              <Icon name="previous" />
            </button>
          </>
        )}
      </div>
    </section>
  );
}
export function SponsoredAds({ placement }: { placement: Placement }) {
  const context = useContext(Context);
  if (!context || !endpoint) return null;
  const campaigns = eligibleAds(context.campaigns, placement, context.preferences.dismissed).slice(
    0,
    placement === 'sidebar' ? 5 : 1,
  );
  if (!campaigns.length) return null;
  return (
    <div className={`sponsored-group sponsored-group--${placement}`}>
      {campaigns.map((campaign) => (
        <div className={`sponsored-placement sponsored-placement--${placement}`} key={campaign.id}>
          <Campaign
            key={JSON.stringify(campaign)}
            campaign={campaign}
            onDismiss={() => {
              void context.update((p) => ({
                ...p,
                dismissed: [...new Set([...p.dismissed, campaign.brandId])],
              }));
            }}
          />
        </div>
      ))}
      {context.error && <p role="status">{context.error}</p>}
    </div>
  );
}
