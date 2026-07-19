'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Receipt, ArrowDownToLine, Wallet, Users, Building2, Settings, FileBarChart, ScrollText, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/transactions', label: 'Transactions', icon: ScrollText },
  { href: '/admin/expenses', label: 'Expenses', icon: Receipt },
  { href: '/admin/income', label: 'Income', icon: ArrowDownToLine },
  { href: '/admin/settlements', label: 'Settlements', icon: Wallet },
  { href: '/admin/people', label: 'People', icon: Users },
  { href: '/admin/owners', label: 'Owners', icon: Building2, requireAdmin: true },
  { href: '/admin/reports', label: 'Reports', icon: FileBarChart },
  { href: '/admin/property', label: 'Property', icon: Building2, requireAdmin: true },
  { href: '/admin/website', label: 'Website', icon: Globe, requireAdmin: true },
  { href: '/admin/audit', label: 'Audit Log', icon: Settings, requireAdmin: true },
];

export function AdminSidebar({ propertyName }: { propertyName: string }) {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-admin-border bg-admin-panel">
      <div className="px-6 py-5 border-b border-admin-border">
        <div className="eyebrow">Property</div>
        <div className="font-serif text-lg text-admin-ink mt-0.5">{propertyName}</div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5" aria-label="Admin">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                active ? 'bg-olive-100 text-olive-900 font-medium' : 'text-admin-ink/80 hover:bg-admin-bg',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-6 py-4 border-t border-admin-border text-xs text-admin-muted">
        v0.1 · Multi-owner
      </div>
    </aside>
  );
}
