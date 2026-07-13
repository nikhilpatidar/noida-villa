/**
 * Centralized financial balance engine.
 *
 * For each participant in a property we compute:
 *
 *   expensePaid      = sum of expenses they paid (minor)
 *   expenseShare     = sum of expense split amounts (minor)  — what they owe
 *   incomeReceived   = sum of income they actually received (minor)
 *   incomeEntitled   = sum of income entitlement share (minor)
 *   settlementsPaid  = sum of settlements they made (completed only)
 *   settlementsRecv  = sum of settlements they received (completed only)
 *
 *   net = (expensePaid - expenseShare) + (incomeEntitled - incomeReceived) + (settlementsRecv - settlementsPaid)
 *
 *   A positive net = "this participant should receive money"
 *   A negative net = "this participant owes money"
 *
 *   Magnitudes in INR paise (BigInt). Server is the authoritative source.
 */

import { addMinor, type MinorAmount } from './money';

export type ParticipantId = string;

export interface TxnForBalance {
  id: string;
  type: 'EXPENSE' | 'INCOME';
  status: 'ACTIVE' | 'VOIDED';
  paidById?: ParticipantId | null;
  receivedById?: ParticipantId | null;
  expenseSplits: { participantId: ParticipantId; amountMinor: MinorAmount }[];
  incomeSplits: { participantId: ParticipantId; entitledMinor: MinorAmount; receivedMinor: MinorAmount }[];
}

export interface SettleForBalance {
  id: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  fromId: ParticipantId;
  toId: ParticipantId;
  amountMinor: MinorAmount;
}

export interface ParticipantBalance {
  participantId: ParticipantId;
  expensePaid: MinorAmount;
  expenseShare: MinorAmount;
  incomeReceived: MinorAmount;
  incomeEntitled: MinorAmount;
  settlementsPaid: MinorAmount;
  settlementsReceived: MinorAmount;
  /** Positive = should receive money. Negative = owes money. */
  net: MinorAmount;
}

export interface PropertyFinancialTotals {
  totalIncomeMinor: MinorAmount;
  totalExpenseMinor: MinorAmount;
  netProfitMinor: MinorAmount;
  outstandingNetMinor: MinorAmount; // sum of |outstanding balances| / 2 (each unsettled debt counted once)
}

/** Compute balances for every participant referenced in the inputs. */
export function computeBalances(
  participants: ParticipantId[],
  transactions: TxnForBalance[],
  settlements: SettleForBalance[],
): ParticipantBalance[] {
  const map = new Map<ParticipantId, ParticipantBalance>();
  for (const id of participants) {
    map.set(id, {
      participantId: id,
      expensePaid: 0n,
      expenseShare: 0n,
      incomeReceived: 0n,
      incomeEntitled: 0n,
      settlementsPaid: 0n,
      settlementsReceived: 0n,
      net: 0n,
    });
  }
  const get = (id: ParticipantId) => {
    let b = map.get(id);
    if (!b) {
      b = {
        participantId: id,
        expensePaid: 0n, expenseShare: 0n,
        incomeReceived: 0n, incomeEntitled: 0n,
        settlementsPaid: 0n, settlementsReceived: 0n,
        net: 0n,
      };
      map.set(id, b);
    }
    return b;
  };

  let totalIncome = 0n;
  let totalExpense = 0n;

  for (const t of transactions) {
    if (t.status !== 'ACTIVE') continue;
    if (t.type === 'EXPENSE') {
      totalExpense += t.expenseSplits.reduce((a, s) => a + s.amountMinor, 0n);
      if (t.paidById) get(t.paidById).expensePaid += sumOfSplits(t);
      for (const s of t.expenseSplits) {
        get(s.participantId).expenseShare += s.amountMinor;
      }
    } else {
      totalIncome += t.incomeSplits.reduce((a, s) => a + s.entitledMinor, 0n);
      if (t.receivedById) {
        // amount received by `receivedById` from this income
        const receivedFor = t.incomeSplits.find((s) => s.participantId === t.receivedById)?.receivedMinor ?? 0n;
        get(t.receivedById).incomeReceived += receivedFor;
      }
      for (const s of t.incomeSplits) {
        get(s.participantId).incomeEntitled += s.entitledMinor;
      }
    }
  }

  for (const s of settlements) {
    if (s.status !== 'COMPLETED') continue;
    get(s.fromId).settlementsPaid += s.amountMinor;
    get(s.toId).settlementsReceived += s.amountMinor;
  }

  // Finalize net
  for (const b of map.values()) {
    b.net =
      (b.expensePaid - b.expenseShare) +
      (b.incomeEntitled - b.incomeReceived) +
      (b.settlementsReceived - b.settlementsPaid);
  }

  const outstandingNetMinor = computeOutstandingTotal(Array.from(map.values()));
  return Array.from(map.values());
}

function sumOfSplits(t: TxnForBalance): MinorAmount {
  return t.expenseSplits.reduce((a, s) => a + s.amountMinor, 0n);
}

/** Sum the absolute value of all negative balances / 2 — i.e., how much cash is owed in total. */
function computeOutstandingTotal(balances: ParticipantBalance[]): MinorAmount {
  let owed = 0n;
  for (const b of balances) if (b.net < 0n) owed += -b.net;
  return owed / 2n;
}

/** Sum amounts of an array. */
export function sumMinor(arr: { amountMinor: MinorAmount }[]): MinorAmount {
  return arr.reduce((a, x) => a + x.amountMinor, 0n);
}

/**
 * Greedy settlement suggestion: minimum number of transfers to settle all balances.
 * Standard "splitwise" algorithm: largest creditor with largest debtor until done.
 */
export function suggestSettlements(balances: ParticipantBalance[]): { fromId: ParticipantId; toId: ParticipantId; amountMinor: MinorAmount }[] {
  const creditors = balances.filter((b) => b.net > 0n).map((b) => ({ ...b })).sort((a, b) => Number(b.net - a.net));
  const debtors = balances.filter((b) => b.net < 0n).map((b) => ({ ...b, net: -b.net })).sort((a, b) => Number(b.net - a.net));
  const out: { fromId: ParticipantId; toId: ParticipantId; amountMinor: MinorAmount }[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = debtors[i].net < creditors[j].net ? debtors[i].net : creditors[j].net;
    if (pay > 0n) {
      out.push({ fromId: debtors[i].participantId, toId: creditors[j].participantId, amountMinor: pay });
      debtors[i].net -= pay;
      creditors[j].net -= pay;
    }
    if (debtors[i].net === 0n) i++;
    if (creditors[j].net === 0n) j++;
  }
  return out;
}

/**
 * Validate that a planned settlement does not overpay the underlying outstanding balance.
 * Returns true if the settlement is acceptable (within 1 INR tolerance for rounding noise).
 */
export function validateSettlementAmount(
  currentBalances: ParticipantBalance[],
  fromId: ParticipantId,
  toId: ParticipantId,
  amountMinor: MinorAmount,
): { ok: boolean; reason?: string; maxAllowed?: MinorAmount } {
  const fromBal = currentBalances.find((b) => b.participantId === fromId);
  const toBal = currentBalances.find((b) => b.participantId === toId);
  if (!fromBal || !toBal) return { ok: false, reason: 'Unknown participant' };
  if (amountMinor <= 0n) return { ok: false, reason: 'Amount must be positive' };
  if (fromBal.net >= 0n) return { ok: false, reason: 'Sender has no outstanding debt' };
  if (toBal.net <= 0n) return { ok: false, reason: 'Recipient is not a creditor' };
  const maxPayable = -fromBal.net;
  // Tolerate 1 INR off due to prior settlements.
  const tolerance = 100n;
  if (amountMinor - maxPayable > tolerance) {
    return { ok: false, reason: `Exceeds outstanding balance (${maxPayable})`, maxAllowed: maxPayable };
  }
  return { ok: true };
}

export { addMinor };