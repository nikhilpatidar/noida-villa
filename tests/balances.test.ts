import { describe, it, expect } from 'vitest';
import { computeBalances, suggestSettlements, validateSettlementAmount } from '@/lib/finance';

const P = ['A', 'B', 'C'] as const;

function exp(amount: string, paidBy: string, splits: [string, string][]) {
  const totalPaise = BigInt(Math.round(Number(amount) * 100));
  const splitsPaise = splits.map(([pid, amt]) => [pid, BigInt(Math.round(Number(amt) * 100))] as [string, bigint]);
  return {
    id: `e-${paidBy}-${amount}`,
    type: 'EXPENSE' as const,
    status: 'ACTIVE' as const,
    paidById: paidBy,
    receivedById: null,
    expenseSplits: splitsPaise.map(([pid, amt]) => ({ participantId: pid, amountMinor: amt })),
    incomeSplits: [],
  };
}

describe('balances — multi-expense scenarios', () => {
  it('classic A=12000 paid, equal among A/B/C', () => {
    const txs = [exp('12000', 'A', [['A', '4000'], ['B', '4000'], ['C', '4000']])];
    const bal = computeBalances([...P], txs, []);
    const A = bal.find((b) => b.participantId === 'A')!;
    const B = bal.find((b) => b.participantId === 'B')!;
    const C = bal.find((b) => b.participantId === 'C')!;
    expect(A.net).toBe(800000n); // 12000 paid - 4000 share = +8000
    expect(B.net).toBe(-400000n);
    expect(C.net).toBe(-400000n);
  });

  it('A and B pay separately', () => {
    const txs = [
      exp('9000', 'A', [['A', '3000'], ['B', '3000'], ['C', '3000']]),
      exp('6000', 'B', [['A', '2000'], ['B', '2000'], ['C', '2000']]),
    ];
    const bal = computeBalances([...P], txs, []);
    const A = bal.find((b) => b.participantId === 'A')!;
    const B = bal.find((b) => b.participantId === 'B')!;
    const C = bal.find((b) => b.participantId === 'C')!;
    // A paid 9000, share 5000 → +4000
    // B paid 6000, share 5000 → +1000
    // C paid 0, share 5000 → -5000
    expect(A.net).toBe(400000n);
    expect(B.net).toBe(100000n);
    expect(C.net).toBe(-500000n);
    // Conservation: sum of nets should equal zero across all participants
    const sum = bal.reduce((a, b) => a + b.net, 0n);
    expect(sum).toBe(0n);
  });

  it('income entitlement vs received', () => {
    const inc = {
      id: 'i1',
      type: 'INCOME' as const,
      status: 'ACTIVE' as const,
      paidById: null,
      receivedById: 'A',
      expenseSplits: [],
      incomeSplits: [
        { participantId: 'A', entitledMinor: 400000n, receivedMinor: 400000n },
        { participantId: 'B', entitledMinor: 300000n, receivedMinor: 0n },
        { participantId: 'C', entitledMinor: 300000n, receivedMinor: 0n },
      ],
    };
    const bal = computeBalances([...P], [inc], []);
    const A = bal.find((b) => b.participantId === 'A')!;
    const B = bal.find((b) => b.participantId === 'B')!;
    const C = bal.find((b) => b.participantId === 'C')!;
    // A: entitled 4000, received 4000 → 0
    // B: entitled 3000, received 0 → +3000
    // C: entitled 3000, received 0 → +3000
    expect(A.net).toBe(0n);
    expect(B.net).toBe(300000n);
    expect(C.net).toBe(300000n);
  });

  it('voided transactions are ignored', () => {
    const t = exp('12000', 'A', [['A', '4000'], ['B', '4000'], ['C', '4000']]);
    const voided = { ...t, id: 'v1', status: 'VOIDED' as const };
    const bal = computeBalances([...P], [voided], []);
    expect(bal.every((b) => b.net === 0n)).toBe(true);
  });
});

describe('settlement suggestions — minimum transfers', () => {
  it('3-way unequal', () => {
    const txs = [
      exp('9000', 'A', [['A', '3000'], ['B', '3000'], ['C', '3000']]),
      exp('6000', 'B', [['A', '2000'], ['B', '2000'], ['C', '2000']]),
    ];
    const bal = computeBalances([...P], txs, []);
    const sugg = suggestSettlements(bal);
    const sum = sugg.reduce((a, s) => a + s.amountMinor, 0n);
    expect(sum).toBe(500000n);
    // Verify after applying, all balances become zero
    const after = bal.map((b) => ({ ...b }));
    for (const s of sugg) {
      const f = after.find((b) => b.participantId === s.fromId)!;
      const t = after.find((b) => b.participantId === s.toId)!;
      f.net += s.amountMinor;
      t.net -= s.amountMinor;
    }
    expect(after.every((b) => b.net === 0n)).toBe(true);
  });
});

describe('validateSettlementAmount', () => {
  it('allows up to outstanding balance', () => {
    const bal = computeBalances([...P], [
      exp('9000', 'A', [['A', '3000'], ['B', '3000'], ['C', '3000']]),
      exp('6000', 'B', [['A', '2000'], ['B', '2000'], ['C', '2000']]),
    ], []);
    const v = validateSettlementAmount(bal, 'C', 'A', 500000n);
    expect(v.ok).toBe(true);
  });

  it('rejects overpayment beyond balance', () => {
    const bal = computeBalances([...P], [
      exp('9000', 'A', [['A', '3000'], ['B', '3000'], ['C', '3000']]),
    ], []);
    const v = validateSettlementAmount(bal, 'C', 'A', 500000n); // C only owes 400000n
    expect(v.ok).toBe(false);
  });

  it('rejects when sender has no debt', () => {
    const bal = computeBalances([...P], [
      exp('12000', 'A', [['A', '4000'], ['B', '4000'], ['C', '4000']]),
    ], []);
    const v = validateSettlementAmount(bal, 'A', 'B', 1000n);
    expect(v.ok).toBe(false);
  });

  it('rejects non-positive amount', () => {
    const bal = computeBalances([...P], [
      exp('9000', 'A', [['A', '3000'], ['B', '3000'], ['C', '3000']]),
    ], []);
    expect(validateSettlementAmount(bal, 'C', 'A', 0n).ok).toBe(false);
  });
});
