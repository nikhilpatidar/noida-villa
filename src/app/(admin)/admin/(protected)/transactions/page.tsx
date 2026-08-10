import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { formatINR } from '@/lib/money';
import { formatDate } from '@/lib/format';
import { EmptyState } from '@/components/ui/EmptyState';
import Link from 'next/link';
import { getActivePropertyId } from '@/lib/authorization';

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/admin/login');
  const sp = await searchParams;
  // The session JWT already carries the active property id; no DB lookup.
  const propertyId = await getActivePropertyId();
  if (!propertyId) redirect('/admin/login');

  const where: any = { propertyId, status: 'ACTIVE' };
  if (sp.type === 'expense' || sp.type === 'EXPENSE') where.type = 'EXPENSE';
  if (sp.type === 'income' || sp.type === 'INCOME') where.type = 'INCOME';
  if (sp.q) where.description = { contains: sp.q, mode: 'insensitive' };

  const txns = await prisma.transaction.findMany({
    where,
    orderBy: { occurredOn: 'desc' },
    // Only the joined relations the table actually renders are included.
    // expenseSplits / incomeSplits are NOT shown here, so loading them
    // wastes bandwidth on every /admin/transactions navigation.
    include: { category: true, paidBy: true, receivedBy: true, createdBy: true },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="eyebrow">Records</div>
          <h1 className="mt-1 font-serif text-3xl text-admin-ink">Transactions</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/expenses" className="btn-secondary">+ Expense</Link>
          <Link href="/admin/income" className="btn-primary">+ Income</Link>
        </div>
      </div>

      <form className="flex flex-wrap items-end gap-3" method="get">
        <div>
          <label className="label">Type</label>
          <select name="type" defaultValue={sp.type ?? ''} className="input">
            <option value="">All</option>
            <option value="EXPENSE">Expenses</option>
            <option value="INCOME">Income</option>
          </select>
        </div>
        <div className="grow min-w-[180px]">
          <label className="label">Search description</label>
          <input name="q" defaultValue={sp.q ?? ''} className="input" placeholder="e.g. electricity" />
        </div>
        <button className="btn-secondary">Apply</button>
      </form>

      {txns.length === 0 ? (
        <EmptyState
          title="No transactions match"
          description="Try clearing filters or record your first transaction."
          action={<Link href="/admin/expenses" className="btn-primary">Add expense</Link>}
        />
      ) : (
        <div className="space-y-3 md:hidden">
          {txns.map((t) => (
            <div key={t.id} className="admin-panel p-4">
              <div className="flex items-center justify-between">
                <Badge variant={t.type === 'INCOME' ? 'success' : 'warn'}>{t.type === 'INCOME' ? 'Income' : 'Expense'}</Badge>
                <span className="font-medium">{formatINR(BigInt(t.amountMinor.toString()))}</span>
              </div>
              <div className="mt-2 font-medium">{t.description}</div>
              <div className="text-xs text-admin-muted mt-1">{formatDate(t.occurredOn)} · {t.category?.name ?? '—'}</div>
              <div className="text-xs text-admin-muted mt-1">{t.type === 'EXPENSE' ? `Paid by ${t.paidBy?.displayName}` : `Received by ${t.receivedBy?.displayName}`}</div>
            </div>
          ))}
        </div>
      )}
      <div className="hidden md:block">
        <Table>
          <THead>
            <TR>
              <TH>Date</TH>
              <TH>Type</TH>
              <TH>Description</TH>
              <TH>Category</TH>
              <TH>Amount</TH>
              <TH>{`Paid / Received`}</TH>
              <TH>Created by</TH>
            </TR>
          </THead>
          <TBody>
            {txns.map((t) => (
              <TR key={t.id}>
                <TD>{formatDate(t.occurredOn)}</TD>
                <TD><Badge variant={t.type === 'INCOME' ? 'success' : 'warn'}>{t.type === 'INCOME' ? 'Income' : 'Expense'}</Badge></TD>
                <TD className="max-w-[280px]"><div className="font-medium text-admin-ink truncate">{t.description}</div></TD>
                <TD className="text-admin-muted">{t.category?.name ?? '—'}</TD>
                <TD className="font-medium">{formatINR(BigInt(t.amountMinor.toString()))}</TD>
                <TD className="text-admin-muted">{t.type === 'EXPENSE' ? t.paidBy?.displayName : t.receivedBy?.displayName}</TD>
                <TD className="text-admin-muted">{t.createdBy?.name ?? t.createdBy?.email}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </div>
  );
}