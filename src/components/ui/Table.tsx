import * as React from 'react';
import { cn } from '@/lib/utils';

export function Table({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('w-full overflow-x-auto rounded-xl border border-ink-100 bg-white', className)}>
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return <thead className="bg-cream-100/50 text-left">{children}</thead>;
}

export function TH({ className, children }: { className?: string; children: React.ReactNode }) {
  return <th className={cn('px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-500', className)}>{children}</th>;
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-ink-100">{children}</tbody>;
}

export function TR({ className, children, ...rest }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('hover:bg-cream-50/40 transition-colors', className)} {...rest}>{children}</tr>;
}

export function TD({ className, children }: { className?: string; children: React.ReactNode }) {
  return <td className={cn('px-4 py-3 align-middle', className)}>{children}</td>;
}