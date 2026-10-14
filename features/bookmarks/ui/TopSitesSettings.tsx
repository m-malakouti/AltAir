import { useTopSites } from '../use-top-sites';
import { Icon } from '@/components/ui/Icon';
export function TopSitesSettings() {
  const frequent = useTopSites();
  return (
    <details className="top-sites-settings">
      <summary className="icon-button" aria-label="سایت‌های پرتکرار" title="سایت‌های پرتکرار">
        <Icon name="frequent" />
      </summary>
      <div className="top-sites-options">
        <p className="helper-text">
          شش سایت پرتکرار مرورگر را پیش از بوکمارک‌ها نمایش بده. فهرست به سرور آلت ایر ارسال
          نمی‌شود.
        </p>
        {!frequent.supported ? (
          <p className="helper-text">این قابلیت فقط در افزونهٔ نصب‌شده در دسترس است.</p>
        ) : (
          <>
            <button
              className="icon-button"
              disabled={frequent.busy}
              aria-pressed={frequent.enabled}
              aria-label={
                frequent.enabled ? 'غیرفعال‌کردن سایت‌های پرتکرار' : 'فعال‌کردن سایت‌های پرتکرار'
              }
              title={frequent.enabled ? 'غیرفعال‌کردن' : 'فعال‌کردن با اجازهٔ مرورگر'}
              onClick={() => {
                void frequent.toggle();
              }}
            >
              <Icon name={frequent.enabled ? 'close' : 'check'} />
            </button>
            {frequent.hidden.length > 0 && (
              <button
                className="icon-button"
                disabled={frequent.busy}
                aria-label="بازگرداندن سایت‌های پنهان‌شده"
                title="بازگرداندن سایت‌های پنهان‌شده"
                onClick={() => {
                  void frequent.changeHidden();
                }}
              >
                <Icon name="refresh" />
              </button>
            )}
          </>
        )}
      </div>
    </details>
  );
}
