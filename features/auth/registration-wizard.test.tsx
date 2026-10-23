// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { defaultCardChoices } from '@/features/workspace/card-catalog';
vi.mock('wxt/browser', () => ({ browser: { runtime: {} } }));
vi.mock('@/features/workspace/personalization-store', () => ({
  readPersonalization: () => Promise.resolve({ cards: defaultCardChoices(), accounts: {} }),
}));
vi.mock('@/components/ui/PersianDatePicker', () => ({
  PersianDatePicker: ({
    id,
    value,
    onChange,
  }: {
    id: string;
    value: string;
    onChange: (value: string) => void;
  }) => <input id={id} value={value} onChange={(event) => onChange(event.target.value)} />,
}));
import { RegistrationWizard } from './ui/RegistrationWizard';
it('validates birthday, keeps choices on back navigation, submits only at review and supports retry', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const save = vi.fn().mockRejectedValueOnce(new Error('ذخیره نشد')).mockResolvedValue(undefined);
  const submit = async () => {
    await act(async () => {
      host
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
  };
  try {
    await act(async () => {
      root.render(
        <RegistrationWizard
          accountKey="test"
          initialProfile={{
            firstName: 'نام',
            lastName: 'آزمایشی',
            birthDate: '',
            gender: 'undisclosed',
          }}
          onComplete={save}
        />,
      );
      await Promise.resolve();
    });
    await submit();
    expect(host.querySelector('[aria-current=step]')!.textContent).toContain('تولد');
    await submit();
    expect(host.querySelector('[role=alert]')!.textContent).toContain('تاریخ تولد');
    act(() => {
      const input = host.querySelector<HTMLInputElement>('input')!;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
        input,
        '2000-02-29',
      );
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await submit();
    const interest = Array.from(host.querySelectorAll('button')).find(
      (button) => button.textContent === 'ورزش',
    )!;
    act(() => interest.click());
    await submit();
    act(() => host.querySelector<HTMLButtonElement>('[aria-label="نمایش آب‌وهوا"]')!.click());
    expect(host.querySelector('[aria-label="نمایش آب‌وهوا"]')!.getAttribute('aria-checked')).toBe(
      'false',
    );
    act(() =>
      Array.from(host.querySelectorAll('button'))
        .find((button) => button.textContent === 'مرحلهٔ قبل')!
        .click(),
    );
    expect(
      Array.from(host.querySelectorAll('button'))
        .find((button) => button.textContent?.includes('ورزش'))!
        .getAttribute('aria-pressed'),
    ).toBe('true');
    await submit();
    await submit();
    expect(save).not.toHaveBeenCalled();
    await submit();
    expect(host.querySelector('[role=alert]')!.textContent).toBe('ذخیره نشد');
    await submit();
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1]?.[0]).toMatchObject({
      profile: { birthDate: '2000-02-29' },
      interests: ['sports'],
      cards: { weather: false },
    });
  } finally {
    act(() => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  }
});
