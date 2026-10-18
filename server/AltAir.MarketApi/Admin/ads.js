(() => {
  const el = id => document.getElementById(id);
  const form = el('ad-form');
  const field = name => form.elements.namedItem(name);
  let catalog = null;
  let editing = null;
  let slides = [];
  let busy = false;
  const message = text => { el('ads-status').textContent = text; };
  async function api(path = '', body) {
    const response = await fetch('/admin/api/ads' + path, {
      method: body === undefined ? 'GET' : 'POST', cache: 'no-store', signal: AbortSignal.timeout(20000),
      headers: body === undefined ? {} : { 'Content-Type': 'application/json', 'X-AltAir-Admin': '1' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    if (!response.ok) throw new Error(response.status === 409 ? 'فهرست در پنجره‌ای دیگر تغییر کرده؛ کمپین‌ها را تازه‌سازی و دوباره ویرایش کنید.' : 'عملیات انجام نشد؛ فایل، ورودی‌ها و اتصال سرور را بررسی کنید.');
    return response.json();
  }
  function button(text, action) {
    const node = document.createElement('button'); node.type = 'button'; node.textContent = text;
    node.addEventListener('click', action); return node;
  }
  function renderSlides() {
    el('ad-slides').replaceChildren(...slides.map((slide, index) => {
      const box = document.createElement('div'); box.className = 'ad-slide';
      const image = document.createElement('img'); image.src = '/admin/api/ads/media/' + slide.mediaId; image.alt = slide.altText;
      const label = document.createElement('label'); label.textContent = `متن جایگزین اسلاید ${index + 1}`;
      const alt = document.createElement('input'); alt.value = slide.altText; alt.maxLength = 200;
      alt.addEventListener('input', () => { slide.altText = alt.value; }); label.append(alt);
      const previous = button('قبلی', () => { [slides[index - 1], slides[index]] = [slides[index], slides[index - 1]]; renderSlides(); });
      previous.disabled = index === 0;
      box.append(image, label, previous, button('حذف', () => { slides.splice(index, 1); renderSlides(); }));
      return box;
    }));
  }
  function edit(campaign = null) {
    editing = campaign?.id ?? null; form.reset();
    const values = campaign ?? { brand: '', brandId: '', title: '', destinationUrl: '', placement: 'sidebar', mode: 'single', order: 0, intervalSeconds: 8, enabled: false };
    for (const name of ['brand','brandId','title','destinationUrl','placement','mode','order','intervalSeconds']) field(name).value = values[name];
    field('brandId').readOnly = Boolean(campaign);
    field('enabled').checked = values.enabled;
    for (const name of ['startsAt','endsAt']) {
      const date = campaign?.[name] ? new Date(campaign[name]) : null;
      field(name).value = date ? new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0,16) : '';
    }
    slides = (campaign?.slides ?? []).map(slide => ({...slide})); renderSlides();
    el('ad-form-title').textContent = campaign ? 'ویرایش کمپین' : 'کمپین جدید';
    form.hidden = false; field('brand').focus();
  }
  async function save(campaigns, enabled = catalog.enabled) {
    catalog = await api('', {...catalog, campaigns, enabled}); render();
  }
  async function operation(action) {
    if (busy) return;
    busy = true;
    el('advertising').querySelectorAll('button,input,select').forEach(node => { node.disabled = true; });
    try { await action(); }
    catch (error) { message(error.message); }
    finally {
      busy = false;
      el('advertising').querySelectorAll('button,input,select').forEach(node => { node.disabled = false; });
      el('ads-enabled').checked = catalog?.enabled ?? false;
      renderSlides();
    }
  }
  function render() {
    el('ads-enabled').checked = catalog.enabled;
    el('ads-list').replaceChildren(...[...catalog.campaigns].sort((a,b) => a.order - b.order).map(campaign => {
      const item = document.createElement('article'); item.className = 'ad-item';
      const title = document.createElement('h3'); title.textContent = `${campaign.brand} · ${campaign.title}`;
      const detail = document.createElement('p');
      const now = Date.now();
      const status = !campaign.enabled ? 'متوقف' : campaign.endsAt && Date.parse(campaign.endsAt) <= now ? 'پایان‌یافته' : campaign.startsAt && Date.parse(campaign.startsAt) > now ? 'زمان‌بندی‌شده' : 'فعال';
      detail.textContent = `${status} · ${campaign.placement === 'sidebar' ? 'کنار میزکار' : 'پایین میزکار'} · ${campaign.mode === 'slider' ? 'اسلایدر' : 'تصویر / GIF'} · ${campaign.slides.length} فایل · ترتیب ${campaign.order}`;
      item.append(title, detail, button('ویرایش', () => { if (!busy) edit(campaign); }),
        button(campaign.enabled ? 'توقف' : 'فعال‌سازی', () => { void operation(async () => { await save(catalog.campaigns.map(c => c.id === campaign.id ? {...c, enabled:!c.enabled} : c)); message('وضعیت کمپین ذخیره شد.'); }); }),
        button('حذف کمپین', () => { if (confirm('این کمپین حذف شود؟')) void operation(async () => { await save(catalog.campaigns.filter(c => c.id !== campaign.id)); if (editing === campaign.id) form.hidden = true; message('کمپین حذف شد.'); }); }));
      return item;
    }));
  }
  async function load() { catalog = await api(); form.hidden = true; render(); message(catalog.campaigns.length ? 'کمپین‌ها دریافت شدند.' : 'هنوز کمپینی ثبت نشده؛ با «کمپین جدید» شروع کنید.'); }
  el('ads-reload').addEventListener('click', () => { if (form.hidden || confirm('تغییرات ذخیره‌نشده کنار گذاشته شوند؟')) void operation(load); });
  el('ads-new').addEventListener('click', () => { if (catalog && !busy && (form.hidden || confirm('تغییرات ذخیره‌نشده کنار گذاشته شوند؟'))) edit(); });
  el('ad-cancel').addEventListener('click', () => { form.hidden = true; });
  el('ads-enabled').addEventListener('change', event => { const enabled = event.target.checked; if (catalog) void operation(async () => { await save(catalog.campaigns, enabled); message(enabled ? 'نمایش تبلیغات روشن شد.' : 'نمایش همهٔ تبلیغات متوقف شد.'); }); });
  el('ad-upload').addEventListener('change', event => {
    const files = [...event.target.files];
    void operation(async () => {
      if (slides.length + files.length > 8 || files.some(f => f.size > 3 * 1024 * 1024 || !['image/png','image/jpeg','image/webp','image/gif'].includes(f.type))) throw new Error('حداکثر ۸ فایل تصویری؛ هر فایل تا ۳ مگابایت مجاز است.');
      for (const file of files) {
        const data = await new Promise((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file); });
        const result = await api('/upload', { base64: data }); slides.push({mediaId:result.mediaId,altText:field('title').value || file.name});
      }
      message('فایل‌ها آماده‌اند؛ برای انتشار کمپین را ذخیره کنید.');
    });
    event.target.value = '';
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    // Read the form before disabling inputs.
    const campaign = {id:editing ?? crypto.randomUUID(), slides:slides.map(s => ({...s})), enabled:field('enabled').checked};
    for (const name of ['brand','brandId','title','destinationUrl','placement','mode']) campaign[name] = field(name).value.trim();
    for (const name of ['order','intervalSeconds']) campaign[name] = Number(field(name).value);
    for (const name of ['startsAt','endsAt']) campaign[name] = field(name).value ? new Date(field(name).value).toISOString() : null;
    if (!slides.length || (campaign.mode === 'single' && slides.length !== 1)) { message('برای نمایش تکی یک فایل و برای اسلایدر یک تا هشت فایل انتخاب کنید.'); return; }
    if (!campaign.destinationUrl.startsWith('https://')) { message('لینک مقصد باید HTTPS باشد.'); return; }
    void operation(async () => {
      await save([...catalog.campaigns.filter(c => c.id !== campaign.id), campaign]); form.hidden = true; message('کمپین ذخیره شد؛ افزونه ظرف یک دقیقه فهرست تازه را دریافت می‌کند.');
    });
  });
  void operation(load);
})();
