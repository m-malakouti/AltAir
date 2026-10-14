import { useEffect, useState } from 'react';
import { cryptoCoins, parseCryptoStats, type CryptoQuote } from '../crypto-rates';
import { Icon } from '@/components/ui/Icon';
import {
  readWorkspaceValue,
  writeWorkspaceValue,
  watchWorkspaceValue,
} from '@/lib/browser/workspace-storage';
const selectionKey = 'altAir.market.crypto-selection';
const defaults = ['BTC', 'ETH', 'SOL', 'USDT'];

export function CryptoPrices() {
  const [selected, setSelected] = useState<string[]>(defaults);
  const [ready, setReady] = useState(false);
  const [picker, setPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectionError, setSelectionError] = useState('');
  useEffect(() => {
    let alive = true;
    let revision = 0;
    async function load() {
      const current = ++revision;
      try {
        const raw = await readWorkspaceValue(selectionKey);
        const codes = raw == null ? defaults : raw;
        if (
          !Array.isArray(codes) ||
          !codes.every(
            (code) => typeof code === 'string' && cryptoCoins.some((coin) => coin.code === code),
          ) ||
          new Set(codes).size !== codes.length
        )
          throw new Error('Invalid crypto selection');
        if (alive && revision === current) {
          setSelected(codes as string[]);
          setReady(true);
        }
      } catch {
        if (alive) setSelectionError('خواندن انتخاب کریپتو انجام نشد.');
      }
    }
    void load();
    const stop = watchWorkspaceValue(selectionKey, () => {
      void load();
    });
    return () => {
      alive = false;
      revision++;
      stop();
    };
  }, []);
  async function select(code: string, checked: boolean) {
    setSaving(true);
    try {
      await navigator.locks.request(selectionKey, async () => {
        const raw = await readWorkspaceValue(selectionKey);
        const current = raw == null ? defaults : raw;
        if (
          !Array.isArray(current) ||
          !current.every(
            (item) => typeof item === 'string' && cryptoCoins.some((coin) => coin.code === item),
          )
        )
          throw new Error('Invalid selection');
        const next: string[] = checked
          ? [...new Set([...(current as string[]), code])]
          : (current as string[]).filter((item) => item !== code);
        await writeWorkspaceValue(selectionKey, next);
        setSelected(next);
      });
      setSelectionError('');
    } catch {
      setSelectionError('انتخاب کریپتو ذخیره نشد.');
    } finally {
      setSaving(false);
    }
  }
  const [prices, setPrices] = useState<Record<string, CryptoQuote>>({});
  const [received, setReceived] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!ready || !selected.length) {
      return;
    }
    const controller = new AbortController();
    let running = false;
    async function load() {
      if (running || controller.signal.aborted) return;
      running = true;
      setLoading(true);
      try {
        const results = await Promise.allSettled(
          cryptoCoins
            .filter((coin) => selected.includes(coin.code))
            .map(async (coin) => {
              const response = await fetch(
                `https://api.exchange.coinbase.com/products/${coin.code}-USD/stats`,
                {
                  credentials: 'omit',
                  cache: 'no-store',
                  signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]),
                },
              );
              if (!response.ok) throw new Error('Crypto unavailable');
              return {
                code: coin.code,
                quote: parseCryptoStats((await response.json()) as unknown),
              };
            }),
        );
        const next: Record<string, CryptoQuote> = {};
        for (const result of results) {
          if (result.status === 'fulfilled') next[result.value.code] = result.value.quote;
        }
        if (!Object.keys(next).length) throw new Error('Crypto unavailable');
        if (!controller.signal.aborted) {
          setPrices(next);
          setReceived(Date.now());
          setError(results.some((result) => result.status === 'rejected'));
        }
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        running = false;
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    const timer = window.setInterval(() => {
      if (!document.hidden) void load();
    }, 60000);
    const onVisible = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh, selected, ready]);
  return (
    <section className="market-segment" aria-label="کریپتو">
      <div className="market-segment-title">
        <h3>کریپتو</h3>
        <button
          className="icon-button market-add"
          title="افزودن کریپتو"
          aria-label="افزودن کریپتو"
          aria-expanded={picker}
          onClick={() => setPicker((value) => !value)}
        >
          <Icon name={picker ? 'close' : 'plus'} />
        </button>
        <small>USD · تغییر ۲۴ساعته</small>
        <button
          className="icon-button"
          disabled={!ready || !selected.length || loading}
          title="تازه‌سازی کریپتو"
          aria-label="تازه‌سازی کریپتو"
          onClick={() => setRefresh((value) => value + 1)}
        >
          <Icon name="refresh" />
        </button>
      </div>
      {picker && (
        <div className="currency-picker market-inline-picker">
          <fieldset disabled={!ready || saving}>
            <legend>کریپتوهای دلخواه</legend>
            {cryptoCoins.map((coin) => (
              <label key={coin.code}>
                <input
                  type="checkbox"
                  checked={selected.includes(coin.code)}
                  onChange={(event) => {
                    void select(coin.code, event.target.checked);
                  }}
                />
                <span>{coin.name}</span>
              </label>
            ))}
          </fieldset>
        </div>
      )}
      {selectionError && (
        <p className="helper-text" role="status">
          {selectionError}
        </p>
      )}
      {ready && !selected.length && <p className="helper-text">با + کریپتوی دلخواه را اضافه کن.</p>}
      {cryptoCoins
        .filter((coin) => selected.includes(coin.code))
        .map((coin) => {
          const quote = prices[coin.code];
          const tone =
            !quote || quote.change === 0
              ? ''
              : quote.change > 0
                ? 'currency-change--up'
                : 'currency-change--down';
          const format = (value: number, signed = false) =>
            value.toLocaleString('en-US', {
              maximumFractionDigits: coin.code === 'USDT' ? 5 : 2,
              signDisplay: signed ? 'exceptZero' : 'auto',
            });
          return (
            <div
              className="crypto-price-row market-table-crypto"
              key={coin.code}
              title={`${coin.name} · USD · تغییر ۲۴ ساعته`}
            >
              <span className="crypto-table-symbol">
                <span className="crypto-coin-symbol" aria-hidden="true">
                  {coin.symbol}
                </span>
                <span>{coin.code}USD</span>
              </span>
              <strong dir="ltr">{quote ? format(quote.price) : loading ? '…' : '—'}</strong>
              <span className={tone} dir="ltr">
                {quote ? format(quote.change, true) : '—'}
              </span>
              <span className={tone} dir="ltr">
                {quote
                  ? `${quote.percent.toLocaleString('en-US', { maximumFractionDigits: 2, signDisplay: 'exceptZero' })}%`
                  : '—'}
              </span>
            </div>
          );
        })}
      {error && (
        <p className="helper-text" role="status">
          {received
            ? 'بعضی نرخ‌ها به‌روز نشدند؛ داده‌ها ممکن است قدیمی باشند.'
            : 'قیمت کریپتو در دسترس نیست؛ دوباره تلاش کن.'}
        </p>
      )}
      <div className="crypto-source">
        <a href="https://www.coinbase.com/explore" target="_blank" rel="noopener noreferrer">
          Coinbase ↗
        </a>
        {received && (
          <time dateTime={new Date(received).toISOString()}>
            دریافت{' '}
            {new Date(received).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
          </time>
        )}
      </div>
    </section>
  );
}
