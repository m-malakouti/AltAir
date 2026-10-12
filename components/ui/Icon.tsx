const paths = {
  grip: 'M8 5h1M15 5h1M8 12h1M15 12h1M8 19h1M15 19h1',
  previous: 'm14 5-7 7 7 7',
  next: 'm10 5 7 7-7 7',
  up: 'm5 14 7-7 7 7',
  down: 'm5 10 7 7 7-7',
  resize: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5M4 4l5 5M20 20l-5-5',
  height: 'M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4',
  calendar: 'M4 5h16v16H4zM8 3v4M16 3v4M4 10h16M8 14h2M14 14h2M8 18h2',
  note: 'M4 3h16v13l-5 5H4zM15 21v-5h5M8 8h8M8 12h6',
  bookmark: 'M6 3h12v18l-6-4-6 4z',
  weather: 'M8 17a4 4 0 1 1 1-8 5 5 0 0 1 9 3 3 3 0 0 1 0 6H8M5 3v2M1 8h2M9 3l-1 2',
  currency: 'M12 3v18M17 7H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H6',
  info: 'M12 11v6M12 7h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  plus: 'M12 5v14M5 12h14',
  close: 'm6 6 12 12M6 18 18 6',
  check: 'm5 12 4 4L19 6',
  edit: 'm15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L5 15l-1 5Z',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5',
  search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  refresh: 'M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  settings: 'M4 7h16M4 17h16M8 4v6M16 14v6',
  panel: 'M3 4h18v16H3zM15 4v16',
};
export type IconName = keyof typeof paths;
export function Icon({ name }: { name: IconName }) {
  return (
    <svg
      className="ui-icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
