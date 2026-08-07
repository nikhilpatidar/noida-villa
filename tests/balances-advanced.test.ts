import { describe, it, expect } from 'vitest';
import { computeBalances, suggestSettlements, validateSettlementAmount } from '@/lib/finance';

const P = ['A', 'B', 'C', 'D'] as const;

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

function settle(fromId: string, toId: string, amount: string, status: 'PENDING' | 'COMPLETED' | 'CANCELLED' = 'COMPLETED') {
  return {
    id: `s-${fromId}-${toId}-${amount}`,
    fromId,
    toId,
    amountMinor: BigInt(Math.round(Number(amount) * 100)),
    status,
  };
}

describe('balances — complex scenarios', () => {
  it('settlements are reflected in balances', () => {
    const txs = [
      exp('9000', 'A', [['A', '3000'], ['B', '3000'], ['C', '3000']]),
    ];
    const settlements = [
      settle('C', 'A', '3000', 'COMPLETED'),
    ];
    const bal = computeBalances(['A', 'B', 'C'], txs, settlements);
    const A = bal.find((b) => b.participantId === 'A')!;
    const B = bal.find((b) => b.participantId === 'B')!;
    const C = bal.find((b) => b.participantId === 'C')!;
    // A: paid 9000, share 3000, received 3000 from C → 9000 - 3000 + 3000 = 9000
    expect(A.net).toBe(900000n); // +₹9000
    expect(B.net).toBe(-300000n); // -₹3000
    // C: share 3000, paid settlement 3000 → -3000 - 3000 = -6000
    expect(C.net).toBe(-600000n);
  });

  it('pending settlements are NOT counted in balances', () => {
    const txs = [
      exp('9000', 'A', [['A', '3000'], ['B', '3000'], ['C', '3000']]),
    ];
    const settlements = [
      settle('C', 'A', '3000', 'PENDING'),
    ];
    const bal = computeBalances(['A', 'B', 'C'], txs, settlements);
    const A = bal.find((b) => b.participantId === 'A')!;
    const C = bal.find((b) => b.participantId === 'C')!;
    // Pending settlement is not applied
    expect(A.net).toBe(600000n); // +6000
    expect(C.net).toBe(-300000n); // -3000
  });

  it('cancelled settlements are NOT counted in balances', () => {
    const txs = [
      exp('9000', 'A', [['A', '3000'], ['B', '3000'], ['C', '3000']]),
    ];
    const settlements = [
      settle('C', 'A', '3000', 'CANCELLED'),
    ];
    const bal = computeBalances(['A', 'B', 'C'], txs, settlements);
    const C = bal.find((b) => b.participantId === 'C')!;
    expect(C.net).toBe(-300000n);
  });

  it('deactivated participants retain their historical balances', () => {
    // We include a deactivated participant D in the participant list to ensure
    // their historical share is still counted.
    const txs = [
      exp('12000', 'A', [['A', '3000'], ['B', '3000'], ['C', '3000'], ['D', '3000']]),
    ];
    const bal = computeBalances(['A', 'B', 'C', 'D'], txs, []);
    const D = bal.find((b) => b.participantId === 'D')!;
    expect(D.expenseShare).toBe(300000n);
    expect(D.net).toBe(-300000n); // still owes
  });

  it('4-way equal split with multiple payers', () => {
    const txs = [
      exp('8000', 'A', [['A', '2000'], ['B', '2000'], ['C', '2000'], ['D', '2000']]),
      exp('4000', 'B', [['A', '1000'], ['B', '1000'], ['C', '1000'], ['D', '1000']]),
      exp('4000', 'C', [['A', '1000'], ['B', '1000'], ['C', '1000'], ['D', '1000']]),
    ];
    const bal = computeBalances([...P], txs, []);
    const sum = bal.reduce((a, b) => a + b.net, 0n);
    expect(sum).toBe(0n); // conservation
    // A: paid 8000, share 4000 → +4000
    expect(bal.find((b) => b.participantId === 'A')!.net).toBe(400000n);
    // B: paid 4000, share 4000 → 0
    expect(bal.find((b) => b.participantId === 'B')!.net).toBe(0n);
    // C: paid 4000, share 4000 → 0
    expect(bal.find((b) => b.participantId === 'C')!.net).toBe(0n);
    // D: paid 0, share 4000 → -4000
    expect(bal.find((b) => b.participantId === 'D')!.net).toBe(-400000n);
  });

  it('settlement suggestions minimize number of transfers', () => {
    const txs = [
      exp('12000', 'A', [['A', '3000'], ['B', '3000'], ['C', '3000'], ['D', '3000']]),
      exp('8000', 'B', [['A', '2000'], ['B', '2000'], ['C', '2000'], ['D', '2000']]),
      exp('4000', 'C', [['A', '1000'], ['B', '1000'], ['C', '1000'], ['D', '1000']]),
    ];
    const bal = computeBalances([...P], txs, []);
    const sugg = suggestSettlements(bal);
    // Should be at most N-1 transfers
    expect(sugg.length).toBeLessThanOrEqual(P.length - 1);
    // Applying suggestions zero-sums all balances
    const after = bal.map((b) => ({ ...b }));
    for (const s of sugg) {
      const f = after.find((b) => b.participantId === s.fromId)!;
      const t = after.find((b) => b.participantId === s.toId)!;
      f.net += s.amountMinor;
      t.net -= s.amountMinor;
    }
    expect(after.every((b) => b.net === 0n)).toBe(true);
  });

  it('validateSettlementAmount — boundary tolerance', () => {
    const bal = computeBalances(['A', 'B'], [exp('1000', 'A', [['A', '500'], ['B', '500']])], []);
    // B owes exactly 50000 paise (₹500). 1 INR tolerance = 100 paise.
    expect(validateSettlementAmount(bal, 'B', 'A', 50000n).ok).toBe(true);
    expect(validateSettlementAmount(bal, 'B', 'A', 50100n).ok).toBe(true); // +1 INR OK
    expect(validateSettlementAmount(bal, 'B', 'A', 50200n).ok).toBe(false); // +2 INR NOT OK
  });

  it('multi-step settlements reduce outstanding correctly', () => {
    const txs = [
      exp('9000', 'A', [['A', '3000'], ['B', '3000'], ['C', '3000']]),
    ];
    // Before any settlement: B owes 3000 (share) - 0 (paid) = 3000.
    let bal = computeBalances(['A', 'B', 'C'], txs, []);
    expect(bal.find((b) => b.participantId === 'B')!.net).toBe(-300000n);
    // After B → A 1000 settlement: B's net is -3000 (share) - 1000 (paid settlement) = -4000.
    bal = computeBalances(['A', 'B', 'C'], txs, [
      settle('B', 'A', '1000', 'COMPLETED'),
    ]);
    const B1 = bal.find((b) => b.participantId === 'B')!;
    expect(B1.net).toBe(-400000n); // -₹4000 (share + already-paid settlement)
    // Validation: B may pay up to 4000 (with ₹1 INR tolerance = 100 paise).
    expect(validateSettlementAmount(bal, 'B', 'A', 400000n).ok).toBe(true);
    expect(validateSettlementAmount(bal, 'B', 'A', 400100n).ok).toBe(true);
    expect(validateSettlementAmount(bal, 'B', 'A', 400200n).ok).toBe(false);
  });
});