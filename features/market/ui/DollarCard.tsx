import { useEffect, useState, useSyncExternalStore } from 'react';
import { currencies, instrumentBasis } from '../currencies';
import type { CurrencyCode } from '../currencies';
import { Icon } from '@/components/ui/Icon';
import { GlassCard } from '@/components/ui/GlassCard';
import { getMarketSnapshot, refreshMarket, subscribeMarket } from '../market-store';
import { dailyChangePercent } from '../daily-change';
import { isQuoteStale } from '../dollar-quote';

const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const changeFormat = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
});
const percentFormat = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
});
const dateFormat = new Intl.DateTimeFormat('fa-IR', {
  timeZone: 'Asia/Tehran',
  dateStyle: 'short',
  timeStyle: 'short',
});

export function DollarCard({
  code = 'USD',
  compact = false,
}: {
  code?: CurrencyCode;
  compact?: boolean;
}) {
  const { status, quote: basket, error } = useSyncExternalStore(subscribeMarket, getMarketSnapshot);
  const currency = currencies.find((item) => item.code === code) ?? currencies[0];
  const rate = basket?.rates?.find((item) => item.code === code);
  const quote =
    code === 'USD'
      ? basket
      : basket && rate
        ? { ...basket, priceToman: rate.priceToman, updatedAt: rate.updatedAt }
        : null;
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const change = rate?.changeToman;
  const percent = quote ? dailyChangePercent(quote.priceToman, change) : null;
  const percentageText = percent === null ? '—' : `${percentFormat.format(percent)}%`;
  const changeLabel =
    change == null
      ? 'تغییر روزانه در دسترس نیست'
      : `تغییر نسبت به روز قبل: ${changeFormat.format(change)} تومان (${percentageText})`;
  const stale = quote && (isQuoteStale(quote, now) || status === 'error');
  return (
    <GlassCard
      className={`dollar-card currency-strip ${compact ? 'dollar-card--compact' : ''}`}
      aria-label={currency.name}
      aria-busy={status === 'loading'}
    >
      <details className="currency-details">
        <summary className="currency-row" title="جزئیات نرخ و منبع">
          <span className="currency-name">
            {code.startsWith('GOLD_') || code.startsWith('COIN_') ? (
              <span className="metal-symbol">
                <Icon name={code.startsWith('GOLD_') ? 'gold' : 'coin'} />
              </span>
            ) : (
              <img
                className="currency-flag"
                src={`/flags/${code.toLowerCase()}.svg`}
                width="20"
                height="15"
                alt=""
                aria-hidden="true"
              />
            )}
            <span title={currency.name}>{currency.name}</span>
          </span>
          <span className="currency-price" aria-live="polite">
            {quote ? (
              <>
                <strong dir="ltr">{numberFormat.format(quote.priceToman)}</strong>

                <span
                  className={`currency-change ${change == null || change === 0 ? '' : change > 0 ? 'currency-change--up' : 'currency-change--down'}`}
                  dir="ltr"
                  title={changeLabel}
                  aria-label={changeLabel}
                >
                  {change == null ? '—' : `${changeFormat.format(change)} (${percentageText})`}
                </span>
              </>
            ) : (
              <span className="currency-unavailable">
                {status === 'loading' ? '…' : '—'}
                <span className="sr-only">قیمت در دسترس نیست</span>
              </span>
            )}
          </span>
          <span
            className={
              stale || error ? 'currency-indicator currency-indicator--stale' : 'currency-indicator'
            }
            aria-label={stale ? 'دادهٔ قدیمی یا تأییدنشده' : error ? 'خطا در دریافت' : 'جزئیات نرخ'}
            title={stale ? 'دادهٔ قدیمی یا تأییدنشده' : error ? 'خطا در دریافت' : 'جزئیات نرخ'}
          >
            {stale || error ? '!' : '⌄'}
          </span>
        </summary>
        <div className="currency-extra">
          <p className="market-meta">واحد قیمت و مبلغ تغییر: تومان · {instrumentBasis(code)}</p>
          {stale && <p className="market-status--stale">دادهٔ قدیمی / تأییدنشده</p>}
          {quote && (
            <div className="market-meta">
              <span>{changeLabel}</span>
              <time dateTime={quote.updatedAt}>
                زمان نرخ: {dateFormat.format(new Date(quote.updatedAt))}
              </time>
              <time dateTime={quote.fetchedAt}>
                آخرین دریافت: {dateFormat.format(new Date(quote.fetchedAt))}
              </time>
            </div>
          )}
          {error && (
            <p className="market-error" role="status">
              {error}
            </p>
          )}
          <div className="market-actions">
            <a
              href={quote?.sourceUrl ?? 'https://www.navasan.net/en/api/'}
              target="_blank"
              rel="noopener noreferrer"
            >
              منبع: نوسان
            </a>
            <button
              className="icon-button"
              aria-label={`به‌روزرسانی نرخ ${currency.name}`}
              title="به‌روزرسانی"
              disabled={status === 'loading' || status === 'unavailable'}
              onClick={() => {
                void refreshMarket();
              }}
            >
              <Icon name="refresh" />
            </button>
          </div>
        </div>
      </details>
    </GlassCard>
  );
}
