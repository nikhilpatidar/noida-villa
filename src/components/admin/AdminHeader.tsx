'use client';
import { Menu } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { isDemoDeployment } from '@/lib/env';

export function AdminHeader({
  userName,
  role,
  onSignOut,
}: {
  userName: string;
  role: 'OWNER' | 'PROPERTY_ADMIN' | null;
  onSignOut: () => Promise<void>;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-admin-border bg-admin-panel/85 backdrop-blur px-4 md:px-8">
      <div className="flex items-center gap-3 min-w-0">
        <button className="md:hidden rounded-md p-2 text-admin-ink" aria-label="Menu">
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <div className="text-sm font-medium text-admin-ink truncate">{userName}</div>
          <div className="text-xs text-admin-muted">Signed in</div>
        </div>
        {role ? <Badge variant={role === 'PROPERTY_ADMIN' ? 'accent' : 'neutral'}>{role === 'PROPERTY_ADMIN' ? 'Admin' : 'Owner'}</Badge> : null}
        {isDemoDeployment ? (
          <span className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-olive-50 px-2.5 py-1 text-[11px] uppercase tracking-wider text-olive-700 border border-olive-200" aria-label="Demo workspace">
            <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-olive-500" />
            Demo Workspace
          </span>
        ) : null}
      </div>
      <form action={onSignOut}>
        <Button type="submit" variant="secondary" size="sm">Sign out</Button>
      </form>
    </header>
  );
}