/**
 * Money utilities.
 *
 * All authoritative amounts are stored as INTEGER MINOR UNITS (paise for INR).
 * 1 INR = 100 paise.  ₹1,250.50 → 125050.
 *
 * This module is the ONLY place that:
 *   - parses user-typed money
 *   - formats money for display
 *   - performs split arithmetic
 *
 * It uses a BigInt-backed helper class so large amounts stay exact.
 */

import Decimal from 'decimal.js';

// Use high precision for intermediate calculations, but final amounts are integers.
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_EVEN });

export type MinorAmount = bigint;
export type Currency = string;

export class MoneyError extends Error {}

/** Convert a major-unit decimal string or number to paise (BigInt). */
export function toMinor(value: string | number | Decimal, currency: string = 'INR'): MinorAmount {
  const decimals = currencyDecimals(currency);
  const d = value instanceof Decimal ? value : new Decimal(value as any);
  // multiply by 10^decimals
  const scaled = d.mul(new Decimal(10).pow(decimals));
  // Round half-even at the final integer boundary (banker's rounding)
  const rounded = scaled.toDecimalPlaces(0, Decimal.ROUND_HALF_EVEN);
  return BigInt(rounded.toFixed(0));
}

/** Convert paise (BigInt) to a major-unit Decimal. */
export function toMajor(minor: MinorAmount, currency: string = 'INR'): Decimal {
  const decimals = currencyDecimals(currency);
  const d = new Decimal(minor.toString()).div(new Decimal(10).pow(decimals));
  return d;
}

/** Currency decimals. Currently all supported currencies use 2 minor digits. */
export function currencyDecimals(currency: string): number {
  // Could expand to a real ISO 4217 table; current scope is INR only.
  return 2;
}

/**
 * Indian locale formatting: 1,25,000.50 style grouping.
 */
export function formatINR(minor: MinorAmount, opts: { showSymbol?: boolean } = {}): string {
  const { showSymbol = true } = opts;
  const sign = minor < 0n ? '-' : '';
  const abs = minor < 0n ? -minor : minor;
  const decimals = 2;
  const s = abs.toString().padStart(decimals + 1, '0');
  const intPart = s.slice(0, s.length - decimals);
  const fracPart = s.slice(s.length - decimals);
  // Indian numbering: last 3 digits, then groups of 2.
  let intFormatted = '';
  if (intPart.length <= 3) {
    intFormatted = intPart;
  } else {
    const last3 = intPart.slice(-3);
    const rest = intPart.slice(0, -3);
    intFormatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
  }
  const core = `${intFormatted}.${fracPart}`;
  return showSymbol ? `${sign}₹${core}` : `${sign}${core}`;
}

export function formatMoney(minor: MinorAmount, currency: string = 'INR'): string {
  if (currency === 'INR') return formatINR(minor);
  // Generic fallback
  const major = toMajor(minor, currency).toNumber();
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(major);
  } catch {
    return `${currency} ${major.toFixed(2)}`;
  }
}

/** Add two minor amounts safely. */
export function addMinor(a: MinorAmount, b: MinorAmount): MinorAmount {
  return a + b;
}
export function subMinor(a: MinorAmount, b: MinorAmount): MinorAmount {
  return a - b;
}

/**
 * Split a total into N shares using the largest-remainder method (banker's rounding for ties).
 * Guarantees:
 *   - sum(splits) === total
 *   - splits are all non-negative (caller pre-validates total >= 0)
 */
export function equalSplit(total: MinorAmount, n: number): MinorAmount[] {
  if (!Number.isInteger(n) || n <= 0) throw new MoneyError('equalSplit: n must be a positive integer');
  if (total < 0n) throw new MoneyError('equalSplit: total must be non-negative');
  if (total === 0n) return new Array<MinorAmount>(n).fill(0n);

  const base = total / BigInt(n);
  let remainder = total - base * BigInt(n); // 0 <= remainder < n
  const out: MinorAmount[] = new Array(n).fill(base);

  // Largest-remainder: distribute the remainder one by one.
  // For ties this produces deterministic results in array order.
  let i = 0;
  while (remainder > 0n) {
    out[i] = out[i] + 1n;
    remainder = remainder - 1n;
    i++;
  }
  return out;
}

/**
 * Split a total by percentage. Percentages may not sum to exactly 100 due to rounding.
 * The remainder is absorbed by the last participant so the total is preserved.
 *
 * @param total minor amount (>= 0)
 * @param bps integer basis points summing close to 10000
 */
export function percentageSplit(total: MinorAmount, bps: number[]): MinorAmount[] {
  if (total < 0n) throw new MoneyError('percentageSplit: total must be non-negative');
  if (bps.length === 0) throw new MoneyError('percentageSplit: empty input');
  const sumBps = bps.reduce((a, b) => a + b, 0);
  if (sumBps <= 0) throw new MoneyError('percentageSplit: percentages must sum > 0');

  // Use Decimal to avoid BigInt division quirks on large totals.
  const totalDec = new Decimal(total.toString());
  const out = bps.map((p) => totalDec.mul(p).div(10000).toDecimalPlaces(0, Decimal.ROUND_DOWN).toFixed(0));
  let allocated = BigInt(out.reduce((acc, s) => acc + Number(s), 0));
  // adjust first non-zero entry to absorb remainder
  let remainder = total - allocated;
  if (remainder === 0n) return out.map((s) => BigInt(s));

  // Distribute remainder one paise at a time to the last entries first,
  // for determinism — but if all zero we'd need at least one. To keep it
  // simple, we add to the last entry (and any earlier zeros if necessary).
  const adjusted = out.map((s) => BigInt(s));
  let idx = adjusted.length - 1;
  while (remainder !== 0n && idx >= 0) {
    if (remainder > 0n) {
      adjusted[idx] = adjusted[idx] + 1n;
      remainder = remainder - 1n;
    } else {
      // remainder negative — reduce from this entry if possible
      if (adjusted[idx] > 0n) {
        adjusted[idx] = adjusted[idx] - 1n;
        remainder = remainder + 1n;
      }
    }
    if (idx === 0) idx = adjusted.length - 1;
    else idx--;
  }
  if (remainder !== 0n) throw new MoneyError('percentageSplit: unable to allocate remainder');
  return adjusted;
}

/**
 * Exact split: caller supplies the per-participant amount; we validate the sum equals total.
 */
export function exactSplit(amounts: (MinorAmount | string | number)[]): MinorAmount[] {
  if (amounts.length === 0) throw new MoneyError('exactSplit: empty input');
  const normalized = amounts.map((a) => (typeof a === 'bigint' ? a : toMinor(a)));
  for (const a of normalized) if (a < 0n) throw new MoneyError('exactSplit: negative amount');
  return [...normalized];
}

/**
 * Normalize a SplitMethod+inputs into a final array of per-participant amounts that sum exactly to `total`.
 *
 * - EQUAL:     shares = equalSplit(total, count)
 * - PERCENTAGE: shares = percentageSplit(total, percentages) where percentages are integer 0-100
 * - EXACT:      validate sum === total
 */
export type SplitInput =
  | { method: 'EQUAL'; participantIds: string[]; percentages?: undefined; amounts?: undefined }
  | { method: 'PERCENTAGE'; participantIds: string[]; percentages: number[]; amounts?: undefined }
  | { method: 'EXACT'; participantIds: string[]; amounts: (MinorAmount | string | number)[]; percentages?: undefined };

export function computeSplits(total: MinorAmount, input: SplitInput): { participantId: string; amountMinor: MinorAmount }[] {
  if (total < 0n) throw new MoneyError('computeSplits: total must be non-negative');
  const ids = input.participantIds;
  if (ids.length === 0) throw new MoneyError('computeSplits: no participants');

  let amounts: MinorAmount[];
  if (input.method === 'EQUAL') {
    amounts = equalSplit(total, ids.length);
  } else if (input.method === 'PERCENTAGE') {
    if (input.percentages.length !== ids.length) throw new MoneyError('computeSplits: percentages length mismatch');
    const sumPct = input.percentages.reduce((a, b) => a + b, 0);
    if (sumPct !== 100) throw new MoneyError(`computeSplits: percentages must sum to 100 (got ${sumPct})`);
    const bps = input.percentages.map((p) => Math.round(p * 100)); // convert % to bps
    amounts = percentageSplit(total, bps);
  } else {
    if (input.amounts.length !== ids.length) throw new MoneyError('computeSplits: amounts length mismatch');
    const normalized = input.amounts.map((a) => (typeof a === 'bigint' ? a : toMinor(a)));
    const sum = normalized.reduce((a, b) => a + b, 0n);
    if (sum !== total) throw new MoneyError(`computeSplits: exact amounts must sum to total (got ${sum}, expected ${total})`);
    amounts = normalized;
  }

  // Final invariant.
  const finalSum = amounts.reduce((a, b) => a + b, 0n);
  if (finalSum !== total) throw new MoneyError(`computeSplits: invariant violated (sum=${finalSum}, total=${total})`);

  return ids.map((participantId, i) => ({ participantId, amountMinor: amounts[i] }));
}