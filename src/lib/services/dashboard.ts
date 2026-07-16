/**
 * Aggregated dashboard endpoint.
 *
 * Returns everything the admin dashboard needs in ONE call to avoid the
 * "GET dashboard / GET expenses / GET income / GET balances / GET categories"
 * waterfall.
 */

import { prisma } from '@/lib/db';
import { computeBalances } from '@/lib/finance';
import type { MinorAmount } from '@/lib/money';

export interface DashboardData {
  property: {
    id: string;
    name: string;
    status: string;
    currency: string;
  };
  totals: {
    incomeMinor: MinorAmount;
    expenseMinor: MinorAmount;
    netProfitMinor: MinorAmount;
    outstandingMinor: MinorAmount;
  };
  monthly: Array<{ month: string; incomeMinor: MinorAmount; expenseMinor: MinorAmount; netMinor: MinorAmount }>;
  categoryBreakdown: Array<{ categoryId: string | null; categoryName: string; amountMinor: MinorAmount; pct: number }>;
  participants: Array<{
    id: string;
    name: string;
    kind: string;
    expensePaidMinor: MinorAmount;
    expenseShareMinor: MinorAmount;
    incomeEntitledMinor: MinorAmount;
    incomeReceivedMinor: MinorAmount;
    netMinor: MinorAmount;
  }>;
  recent: Array<{
    id: string;
    type: 'EXPENSE' | 'INCOME';
    description: string;
    amountMinor: MinorAmount;
    occurredOn: string;
    category: { id: string; name: string } | null;
    paidByName: string | null;
    receivedByName: string | null;
    createdByName: string | null;
  }>;
}

export async function loadDashboard(propertyId: string): Promise<DashboardData> {
  const [property, participants, transactions, categories] = await Promise.all([
    prisma.property.findUnique({ where: { id: propertyId } }),
    prisma.participant.findMany({ where: { propertyId, isActive: true }, orderBy: { displayName: 'asc' } }),
    prisma.transaction.findMany({
      where: { propertyId, status: 'ACTIVE' },
      include: {
        category: true,
        paidBy: true,
        receivedBy: true,
        createdBy: true,
        expenseSplits: true,
        incomeSplits: true,
      },
      orderBy: { occurredOn: 'desc' },
    }),
    prisma.category.findMany({ where: { propertyId, isActive: true } }),
  ]);
  if (!property) throw new Error('Property not found');

  const settlements = await prisma.settlement.findMany({ where: { propertyId } });

  const balances = computeBalances(
    participants.map((p) => p.id),
    transactions.map((t) => ({
      id: t.id,
      type: t.type as 'EXPENSE' | 'INCOME',
      status: t.status as 'ACTIVE' | 'VOIDED',
      paidById: t.paidById,
      receivedById: t.receivedById,
      expenseSplits: t.expenseSplits.map((s) => ({ participantId: s.participantId, amountMinor: BigInt(s.amountMinor.toString()) })),
      incomeSplits: t.incomeSplits.map((s) => ({
        participantId: s.participantId,
        entitledMinor: BigInt(s.entitledMinor.toString()),
        receivedMinor: BigInt(s.receivedMinor.toString()),
      })),
    })),
    settlements.map((s) => ({
      id: s.id,
      status: s.status as 'PENDING' | 'COMPLETED' | 'CANCELLED',
      fromId: s.fromId,
      toId: s.toId,
      amountMinor: BigInt(s.amountMinor.toString()),
    })),
  );

  const balByParticipant = new Map(balances.map((b) => [b.participantId, b]));

  // Totals
  let totalIncome = 0n;
  let totalExpense = 0n;
  for (const t of transactions) {
    const amt = BigInt(t.amountMinor.toString());
    if (t.type === 'INCOME') totalIncome += amt;
    else totalExpense += amt;
  }
  let outstanding = 0n;
  for (const b of balances) if (b.net < 0n) outstanding += -b.net;
  outstanding = outstanding / 2n;

  // Monthly: last 12 months
  const monthlyMap = new Map<string, { income: bigint; expense: bigint }>();
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyMap.set(key, { income: 0n, expense: 0n });
  }
  for (const t of transactions) {
    const d = t.occurredOn;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const entry = monthlyMap.get(key);
    if (!entry) continue;
    const amt = BigInt(t.amountMinor.toString());
    if (t.type === 'INCOME') entry.income += amt;
    else entry.expense += amt;
  }
  const monthly = Array.from(monthlyMap.entries()).map(([month, v]) => ({
    month,
    incomeMinor: v.income,
    expenseMinor: v.expense,
    netMinor: v.income - v.expense,
  }));

  // Category breakdown (expenses only)
  const catMap = new Map<string | null, bigint>();
  for (const t of transactions.filter((t) => t.type === 'EXPENSE')) {
    const amt = BigInt(t.amountMinor.toString());
    const key = t.categoryId ?? null;
    catMap.set(key, (catMap.get(key) ?? 0n) + amt);
  }
  const catNameById = new Map(categories.map((c) => [c.id, c.name]));
  const categoryBreakdown = Array.from(catMap.entries())
    .map(([cid, amt]) => ({
      categoryId: cid,
      categoryName: cid ? catNameById.get(cid) ?? 'Unknown' : 'Uncategorized',
      amountMinor: amt,
      pct: totalExpense > 0n ? Number((amt * 10000n) / totalExpense) / 100 : 0,
    }))
    .sort((a, b) => (b.amountMinor > a.amountMinor ? 1 : -1));

  const participantById = new Map(participants.map((p) => [p.id, p]));

  const participantRows = balances.map((b) => {
    const p = participantById.get(b.participantId)!;
    return {
      id: p.id,
      name: p.displayName,
      kind: p.kind,
      expensePaidMinor: b.expensePaid,
      expenseShareMinor: b.expenseShare,
      incomeEntitledMinor: b.incomeEntitled,
      incomeReceivedMinor: b.incomeReceived,
      netMinor: b.net,
    };
  });

  const recent = transactions.slice(0, 20).map((t) => ({
    id: t.id,
    type: t.type as 'EXPENSE' | 'INCOME',
    description: t.description,
    amountMinor: BigInt(t.amountMinor.toString()),
    occurredOn: t.occurredOn.toISOString().slice(0, 10),
    category: t.category ? { id: t.category.id, name: t.category.name } : null,
    paidByName: t.paidBy?.displayName ?? null,
    receivedByName: t.receivedBy?.displayName ?? null,
    createdByName: t.createdBy?.name ?? null,
  }));

  return {
    property: { id: property.id, name: property.name, status: property.status, currency: property.currency },
    totals: {
      incomeMinor: totalIncome,
      expenseMinor: totalExpense,
      netProfitMinor: totalIncome - totalExpense,
      outstandingMinor: outstanding,
    },
    monthly,
    categoryBreakdown,
    participants: participantRows,
    recent,
  };
}