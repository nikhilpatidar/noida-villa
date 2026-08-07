import { describe, it, expect } from 'vitest';
import {
  toMinor,
  toMajor,
  formatINR,
  formatMoney,
  equalSplit,
  percentageSplit,
  exactSplit,
  computeSplits,
  addMinor,
} from '@/lib/money';

describe('money / INR formatting', () => {
  it('converts decimal strings to paise', () => {
    expect(toMinor('1')).toBe(100n);
    expect(toMinor('1.5')).toBe(150n);
    expect(toMinor('1250.50')).toBe(125050n);
    expect(toMinor('0.01')).toBe(1n);
    expect(toMinor('1000000')).toBe(100000000n);
  });

  it('formats INR with Indian grouping', () => {
    expect(formatINR(100n)).toBe('₹1.00');
    expect(formatINR(1000n)).toBe('₹10.00');
    expect(formatINR(100000n)).toBe('₹1,000.00');
    expect(formatINR(12500050n)).toBe('₹1,25,000.50');
    expect(formatINR(125000000n)).toBe('₹12,50,000.00');
  });

  it('formats without symbol', () => {
    expect(formatINR(125050n, { showSymbol: false })).toBe('1,250.50');
  });

  it('handles negative amounts', () => {
    expect(formatINR(-100n)).toBe('-₹1.00');
  });

  it('round-trips through toMajor/toMinor', () => {
    const original = '12345.67';
    expect(toMinor(original)).toBe(1234567n);
    expect(Number(toMajor(1234567n))).toBeCloseTo(12345.67, 2);
  });

  it('formatMoney falls back for unknown currency', () => {
    expect(formatMoney(100n, 'USD')).toMatch(/\$|USD/);
  });
});

describe('equalSplit — no money lost', () => {
  it('9000 split among 3', () => {
    const out = equalSplit(900000n, 3);
    expect(out).toEqual([300000n, 300000n, 300000n]);
    expect(out.reduce((a, b) => a + b, 0n)).toBe(900000n);
  });

  it('100 split among 3 — deterministic, no loss', () => {
    const out = equalSplit(10000n, 3);
    expect(out.reduce((a, b) => a + b, 0n)).toBe(10000n);
    // The largest-remainder method distributes to first entries first.
    expect(out[0]).toBe(3334n);
    expect(out[1]).toBe(3333n);
    expect(out[2]).toBe(3333n);
  });

  it('1 split among 3 — single paise goes to first', () => {
    expect(equalSplit(1n, 3)).toEqual([1n, 0n, 0n]);
  });

  it('0 split returns all zeros', () => {
    expect(equalSplit(0n, 5)).toEqual([0n, 0n, 0n, 0n, 0n]);
  });

  it('1 split among 1', () => {
    expect(equalSplit(100n, 1)).toEqual([100n]);
  });

  it('large uneven total — invariant holds', () => {
    const out = equalSplit(10000000007n, 9);
    expect(out.reduce((a, b) => a + b, 0n)).toBe(10000000007n);
  });

  it('throws on bad input', () => {
    expect(() => equalSplit(100n, 0)).toThrow();
    expect(() => equalSplit(-1n, 2)).toThrow();
  });
});

describe('percentageSplit — sum is preserved', () => {
  it('10000 @ 50/30/20', () => {
    const out = percentageSplit(1000000n, [5000, 3000, 2000]);
    expect(out.reduce((a, b) => a + b, 0n)).toBe(1000000n);
    expect(out[0]).toBe(500000n);
    expect(out[1]).toBe(300000n);
    expect(out[2]).toBe(200000n);
  });

  it('uneven 100 @ 33/33/34', () => {
    const out = percentageSplit(10000n, [3300, 3300, 3400]);
    expect(out.reduce((a, b) => a + b, 0n)).toBe(10000n);
  });

  it('odd split with remainder', () => {
    // 100 / 3 equal (33.33% each)
    const out = percentageSplit(10000n, [3333, 3333, 3334]);
    expect(out.reduce((a, b) => a + b, 0n)).toBe(10000n);
  });

  it('handles zero participants', () => {
    expect(() => percentageSplit(100n, [])).toThrow();
  });
});

describe('exactSplit', () => {
  it('passes through and validates', () => {
    expect(exactSplit([5000n, 2500n, 1500n])).toEqual([5000n, 2500n, 1500n]);
    expect(() => exactSplit([-1n])).toThrow();
  });
});

describe('computeSplits (the unified entry point)', () => {
  it('EQUAL', () => {
    const r = computeSplits(900000n, { method: 'EQUAL', participantIds: ['A', 'B', 'C'] });
    expect(r).toEqual([
      { participantId: 'A', amountMinor: 300000n },
      { participantId: 'B', amountMinor: 300000n },
      { participantId: 'C', amountMinor: 300000n },
    ]);
  });

  it('PERCENTAGE 50/30/20', () => {
    const r = computeSplits(1000000n, { method: 'PERCENTAGE', participantIds: ['A', 'B', 'C'], percentages: [50, 30, 20] });
    expect(r).toEqual([
      { participantId: 'A', amountMinor: 500000n },
      { participantId: 'B', amountMinor: 300000n },
      { participantId: 'C', amountMinor: 200000n },
    ]);
  });

  it('EXACT must sum exactly', () => {
    const r = computeSplits(900000n, { method: 'EXACT', participantIds: ['A', 'B', 'C'], amounts: [500000n, 250000n, 150000n] });
    expect(r.reduce((a, x) => a + x.amountMinor, 0n)).toBe(900000n);
    expect(() =>
      computeSplits(900000n, { method: 'EXACT', participantIds: ['A', 'B', 'C'], amounts: [500000n, 200000n, 100000n] }),
    ).toThrow(/sum to total/);
  });

  it('PERCENTAGE rejects non-100 sums', () => {
    expect(() =>
      computeSplits(100n, { method: 'PERCENTAGE', participantIds: ['A', 'B'], percentages: [40, 50] }),
    ).toThrow(/sum to 100/);
  });

  it('PERCENTAGE with single participant 100% works', () => {
    const r = computeSplits(12345n, { method: 'PERCENTAGE', participantIds: ['A'], percentages: [100] });
    expect(r).toEqual([{ participantId: 'A', amountMinor: 12345n }]);
  });

  it('EQUAL of 100 among 3 is exact-invariant (10000 paise)', () => {
    const r = computeSplits(10000n, { method: 'EQUAL', participantIds: ['A', 'B', 'C'] });
    expect(r.reduce((a, x) => a + x.amountMinor, 0n)).toBe(10000n);
  });
});

describe('addMinor', () => {
  it('adds', () => {
    expect(addMinor(100n, 200n)).toBe(300n);
  });
});
