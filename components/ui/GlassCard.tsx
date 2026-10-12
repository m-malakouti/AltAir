import type { HTMLAttributes } from 'react';

export function GlassCard({ className = '', ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`glass-card ${className}`} {...props} />;
}
