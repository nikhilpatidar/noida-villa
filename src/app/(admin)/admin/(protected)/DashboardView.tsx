'use client';
import { useMemo } from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { Card, CardHeader, CardTitle, CardBody, CardDescription } from '@/components/ui/Card';
import { formatINR } from '@/lib/money';
import { formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { TrendingUp, TrendingDown, Wallet, Users } from 'lucide-react';

function mini(n: string): bigint { return BigInt(n); }

export function DashboardView({ data, myNetMinor, formattedNet }: { data: any; myNetMinor: string | null; formattedNet: string | null }) {
  const fmt = (v: string) => formatINR(mini(v));
  const monthlyChart = data.monthly.map((m: any) => ({
    month: m.month,
    Income: Number(mini(m.incomeMinor) / 100n),
    Expense: Number(mini(m.expenseMinor) / 100n),
  }));
  const catChart = data.categoryBreakdown.slice(0, 8).map((c: any) => ({
    name: c.categoryName,
    value: Number(mini(c.amountMinor) / 100n),
  }));

  const monthFormatter = (v: number) => {
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    if (v >= 1000) return `₹${(v / 1000).toFixed(0)}k`;
    return `₹${v}`;
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="eyebrow">Overview</div>
        <h1 className="mt-1 font-serif text-3xl text-admin-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-admin-muted">Property: {data.property.name} · Status: {data.property.status}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Income" value={fmt(data.totals.incomeMinor)} icon={<TrendingUp className="h-4 w-4" />} trend="up" />
        <StatCard label="Total Expenses" value={fmt(data.totals.expenseMinor)} icon={<TrendingDown className="h-4 w-4" />} trend="down" />
        <StatCard label="Net Profit" value={fmt(data.totals.netProfitMinor)} icon={<Wallet className="h-4 w-4" />} trend={mini(data.totals.netProfitMinor) >= 0n ? 'up' : 'down'} />
        <StatCard label="Outstanding" value={fmt(data.totals.outstandingMinor)} icon={<Users className="h-4 w-4" />} trend="neutral" />
      </div>

      {myNetMinor !== null ? (
        <Card>
          <CardHeader>
            <CardTitle>Your balance</CardTitle>
            <CardDescription>Your personal position in this property.</CardDescription>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-4">
              <div className="font-serif text-3xl text-admin-ink">{formattedNet}</div>
              <Badge variant={mini(myNetMinor) > 0n ? 'success' : mini(myNetMinor) < 0n ? 'danger' : 'neutral'}>
                {mini(myNetMinor) > 0n ? 'You should receive' : mini(myNetMinor) < 0n ? 'You owe' : 'Settled'}
              </Badge>
            </div>
          </CardBody>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Income vs Expenses</CardTitle>
            <CardDescription>Last 12 months</CardDescription>
          </CardHeader>
          <CardBody>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChart} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
                  <CartesianGrid stroke="#E7E5E4" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#78716C' }} />
                  <YAxis tickFormatter={monthFormatter} tick={{ fontSize: 11, fill: '#78716C' }} />
                  <Tooltip
                    formatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`}
                    contentStyle={{ borderRadius: 8, border: '1px solid #E7E5E4', fontSize: 12 }}
                  />
                  <Bar dataKey="Income" fill="#3F6212" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expense" fill="#A85A3D" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expense Categories</CardTitle>
            <CardDescription>Top spend this year</CardDescription>
          </CardHeader>
          <CardBody>
            {catChart.length === 0 ? (
              <EmptyState title="No expenses yet" description="Categories will appear here once you start recording expenses." />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={catChart} layout="vertical" margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
                    <CartesianGrid stroke="#E7E5E4" horizontal={false} />
                    <XAxis type="number" tickFormatter={monthFormatter} tick={{ fontSize: 11, fill: '#78716C' }} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: '#78716C' }} />
                    <Tooltip
                      formatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`}
                      contentStyle={{ borderRadius: 8, border: '1px solid #E7E5E4', fontSize: 12 }}
                    />
                    <Bar dataKey="value" fill="#677645" radius={[0, 4, 4, 0]}>
                      {catChart.map((_: any, i: number) => (
                        <Cell key={i} fill={i === 0 ? '#3F6212' : i === 1 ? '#677645' : '#84925E'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Owner balances</CardTitle>
            <CardDescription>All participants · shared view</CardDescription>
          </CardHeader>
          <CardBody>
            {data.participants.length === 0 ? (
              <EmptyState title="No participants yet" description="Add owners and investors in People." />
            ) : (
              <ul className="divide-y divide-admin-border">
                {data.participants.map((p: any) => (
                  <li key={p.id} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <div className="font-medium text-admin-ink">{p.name}</div>
                      <div className="text-xs text-admin-muted">{p.kind}</div>
                    </div>
                    <div className={`font-medium ${mini(p.netMinor) > 0n ? 'text-emerald-700' : mini(p.netMinor) < 0n ? 'text-red-700' : 'text-admin-muted'}`}>
                      {fmt(p.netMinor)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent transactions</CardTitle>
            <CardDescription>Last 20</CardDescription>
          </CardHeader>
          <CardBody>
            {data.recent.length === 0 ? (
              <EmptyState title="No transactions yet" description="Record your first expense or income." />
            ) : (
              <ul className="divide-y divide-admin-border">
                {data.recent.map((t: any) => (
                  <li key={t.id} className="flex items-center justify-between py-3 text-sm">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant={t.type === 'INCOME' ? 'success' : 'warn'}>{t.type === 'INCOME' ? 'Income' : 'Expense'}</Badge>
                        <div className="truncate font-medium text-admin-ink">{t.description}</div>
                      </div>
                      <div className="text-xs text-admin-muted mt-0.5">{formatDate(t.occurredOn)} · {t.category?.name ?? 'Uncategorized'}</div>
                    </div>
                    <div className={`font-medium ${t.type === 'INCOME' ? 'text-emerald-700' : 'text-admin-ink'}`}>{fmt(t.amountMinor)}</div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, trend }: { label: string; value: string; icon: React.ReactNode; trend: 'up' | 'down' | 'neutral' }) {
  const trendColor = trend === 'up' ? 'text-emerald-700' : trend === 'down' ? 'text-red-700' : 'text-admin-muted';
  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between text-xs text-admin-muted">
          <span>{label}</span>
          <span className={trendColor}>{icon}</span>
        </div>
        <div className="mt-2 font-serif text-2xl text-admin-ink">{value}</div>
      </CardBody>
    </Card>
  );
}