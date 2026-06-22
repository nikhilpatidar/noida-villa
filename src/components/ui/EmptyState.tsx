import * as React from 'react';
import { cn } from '@/lib/utils';

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center text-center py-12 px-6', className)}>
      {icon ? <div className="mb-3 text-ink-300">{icon}</div> : null}
      <h3 className="font-serif text-lg text-ink-800">{title}</h3>
      {description ? <p className="mt-1.5 max-w-sm text-sm text-ink-500 text-pretty">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}