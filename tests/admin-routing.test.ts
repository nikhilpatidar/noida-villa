/**
 * Regression test for the `/admin/login` infinite redirect-loop bug.
 *
 * The bug was caused by putting the authenticated admin layout one directory
 * too high: `(admin)/admin/layout.tsx` applied to every page under
 * `(admin)/admin/**`, including `/admin/login` itself. An unauthenticated
 * visit to `/admin/login` therefore ran the auth guard and redirected to
 * `/admin/login`, which ran the guard again, ad infinitum.
 *
 * The fix relocates the protected layout into a route group:
 *
 *     src/app/(admin)/admin/
 *       ├── login/                 ← public, no auth-guarded ancestor
 *       └── (protected)/          ← route group, URL-unaffected
 *           ├── layout.tsx        ← the auth guard, scoped here
 *           ├── page.tsx          ← /admin
 *           └── …
 *
 * These assertions pin the architectural invariant that makes the bug
 * class impossible to recur: a layout that performs an
 * `auth() → redirect('/admin/login')` must NOT be an ancestor of
 * `/admin/login`.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ADMIN = path.resolve(__dirname, '../src/app/(admin)/admin');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

describe('/admin/login — must not be wrapped by the authenticated layout', () => {
  it('the login route lives directly under (admin)/admin/, NOT under (protected)/', () => {
    expect(existsSync(path.join(ADMIN, 'login/page.tsx'))).toBe(true);
    expect(existsSync(path.join(ADMIN, '(protected)/login/page.tsx'))).toBe(false);
  });

  it('the authenticated layout lives under (protected)/ only — never above it', () => {
    // The layout file must exist inside the (protected) route group …
    expect(existsSync(path.join(ADMIN, '(protected)/layout.tsx'))).toBe(true);
    // … and it must NOT exist at (admin)/admin/layout.tsx, which would
    // make it an ancestor of /admin/login.
    expect(existsSync(path.join(ADMIN, 'layout.tsx'))).toBe(false);
  });

  it('every layout.tsx under (admin)/admin/ must be a descendant of (protected)/', () => {
    const layouts = walk(ADMIN).filter((f) => f.endsWith('/layout.tsx'));
    expect(layouts.length).toBeGreaterThan(0);
    for (const f of layouts) {
      // Every layout must live inside the (protected) group.
      expect(f.includes(`${path.sep}(protected)${path.sep}`)).toBe(true);
    }
  });

  it('the protected layout still redirects unauthenticated users to /admin/login', () => {
    // Defence against a future regression where someone "simplifies" by
    // moving the layout back up or removes the guard.
    const layoutSrc = readFileSync(path.join(ADMIN, '(protected)/layout.tsx'), 'utf8');
    expect(layoutSrc).toMatch(/auth\s*\(\s*\)/);
    expect(layoutSrc).toMatch(/redirect\(['"`]\/admin\/login['"`]\)/);
    // And it must still check session.user.id (not just any session).
    expect(layoutSrc).toMatch(/session\?\.user\?\.id/);
  });

  it('every admin page (besides login) lives inside (protected)/', () => {
    // Walk the protected tree and confirm that for every page.tsx we find,
    // its nearest ancestor layout.tsx is the (protected) one. Conversely,
    // no page.tsx may live in a directory that has the auth-guarded layout
    // as an ancestor but is NOT under (protected)/ — which is exactly what
    // the original bug looked like.
    const allPages = walk(ADMIN).filter((f) => f.endsWith('/page.tsx'));
    expect(allPages.length).toBeGreaterThan(0);
    for (const page of allPages) {
      // Login is allowed to live outside (protected)/ (and indeed must).
      if (page.includes(`${path.sep}login${path.sep}page.tsx`)) continue;
      // Every other page must live under (protected)/.
      expect(
        page.includes(`${path.sep}(protected)${path.sep}`),
        `expected ${page} to live under (protected)/`,
      ).toBe(true);
    }
  });

  it('the protected layout covers every non-login admin page', () => {
    // Walking from each non-login admin page upward, the first layout.tsx
    // encountered must be the protected one. This is the actual runtime
    // invariant: a child inherits its closest ancestor layout, so the
    // closest ancestor must be the protected one.
    const allPages = walk(ADMIN).filter((f) => f.endsWith('/page.tsx'));
    const nonLogin = allPages.filter((p) => !p.includes(`${path.sep}login${path.sep}page.tsx`));
    expect(nonLogin.length).toBeGreaterThan(0);
    for (const page of nonLogin) {
      let dir = path.dirname(page);
      let closestLayout: string | null = null;
      while (dir.startsWith(ADMIN)) {
        const candidate = path.join(dir, 'layout.tsx');
        if (existsSync(candidate)) {
          closestLayout = candidate;
          break;
        }
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
      }
      expect(closestLayout, `no layout found above ${page}`).not.toBeNull();
      expect(closestLayout!.includes(`${path.sep}(protected)${path.sep}`)).toBe(true);
    }
  });
});