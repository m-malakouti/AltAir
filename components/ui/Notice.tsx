import type { ReactNode } from 'react';

export function Notice({
  children,
  tone = 'error',
}: {
  children: ReactNode;
  tone?: 'error' | 'success' | 'warning';
}) {
  return (
    <p className={`notice notice--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}
