import { describe, it, expect } from 'vitest';
import { toMinor, formatINR, equalSplit, computeSplits } from '@/lib/money';

describe('edge cases — money must never be lost', () => {
  it('1 INR / 7 — sum is preserved', () => {
    const out = equalSplit(100n, 7);
    expect(out.reduce((a, b) => a + b, 0n)).toBe(100n);
  });

  it('₹9,999.99 / 13 — sum preserved', () => {
    const total = toMinor('9999.99'); // 999999n
    const out = equalSplit(total, 13);
    expect(out.reduce((a, b) => a + b, 0n)).toBe(999999n);
  });

  it('computeSplits with PERCENTAGE 100% single person', () => {
    const out = computeSplits(500n, { method: 'PERCENTAGE', participantIds: ['A'], percentages: [100] });
    expect(out[0].amountMinor).toBe(500n);
  });

  it('formatINR for ₹10,00,00,000 (10 crore)', () => {
    // 10 crore = 100,000,000 INR = 10,000,000,000 paise
    expect(formatINR(10000000000n)).toBe('₹10,00,00,000.00');
  });

  it('formatINR for ₹1,00,00,000 (1 crore)', () => {
    // 1 crore = 10,000,000 INR = 1,000,000,000 paise
    expect(formatINR(1000000000n)).toBe('₹1,00,00,000.00');
  });

  it('formatINR for negative amount', () => {
    expect(formatINR(-10000000000n)).toBe('-₹10,00,00,000.00');
  });

  it('toMinor handles negative (refund)', () => {
    expect(toMinor('-100.50')).toBe(-10050n);
  });

  it('massive total (₹1,00,00,000 split 13) preserves money', () => {
    const total = toMinor('10000000.00'); // 1 crore
    const out = equalSplit(total, 13);
    expect(out.reduce((a, b) => a + b, 0n)).toBe(total);
  });
});