export const cardCatalog = [
  {
    id: 'clock',
    title: 'ساعت و تمرکز',
    detail: 'زمانت را ببین؛ یک جلسهٔ متمرکز شروع کن.',
    sample: '۱۰:۲۴',
    caption: '۲۵ دقیقه برای کار مهم امروز',
    icon: 'clock',
  },
  {
    id: 'tasks',
    title: 'کارهای من',
    detail: 'کارهای روزانه و اولویت‌های تو.',
    sample: '✓ برنامهٔ امروز',
    caption: '○ مطالعه  ○ کار مهم روز',
    icon: 'check',
  },
  {
    id: 'calendar',
    title: 'تقویم',
    detail: 'امروز، روزهای ماه و مناسبت‌ها.',
    sample: '۱  ۲  ۳  ۴  ۵  ۶  ۷',
    caption: 'تقویم شمسی در یک نگاه',
    icon: 'calendar',
  },
  {
    id: 'bookmarks',
    title: 'بوکمارک‌ها',
    detail: 'میان‌برهای سایت‌های مورد علاقه.',
    sample: 'G   ▶   ✦   +',
    caption: 'سایت‌های همیشگی، نزدیک‌تر',
    icon: 'bookmark',
  },
  {
    id: 'weather',
    title: 'آب‌وهوا',
    detail: 'دمای شهر و پیش‌بینی ساعت‌های آینده.',
    sample: '☀ ۲۳°',
    caption: 'آفتابی · پیش‌نمایش نمونه',
    icon: 'weather',
  },
  {
    id: 'currencies',
    title: 'نرخ بازار',
    detail: 'ارز، طلا و رمزارزهای منتخب.',
    sample: 'USD  ───  BTC',
    caption: 'قیمت‌ها و تغییرات روز',
    icon: 'currency',
  },
  {
    id: 'notes',
    title: 'یادداشت‌ها',
    detail: 'جایی برای فکرها و یادآوری‌های کوتاه.',
    sample: 'یک فکر تازه…',
    caption: 'بنویس، ذخیره کن، برگرد',
    icon: 'note',
  },
  {
    id: 'podcast',
    title: 'پادکست',
    detail: 'قسمت‌های دلخواهت از Castbox.',
    sample: '▶  ▂ ▄ ▆ ▃ ▅ ▂',
    caption: 'یک وقفهٔ شنیدنی',
    icon: 'play',
  },
  {
    id: 'scores',
    title: 'نتایج زنده',
    detail: 'مسابقات فوتبال و نتایج روز.',
    sample: '۲  —  ۱',
    caption: 'تیم میزبان · تیم مهمان',
    icon: 'star',
  },
] as const;
export type CardId = (typeof cardCatalog)[number]['id'];
export type CardChoices = Record<CardId, boolean>;
export const interestCatalog = [
  {
    id: 'productivity',
    title: 'برنامه‌ریزی و تمرکز',
    cards: ['clock', 'tasks', 'calendar', 'notes'],
  },
  { id: 'technology', title: 'فناوری', cards: ['bookmarks', 'podcast'] },
  { id: 'finance', title: 'اقتصاد و بازار', cards: ['currencies'] },
  { id: 'sports', title: 'ورزش', cards: ['scores'] },
  { id: 'learning', title: 'یادگیری و مطالعه', cards: ['notes', 'podcast', 'bookmarks'] },
  { id: 'travel', title: 'سفر و طبیعت', cards: ['weather', 'calendar'] },
  { id: 'culture', title: 'هنر و فرهنگ', cards: ['podcast', 'notes'] },
] as const;
export type InterestId = (typeof interestCatalog)[number]['id'];
export const defaultCardChoices = (): CardChoices =>
  Object.fromEntries(cardCatalog.map((card) => [card.id, true])) as CardChoices;
export function parseCardChoices(value: unknown, fallback = defaultCardChoices()): CardChoices {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return Object.fromEntries(
    cardCatalog.map((card) => [
      card.id,
      typeof raw[card.id] === 'boolean' ? raw[card.id] : fallback[card.id],
    ]),
  ) as CardChoices;
}
export function parseInterests(value: unknown): InterestId[] {
  return Array.isArray(value)
    ? interestCatalog.filter((item) => value.includes(item.id)).map((item) => item.id)
    : [];
}
export function suggestedCards(interests: InterestId[]): CardChoices {
  if (!interests.length) return defaultCardChoices();
  const selected = new Set<string>(
    interestCatalog
      .filter((item) => interests.includes(item.id))
      .flatMap((item) => [...item.cards]),
  );
  return Object.fromEntries(
    cardCatalog.map((card) => [card.id, selected.has(card.id)]),
  ) as CardChoices;
}
