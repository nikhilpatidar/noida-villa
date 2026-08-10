import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { formatINR } from '@/lib/money';
import { YearPicker } from './YearPicker';
import { getActivePropertyId } from '@/lib/authorization';

function startOfYear(d: Date) { return new Date(d.getFullYear(), 0, 1); }
function endOfYear(d: Date) { return new Date(d.getFullYear(), 11, 31); }

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/admin/login');
  // The session JWT already carries the active property id; no DB lookup.
  const propertyId = await getActivePropertyId();
  if (!propertyId) redirect('/admin/login');

  const sp = await searchParams;
  const year = Number(sp.year ?? new Date().getFullYear());
  const start = startOfYear(new Date(year, 0, 1));
  const end = endOfYear(new Date(year, 0, 1));

  // Categories and transactions are independent — fetch in parallel.
  const [categories, transactions] = await Promise.all([
    prisma.category.findMany({ where: { propertyId } }),
    prisma.transaction.findMany({
      where: { propertyId, status: 'ACTIVE', occurredOn: { gte: start, lte: end } },
      include: { category: true, paidBy: true, receivedBy: true, expenseSplits: true, incomeSplits: true },
    }),
  ]);

  let totalIncome = 0n;
  let totalExpense = 0n;
  const catExpense = new Map<string | null, bigint>();
  const catIncome = new Map<string | null, bigint>();
  const monthly = new Map<string, { income: bigint; expense: bigint }>();
  for (let m = 0; m < 12; m++) monthly.set(`${year}-${String(m + 1).padStart(2, '0')}`, { income: 0n, expense: 0n });

  for (const t of transactions) {
    const amt = BigInt(t.amountMinor.toString());
    const month = `${t.occurredOn.getFullYear()}-${String(t.occurredOn.getMonth() + 1).padStart(2, '0')}`;
    if (t.type === 'INCOME') {
      totalIncome += amt;
      catIncome.set(t.categoryId, (catIncome.get(t.categoryId) ?? 0n) + amt);
      monthly.get(month)!.income += amt;
    } else {
      totalExpense += amt;
      catExpense.set(t.categoryId, (catExpense.get(t.categoryId) ?? 0n) + amt);
      monthly.get(month)!.expense += amt;
    }
  }

  const totalExpenseBase = totalExpense > 0n ? totalExpense : 1n;
  const categoryBreakdown = Array.from(catExpense.entries())
    .map(([cid, amt]) => ({
      name: cid ? categories.find((c) => c.id === cid)?.name ?? 'Unknown' : 'Uncategorized',
      amountMinor: amt,
      pct: Number((amt * 10000n) / totalExpenseBase) / 100,
    }))
    .sort((a, b) => (b.amountMinor > a.amountMinor ? 1 : -1));

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <div className="eyebrow">Reports</div>
          <h1 className="mt-1 font-serif text-3xl text-admin-ink">{year} financial report</h1>
        </div>
        <YearPicker
          currentYear={year}
          years={Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle>Total income</CardTitle></CardHeader><CardBody><div className="font-serif text-2xl text-emerald-700">{formatINR(totalIncome)}</div></CardBody></Card>
        <Card><CardHeader><CardTitle>Total expenses</CardTitle></CardHeader><CardBody><div className="font-serif text-2xl text-red-700">{formatINR(totalExpense)}</div></CardBody></Card>
        <Card><CardHeader><CardTitle>Net</CardTitle></CardHeader><CardBody><div className={`font-serif text-2xl ${totalIncome - totalExpense >= 0n ? 'text-emerald-700' : 'text-red-700'}`}>{formatINR(totalIncome - totalExpense)}</div></CardBody></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Expense by category</CardTitle></CardHeader>
          <CardBody>
            {categoryBreakdown.length === 0 ? (
              <p className="text-sm text-admin-muted">No expenses recorded.</p>
            ) : (
              <Table>
                <THead><TR><TH>Category</TH><TH>Amount</TH><TH>Share</TH></TR></THead>
                <TBody>
                  {categoryBreakdown.map((c) => (
                    <TR key={c.name}>
                      <TD>{c.name}</TD>
                      <TD className="font-medium">{formatINR(c.amountMinor)}</TD>
                      <TD className="text-admin-muted">{c.pct.toFixed(1)}%</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Monthly trend</CardTitle></CardHeader>
          <CardBody>
            <Table>
              <THead><TR><TH>Month</TH><TH>Income</TH><TH>Expense</TH><TH>Net</TH></TR></THead>
              <TBody>
                {Array.from(monthly.entries()).map(([m, v]) => (
                  <TR key={m}>
                    <TD>{m}</TD>
                    <TD className="text-emerald-700">{formatINR(v.income)}</TD>
                    <TD className="text-red-700">{formatINR(v.expense)}</TD>
                    <TD className="font-medium">{formatINR(v.income - v.expense)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}