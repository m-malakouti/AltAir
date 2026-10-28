import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Icon } from '@/components/ui/Icon';
import { getMarketSnapshot, refreshMarket, subscribeMarket } from '../../market-store';
import { assetsFromQuote } from '../exchange-assets';
import {
  exchangeCategories,
  changeTone,
  formatPercent,
  formatPrice,
  isAssetStale,
  layoutTiles,
  localAsset,
  periodLabel,
  unitLabel,
  type ExchangeAsset,
} from '../exchange-model';
import {
  useExchangePreferences,
  useObservedHistory,
  type PriceObservation,
} from '../exchange-storage';
import './exchange-view.css';
import { AssetSymbol } from './AssetSymbol';
import { AnimatedPrice } from '../../ui/AnimatedPrice';

function AssetPrice({ asset }: { asset: ExchangeAsset }) {
  return (
    <AnimatedPrice
      value={asset.price}
      valueKey={`${asset.id}:${asset.unit}`}
      format={(value) => formatPrice(value, asset.unit)}
    />
  );
}

function ageLabel(time: string, now: number) {
  const minutes = Math.max(0, Math.floor((now - Date.parse(time)) / 60000));
  return minutes < 1
    ? 'کمتر از یک دقیقه'
    : minutes < 60
      ? `${minutes.toLocaleString('fa-IR')} دقیقه قبل`
      : minutes < 1440
        ? `${Math.floor(minutes / 60).toLocaleString('fa-IR')} ساعت قبل`
        : `${Math.floor(minutes / 1440).toLocaleString('fa-IR')} روز قبل`;
}
function Trend({ points }: { points: PriceObservation[] }) {
  if (points.length < 2)
    return (
      <div className="ex-chart-empty">
        <Icon name="live" />
        <strong>روند واقعی، از اینجا به بعد</strong>
        <p>
          هنوز دو قیمت با زمان متفاوت در این مرورگر ثبت نشده. با دریافت دادهٔ تازه، نمودار شکل
          می‌گیرد.
        </p>
      </div>
    );
  const min = Math.min(...points.map((p) => p.price)),
    max = Math.max(...points.map((p) => p.price));
  const start = Date.parse(points[0]!.time),
    end = Date.parse(points.at(-1)!.time);
  const coords = points
    .map(
      (p) =>
        `${12 + ((Date.parse(p.time) - start) / Math.max(1, end - start)) * 536},${120 - ((p.price - min) / Math.max(1e-12, max - min)) * 100}`,
    )
    .join(' ');
  return (
    <div className="ex-trend">
      <svg
        viewBox="0 0 560 140"
        role="img"
        aria-label={`روند ${points.length} قیمت ثبت‌شده در این مرورگر؛ کمینه ${min} و بیشینه ${max}`}
      >
        <path d="M12 120H548M12 70H548M12 20H548" stroke="currentColor" opacity=".12" />
        <polyline
          points={coords}
          fill="none"
          stroke="var(--ex-up)"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <p>
        ثبت‌های همین مرورگر · {points.length.toLocaleString('fa-IR')} نمونه ·{' '}
        {new Date(start).toLocaleString('fa-IR')} تا {new Date(end).toLocaleString('fa-IR')}
      </p>
    </div>
  );
}
export function ExchangeView({ active = true }: { active?: boolean }) {
  const { status, quote, error } = useSyncExternalStore(subscribeMarket, getMarketSnapshot);
  const { preferences, ready, saving, error: preferenceError, update } = useExchangePreferences();
  const [now, setNow] = useState(Date.now);
  const [category, setCategory] = useState<keyof typeof exchangeCategories>('all');
  const [query, setQuery] = useState('');
  const [watchOnly, setWatchOnly] = useState(false);
  const [variants, setVariants] = useState(false);
  const [freshOnly, setFreshOnly] = useState(false);
  const [preferToman, setPreferToman] = useState(false);
  const [mode, setMode] = useState<'map' | 'table'>('map');
  const [limit, setLimit] = useState(() => (window.innerWidth < 700 ? 24 : 48));
  const [sort, setSort] = useState<'favorites' | 'change' | 'name' | 'freshness'>('favorites');
  const [paused, setPaused] = useState(false);
  const [comparison, setComparison] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [mapWidth, setMapWidth] = useState(1000);
  const map = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const assets = useMemo(
    () => assetsFromQuote(quote).map((asset) => localAsset(asset, preferToman)),
    [quote, preferToman],
  );
  const staleSeconds = quote?.staleAfterSeconds ?? 7200;
  const isStale = (asset: ExchangeAsset) =>
    Boolean(quote?.fetchFailed) || isAssetStale(asset, staleSeconds, now);
  const detail = assets.find((asset) => asset.id === selected) ?? null;
  const { points, error: historyError } = useObservedHistory(detail);
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, [active]);
  useEffect(() => {
    if (!active || paused || status === 'error' || status === 'unavailable') return;
    const refresh = () => {
      if (!document.hidden && navigator.onLine) void refreshMarket();
    };
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener('online', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('online', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [active, paused, status]);
  useEffect(() => {
    const element = map.current;
    if (!element) return;
    const measure = () => {
      if (element.clientWidth > 0) setMapWidth(element.clientWidth);
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(element);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [mode, status]);
  useEffect(() => {
    if (detail && !dialog.current?.open) dialog.current?.showModal();
    else if (!detail) dialog.current?.close();
  }, [detail]);
  useEffect(() => {
    if (!active) return;
    const key = (event: KeyboardEvent) => {
      if (
        event.key === '/' &&
        !document.querySelector('dialog[open]') &&
        !(event.target instanceof Element && event.target.closest('input,textarea,select'))
      ) {
        event.preventDefault();
        search.current?.focus();
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [active]);
  const favorite = (id: string) => preferences.favorites.includes(id);
  const star = (id: string) => {
    void update((current) => ({
      ...current,
      favorites: current.favorites.includes(id)
        ? current.favorites.filter((value) => value !== id)
        : [...current.favorites, id],
    }));
  };
  function toggleComparison(id: string) {
    setNotice('');
    if (comparison.includes(id)) setComparison(comparison.filter((value) => value !== id));
    else if (comparison.length >= 4) setNotice('برای مقایسه حداکثر چهار دارایی انتخاب کن.');
    else setComparison([...comparison, id]);
  }
  const normalizedQuery = query
    .trim()
    .toLocaleLowerCase('fa')
    .replaceAll('ي', 'ی')
    .replaceAll('ك', 'ک');
  const filtered = assets
    .filter(
      (asset) =>
        (category === 'all' || asset.category === category) &&
        (!watchOnly || favorite(asset.id)) &&
        (variants || !asset.variant) &&
        (!freshOnly || !isStale(asset)) &&
        (!normalizedQuery ||
          `${asset.name} ${asset.symbol} ${asset.id} ${asset.basis}`
            .toLocaleLowerCase('fa')
            .replaceAll('ي', 'ی')
            .replaceAll('ك', 'ک')
            .includes(normalizedQuery)),
    )
    .sort((a, b) =>
      sort === 'change'
        ? Math.abs(b.percent ?? 0) - Math.abs(a.percent ?? 0)
        : sort === 'name'
          ? a.name.localeCompare(b.name, 'fa')
          : sort === 'freshness'
            ? Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
            : Number(favorite(b.id)) - Number(favorite(a.id)) || a.name.localeCompare(b.name, 'fa'),
    );
  const visible = mode === 'map' ? filtered.slice(0, limit) : filtered;
  const mapHeight = Math.max(
    460,
    Math.ceil(Math.max(visible.length, 1) / (mapWidth < 420 ? 2 : mapWidth < 580 ? 3 : 7)) * 140,
  );
  const tiles = layoutTiles(
    visible.map((asset) => ({
      id: asset.id,
      weight:
        preferences.sizing === 'equal'
          ? 1
          : preferences.sizing === 'favorites'
            ? favorite(asset.id)
              ? 3
              : 1
            : isStale(asset) || asset.percent === null || !asset.unitVerified
              ? 1
              : 1 + Math.min(Math.abs(asset.percent), 8) * 0.4,
    })),
    mapWidth,
    mapHeight,
  );
  const fresh = filtered.filter((asset) => !isStale(asset) && asset.unitVerified);
  const rising = fresh.filter((asset) => (asset.percent ?? 0) > 0).length,
    falling = fresh.filter((asset) => (asset.percent ?? 0) < 0).length;
  const compared = comparison
    .map((id) => assets.find((asset) => asset.id === id))
    .filter((asset): asset is ExchangeAsset => Boolean(asset));
  const amount = Number(
    quantity.replace(/[۰-۹٠-٩]/g, (c) => String(c.charCodeAt(0) - (c >= '۰' ? 1776 : 1632))),
  );
  const validAmount = Number.isFinite(amount) && amount > 0 && amount <= 1e9;
  const open = (id: string) => {
    setSelected(id);
    setQuantity('1');
    setNotice('');
  };
  const clearFilters = () => {
    setQuery('');
    setCategory('all');
    setWatchOnly(false);
    setFreshOnly(false);
    setVariants(false);
  };
  return (
    <section
      className={`exchange-view ex-palette--${preferences.palette}`}
      aria-label="نمای صرافی"
      dir="rtl"
    >
      <header className="ex-header">
        <div>
          <div className="ex-kicker">
            <span className="ex-live-dot" /> ALTAIR 360 <span>/</span> MARKET MAP
          </div>
          <h1>
            نمای صرافی<span>نبض بازار، در یک نگاه</span>
          </h1>
          <p>ارز، طلا، سکه و رمزارز؛ یک تابلو برای دنبال‌کردن آنچه برایت مهم است.</p>
        </div>
        <div className="ex-header-actions">
          <button
            type="button"
            className="ex-refresh"
            disabled={status === 'loading' || status === 'unavailable'}
            onClick={() => {
              void refreshMarket();
            }}
          >
            <Icon name="refresh" />
            {status === 'loading' ? 'دریافت…' : 'تازه‌سازی'}
          </button>
          <button type="button" aria-pressed={paused} onClick={() => setPaused((value) => !value)}>
            <Icon name={paused ? 'play' : 'pause'} />
            {paused ? 'ادامهٔ بررسی خودکار' : 'توقف بررسی خودکار'}
          </button>
        </div>
      </header>
      <div className="ex-statusbar">
        <span className={`ex-feed-state ${status === 'error' ? 'is-error' : ''}`}>
          {status === 'ready'
            ? 'داده دریافت شد'
            : status === 'loading'
              ? 'در حال دریافت قیمت‌ها'
              : status === 'unavailable'
                ? 'منبع قیمت تنظیم نشده'
                : 'دریافت جدید انجام نشد'}
        </span>
        <span>منبع: {quote?.source ?? 'نوسان'}</span>
        <span>
          {quote ? `آخرین دریافت: ${ageLabel(quote.fetchedAt, now)}` : 'در انتظار اولین پاسخ'}
        </span>
        <span>
          {paused
            ? 'بررسی خودکار متوقف است'
            : status === 'error'
              ? 'برای تلاش دوباره، تازه‌سازی را بزن'
              : 'بررسی پاسخ هر دقیقه؛ تازگی هر نماد مستقل است'}
        </span>
      </div>
      {(error || preferenceError) && (
        <div className="ex-notice" role="status">
          <Icon name="info" />
          {error || preferenceError}
        </div>
      )}
      {quote && !quote.assets?.length && (
        <div className="ex-notice" role="status">
          فهرست محدود از پاسخ قبلی نمایش داده می‌شود. برای دریافت همهٔ نمادها، نسخهٔ جدید سرور را
          اجرا و تازه‌سازی کن.
        </div>
      )}
      <div className="ex-stats">
        <article>
          <span>نمادهای این فیلتر</span>
          <strong>
            {filtered.length.toLocaleString('fa-IR')}
            <small> از {assets.length.toLocaleString('fa-IR')}</small>
          </strong>
        </article>
        <article className="ex-positive">
          <span>رشد / افت در دادهٔ تازه</span>
          <strong>
            <b dir="ltr">↑ {rising.toLocaleString('fa-IR')}</b>
            <small className="ex-negative" dir="ltr">
              ↓ {falling.toLocaleString('fa-IR')}
            </small>
          </strong>
        </article>
        <article>
          <span>قیمت قدیمی در این فیلتر</span>
          <strong className={filtered.length - fresh.length ? 'ex-caution' : ''}>
            {filtered.filter(isStale).length.toLocaleString('fa-IR')}
            <small>زمان منبع بررسی می‌شود</small>
          </strong>
        </article>
        <article>
          <span>فهرست دنبال‌کردن</span>
          <strong>
            {assets.filter((asset) => favorite(asset.id)).length.toLocaleString('fa-IR')}
            <small>روی همین مرورگر</small>
          </strong>
        </article>
      </div>
      <nav className="ex-categories" aria-label="بازارها">
        {Object.entries(exchangeCategories).map(([key, label]) => (
          <button
            type="button"
            key={key}
            aria-pressed={category === key && !watchOnly}
            onClick={() => {
              setCategory(key as keyof typeof exchangeCategories);
              setWatchOnly(false);
            }}
          >
            {label}
            <span>
              {assets
                .filter(
                  (asset) =>
                    (key === 'all' || asset.category === key) && (variants || !asset.variant),
                )
                .length.toLocaleString('fa-IR')}
            </span>
          </button>
        ))}
        <button
          type="button"
          aria-pressed={watchOnly}
          onClick={() => setWatchOnly((value) => !value)}
        >
          <span aria-hidden="true">★</span> دلخواه‌ها
        </button>
      </nav>
      <div className="ex-controls">
        <label className="ex-search">
          <Icon name="search" />
          <input
            ref={search}
            aria-label="جست‌وجوی نماد، نام یا بازار"
            placeholder="جست‌وجو؛ دلار، بیت‌کوین، طلا…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <kbd>/</kbd>
        </label>
        <div className="ex-display" role="group" aria-label="نوع نمایش">
          <button type="button" aria-pressed={mode === 'map'} onClick={() => setMode('map')}>
            <Icon name="grid" />
            نقشه
          </button>
          <button type="button" aria-pressed={mode === 'table'} onClick={() => setMode('table')}>
            <Icon name="list" />
            فهرست
          </button>
        </div>
        <label>
          مرتب‌سازی
          <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
            <option value="favorites">دلخواه‌ها اول</option>
            <option value="change">بیشترین شدت تغییر</option>
            <option value="name">نام</option>
            <option value="freshness">تازه‌ترین زمان</option>
          </select>
        </label>
        <label>
          نمایش کریپتو
          <select
            value={preferToman ? 'toman' : 'USD'}
            onChange={(event) => setPreferToman(event.target.value === 'toman')}
          >
            <option value="USD">دلار</option>
            <option value="toman">تومانِ منبع، اگر موجود باشد</option>
          </select>
        </label>
      </div>
      <div className="ex-map-options">
        <label>
          اندازهٔ بلوک
          <select
            value={preferences.sizing}
            disabled={!ready || saving}
            onChange={(event) => {
              const sizing = event.target.value as typeof preferences.sizing;
              void update((current) => ({ ...current, sizing }));
            }}
          >
            <option value="change">شدت تغییر</option>
            <option value="favorites">تأکید بر دلخواه‌ها</option>
            <option value="equal">برابر</option>
          </select>
        </label>
        {mode === 'map' && (
          <label>
            تعداد بلوک
            <select value={limit} onChange={(event) => setLimit(Number(event.target.value))}>
              <option value={24}>۲۴</option>
              <option value={48}>۴۸</option>
              <option value={96}>۹۶</option>
              <option value={500}>همه</option>
            </select>
          </label>
        )}
        <label className="ex-check">
          <input
            type="checkbox"
            checked={freshOnly}
            onChange={(event) => setFreshOnly(event.target.checked)}
          />
          فقط قیمت تازه
        </label>
        <label className="ex-check">
          <input
            type="checkbox"
            checked={variants}
            onChange={(event) => setVariants(event.target.checked)}
          />
          نرخ‌های خرید و نام‌های جایگزین
        </label>
        <button
          type="button"
          disabled={!ready || saving}
          aria-pressed={preferences.palette === 'accessible'}
          onClick={() => {
            void update((current) => ({
              ...current,
              palette: current.palette === 'classic' ? 'accessible' : 'classic',
            }));
          }}
        >
          رنگ مناسب تشخیص آسان
        </button>
        <button type="button" className="ex-text-button" onClick={clearFilters}>
          پاک‌کردن فیلترها
        </button>
      </div>
      <div className="ex-map-heading">
        <div>
          <h2>{watchOnly ? 'تابلوی دلخواه من' : exchangeCategories[category]}</h2>
          <p>
            اندازه بر اساس{' '}
            {preferences.sizing === 'change'
              ? 'شدت تغییر'
              : preferences.sizing === 'equal'
                ? 'وزن برابر'
                : 'دلخواه‌های تو'}{' '}
            است؛ ارزش بازار نیست.
          </p>
        </div>
        <div className="ex-legend">
          <span>افت</span>
          <i className="ex-legend-down" />
          <i className="ex-legend-neutral" />
          <i className="ex-legend-up" />
          <span>رشد</span>
          <small>هاشور: دادهٔ قدیمی · خاکستری: تغییر ناموجود یا واحد تأییدنشده</small>
        </div>
      </div>
      <p className="ex-period-note">
        مبنای رنگ: کریپتوی دلاری، تغییر ۲۴ساعته؛ نرخ‌های محلی، تغییر نسبت به پایان روز قبل. این دو
        بازه یکسان نیستند.
      </p>
      <div className="ex-map-wrap" ref={map}>
        {!assets.length ? (
          <div className="ex-empty">
            <Icon name="currency" />
            <h2>
              {status === 'loading' ? 'در حال ساختن تابلوی بازار…' : 'هنوز قیمت معتبری دریافت نشده'}
            </h2>
            <p>پس از اتصال سرویس قیمت، بلوک‌ها با دادهٔ واقعی اینجا ظاهر می‌شوند.</p>
          </div>
        ) : !filtered.length ? (
          <div className="ex-empty">
            <Icon name="search" />
            <h2>نمادی با این فیلتر پیدا نشد</h2>
            <button type="button" onClick={clearFilters}>
              نمایش همهٔ بازارها
            </button>
          </div>
        ) : mode === 'map' ? (
          <div
            className="ex-treemap"
            style={{ height: mapHeight }}
            aria-label="نقشهٔ بلوکی قیمت‌ها"
          >
            {tiles.map((tile) => {
              const asset = visible.find((item) => item.id === tile.id)!;
              const stale = isStale(asset);
              const tone = changeTone(asset, stale);
              const small = tile.width < 130;
              const isCurrency = asset.category === 'fiat' || asset.category === 'remittance';
              return (
                <div
                  key={asset.id}
                  className={`ex-tile ex-tone--${tone}${isCurrency ? ' ex-tile--currency' : ''}${stale ? ' is-stale' : ''}${small ? ' is-small' : ''}${tile.height < 140 ? ' is-short' : ''}${tile.height < (isCurrency ? 110 : 100) ? ' is-tiny' : ''}${!asset.unitVerified ? ' is-unverified' : ''}`}
                  style={{
                    left: `${(tile.x / mapWidth) * 100}%`,
                    top: `${(tile.y / mapHeight) * 100}%`,
                    width: `${(tile.width / mapWidth) * 100}%`,
                    height: `${(tile.height / mapHeight) * 100}%`,
                  }}
                >
                  <button
                    type="button"
                    className="ex-tile-open"
                    onClick={() => open(asset.id)}
                    aria-label={`${asset.name}، ${formatPrice(asset.price, asset.unit)} ${unitLabel(asset.unit)}، تغییر ${formatPercent(asset.percent)}، ${stale ? 'قیمت قدیمی' : ageLabel(asset.updatedAt, now)}؛ نمایش جزئیات`}
                  >
                    <span className="ex-tile-name">{asset.name}</span>
                    <AssetSymbol asset={asset} />
                    <span className="ex-tile-price" dir="ltr">
                      <AssetPrice asset={asset} /> <small>{unitLabel(asset.unit)}</small>
                    </span>
                    <span className="ex-tile-percent" dir="ltr">
                      {asset.percent !== null
                        ? (asset.percent > 0 ? '↑ ' : asset.percent < 0 ? '↓ ' : '') +
                          formatPercent(asset.percent)
                        : '—'}
                    </span>
                    <span className="ex-tile-age">
                      {!asset.unitVerified
                        ? 'واحد نیازمند تأیید'
                        : stale
                          ? 'قیمت قدیمی'
                          : ageLabel(asset.updatedAt, now)}
                    </span>
                  </button>
                  <div className="ex-tile-tools">
                    <button
                      type="button"
                      disabled={!ready || saving}
                      aria-pressed={favorite(asset.id)}
                      aria-label={`${favorite(asset.id) ? 'حذف از' : 'افزودن به'} دلخواه‌ها: ${asset.name}`}
                      onClick={() => star(asset.id)}
                    >
                      {favorite(asset.id) ? '★' : '☆'}
                    </button>
                    <button
                      type="button"
                      aria-pressed={comparison.includes(asset.id)}
                      aria-label={`مقایسهٔ ${asset.name}`}
                      onClick={() => toggleComparison(asset.id)}
                    >
                      <Icon name="swap" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="ex-table-wrap">
            <table className="ex-table">
              <thead>
                <tr>
                  <th>نماد / نام</th>
                  <th>قیمت</th>
                  <th>تغییر</th>
                  <th>زمان و مبنا</th>
                  <th>انتخاب</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((asset) => (
                  <tr
                    key={asset.id}
                    className={`ex-text-tone--${changeTone(asset, isStale(asset))}`}
                  >
                    <td>
                      <button type="button" onClick={() => open(asset.id)}>
                        <AssetSymbol asset={asset} />
                        <span>{asset.name}</span>
                      </button>
                    </td>
                    <td>
                      <bdi>
                        <AssetPrice asset={asset} />
                      </bdi>
                      <small>{unitLabel(asset.unit)}</small>
                    </td>
                    <td>
                      <bdi>{formatPercent(asset.percent)}</bdi>
                      <small>{periodLabel(asset)}</small>
                    </td>
                    <td>
                      {isStale(asset) ? 'قدیمی · ' : ''}
                      {ageLabel(asset.updatedAt, now)}
                      <small>{asset.unitVerified ? asset.basis : 'واحد نیازمند تأیید'}</small>
                    </td>
                    <td>
                      <button
                        type="button"
                        disabled={!ready || saving}
                        aria-pressed={favorite(asset.id)}
                        aria-label={`دلخواه: ${asset.name}`}
                        onClick={() => star(asset.id)}
                      >
                        {favorite(asset.id) ? '★' : '☆'}
                      </button>
                      <button
                        type="button"
                        aria-pressed={comparison.includes(asset.id)}
                        aria-label={`مقایسهٔ ${asset.name}`}
                        onClick={() => toggleComparison(asset.id)}
                      >
                        <Icon name="swap" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {mode === 'map' && filtered.length > visible.length && (
        <p className="ex-showing">
          {visible.length.toLocaleString('fa-IR')} از {filtered.length.toLocaleString('fa-IR')} نماد
          نمایش داده شد.{' '}
          <button type="button" onClick={() => setMode('table')}>
            دیدن همه در فهرست
          </button>
        </p>
      )}
      {compared.length > 0 && (
        <section className="ex-compare" aria-label="مقایسهٔ دارایی‌ها">
          <header>
            <div>
              <h2>مقایسه کنار هم</h2>
              <p>قیمت‌های با واحد یا وزن متفاوت، مستقیماً قابل رتبه‌بندی نیستند.</p>
            </div>
            <button type="button" onClick={() => setComparison([])}>
              پاک‌کردن مقایسه
            </button>
          </header>
          <div className="ex-comparison-grid">
            {compared.map((asset) => (
              <article key={asset.id}>
                <button
                  type="button"
                  className="ex-remove"
                  aria-label={`حذف ${asset.name} از مقایسه`}
                  onClick={() => toggleComparison(asset.id)}
                >
                  ×
                </button>
                <strong>{asset.name}</strong>
                <bdi>
                  <AssetPrice asset={asset} />
                </bdi>
                <span>
                  {unitLabel(asset.unit)} · {asset.basis}
                </span>
                <bdi>{formatPercent(asset.percent)}</bdi>
                <small>
                  {periodLabel(asset)} ·{' '}
                  {isStale(asset) ? 'قدیمی' : 'زمان منبع: ' + ageLabel(asset.updatedAt, now)}
                </small>
              </article>
            ))}
          </div>
        </section>
      )}
      <div className="ex-footnote">
        <Icon name="info" />
        <p>
          قیمت نمایشی است؛ نرخ قابل اجرای معامله یا سفارش خریدوفروش نیست. دریافت دوباره ممکن است
          همان آخرین پاسخ ذخیره‌شدهٔ سرویس را برگرداند.{' '}
          <a href="https://www.navasan.net/" target="_blank" rel="noopener noreferrer">
            منبع قیمت: نوسان ↗
          </a>
        </p>
      </div>
      <p className="ex-announcement" role="status">
        {notice}
      </p>
      <dialog
        ref={dialog}
        className="ex-detail"
        aria-labelledby={titleId}
        onCancel={() => setSelected(null)}
        onClose={() => setSelected(null)}
      >
        {detail && (
          <>
            <header>
              <div>
                <span className="ex-kicker">
                  جزئیات بازار / <AssetSymbol asset={detail} />
                </span>
                <h2 id={titleId}>{detail.name}</h2>
              </div>
              <button type="button" aria-label="بستن جزئیات" onClick={() => setSelected(null)}>
                <Icon name="close" />
              </button>
            </header>
            <div className={`ex-detail-price ex-text-tone--${changeTone(detail, isStale(detail))}`}>
              <strong dir="ltr">
                <AssetPrice asset={detail} />
              </strong>
              <span>{unitLabel(detail.unit)}</span>
              <bdi>{formatPercent(detail.percent)}</bdi>
              <small>{periodLabel(detail)}</small>
            </div>
            <div className="ex-detail-tags">
              <span>{detail.basis}</span>
              <span className={isStale(detail) ? 'ex-caution' : ''}>
                {isStale(detail) ? 'قیمت قدیمی · ' : ''}
                {ageLabel(detail.updatedAt, now)}
              </span>
              {detail.variant && <span>نام جایگزین / سمت دیگر بازار</span>}
              {!detail.unitVerified && (
                <span className="ex-caution">واحد منبع تأیید نشده؛ با تومان مقایسه نکن</span>
              )}
            </div>
            <dl className="ex-detail-facts">
              <dt>زمان قیمت در منبع</dt>
              <dd>
                {new Date(detail.updatedAt).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' })} ·
                تهران
              </dd>
              <dt>زمان دریافت ما</dt>
              <dd>
                {quote
                  ? new Date(quote.fetchedAt).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' })
                  : '—'}
              </dd>
              <dt>تغییر عددی</dt>
              <dd>
                <bdi>{detail.change !== null ? formatPrice(detail.change, detail.unit) : '—'}</bdi>{' '}
                {detail.change !== null ? unitLabel(detail.unit) : 'داده موجود نیست'}
              </dd>
              {detail.volumeUsd != null && (
                <>
                  <dt>حجم ۲۴ساعتهٔ دلاری منبع</dt>
                  <dd>
                    <bdi>{formatPrice(detail.volumeUsd, 'USD')}</bdi> دلار
                  </dd>
                </>
              )}
              {detail.unit === 'USD' && detail.priceToman != null && (
                <>
                  <dt>نرخ تومانی مستقل منبع</dt>
                  <dd>
                    <bdi>
                      <AnimatedPrice
                        value={detail.priceToman}
                        valueKey={`${detail.id}:toman`}
                        format={(value) => formatPrice(value, 'toman')}
                      />
                    </bdi>{' '}
                    تومان
                    {detail.tomanUpdatedAt && (
                      <small>
                        {isAssetStale(
                          { ...detail, updatedAt: detail.tomanUpdatedAt },
                          staleSeconds,
                          now,
                        )
                          ? 'قدیمی · '
                          : ''}
                        {ageLabel(detail.tomanUpdatedAt, now)}
                      </small>
                    )}
                  </dd>
                </>
              )}
            </dl>
            <Trend points={points} />
            {historyError && <p role="status">{historyError}</p>}
            <div className="ex-detail-actions">
              <button
                type="button"
                disabled={!ready || saving}
                aria-pressed={favorite(detail.id)}
                onClick={() => star(detail.id)}
              >
                {favorite(detail.id) ? '★ در دلخواه‌ها' : '☆ دنبال‌کردن'}
              </button>
              <button
                type="button"
                aria-pressed={comparison.includes(detail.id)}
                onClick={() => toggleComparison(detail.id)}
              >
                <Icon name="swap" />
                مقایسه
              </button>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(
                      `${detail.name}: ${detail.price} ${unitLabel(detail.unit)} · ${detail.updatedAt} · نوسان`,
                    )
                    .then(() => setNotice('قیمت و زمان منبع کپی شد.'))
                    .catch(() => setNotice('کپی انجام نشد؛ قیمت را انتخاب و کپی کن.'));
                }}
              >
                کپی قیمت و زمان
              </button>
            </div>
            {detail.unitVerified && (
              <div className="ex-calculator">
                <label htmlFor={titleId + '-amount'}>برآورد ارزش · {detail.basis}</label>
                <input
                  id={titleId + '-amount'}
                  inputMode="decimal"
                  dir="ltr"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  aria-describedby={titleId + '-estimate'}
                />
                <output id={titleId + '-estimate'}>
                  {validAmount ? (
                    <>
                      <bdi>{formatPrice(amount * detail.price, detail.unit)}</bdi>{' '}
                      {unitLabel(detail.unit)}
                    </>
                  ) : (
                    'مقدار مثبت و حداکثر یک میلیارد وارد کن.'
                  )}
                </output>
                <small>برآورد ساده با همین نرخ؛ بدون کارمزد و اختلاف خریدوفروش</small>
              </div>
            )}
            <p className="ex-dialog-notice" role="status">
              {notice}
            </p>
          </>
        )}
      </dialog>
    </section>
  );
}
