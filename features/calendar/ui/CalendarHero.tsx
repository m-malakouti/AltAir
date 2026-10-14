import { Icon } from '@/components/ui/Icon';
import { useEffect, useState } from 'react';
import {
  CALENDAR_SOURCE,
  VERIFIED_YEAR,
  MONTHS,
  WEEKDAYS,
  faNumber,
  persianDay,
  monthDays,
  sameDay,
  shiftMonth,
  holidayFor,
} from '../calendar-model';

export function CalendarHero({
  variant = 'full',
  onSelectDate,
}: {
  variant?: 'full' | 'date' | 'month';
  onSelectDate?: (date: Date | null) => void;
}) {
  const [now, setNow] = useState(() => new Date());
  const today = persianDay(now);
  const [view, setView] = useState<{ year: number; month: number } | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const active = view ?? today;
  const days = monthDays(active.year, active.month);
  const current =
    days.find((day) => day.day === selected) ?? days.find((day) => sameDay(day, today)) ?? days[0];
  useEffect(() => {
    const update = () => setNow(new Date());
    const timer = window.setInterval(update, 30_000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  const weekday = new Intl.DateTimeFormat('fa-IR', {
    timeZone: 'Asia/Tehran',
    weekday: 'long',
  }).format(now);
  const verified = active.year === VERIFIED_YEAR;
  function move(delta: number) {
    const next = shiftMonth(active.year, active.month, delta);
    setView(next);
    setSelected(1);
    const day = monthDays(next.year, next.month)[0];
    if (day) onSelectDate?.(day.date);
  }
  return (
    <section className={`calendar-hero calendar-hero--${variant}`} aria-label="تقویم شمسی">
      <div className="calendar-intro">
        <span className="eyebrow">امروز، فرصتی تازه</span>
        <div className="hero-today">
          <span className="hero-day">{faNumber(today.day)}</span>
          <div>
            <h2>
              {MONTHS[today.month - 1]} {faNumber(today.year)}
            </h2>
            <p>{weekday}</p>
          </div>
        </div>
        {variant !== 'date' && (
          <time className="hero-clock" dateTime={now.toISOString()}>
            {now.toLocaleTimeString('fa-IR', {
              timeZone: 'Asia/Tehran',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })}
          </time>
        )}
        {variant !== 'date' && <span className="helper-text">به وقت تهران</span>}
        <p className="hero-gregorian" dir="ltr">
          {now.toLocaleDateString('en-GB', {
            timeZone: 'Asia/Tehran',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
        {variant === 'date' && (
          <p className="hero-occasion">
            {holidayFor(today) ??
              (today.year === VERIFIED_YEAR
                ? 'مناسبتی در تقویم ثبت نشده'
                : 'مناسبت‌های این سال ثبت نشده‌اند')}
          </p>
        )}
        {variant !== 'date' && holidayFor(today) && (
          <p className="calendar-holiday-banner">امروز تعطیل رسمی · {holidayFor(today)}</p>
        )}
        <p className="calendar-tagline">روزت را به سبک خودت بساز.</p>
      </div>
      <div className="calendar-month">
        <div className="calendar-toolbar">
          <button
            className="icon-button"
            aria-label="ماه قبل"
            title="ماه قبل"
            disabled={active.year === 1300 && active.month === 1}
            onClick={() => move(-1)}
          >
            <Icon name="previous" />
          </button>
          <h3 aria-live="polite">
            {MONTHS[active.month - 1]} {faNumber(active.year)}
          </h3>
          <button
            className="icon-button"
            aria-label="ماه بعد"
            title="ماه بعد"
            disabled={active.year === 1500 && active.month === 12}
            onClick={() => move(1)}
          >
            <Icon name="next" />
          </button>
          <button
            className="icon-button calendar-today-button"
            aria-label="بازگشت به امروز"
            title="بازگشت به امروز"
            onClick={() => {
              setView(null);
              setSelected(null);
              setNow(new Date());
              onSelectDate?.(null);
            }}
          >
            <Icon name="calendar" />
          </button>
        </div>
        <div className="calendar-grid" aria-label="روزهای ماه">
          {WEEKDAYS.map((day) => (
            <span className="calendar-weekday" key={day} title={day}>
              {day === 'پنجشنبه'
                ? 'پ'
                : day === 'چهارشنبه'
                  ? 'چ'
                  : day === 'سه‌شنبه'
                    ? 'س'
                    : day === 'دوشنبه'
                      ? 'د'
                      : day === 'یکشنبه'
                        ? 'ی'
                        : day === 'جمعه'
                          ? 'ج'
                          : 'ش'}
            </span>
          ))}
          {Array.from({ length: days[0]?.weekday ?? 0 }, (_, index) => (
            <span key={`empty-${index}`} aria-hidden="true" />
          ))}
          {days.map((day) => (
            <button
              key={day.day}
              className={`calendar-date ${day.holiday || day.weekday === 6 ? 'is-holiday' : ''} ${sameDay(day, today) ? 'is-today' : ''} ${day.day === current?.day ? 'is-selected' : ''}`}
              aria-current={sameDay(day, today) ? 'date' : undefined}
              aria-pressed={day.day === current?.day}
              aria-label={`${WEEKDAYS[day.weekday]} ${faNumber(day.day)} ${MONTHS[day.month - 1]} ${day.holiday ? `، تعطیل رسمی: ${day.holiday}` : day.weekday === 6 ? '، تعطیل هفتگی' : ''}`}
              onClick={() => {
                setSelected(day.day);
                onSelectDate?.(sameDay(day, today) ? null : day.date);
              }}
            >
              {faNumber(day.day)}
              {day.holiday && <span className="calendar-dot" aria-hidden="true" />}
            </button>
          ))}
        </div>
        {current && (
          <div className="calendar-selection" aria-live="polite">
            <strong>
              {WEEKDAYS[current.weekday]}، {faNumber(current.day)} {MONTHS[current.month - 1]}
            </strong>
            <p>
              {current.holiday
                ? `تعطیل رسمی · ${current.holiday}`
                : current.weekday === 6
                  ? 'جمعه · تعطیل هفتگی'
                  : verified
                    ? 'تعطیل رسمی ثبت نشده است.'
                    : 'اطلاعات تعطیلات این سال هنوز تأیید نشده است.'}
            </p>
          </div>
        )}
        <div className="calendar-legend">
          <span>● تعطیل رسمی</span>
          <span>جمعه‌ها: تعطیل هفتگی</span>
        </div>
        <details className="calendar-source">
          <summary
            className="icon-button"
            aria-label="منبع و پوشش تعطیلات"
            title="منبع و پوشش تعطیلات"
          >
            <Icon name="info" />
          </summary>
          <p>
            تعطیلات سال ۱۴۰۵ مطابق نسخهٔ نهایی تقویم رسمی مرکز تقویم دانشگاه تهران؛ بررسی در ۲۱ مهر
            ۱۴۰۵. تعطیلی‌های موردی و استانی در این فهرست نیستند.
          </p>
          <a href={CALENDAR_SOURCE} target="_blank" rel="noopener noreferrer">
            مشاهدهٔ تقویم رسمی ۱۴۰۵ ↗
          </a>
        </details>
        {!verified && (
          <p className="calendar-coverage" role="status">
            تعطیلات رسمی فقط برای سال ۱۴۰۵ تأیید شده‌اند؛ در این سال تنها جمعه‌ها مشخص هستند.
          </p>
        )}
      </div>
    </section>
  );
}
