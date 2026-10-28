import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from 'react';
import { Icon } from '@/components/ui/Icon';
import { Notice } from '@/components/ui/Notice';
import { getMarketSnapshot, refreshMarket, subscribeMarket } from '@/features/market/market-store';
import { AnimatedPrice } from '@/features/market/ui/AnimatedPrice';
import {
  portfolioAssets,
  portfolioUnits,
  parseQuantity,
  valuePortfolio,
  formatPortfolioValue,
  type Holding,
  type PortfolioUnit,
} from '../portfolio-model';
import { updatePortfolio, saveHolding, removeHolding } from '../portfolio-store';
import { usePortfolio } from '../use-portfolio';
import './portfolio.css';

const time = (value: string) =>
  new Date(value).toLocaleString('fa-IR', {
    timeZone: 'Asia/Tehran',
    dateStyle: 'short',
    timeStyle: 'short',
  });
const units = Object.keys(portfolioUnits) as PortfolioUnit[];

export function PortfolioCard() {
  const { data, error, busy, reload, save } = usePortfolio();
  const market = useSyncExternalStore(subscribeMarket, getMarketSnapshot);
  const [now, setNow] = useState(Date.now);
  const [forceHidden, setForceHidden] = useState(false);
  const [editor, setEditor] = useState<{ code: string; previous: string | null } | null>(null);
  const [quantity, setQuantity] = useState('');
  const [formError, setFormError] = useState('');
  const [deleting, setDeleting] = useState<Holding | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const amountInput = useRef<HTMLInputElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const deleteButton = useRef<HTMLButtonElement>(null);
  const restoreAddFocus = useRef(false);
  const id = useId();
  const hidden = forceHidden || data?.hidden === true;
  const valuation = useMemo(
    () => (data ? valuePortfolio(data, market.quote, now) : null),
    [data, market.quote, now],
  );
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (editor && !hidden) amountInput.current?.focus();
    else if (restoreAddFocus.current) {
      restoreAddFocus.current = false;
      addButton.current?.focus();
    }
  }, [editor, hidden]);
  useEffect(() => {
    if (deleting && !hidden) deleteButton.current?.focus();
  }, [deleting, hidden]);

  async function togglePrivacy() {
    if (!data || busy) return;
    const nextHidden = !hidden;
    if (nextHidden) {
      setForceHidden(true);
      setEditor(null);
      setQuantity('');
      setDeleting(null);
    }
    if (await save(() => updatePortfolio((current) => ({ ...current, hidden: nextHidden }))))
      setForceHidden(false);
  }
  function closeEditor() {
    restoreAddFocus.current = true;
    setEditor(null);
    setQuantity('');
    setFormError('');
  }
  function edit(holding?: Holding) {
    const available = portfolioAssets.find(
      (asset) => !data?.holdings.some((item) => item.code === asset.code),
    );
    const code =
      holding?.code ??
      (data?.holdings.some((item) => item.code === 'BTC') ? available?.code : 'BTC');
    if (!code || hidden) return;
    setEditor({ code, previous: holding?.quantity ?? null });
    setQuantity(holding?.quantity ?? '');
    setFormError('');
    setDeleting(null);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || hidden || busy) return;
    try {
      parseQuantity(quantity, editor.code);
    } catch {
      setFormError('مقدار مثبت و معتبر وارد کن؛ سکه با تعداد صحیح و رمزارز تا ۸ رقم اعشار.');
      return;
    }
    if (await save(() => saveHolding(editor.code, quantity, editor.previous))) {
      closeEditor();
      setAnnouncement('دارایی ذخیره شد.');
    }
  }
  async function confirmDelete() {
    if (!deleting || hidden || busy) return;
    if (await save(() => removeHolding(deleting.code, deleting.quantity))) {
      setDeleting(null);
      setAnnouncement('دارایی حذف شد.');
      addButton.current?.focus();
    }
  }
  const selectedAsset = portfolioAssets.find((asset) => asset.code === editor?.code);
  const baseStale = valuation?.stale || market.status === 'error';
  const renderTotal = (unit: PortfolioUnit) => {
    if (hidden) return <span aria-label="مقدار پنهان">****</span>;
    const value = valuation?.totals[unit];
    return value == null ? (
      <span aria-label="ارزش در دسترس نیست">—</span>
    ) : (
      <AnimatedPrice
        value={value}
        valueKey={`portfolio:${unit}`}
        format={(number) => formatPortfolioValue(number, unit)}
      />
    );
  };

  return (
    <section className="portfolio-card" aria-label="سبد دارایی من">
      <header className="portfolio-header">
        <h2>
          <Icon name="wallet" /> سبد دارایی من
        </h2>
        <div className="portfolio-row-actions">
          <button
            type="button"
            className="icon-button"
            disabled={market.status === 'loading' || market.status === 'unavailable'}
            onClick={() => void refreshMarket()}
            aria-label="تازه‌سازی قیمت‌های سبد"
            title="تازه‌سازی قیمت‌های سبد"
          >
            <Icon name="refresh" />
          </button>
          <button
            type="button"
            className="icon-button"
            disabled={!data || busy}
            onClick={() => void togglePrivacy()}
            aria-label={hidden ? 'نمایش اعداد سبد' : 'پنهان‌کردن اعداد سبد'}
            title={hidden ? 'نمایش اعداد' : 'پنهان‌کردن اعداد'}
            aria-pressed={hidden}
          >
            <Icon name={hidden ? 'eyeOff' : 'eye'} />
          </button>
        </div>
      </header>
      <span className="sr-only" role="status">
        {announcement}
      </span>
      {error && (
        <Notice>
          {error}
          <button
            className="icon-button"
            type="button"
            aria-label="تازه‌سازی سبد دارایی"
            title="تلاش دوباره"
            onClick={() => void reload()}
          >
            <Icon name="refresh" />
          </button>
        </Notice>
      )}
      {!data ? (
        <p className="helper-text">
          {error ? 'برای حفظ اطلاعات، ویرایش غیرفعال است.' : 'در حال خواندن سبد…'}
        </p>
      ) : (
        <>
          <div className="portfolio-total">
            <div className="portfolio-total-label">
              <span>{valuation?.missing ? 'جمع دارایی‌های قیمت‌دار' : 'ارزش برآوردی سبد'}</span>
              <select
                aria-label="واحد نمایش ارزش سبد"
                value={data.unit}
                disabled={busy}
                onChange={(event) => {
                  const unit = event.target.value as PortfolioUnit;
                  void save(() => updatePortfolio((current) => ({ ...current, unit })));
                }}
              >
                {units.map((unit) => (
                  <option key={unit} value={unit}>
                    {portfolioUnits[unit]}
                  </option>
                ))}
              </select>
            </div>
            <strong className="portfolio-total-number" dir="ltr">
              {renderTotal(data.unit)}
            </strong>
            {data.holdings.length > 0 &&
              (baseStale || valuation?.conversions[data.unit]?.stale) && (
                <span className="portfolio-warning">بر اساس نرخ قدیمی / تأییدنشده</span>
              )}
          </div>
          <details className="portfolio-equivalents">
            <summary>معادل‌ها</summary>
            <dl>
              {units.map((unit) => (
                <div key={unit}>
                  <dt>{portfolioUnits[unit]}</dt>
                  <dd dir="ltr">{renderTotal(unit)}</dd>
                  {valuation?.conversions[unit]?.stale && <small>نرخ تبدیل قدیمی</small>}
                </div>
              ))}
            </dl>
          </details>
          {Boolean(valuation?.missing) && (
            <p className="portfolio-warning" role="status">
              مجموع ناقص است؛ {valuation?.missing.toLocaleString('fa-IR')} دارایی به‌دلیل نبود نرخ
              معتبر یا خارج‌بودن ارزش از محدودهٔ محاسبه، جمع نشده است.
            </p>
          )}
          {data.holdings.length === 0 && (
            <div className="portfolio-empty">
              <Icon name="wallet" />
              <p>دارایی‌هایت را یک‌بار ثبت کن.</p>
              <small>مقدارها روی همین مرورگر می‌مانند و به سرور ارسال نمی‌شوند.</small>
            </div>
          )}
          <ul className="portfolio-holdings">
            {valuation?.rows.map((row) => {
              const asset = portfolioAssets.find((item) => item.code === row.code)!;
              return (
                <li key={row.code}>
                  <div className="portfolio-holding-name">
                    <strong>{asset.name}</strong>
                    {asset.crypto && <small dir="ltr">{asset.code}</small>}
                  </div>
                  <div className="portfolio-holding-values">
                    <span>
                      {hidden ? (
                        <span aria-label="مقدار پنهان">****</span>
                      ) : (
                        <bdi>
                          {new Intl.NumberFormat('en-US', { maximumFractionDigits: 8 }).format(
                            Number(row.quantity),
                          )}
                        </bdi>
                      )}{' '}
                      <small>{asset.unit}</small>
                    </span>
                    <strong>
                      {hidden ? (
                        <span aria-label="ارزش پنهان">****</span>
                      ) : row.value === null ? (
                        '—'
                      ) : (
                        <AnimatedPrice
                          value={row.value}
                          valueKey={`holding:${row.code}`}
                          format={(number) => formatPortfolioValue(number, 'toman')}
                        />
                      )}{' '}
                      <small>تومان</small>
                    </strong>
                  </div>
                  <div className="portfolio-row-meta">
                    <small>
                      {row.rate
                        ? `زمان نرخ: ${time(row.rate.time)}${row.rate.stale || market.status === 'error' ? ' · قدیمی' : ''}`
                        : 'نرخ تومانی معتبر موجود نیست'}
                    </small>
                    <div className="portfolio-row-actions">
                      <button
                        className="icon-button"
                        type="button"
                        aria-label={`ویرایش ${asset.name}`}
                        title="ویرایش مقدار"
                        disabled={busy || hidden}
                        onClick={() => edit(row)}
                      >
                        <Icon name="edit" />
                      </button>
                      <button
                        className="icon-button"
                        type="button"
                        aria-label={`حذف ${asset.name}`}
                        title="حذف دارایی"
                        disabled={busy || hidden}
                        onClick={() => {
                          setDeleting(row);
                          setEditor(null);
                        }}
                      >
                        <Icon name="trash" />
                      </button>
                    </div>
                  </div>
                  {!hidden && deleting?.code === row.code && (
                    <div
                      className="portfolio-delete"
                      role="group"
                      aria-label={`تأیید حذف ${asset.name}`}
                    >
                      <span>این دارایی از سبد حذف شود؟</span>
                      <button
                        ref={deleteButton}
                        type="button"
                        disabled={busy}
                        onClick={() => void confirmDelete()}
                      >
                        حذف
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setDeleting(null);
                          addButton.current?.focus();
                        }}
                      >
                        انصراف
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {!hidden && editor && (
            <form
              className="portfolio-form"
              onSubmit={(event) => void submit(event)}
              aria-label={editor.previous === null ? 'افزودن دارایی' : 'ویرایش دارایی'}
            >
              <fieldset disabled={busy}>
                <label htmlFor={`${id}-asset`}>دارایی</label>
                <select
                  id={`${id}-asset`}
                  value={editor.code}
                  disabled={editor.previous !== null}
                  onChange={(event) => {
                    setEditor({ code: event.target.value, previous: null });
                    setQuantity('');
                    setFormError('');
                  }}
                >
                  {portfolioAssets
                    .filter(
                      (asset) =>
                        asset.code === editor.code ||
                        !data.holdings.some((item) => item.code === asset.code),
                    )
                    .map((asset) => (
                      <option key={asset.code} value={asset.code}>
                        {asset.name} · {asset.unit}
                      </option>
                    ))}
                </select>
                <label htmlFor={`${id}-quantity`}>مقدار ({selectedAsset?.unit})</label>
                <input
                  ref={amountInput}
                  id={`${id}-quantity`}
                  type="text"
                  inputMode={selectedAsset?.decimals === 0 ? 'numeric' : 'decimal'}
                  dir="ltr"
                  required
                  maxLength={30}
                  value={quantity}
                  aria-invalid={Boolean(formError)}
                  aria-describedby={formError ? `${id}-error` : `${id}-basis`}
                  onChange={(event) => setQuantity(event.target.value)}
                />
                <small id={`${id}-basis`}>
                  {selectedAsset?.decimals === 0
                    ? 'تعداد صحیح وارد کن.'
                    : `حداکثر ${selectedAsset?.decimals.toLocaleString('fa-IR')} رقم اعشار.`}
                  {selectedAsset?.code === 'GOLD_18' && ' وزن خالص طلا را به گرم وارد کن.'}
                </small>
                {formError && (
                  <p id={`${id}-error`} className="portfolio-warning" role="alert">
                    {formError}
                  </p>
                )}
                <div className="portfolio-form-actions">
                  <button className="button button--primary" type="submit">
                    {busy ? 'در حال ذخیره…' : 'ذخیرهٔ دارایی'}
                  </button>
                  <button className="button button--ghost" type="button" onClick={closeEditor}>
                    انصراف
                  </button>
                </div>
              </fieldset>
            </form>
          )}
          {!editor || hidden ? (
            <button
              ref={addButton}
              className="portfolio-add"
              type="button"
              disabled={busy || hidden || data.holdings.length >= portfolioAssets.length}
              onClick={() => edit()}
            >
              <Icon name="plus" /> افزودن دارایی
            </button>
          ) : null}
          {hidden && <p className="helper-text">برای ثبت یا ویرایش، نمایش اعداد را فعال کن.</p>}
          <footer className="portfolio-footnote">
            <span>بر اساس آخرین قیمت دریافتی؛ قیمت لحظه‌ای نیست.</span>
            {market.quote && (
              <time dateTime={market.quote.fetchedAt}>
                آخرین دریافت: {time(market.quote.fetchedAt)}
              </time>
            )}
            {valuation?.oldestAt && (
              <time dateTime={valuation.oldestAt}>
                قدیمی‌ترین نرخ سبد: {time(valuation.oldestAt)}
              </time>
            )}
            {market.error && <span className="portfolio-warning">{market.error}</span>}
            <span>اجرت، کارمزد و اختلاف خریدوفروش در این برآورد محاسبه نمی‌شوند.</span>
          </footer>
        </>
      )}
    </section>
  );
}
