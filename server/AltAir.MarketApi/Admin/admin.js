const $ = (id) => document.getElementById(id);
async function request(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000), cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
function state(id, text, kind = '') { $(id).textContent = text; $(id).dataset.state = kind; }
async function overview() {
  $('refresh').disabled = true;
  try {
    const data = await request('/admin/api/overview');
    $('environment').textContent = data.environment;
    $('updated').textContent = new Date(data.checkedAt).toLocaleTimeString('fa-IR');
    state('market-state', data.marketConfigured ? 'پیکربندی آماده' : 'نیازمند تنظیم', data.marketConfigured ? '' : 'error');
    $('market-config').textContent = `کلید: ${data.marketKeyPresent ? 'تنظیم شده' : 'تنظیم نشده'} · واحد: ${data.priceUnit || 'نامشخص'}`;
    state('maps-state', 'تست نشده');
    $('maps-result').textContent = `کلید نشان در سرور: ${data.neshanKeyPresent ? 'موجود' : 'تنظیم نشده'}. نقشهٔ گوگل وابسته به تنظیم افزونه است.`;
    for (const [id, key] of [['poll','pollMinutes'],['stale','staleAfterMinutes'],['budget','maxRequestsPerMonth']]) { $(id).value = data.settings[key]; $(id).disabled = false; }
    $('save').disabled = false;
    $('notice').textContent = 'اطلاعات پیکربندی دریافت شد؛ برای تأیید اتصال هر سرویس، بررسی آن را اجرا کنید.';
  } catch { $('notice').textContent = 'دریافت اطلاعات انجام نشد. اجرای سرور در حالت Development و آدرس محلی را بررسی کنید.'; }
  finally { $('refresh').disabled = false; }
}
$('refresh').addEventListener('click', overview);
const probes = { health:'/health', market:'/api/market/usd', weather:'/api/weather/current?latitude=35.6892&longitude=51.3890' };
for (const button of document.querySelectorAll('[data-probe]')) button.addEventListener('click', async () => {
  const name = button.dataset.probe;
  button.disabled = true;
  state(`${name}-state`, 'در حال بررسی…');
  const started = performance.now();
  try {
    const data = await request(probes[name]);
    let detail = '';
    let warning = false;
    if (name === 'health' && data.status !== 'ok') throw new Error('invalid');
    if (name === 'weather') {
      if (!Number.isFinite(data.temperature) || !data.observedAt) throw new Error('invalid');
      warning = Date.now() - Date.parse(data.observedAt) > 3600000;
      detail = `تهران: ${data.temperature}° · زمان مشاهده: ${new Date(data.observedAt).toLocaleString('fa-IR')}`;
    }
    if (name === 'market') {
      if (!data.fetchedAt) throw new Error('invalid');
      warning = Boolean(data.fetchFailed) || Date.now() - Date.parse(data.fetchedAt) > (data.staleAfterSeconds ?? 7200) * 1000;
      detail = `آخرین دریافت: ${new Date(data.fetchedAt).toLocaleString('fa-IR')}`;
    }
    state(`${name}-state`, warning ? 'دادهٔ قدیمی / دریافت ناموفق' : 'پاسخ معتبر', warning ? 'error' : 'ok');
    $(`${name}-result`).textContent = `${detail} · ${Math.round(performance.now()-started)} ms · بررسی در ${new Date().toLocaleTimeString('fa-IR')}`;
  } catch { state(`${name}-state`, 'بررسی ناموفق', 'error'); $(`${name}-result`).textContent = 'پاسخ معتبر دریافت نشد؛ شبکه، تنظیم سرویس یا محدودیت ارائه‌دهنده را بررسی کنید.'; }
  finally { button.disabled = false; }
});
$('settings-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  $('save').disabled = true;
  $('save-result').textContent = 'در حال ذخیره…';
  try {
    const settings = { pollMinutes:Number($('poll').value), staleAfterMinutes:Number($('stale').value), maxRequestsPerMonth:Number($('budget').value) };
    await request('/admin/api/settings', {method:'POST', headers:{'Content-Type':'application/json','X-AltAir-Admin':'1'},body:JSON.stringify(settings)});
    $('save-result').textContent = 'ذخیره شد؛ سیاست جدید برای دریافت بعدی اعمال می‌شود.';
  } catch { $('save-result').textContent = 'ذخیره نشد. مقادیر و دسترسی سرور به پوشهٔ داده‌ها را بررسی کنید.'; }
  finally { $('save').disabled = false; }
});
void overview();
