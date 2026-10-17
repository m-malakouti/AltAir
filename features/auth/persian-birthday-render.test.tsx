// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, vi } from 'vitest';
import { PersianDatePicker } from '@/components/ui/PersianDatePicker';
describe('birthday picker rendering', () => {
  it('renders and opens for an existing birthday', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    await act(async () => {
      await Promise.resolve();
      root.render(<PersianDatePicker id="birth" value="2000-02-29" onChange={vi.fn()} />);
    });
    expect(host.querySelector('input')).not.toBeNull();
    await act(async () => {
      await Promise.resolve();
      host.querySelector('input')!.focus();
    });
    expect(host.querySelector('.rmdp-calendar')).not.toBeNull();
    await act(async () => {
      await Promise.resolve();
      root.unmount();
    });
    host.remove();
  });
});
