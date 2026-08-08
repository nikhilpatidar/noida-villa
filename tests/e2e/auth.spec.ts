import { test, expect } from '@playwright/test';

/**
 * E2E tests require a running database + seeded admin user.
 * They are not run by `npm run test`. Run with `npm run test:e2e`.
 *
 * These tests focus on authentication and authorization paths.
 */
test.describe('authentication', () => {
  test('admin login form is accessible', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.locator('input[name=email]')).toBeVisible();
    await expect(page.locator('input[name=password]')).toBeVisible();
  });

  test('invalid login shows error and does not redirect to /admin', async ({ page }) => {
    await page.goto('/admin/login');
    await page.fill('input[name=email]', 'nobody@example.com');
    await page.fill('input[name=password]', 'wrongpassword1');
    await page.click('button[type=submit]');
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByText(/wrong email or password/i)).toBeVisible();
  });

  test('unauthenticated /admin redirects to /admin/login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});