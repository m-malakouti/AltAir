const paths = {
  fullscreen: 'M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5',
  fullscreenExit: 'M3 8h5V3M21 8h-5V3M16 21v-5h5M8 21v-5H3',
  home: 'm3 10 9-7 9 7v11h-7v-7h-4v7H3z',
  work: 'M3 7h18v14H3zM8 7V3h8v4M3 12a25 25 0 0 0 18 0M12 11v4',
  route:
    'M6 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 23a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 7v8a3 3 0 0 0 3 3h6M18 17V9a3 3 0 0 0-3-3h-3',
  swap: 'M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4',
  external: 'M14 3h7v7M21 3 10 14M10 3H3v18h18v-7',
  play: 'm8 4 12 8-12 8Z',
  pause: 'M8 5v14M16 5v14',
  stop: 'M6 6h12v12H6z',
  focus: 'M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  expand: 'm6 9 6 6 6-6',
  collapse: 'm6 15 6-6 6 6',
  save: 'M4 3h13l4 4v14H3V3zM7 3v6h10V3M7 21v-8h10v8',
  undo: 'm8 4-5 5 5 5M3 9h10a7 7 0 0 1 0 14',
  list: 'M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1',
  live: 'M9 8a5 5 0 0 0 0 8M15 8a5 5 0 0 1 0 8M5 4a11 11 0 0 0 0 16M19 4a11 11 0 0 1 0 16M12 12h.01',
  clock: 'M12 7v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  coffee: 'M3 5h13v9a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V5M16 6h2a3 3 0 0 1 0 6h-2M2 22h18',
  skip: 'm4 4 11 8L4 20ZM20 4v16',
  sun: 'M12 2v2M12 20v2M2 12h2M20 12h2M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  moon: 'M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z',
  pin: 'M9 3h6l-1 6 4 4v2H6v-2l4-4-1-6M12 15v7',
  frequent: 'm13 2-9 12h7l-1 8 10-13h-7z',
  user: 'M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  logout: 'M9 4H4v16h5M10 12h11M17 8l4 4-4 4',
  gold: 'M5 7h14l3 12H2zM5 7l5 12M19 7l-5 12M5 7h14',
  coin: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0',
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
