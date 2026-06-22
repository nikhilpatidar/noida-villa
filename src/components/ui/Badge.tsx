import * as React from 'react';
import { cn } from '@/lib/utils';

const badgeVariants: Record<string, string> = {
  neutral: 'bg-ink-100 text-ink-700',
  success: 'bg-emerald-100 text-emerald-800',
  warn: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-sky-100 text-sky-800',
  accent: 'bg-olive-100 text-olive-800',
};

export function Badge({
  variant = 'neutral',
  className,
  children,
}: {
  variant?: keyof typeof badgeVariants;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase', badgeVariants[variant], className)}>
      {children}
    </span>
  );
}