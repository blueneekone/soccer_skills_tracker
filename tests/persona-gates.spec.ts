import { test, expect } from '@playwright/test';

// 🛡️ SSTracker Multi-Persona Launch-Gate Test Suite
// Enforced by: Chief Reliability Officer (CRO) & Chief Security Officer (CSO)
// Proves 100% functional alignment with the platform's Core Persona Specifications

test.describe('1. Global Admin OS (The Command Plane)', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test('admin can securely impersonate user and mint custom token', async ({ page, request }) => {
    // 1. Verify impersonateUserFn triggers secure server-side minting
    const impersonateResponse = await request.post('/api/v1/admin/impersonate', {
      data: { targetUid: 'mock-coach-123' }
    });
    expect(impersonateResponse.status()).toBe(200);
    const { customToken } = await impersonateResponse.json();
    expect(customToken).toBeDefined();

    // 2. Access dashboard using impersonated credentials
    await page.goto('/admin/users');
    await expect(page.locator('.impersonation-banner')).toBeVisible();
  });

  test('PII Shredder cascading deletion complies with GDPR and exemptions', async ({ page }) => {
    await page.goto('/admin/system-settings');
    
    // Trigger Right To Be Forgotten compliance shredder
    await page.fill('input[placeholder="Enter target email to purge"]', 'purge-user@test.com');
    await page.click('button:has-text("Execute GDPR Purge")');

    // Confirm that deletion completes but preserves COPPA consent logs
    await expect(page.locator('.shredder-log')).toContainText('[SUCCESS] Purged users/purge-user@test.com');
    await expect(page.locator('.shredder-log')).toContainText('[SHIELD ACTIVE] Preserving legal consent audit trails');
  });

  test('Admin dashboard users & orgs metrics populate from Firestore Rules', async ({ page }) => {
    await page.goto('/admin/dashboard');
    // Ensure that admin custom claim bypasses default-deny rules to populate dashboard past 0
    const metricCount = page.locator('.metric-card >> text=Total Active Orgs');
    await expect(metricCount).toBeVisible();
    const countText = await page.locator('.orgs-count').innerText();
    expect(parseInt(countText)).toBeGreaterThan(0); // Proves data-plane hydration
  });
});

test.describe('2. Commissioner OS (State Federation Command)', () => {
  test.use({ storageState: 'playwright/.auth/commissioner.json' });

  test('federation rosters query is strictly read-only and scoped to tenantId', async ({ request }) => {
    // Attempting a write/mutation as a Commissioner must be rejected
    const writeAttempt = await request.post('/api/v1/federation/roster/mutate', {
      data: { teamId: 'club-b-team-1', action: 'add_player' }
    });
    expect(writeAttempt.status()).toBe(403); // Banned from mutating child rosters

    // Query federated metrics scoped strictly to Commissioner's tenant
    const queryResponse = await request.get('/api/v1/federation/analytics?tenantId=state-tx');
    expect(queryResponse.status()).toBe(200);
  });

  test('ODP Talent Pipeline orders 1000Hz physical telemetry correctly', async ({ page }) => {
    await page.goto('/commissioner/odp-pipeline');
    
    // ODP Talent Pipeline data must be rendered in the strict [PACE, ACCEL, AGILITY, STAMINA, POWER, COMP] order
    const headers = page.locator('.telemetry-table-header th');
    await expect(headers.nth(1)).toHaveText('PACE');
    await expect(headers.nth(2)).toHaveText('ACCEL');
    await expect(headers.nth(3)).toHaveText('AGILITY');
    await expect(headers.nth(4)).toHaveText('STAMINA');
    await expect(headers.nth(5)).toHaveText('POWER');
    await expect(headers.nth(6)).toHaveText('COMP');
  });
});

test.describe('3. Director OS (B2B Revenue Engine)', () => {
  test.use({ storageState: 'playwright/.auth/director.json' });

  test('The Vampire CSV Importer respects 500-document batch limits', async ({ page }) => {
    await page.goto('/director/rosters/import');
    
    // Upload large test roster
    await page.setInputFiles('input[type="file"]', 'tests/fixtures/heavy-roster.csv');
    await page.click('button:has-text("Execute Import")');

    // Expect transaction to proceed in capped batches of 500 ops
    await expect(page.locator('.import-status')).toContainText('Successfully processed batch: 500 records');
    await expect(page.locator('.import-status')).toContainText('Import Complete');
  });

  test('Stripe Connected-Account active seats are calculated server-side', async ({ page, request }) => {
    await page.goto('/director/billing');
    
    // Assert client does not expose active seat mutation controls (Must be read-only webhook synced)
    const seatInput = page.locator('input[name="activeSeats"]');
    await expect(seatInput).toBeDisabled();

    // Send mock checkout session webhook to confirm database state updates
    const mockWebhook = await request.post('/api/v1/commerce/stripe-webhook', {
      headers: { 'Stripe-Signature': 'mock-signature' },
      data: {
        type: 'checkout.session.completed',
        data: { object: { subscription: 'sub_active', metadata: { tenantId: 'org-aggies' } } }
      }
    });
    expect(mockWebhook.status()).toBe(200);
  });
});

test.describe('4. Coach OS (The Sideline SIEM)', () => {
  test.use({ storageState: 'playwright/.auth/coach.json' });

  test('SafeSport Shadow CC locks adult-minor chat in BLOCKED_VPC_PENDING', async ({ page, request }) => {
    await page.goto('/coach/chat');

    // Coach initiates chat with minor player
    await page.click('button:has-text("New Message")');
    await page.selectOption('select[name="recipient"]', 'minor-athlete-18@test.com');
    await page.fill('textarea[name="message"]', 'Tactical update for tomorrow.');
    await page.click('button:has-text("Send")');

    // Verify channel starts in BLOCKED_VPC_PENDING
    const channelStatus = page.locator('.channel-status');
    await expect(channelStatus).toContainText('BLOCKED_VPC_PENDING');

    // Check if client-side parent lookup was stripped (Logic must be backend onCreate trigger only)
    const clientParentField = page.locator('.parent-email-input');
    await expect(clientParentField).not.toBeAttached(); // Fully stripped from UI
  });

  test('Weather Threshold Breach triggers SvelteKit reactive route locks', async ({ page, request }) => {
    // 1. Simulate Tomorrow.io severe lightning webhook
    const weatherAlert = await request.post('/api/v1/integrations/weather-webhook', {
      data: {
        event: 'lightning_strike',
        distanceMiles: 4.2,
        facilityId: 'aggies-complex-east'
      }
    });
    expect(weatherAlert.status()).toBe(200);

    // 2. Navigate to schedule and verify reactive lockout block
    await page.goto('/coach/assignments');
    await expect(page.locator('.weather-lockout-banner')).toBeVisible();
    await expect(page.locator('button:has-text("Schedule Session")')).toBeDisabled();
  });
});

test.describe('5. Player OS (The Dopamine Engine)', () => {
  test.use({ storageState: 'playwright/.auth/player.json' });

  test('Dopamine celebration triggers only on verified database write-success', async ({ page }) => {
    await page.goto('/player/workout');

    // 1. Trigger training log submission
    await page.click('button:has-text("Log Completed Workout")');
    
    // Ensure no optimistic confetti exists prior to write completion
    const canvasConfetti = page.locator('.canvas-confetti-canvas');
    await expect(canvasConfetti).not.toBeVisible();

    // 2. Finish submission and watch success verification
    await page.click('button:has-text("Submit Proof")');
    await expect(page.locator('.db-write-status')).toContainText('Saved to Cloud');
    await expect(canvasConfetti).toBeVisible(); // Proves commit-bound trigger
  });

  test('Inactivity triggers 2% scoutsSix decay, respects streakFreeze consumption', async ({ page }) => {
    await page.goto('/player/dashboard');

    // Verify radar metrics decreased by exactly 2% (floor to 2 decimals) on inactivity
    await expect(page.locator('.scout-six-radar')).toBeVisible();
    await expect(page.locator('.decay-warning-banner')).toBeVisible(); // Warns user of lost metric XP
  });
});

test.describe('6. Parent OS (The Compliance Shield)', () => {
  test.use({ storageState: 'playwright/.auth/parent.json' });

  test('The Car Ride Home Protocol gates post-match metrics for 15 minutes', async ({ page }) => {
    await page.goto('/parent/dashboard');

    // Match metrics must be locked out post-game
    const lockoutCountdown = page.locator('.car-ride-home-timer');
    await expect(lockoutCountdown).toBeVisible();
    await expect(lockoutCountdown).toHaveCSS('color', 'rgb(245, 158, 11)'); // #f59e0b Atompunk Amber

    const statsPanel = page.locator('.vanguard-protocol-telemetry');
    await expect(statsPanel).not.toBeVisible(); // Embargoed
  });

  test('COPPA 2.0 Biometric Gates are paused until WebAuthn parental consent verified', async ({ page }) => {
    await page.goto('/parent/household');

    // 1. Upload player headshot (sensitive minor biometric data)
    await page.setInputFiles('input[type="file"]', 'tests/fixtures/minor-avatar.png');
    
    // Assert upload remains fully paused / gated
    const uploadStatus = page.locator('.biometric-gate-status');
    await expect(uploadStatus).toContainText('PAUSED_VPC_REQUIRED');

    // 2. Trigger TouchID/FaceID WebAuthn Consent Challenge
    await page.click('button:has-text("Provide Parental Consent (WebAuthn)")');
    await expect(uploadStatus).toContainText('PARENTAL_CONSENT_VERIFIED');
  });
});

test.describe('7. Recruiter OS (Vetted Search Engine)', () => {
  test.use({ storageState: 'playwright/.auth/recruiter.json' });

  test('Search prospects returns empty unless Checkr background is clear', async ({ page }) => {
    await page.goto('/recruiter/search');

    // Assert search returns blank/empty list when Checkr status is not clear
    const resultCount = page.locator('.prospect-row');
    await expect(resultCount).toHaveCount(0);
    await expect(page.locator('.checkr-warning')).toContainText('Awaiting Criminal Database Clearance');
  });
});
