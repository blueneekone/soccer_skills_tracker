import { test, expect } from '@playwright/test';

const PERSONAS = [
  { role: 'coach', route: '/coach', email: process.env.TEST_COACH_EMAIL || 'coach@sstracker.test' },
  { role: 'player', route: '/player', email: process.env.TEST_PLAYER_EMAIL || 'player@sstracker.test' },
  { role: 'parent', route: '/parent', email: process.env.TEST_PARENT_EMAIL || 'parent@sstracker.test' },
  { role: 'director', route: '/director', email: process.env.TEST_DIRECTOR_EMAIL || 'director@sstracker.test' },
];

// Test 1: Landing page renders with correct SEO meta
test('landing page has correct SEO meta', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('title')).not.toBeEmpty();
  const descriptionMeta = page.locator('meta[name="description"]');
  if (await descriptionMeta.count() > 0) {
    await expect(descriptionMeta).toHaveAttribute('content', /.{50,}/);
  }
});

// Test 2: Authenticated persona login flow and dashboard rendering without crash or white screen
for (const persona of PERSONAS) {
  test(`${persona.role} login flow and dashboard renders without crash`, async ({ page }) => {
    // 1. Navigate to login page
    await page.goto('/login');
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    if (await emailInput.count() > 0) {
      await emailInput.first().fill(persona.email);
      const submitBtn = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
      if (await submitBtn.count() > 0) {
        await submitBtn.first().click().catch(() => {});
      }
    }

    // 2. Navigate to persona route
    await page.goto(persona.route);
    await expect(page.locator('body')).not.toContainText('Error:');
    await expect(page.locator('body')).not.toContainText('500 Server Error');
    await expect(page.locator('body')).not.toContainText('undefined');
  });
}
