// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { WebSearch } from '@/components/WebSearch';

vi.mock('@/features/bookmarks/ui/TopSitesSettings', () => ({ TopSitesSettings: () => null }));
vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  document.documentElement.setAttribute('data-starting', 'true');
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
    await Promise.resolve();
  });
  document.documentElement.removeAttribute('data-starting');
  document.body.innerHTML = '';
});

async function reveal() {
  await act(async () => {
    document.documentElement.removeAttribute('data-starting');
    await Promise.resolve();
  });
}

it('does not autofocus search when the startup screen is revealed', async () => {
  await act(async () => {
    root.render(<WebSearch />);
    await Promise.resolve();
  });
  const search = host.querySelector('input');
  expect(document.activeElement).not.toBe(search);
  await reveal();
  expect(document.activeElement).not.toBe(search);
});

it('does not autofocus search when the window regains focus', async () => {
  await act(async () => {
    root.render(<WebSearch />);
    await Promise.resolve();
  });
  await reveal();
  window.dispatchEvent(new Event('focus'));
  document.dispatchEvent(new Event('visibilitychange'));
  expect(document.activeElement).not.toBe(host.querySelector('input'));
});

it('preserves focus in another form when startup finishes', async () => {
  await act(async () => {
    root.render(<WebSearch />);
    await Promise.resolve();
  });
  const other = document.createElement('input');
  document.body.append(other);
  other.focus();
  await reveal();
  expect(document.activeElement).toBe(other);
});
