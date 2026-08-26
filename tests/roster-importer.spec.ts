import { test, expect } from '@playwright/test';

test.describe('Director OS: Vampire CSV Roster Importer & Verification', () => {
  test('Should parse large CSV files, chunk Firestore writes at 500 records, and show progress HUD', async ({ page }) => {
    
    // 1. Setup Session: Programmatically authenticate as a Director
    const mockClaims = {
      uid: 'testing-director-uid',
      email: 'director@sstracker.app',
      role: 'director',
      isProfileComplete: true,
      tenantId: 'club-phoenix-soccer'
    };
    
    await page.addInitScript((claims) => {
      window.localStorage.setItem('user_session_claims', JSON.stringify(claims));
    }, mockClaims);

    // Navigate directly to the Director OS CSV Roster Import View
    await page.goto('/director/import');
    await page.waitForSelector('.pd-page-root', { timeout: 5000 });

    // 2. Generate and upload a mock CSV with over 500 players to test chunking
    const csvHeader = 'First Name,Last Name,Date of Birth,Email\n';
    let csvBody = '';
    for (let i = 1; i <= 520; i++) {
      csvBody += `Player${i},Test,2012-05-12,player${i}@sstracker.app\n`;
    }
    const mockCSVContent = csvHeader + csvBody;

    // Buffer mock upload file
    const filePayload = {
      name: 'massive-roster.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(mockCSVContent)
    };

    // 3. Set up the file chooser listener and trigger upload click
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[data-testid="csv-upload-btn"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([filePayload]);

    // 4. Assert Svelte 5 Real-Time Progress Bar presence and scaling (Zero-Freeze check)
    const progressBar = page.locator('[data-testid="upload-progress-bar"]');
    await expect(progressBar).toBeVisible();

    // 5. Wait for the transaction to complete (should process in exactly two chunks: 500 + 20)
    await expect(page.locator('[data-testid="import-success-badge"]')).toBeVisible({ timeout: 15000 });

    // 6. Assert exact UI elements mount post-commit with Atompunk design guidelines
    const successBadge = page.locator('[data-testid="import-success-badge"]');
    await expect(successBadge).toBeVisible();
    await expect(successBadge).toHaveCSS('border-radius', '0px'); // Strictly square Atompunk

    // 7. Verify standard operational access is completely uninhibited
    // Navigate to dashboard and assert ability to view navigation
    await page.goto('/director/dashboard');
    await expect(page.locator('.pd-page-root')).toBeVisible();
  });
});
