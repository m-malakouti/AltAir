import { useId } from 'react';
import { Icon } from './ui/Icon';
import { TopSitesSettings } from '@/features/bookmarks/ui/TopSitesSettings';

export function WebSearch() {
  const id = useId();
  return (
    <div className="web-search-row">
      <form
        className="web-search"
        role="search"
        aria-label="جست‌وجوی وب"
        action="https://www.google.com/search"
        method="get"
        target="_blank"
        rel="noopener noreferrer"
      >
        <label className="sr-only" htmlFor={id}>
          جست‌وجو در وب
        </label>
        <Icon name="search" />
        <input
          id={id}
          type="search"
          name="q"
          required
          maxLength={500}
          placeholder="جست‌وجو در وب…"
          autoComplete="off"
        />
        <button
          type="submit"
          className="icon-button"
          aria-label="جست‌وجو در گوگل"
          title="جست‌وجو در گوگل"
        >
          <Icon name="search" />
        </button>
      </form>
      <TopSitesSettings />
    </div>
  );
}
