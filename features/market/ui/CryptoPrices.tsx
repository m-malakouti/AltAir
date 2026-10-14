import { useEffect, useState } from 'react';
import { cryptoCoins, parseCryptoRates } from '../crypto-rates';
import { Icon } from '@/components/ui/Icon';

export function CryptoPrices() {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [received, setReceived] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let running = false;
    async function load() {
      if (running || controller.signal.aborted) return;
      running = true;
      setLoading(true);
      try {
        const response = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=USD', {
          credentials: 'omit',
          cache: 'no-store',
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]),
        });
        if (!response.ok) throw new Error('Crypto unavailable');
        const next = parseCryptoRates((await response.json()) as unknown);
        if (!controller.signal.aborted) {
          setPrices(next);
          setReceived(Date.now());
          setError(false);
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
  }, [refresh]);
  return (
    <section className="market-segment" aria-label="کریپتو">
      <div className="market-segment-title">
        <h3>کریپتو</h3>
        <small>دلار آمریکا · USD</small>
        <button
          className="icon-button"
          disabled={loading}
          title="تازه‌سازی کریپتو"
          aria-label="تازه‌سازی کریپتو"
          onClick={() => setRefresh((value) => value + 1)}
        >
          <Icon name="refresh" />
        </button>
      </div>
      {cryptoCoins.map((coin) => (
        <div className="crypto-price-row" key={coin.code}>
          <span className="crypto-coin-symbol" aria-hidden="true">
            {coin.symbol}
          </span>
          <span>
            {coin.name}
            <small>{coin.code}</small>
          </span>
          <strong dir="ltr">
            {prices[coin.code] === undefined
              ? loading
                ? '…'
                : '—'
              : `$${prices[coin.code]?.toLocaleString('en-US', { maximumFractionDigits: coin.code === 'USDT' ? 4 : 2 })}`}
          </strong>
        </div>
      ))}
      {error && (
        <p className="helper-text" role="status">
          {received
            ? 'به‌روزرسانی نشد؛ قیمت‌های قبلی ممکن است قدیمی باشند.'
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
