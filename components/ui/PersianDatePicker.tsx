import { useState } from 'react';
import { Calendar, DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import gregorian from 'react-date-object/calendars/gregorian';
import persianFa from 'react-date-object/locales/persian_fa';
import gregorianEn from 'react-date-object/locales/gregorian_en';
import { DatePickerBoundary } from './DatePickerBoundary';

export function persianPickerValue(value: string) {
  return value
    ? new DateObject({
        date: value,
        format: 'YYYY-MM-DD',
        calendar: gregorian,
        locale: gregorianEn,
      }).convert(persian, persianFa)
    : null;
}
export function pickerIsoDate(value: DateObject | null) {
  return value?.isValid
    ? new DateObject(value).convert(gregorian, gregorianEn).format('YYYY-MM-DD')
    : '';
}

export function PersianDatePicker({
  id,
  value,
  onChange,
  disabled = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const minimum = new Date(today);
  minimum.setFullYear(minimum.getFullYear() - 120);
  return (
    <div className="persian-birthday-picker" dir="rtl">
      <input
        id={id}
        className="persian-birthday-input"
        value={persianPickerValue(value)?.format('YYYY/MM/DD') ?? ''}
        placeholder="انتخاب تاریخ تولد شمسی"
        readOnly
        disabled={disabled}
        aria-expanded={open}
        aria-controls={`${id}-calendar`}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            setOpen(false);
          }
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen((value) => !value);
          }
        }}
      />
      {open && !disabled && (
        <div id={`${id}-calendar`} className="persian-birthday-inline">
          <DatePickerBoundary>
            <Calendar
              value={persianPickerValue(value)}
              onChange={(date) => {
                onChange(pickerIsoDate(date));
                setOpen(false);
              }}
              calendar={persian}
              locale={persianFa}
              format="YYYY/MM/DD"
              className="altair-persian-calendar"
              minDate={minimum}
              maxDate={today}
              highlightToday
              shadow={false}
            >
              <p className="persian-calendar-hint">برای انتخاب سریع، روی ماه یا سال بزنید</p>
            </Calendar>
          </DatePickerBoundary>
          <button type="button" className="persian-calendar-close" onClick={() => setOpen(false)}>
            بستن تقویم
          </button>
        </div>
      )}
      <span className="helper-text">تقویم شمسی · انتخاب روز، ماه و سال تولد</span>
    </div>
  );
}
