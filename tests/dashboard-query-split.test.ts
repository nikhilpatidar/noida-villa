/**
 * Regression tests for the Phase J dashboard query split.
 *
 * The pre-fix `loadDashboard()` did ONE unbounded
 * `prisma.transaction.findMany` with 6 includes (category, paidBy,
 * receivedBy, createdBy, expenseSplits, incomeSplits). On every /admin
 * navigation, this shipped the entire transaction history plus every
 * joined relation across the Vercel iad1 ↔ Supabase Mumbai link.
 *
 * Source inspection of every consumer proved:
 *
 *   - computeBalances, totals, monthly, categoryBreakdown only need
 *     scalar fields + split sub-fields. They do NOT need any joined
 *     relation.
 *   - The "recent" card renders only the top 20 transactions and uses
 *     category/paidBy/receivedBy/createdBy from those rows.
 *
 * The fix splits the query into two narrow selects:
 *
 *   Query A (balance) — full ACTIVE transaction history, no joins,
 *     only the scalar fields and split sub-fields.
 *   Query B (recent) — top 20 by occurredOn desc, with only the joins
 *     the recent card actually renders.
 *
 * These tests pin the architectural invariants so any future edit that
 * re-introduces the unbounded include is caught.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const DASHBOARD = path.resolve(
  __dirname,
  '../src/lib/services/dashboard.ts',
);
const dashboardSrc = readFileSync(DASHBOARD, 'utf8');

describe('loadDashboard — balance query shape', () => {
  // The balance query must NOT include any joined relation that the
  // balance / totals / monthly / categoryBreakdown consumers do not
  // actually use. Source inspection proved only scalar fields and split
  // sub-fields are consumed.
  it('uses select (not include) for the balance transactions query', () => {
    // Locate the balance findMany block. It is the one without `take: 20`.
    const candidates = dashboardSrc.match(
      /prisma\.transaction\.findMany\s*\(\s*\{[\s\S]*?\}\s*\)/g,
    );
    expect(candidates).not.toBeNull();
    const balanceQuery = candidates!.find((c) => !/take:\s*20/.test(c));
    expect(balanceQuery).toBeDefined();
    expect(balanceQuery).toMatch(/select:\s*\{/);
    expect(balanceQuery).not.toMatch(/include:\s*\{/);
  });

  it('balance query selects only the scalar fields consumed by aggregates / computeBalances', () => {
    const candidates = dashboardSrc.match(
      /prisma\.transaction\.findMany\s*\(\s*\{[\s\S]*?\}\s*\)/g,
    );
    expect(candidates).not.toBeNull();
    const balanceQuery = candidates!.find((c) => !/take:\s*20/.test(c));
    expect(balanceQuery).toBeDefined();
    for (const field of ['id', 'type', 'status', 'paidById', 'receivedById', 'amountMinor', 'occurredOn', 'categoryId']) {
      expect(balanceQuery).toMatch(new RegExp(`${field}:\\s*true`));
    }
  });

  it('balance query selects ONLY the split sub-fields consumed by computeBalances', () => {
    const candidates = dashboardSrc.match(
      /prisma\.transaction\.findMany\s*\(\s*\{[\s\S]*?\}\s*\)/g,
    );
    expect(candidates).not.toBeNull();
    const balanceQuery = candidates!.find((c) => !/take:\s*20/.test(c));
    expect(balanceQuery).toBeDefined();
    expect(balanceQuery).toMatch(/expenseSplits:\s*\{\s*select:\s*\{\s*participantId:\s*true,\s*amountMinor:\s*true\s*\}\s*\}/);
    expect(balanceQuery).toMatch(/incomeSplits:\s*\{\s*select:\s*\{\s*participantId:\s*true,\s*entitledMinor:\s*true,\s*receivedMinor:\s*true\s*\}\s*\}/);
  });

  it('balance query does NOT pull category, paidBy, receivedBy, or createdBy joins', () => {
    const candidates = dashboardSrc.match(
      /prisma\.transaction\.findMany\s*\(\s*\{[\s\S]*?\}\s*\)/g,
    );
    expect(candidates).not.toBeNull();
    const balanceQuery = candidates!.find((c) => !/take:\s*20/.test(c));
    expect(balanceQuery).toBeDefined();
    // The balance query must NOT have any of these joined relations.
    expect(balanceQuery).not.toMatch(/category:\s*\{/);
    expect(balanceQuery).not.toMatch(/paidBy:\s*\{/);
    expect(balanceQuery).not.toMatch(/receivedBy:\s*\{/);
    expect(balanceQuery).not.toMatch(/createdBy:\s*\{/);
  });

  it('balance query has NO take limit (computes over the full ACTIVE history)', () => {
    // Critical: balance calculation must continue to use the complete
    // transaction history. We didn't sneak in a take limit on the
    // balance query.
    const candidates = dashboardSrc.match(
      /prisma\.transaction\.findMany\s*\(\s*\{[\s\S]*?\}\s*\)/g,
    );
    expect(candidates).not.toBeNull();
    const balanceQuery = candidates!.find((c) => !/take:\s*20/.test(c));
    expect(balanceQuery).toBeDefined();
    expect(balanceQuery).not.toMatch(/take:\s*\d+/);
  });
});

describe('loadDashboard — recent transactions query shape', () => {
  it('the recent transactions query is bounded to 20', () => {
    const candidates = dashboardSrc.match(
      /prisma\.transaction\.findMany\s*\(\s*\{[\s\S]*?\}\s*\)/g,
    );
    expect(candidates).not.toBeNull();
    const recentQuery = candidates!.find((c) => /take:\s*20/.test(c));
    expect(recentQuery).toBeDefined();
  });

  it('recent query includes only the joined relations the recent card renders', () => {
    const candidates = dashboardSrc.match(
      /prisma\.transaction\.findMany\s*\(\s*\{[\s\S]*?\}\s*\)/g,
    );
    expect(candidates).not.toBeNull();
    const recentQuery = candidates!.find((c) => /take:\s*20/.test(c));
    expect(recentQuery).toBeDefined();
    expect(recentQuery).toMatch(/category:\s*\{\s*select:\s*\{\s*id:\s*true,\s*name:\s*true\s*\}\s*\}/);
    expect(recentQuery).toMatch(/paidBy:\s*\{\s*select:\s*\{\s*displayName:\s*true\s*\}\s*\}/);
    expect(recentQuery).toMatch(/receivedBy:\s*\{\s*select:\s*\{\s*displayName:\s*true\s*\}\s*\}/);
    expect(recentQuery).toMatch(/createdBy:\s*\{\s*select:\s*\{\s*name:\s*true\s*\}\s*\}/);
  });

  it('recent query does NOT include split relations (the recent card does not render them)', () => {
    const candidates = dashboardSrc.match(
      /prisma\.transaction\.findMany\s*\(\s*\{[\s\S]*?\}\s*\)/g,
    );
    expect(candidates).not.toBeNull();
    const recentQuery = candidates!.find((c) => /take:\s*20/.test(c));
    expect(recentQuery).toBeDefined();
    expect(recentQuery).not.toMatch(/expenseSplits:/);
    expect(recentQuery).not.toMatch(/incomeSplits:/);
  });

  it('recent slice maps from the recent query, not the balance query', () => {
    // The recent slice in the response shape must source its rows from
    // the bounded recent query (so the payload stays small) rather than
    // from the full balance transaction set.
    expect(dashboardSrc).toMatch(/const recent\s*=\s*recentTransactions\.map/);
    expect(dashboardSrc).not.toMatch(/const recent\s*=\s*balanceTransactions\.map/);
    expect(dashboardSrc).not.toMatch(/const recent\s*=\s*transactions\.slice/);
  });
});

describe('loadDashboard — settlement query is parallelized', () => {
  it('settlement.findMany is inside the Promise.all alongside the other queries', () => {
    // The Phase I report noted that the settlement.findMany was serial
    // after the Promise.all despite being independent. This pins that
    // it is now parallel.
    const promiseAll = dashboardSrc.match(/await\s+Promise\.all\s*\(\s*\[[\s\S]*?\]\s*\)/);
    expect(promiseAll).not.toBeNull();
    expect(promiseAll![0]).toMatch(/prisma\.settlement\.findMany/);
  });

  it('there is no separate await prisma.settlement.findMany outside the Promise.all', () => {
    // After splitting, the only settlement.findMany must be inside the
    // Promise.all. Any standalone fetch would re-introduce the serial
    // round-trip.
    const settlementMatches = dashboardSrc.match(/prisma\.settlement\.findMany\s*\(/g) ?? [];
    expect(settlementMatches.length).toBe(1);
  });
});

describe('loadDashboard — narrow selects on property/participant/category', () => {
  // The dashboard only uses a few fields from each of these. Narrowing
  // them reduces the payload regardless of transaction-query changes.
  it('property.findUnique selects only id, name, status, currency', () => {
    expect(dashboardSrc).toMatch(
      /prisma\.property\.findUnique\s*\(\s*\{[\s\S]*?select:\s*\{\s*id:\s*true,\s*name:\s*true,\s*status:\s*true,\s*currency:\s*true\s*\}/,
    );
  });

  it('participant.findMany selects only id, displayName, kind', () => {
    expect(dashboardSrc).toMatch(
      /prisma\.participant\.findMany\s*\(\s*\{[\s\S]*?select:\s*\{\s*id:\s*true,\s*displayName:\s*true,\s*kind:\s*true\s*\}/,
    );
  });

  it('category.findMany selects only id, name', () => {
    expect(dashboardSrc).toMatch(
      /prisma\.category\.findMany\s*\(\s*\{[\s\S]*?select:\s*\{\s*id:\s*true,\s*name:\s*true\s*\}/,
    );
  });
});

describe('dashboard output shape — DashboardView contract', () => {
  // The DashboardView consumes: data.property.{name, status},
  // data.totals.{incomeMinor, expenseMinor, netProfitMinor, outstandingMinor},
  // data.monthly[*].{month, incomeMinor, expenseMinor, netMinor},
  // data.categoryBreakdown.slice(0, 8)[*].{name, amountMinor},
  // data.participants[*].{id, name, kind, netMinor},
  // data.recent[*].{id, type, description, amountMinor, occurredOn,
  //   category.{id, name}, paidByName, receivedByName, createdByName}.
  //
  // loadDashboard must still return all of these with the same shape.
  it('returns property with id, name, status, currency', () => {
    expect(dashboardSrc).toMatch(
      /property:\s*\{\s*id:\s*property\.id,\s*name:\s*property\.name,\s*status:\s*property\.status,\s*currency:\s*property\.currency\s*\}/,
    );
  });

  it('returns totals with incomeMinor, expenseMinor, netProfitMinor, outstandingMinor', () => {
    // The return-object's `totals` block (the one we ship to the client).
    expect(dashboardSrc).toMatch(/incomeMinor:\s*totalIncome/);
    expect(dashboardSrc).toMatch(/expenseMinor:\s*totalExpense/);
    expect(dashboardSrc).toMatch(/netProfitMinor:\s*totalIncome\s*-\s*totalExpense/);
    expect(dashboardSrc).toMatch(/outstandingMinor:\s*outstanding/);
  });

  it('returns recent entries with all fields DashboardView renders', () => {
    expect(dashboardSrc).toMatch(/category:\s*t\.category\s*\?\s*\{\s*id:\s*t\.category\.id,\s*name:\s*t\.category\.name\s*\}\s*:\s*null/);
    expect(dashboardSrc).toMatch(/paidByName:\s*t\.paidBy\?\.displayName/);
    expect(dashboardSrc).toMatch(/receivedByName:\s*t\.receivedBy\?\.displayName/);
    expect(dashboardSrc).toMatch(/createdByName:\s*t\.createdBy\?\.name/);
  });
});