import { useId } from 'react';
import { Icon } from './ui/Icon';
import { TopSitesSettings } from '@/features/bookmarks/ui/TopSitesSettings';

export function WebSearch() {
  const id = useId();
  return (
    <div className="web-search-row">
      <TopSitesSettings />
      <form
        className="web-search"
        dir="ltr"
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
        <button
          type="submit"
          className="icon-button"
          aria-label="جست‌وجو در گوگل"
          title="جست‌وجو در گوگل"
        >
          <Icon name="search" />
        </button>
        <input
          id={id}
          type="search"
          dir="auto"
          name="q"
          required
          maxLength={500}
          placeholder="Search Google or type a URL"
          autoComplete="off"
        />
      </form>
    </div>
  );
}
