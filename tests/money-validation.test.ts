/**
 * Money-input validation regression tests.
 *
 * The previous `moneyString` regex `/^-?\d+(\.\d{1,2})?$/` accepted
 * negative values at the form layer. The service layer still rejected
 * them, but the user saw a generic "Amount must be positive" deep in the
 * stack instead of a clear form-level message. The fix tightens the
 * regex and adds a length cap so a caller cannot submit arbitrarily
 * large digit strings for BigInt to chew through.
 *
 * Note: the lower-level `toMinor()` in `src/lib/money.ts` deliberately
 * accepts negatives for refunds / voids; this test only covers the
 * user-facing form-level schema.
 */
import { describe, it, expect } from 'vitest';
import { moneyString } from '../src/lib/validation';

function parse(input: unknown) {
  return moneyString.safeParse(input);
}

describe('moneyString — form-level validation', () => {
  it('accepts a positive integer', () => {
    expect(parse('1250').success).toBe(true);
  });

  it('accepts a positive decimal with up to 2 fraction digits', () => {
    expect(parse('1250.50').success).toBe(true);
    expect(parse('1250.5').success).toBe(true);
    expect(parse('0.99').success).toBe(true);
  });

  it('accepts zero', () => {
    expect(parse('0').success).toBe(true);
    expect(parse('0.00').success).toBe(true);
  });

  it('trims surrounding whitespace', () => {
    expect(parse('  100.50  ').success).toBe(true);
  });

  it('rejects a negative value', () => {
    const r = parse('-100');
    expect(r.success).toBe(false);
  });

  it('rejects a negative decimal', () => {
    expect(parse('-100.50').success).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(parse('').success).toBe(false);
  });

  it('rejects a whitespace-only string', () => {
    expect(parse('   ').success).toBe(false);
  });

  it('rejects a string with multiple decimal points', () => {
    expect(parse('100.50.25').success).toBe(false);
  });

  it('rejects more than 2 decimal places', () => {
    expect(parse('100.501').success).toBe(false);
    expect(parse('100.5019').success).toBe(false);
  });

  it('rejects scientific notation', () => {
    expect(parse('1e6').success).toBe(false);
    expect(parse('1.5E3').success).toBe(false);
  });

  it('rejects Infinity and NaN literals (non-string inputs reach the parser as strings; but if someone slips them in…)', () => {
    // Direct string attempts should be rejected anyway.
    expect(parse('Infinity').success).toBe(false);
    expect(parse('NaN').success).toBe(false);
  });

  it('rejects a pathologically long digit string', () => {
    // 10,000 digits — used to be accepted by regex; now refused by length cap.
    const huge = '9'.repeat(10_000);
    const r = parse(huge);
    expect(r.success).toBe(false);
  });

  it('rejects a 14+ digit value (above MAX_MONEY_DIGITS=13)', () => {
    expect(parse('10000000000000').success).toBe(false); // 14 digits
    expect(parse('99999999999999').success).toBe(false);
  });

  it('still accepts a 13-digit value (max allowed)', () => {
    expect(parse('1000000000000').success).toBe(true); // 1 trillion (13 digits)
  });

  it('still accepts large but reasonable decimal values', () => {
    // 10 integer + 2 decimal = 12 total digits, well under the cap.
    expect(parse('9999999999.99').success).toBe(true);
  });

  it('rejects a value where the decimal part pushes total digits over cap', () => {
    // 13 integer digits + 2 decimals = 15 total digits > 13 cap.
    expect(parse('1000000000000.99').success).toBe(false);
  });

  it('rejects alphabetic / punctuation noise', () => {
    expect(parse('12a.50').success).toBe(false);
    expect(parse('100,50').success).toBe(false); // comma instead of dot
    expect(parse('100_50').success).toBe(false);
    expect(parse('$100').success).toBe(false);
  });
});