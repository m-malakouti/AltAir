(() => {
  const element = (id) => document.getElementById(id);
  const number = (value) => Number(value).toLocaleString('fa-IR');
  const date = (value) => value ? new Date(value).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' }) : 'هنوز ثبت نشده';
  const states = {
    ready: ['داده‌ها تازه‌اند', 'ok'],
    stale: ['بخشی از داده‌ها قدیمی‌اند', 'warning'],
    unavailable: ['آخرین دریافت ناموفق', 'error'],
    not_checked: ['هنوز دریافت نشده', ''],
    unconfigured: ['نیازمند تنظیم سرویس', 'error'],
    storage_error: ['خطا در خواندن تنظیمات', 'error'],
    budget_exhausted: ['سهمیهٔ محلی تمام شده', 'warning'],
  };
  const errors = {
    network_error: 'اتصال شبکه به نوسان برقرار نشد؛ اینترنت و دسترسی شبکهٔ فرایند سرور را بررسی کنید.',
    provider_timeout: 'نوسان در مهلت تعیین‌شده پاسخ نداد.',
    provider_http_error: 'نوسان پاسخ HTTP ناموفق داد.',
    invalid_response: 'پاسخ نوسان با ساختار معتبر قیمت‌ها سازگار نبود.',
    request_cancelled: 'درخواست پیش از تکمیل لغو شد.',
  };
  let pending = false;

  function failureText(failure) {
    return `${errors[failure.code] || 'دریافت ناموفق بود.'}${failure.httpStatus ? ` (HTTP ${failure.httpStatus})` : ''}`;
  }

  function render(data) {
    const [label, kind] = states[data.state] || ['وضعیت نامشخص', 'warning'];
    element('market-state').textContent = label;
    element('market-state').dataset.state = kind;
    element('market-result').textContent = data.cacheAvailable
      ? `${number(data.assetCount)} دارایی معتبر در کش؛ ${number(data.staleAssetCount)} دارایی قدیمی. دریافت موفق به معنی تازه‌بودن همهٔ قیمت‌ها نیست.`
      : 'هنوز قیمت معتبری در کش این سرور نیست.';
    element('market-success').textContent = date(data.lastSuccessAt);
    element('market-source').textContent = date(data.providerUpdatedAt);
    element('market-attempt').textContent = date(data.lastAttemptAt);
    element('market-duration').textContent = data.lastAttemptDurationMs == null ? '—' : `${number(data.lastAttemptDurationMs)} میلی‌ثانیه`;
    element('market-oldest').textContent = date(data.oldestAssetAt);
    element('market-newest').textContent = date(data.newestAssetAt);
    element('market-assets').textContent = `${number(data.assetCount - data.staleAssetCount)} تازه از ${number(data.assetCount)} دارایی`;
    element('market-stale-policy').textContent = data.cacheStaleAfterSeconds == null ? 'پس از اولین دریافت مشخص می‌شود' : `${number(data.cacheStaleAfterSeconds / 60)} دقیقه`;
    element('market-next').textContent = data.nextEligibleAt
      ? Date.parse(data.nextEligibleAt) <= Date.parse(data.checkedAt) ? 'با درخواست بعدی، اکنون مجاز است' : date(data.nextEligibleAt)
      : 'تا اصلاح تنظیمات مشخص نمی‌شود';
    element('market-budget').textContent = `${number(data.budget.used)} از ${number(data.budget.limit)} درخواست`;
    element('market-remaining').textContent = `${number(data.budget.remaining)} درخواست باقی مانده`;
    element('market-budget-progress').max = data.budget.limit;
    element('market-budget-progress').value = Math.min(data.budget.used, data.budget.limit);
    element('market-budget-reset').textContent = `${data.budget.monthUtc} UTC · بازنشانی: ${date(data.budget.resetsAt)}`;
    element('market-started').textContent = date(data.processStartedAt);
    element('market-error').textContent = data.lastFailure
      ? `${failureText(data.lastFailure)} · ${date(data.lastFailure.at)}`
      : 'خطایی از زمان شروع این فرایند ثبت نشده است.';
    element('market-error').dataset.state = data.fetchFailed ? 'error' : '';
    element('market-diagnostics-status').textContent = `آخرین مشاهده: ${date(data.checkedAt)} · ساعت‌ها به وقت تهران`;
    const rows = data.recentAttempts.map(attempt => {
      const row = document.createElement('tr');
      const outcome = attempt.successful ? 'دریافت معتبر' : failureText({ code: attempt.errorCode, httpStatus: attempt.httpStatus });
      for (const text of [date(attempt.completedAt), outcome, attempt.httpStatus ?? '—', `${number(attempt.durationMs)} ms`]) {
        const cell = document.createElement('td');
        cell.textContent = text;
        row.append(cell);
      }
      return row;
    });
    element('market-history').replaceChildren(...rows);
    element('market-history-empty').hidden = rows.length > 0;
  }

  async function load(probe = false) {
    if (pending) return;
    pending = true;
    element('market-probe').disabled = true;
    element('market-status-refresh').disabled = true;
    try {
      const response = await fetch(probe ? '/admin/api/market/probe' : '/admin/api/market/status', {
        method: probe ? 'POST' : 'GET',
        headers: probe ? { 'X-AltAir-Admin': '1' } : {},
        cache: 'no-store', signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error('diagnostics_unavailable');
      render(await response.json());
      if (probe) element('market-diagnostics-status').textContent += ' · بررسی طبق کش و سهمیه انجام شد.';
    } catch {
      element('market-state').textContent = 'ارتباط داشبورد با سرور قطع است';
      element('market-state').dataset.state = 'error';
      element('market-diagnostics-status').textContent = 'وضعیت تازه دریافت نشد؛ اطلاعات نمایش‌داده‌شده مربوط به آخرین مشاهده است. اتصال سرور را بررسی کنید.';
    } finally {
      pending = false;
      element('market-probe').disabled = false;
      element('market-status-refresh').disabled = false;
    }
  }

  element('market-probe').addEventListener('click', () => void load(true));
  element('market-status-refresh').addEventListener('click', () => void load());
  element('refresh').addEventListener('click', () => void load());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void load();
  });
  setInterval(() => {
    if (document.visibilityState === 'visible') void load();
  }, 30_000);
  void load();
})();
