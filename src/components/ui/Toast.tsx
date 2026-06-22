'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';

export function Toast({
  kind = 'info',
  children,
}: {
  kind?: 'info' | 'success' | 'warn' | 'danger';
  children: React.ReactNode;
}) {
  const styles: Record<string, string> = {
    info: 'bg-sky-50 border-sky-200 text-sky-900',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    warn: 'bg-amber-50 border-amber-200 text-amber-900',
    danger: 'bg-red-50 border-red-200 text-red-900',
  };
  return (
    <div className={cn('rounded-md border px-4 py-3 text-sm shadow-sm', styles[kind])} role="status">
      {children}
    </div>
  );
}