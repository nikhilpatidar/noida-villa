import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { computeSuggestions } from '@/lib/services/settlements';
import { formatINR } from '@/lib/money';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/format';
import { SettlementsActions } from './SettlementsActions';

export default async function SettlementsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/admin/login');
  const property = await prisma.property.findFirst({
    where: { memberships: { some: { userId: session.user.id, isActive: true } } },
    include: { participants: { where: { isActive: true } } },
  });
  if (!property) redirect('/admin/login');

  const { balances, suggestions } = await computeSuggestions(property.id);
  const settlements = await prisma.settlement.findMany({
    where: { propertyId: property.id },
    orderBy: { occurredOn: 'desc' },
    include: { from: true, to: true },
    take: 100,
  });

  const participantById = new Map<string, typeof property.participants[number]>();
  for (const p of property.participants) participantById.set(p.id, p);

  return (
    <div className="space-y-8">
      <div>
        <div className="eyebrow">Money</div>
        <h1 className="mt-1 font-serif text-3xl text-admin-ink">Settlements</h1>
        <p className="mt-1 text-sm text-admin-muted">Suggested transfers to settle all balances. Server prevents overpaying.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="admin-panel p-5">
          <h2 className="font-serif text-xl">Suggested transfers</h2>
          {suggestions.length === 0 ? (
            <p className="mt-3 text-sm text-admin-muted">Everything is settled. 🎉</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {suggestions.map((s, i) => (
                <li key={i} className="flex items-center justify-between rounded-md border border-admin-border bg-admin-bg/40 px-4 py-3 text-sm">
                  <span><span className="font-medium">{participantById.get(s.fromId)?.displayName}</span> → <span className="font-medium">{participantById.get(s.toId)?.displayName}</span></span>
                  <span className="font-medium">{formatINR(s.amountMinor)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="admin-panel p-5">
          <h2 className="font-serif text-xl">Record a settlement</h2>
          <SettlementsActions
            propertyId={property.id}
            participants={property.participants.map((p) => ({ id: p.id, name: p.displayName }))}
          />
        </div>
      </div>

      <div>
        <h2 className="font-serif text-2xl text-admin-ink">Owner balances</h2>
        <div className="mt-3">
          <Table>
            <THead>
              <TR>
                <TH>Owner</TH>
                <TH>Paid</TH>
                <TH>Share</TH>
                <TH>Received</TH>
                <TH>Entitled</TH>
                <TH>Net</TH>
              </TR>
            </THead>
            <TBody>
              {balances.map((b) => {
                const p = participantById.get(b.participantId);
                if (!p) return null;
                return (
                  <TR key={b.participantId}>
                    <TD>
                      <div className="font-medium">{p.displayName}</div>
                      <div className="text-xs text-admin-muted">{p.kind}</div>
                    </TD>
                    <TD>{formatINR(b.expensePaid)}</TD>
                    <TD>{formatINR(b.expenseShare)}</TD>
                    <TD>{formatINR(b.incomeReceived)}</TD>
                    <TD>{formatINR(b.incomeEntitled)}</TD>
                    <TD className={`font-medium ${b.net > 0n ? 'text-emerald-700' : b.net < 0n ? 'text-red-700' : 'text-admin-muted'}`}>
                      {formatINR(b.net)}
                      {b.net > 0n ? <span className="ml-2 text-xs text-admin-muted">should receive</span> : b.net < 0n ? <span className="ml-2 text-xs text-admin-muted">owes</span> : null}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </div>
      </div>

      <div>
        <h2 className="font-serif text-2xl text-admin-ink">Settlement history</h2>
        <div className="mt-3">
          {settlements.length === 0 ? (
            <p className="text-sm text-admin-muted">No settlements recorded yet.</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Date</TH>
                  <TH>From</TH>
                  <TH>To</TH>
                  <TH>Amount</TH>
                  <TH>Status</TH>
                  <TH>Reference</TH>
                  <TH>Notes</TH>
                </TR>
              </THead>
              <TBody>
                {settlements.map((s) => (
                  <TR key={s.id}>
                    <TD>{formatDate(s.occurredOn)}</TD>
                    <TD>{s.from.displayName}</TD>
                    <TD>{s.to.displayName}</TD>
                    <TD className="font-medium">{formatINR(BigInt(s.amountMinor.toString()))}</TD>
                    <TD>
                      <Badge variant={s.status === 'COMPLETED' ? 'success' : s.status === 'PENDING' ? 'warn' : 'neutral'}>
                        {s.status}
                      </Badge>
                    </TD>
                    <TD className="text-admin-muted">{s.paymentRef ?? '—'}</TD>
                    <TD className="text-admin-muted max-w-[280px] truncate">{s.notes ?? '—'}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}