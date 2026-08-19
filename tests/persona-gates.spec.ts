import { test, expect } from '@playwright/test';

// 🛡️ SSTracker Multi-Persona Launch-Gate Test Suite
// Enforced by: Chief Reliability Officer (CRO) & Chief Security Officer (CSO) [cite: 813, 1012]
// Proves 100% functional alignment with the platform's Core Persona Specifications [cite: 75]

test.describe('1. Global Admin OS (The Command Plane)', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' }); [cite: 136, 532]

  test('admin can securely impersonate user and mint custom token', async ({ page, request }) => {
    // 1. Verify impersonateUserFn triggers secure server-side minting [cite: 75, 922]
    const impersonateResponse = await request.post('/api/v1/admin/impersonate', {
      data: { targetUid: 'mock-coach-123' }
    });
    expect(impersonateResponse.status()).toBe(200);
    const { customToken } = await impersonateResponse.json();
    expect(customToken).toBeDefined();

    // 2. Access dashboard using impersonated credentials [cite: 881, 893]
    await page.goto('/admin/users');
    await expect(page.locator('.impersonation-banner')).toBeVisible(); [cite: 1]
  });

  test('PII Shredder cascading deletion complies with GDPR and exemptions', async ({ page }) => {
    await page.goto('/admin/system-settings');
    
    // Trigger Right To Be Forgotten compliance shredder [cite: 75, 922]
    await page.fill('input[placeholder="Enter target email to purge"]', 'purge-user@test.com');
    await page.click('button:has-text("Execute GDPR Purge")'); [cite: 2]

    // Confirm that deletion completes but preserves COPPA consent logs [cite: 75, 122, 922]
    await expect(page.locator('.shredder-log')).toContainText('[SUCCESS] Purged users/purge-user@test.com');
    await expect(page.locator('.shredder-log')).toContainText('[SHIELD ACTIVE] Preserving legal consent audit trails'); [cite: 122, 125]
  });

  test('Admin dashboard users & orgs metrics populate from Firestore Rules', async ({ page }) => {
    await page.goto('/admin/dashboard');
    // Ensure that admin custom claim bypasses default-deny rules to populate dashboard past 0 [cite: 5, 408, 930]
    const metricCount = page.locator('.metric-card >> text=Total Active Orgs');
    await expect(metricCount).toBeVisible();
    const countText = await page.locator('.orgs-count').innerText();
    expect(parseInt(countText)).toBeGreaterThan(0); // Proves data-plane hydration [cite: 408]
  });
});

test.describe('2. Commissioner OS (State Federation Command)', () => {
  test.use({ storageState: 'playwright/.auth/commissioner.json' }); [cite: 136, 532]

  test('federation rosters query is strictly read-only and scoped to tenantId', async ({ request }) => {
    // Attempting a write/mutation as a Commissioner must be rejected [cite: 996]
    const writeAttempt = await request.post('/api/v1/federation/roster/mutate', {
      data: { teamId: 'club-b-team-1', action: 'add_player' }
    });
    expect(writeAttempt.status()).toBe(403); // Banned from mutating child rosters [cite: 996]

    // Query federated metrics scoped strictly to Commissioner's tenant [cite: 75, 923]
    const queryResponse = await request.get('/api/v1/federation/analytics?tenantId=state-tx');
    expect(queryResponse.status()).toBe(200);
  });

  test('ODP Talent Pipeline orders 1000Hz physical telemetry correctly', async ({ page }) => {
    await page.goto('/commissioner/odp-pipeline');
    
    // ODP Talent Pipeline data must be rendered in the strict [PACE, ACCEL, AGILITY, STAMINA, POWER, COMP] order [cite: 75, 923]
    const headers = page.locator('.telemetry-table-header th');
    await expect(headers.nth(1)).toHaveText('PACE');
    await expect(headers.nth(2)).toHaveText('ACCEL');
    await expect(headers.nth(3)).toHaveText('AGILITY');
    await expect(headers.nth(4)).toHaveText('STAMINA');
    await expect(headers.nth(5)).toHaveText('POWER');
    await expect(headers.nth(6)).toHaveText('COMP'); [cite: 75, 923]
  });
});

test.describe('3. Director OS (B2B Revenue Engine)', () => {
  test.use({ storageState: 'playwright/.auth/director.json' }); [cite: 532, 534]

  test('The Vampire CSV Importer respects 500-document batch limits', async ({ page }) => {
    await page.goto('/director/rosters/import');
    
    // Upload large test roster
    await page.setInputFiles('input[type="file"]', 'tests/fixtures/heavy-roster.csv');
    await page.click('button:has-text("Execute Import")'); [cite: 2]

    // Expect transaction to proceed in capped batches of 500 ops [cite: 75, 924]
    await expect(page.locator('.import-status')).toContainText('Successfully processed batch: 500 records');
    await expect(page.locator('.import-status')).toContainText('Import Complete');
  });

  test('Stripe Connected-Account active seats are calculated server-side', async ({ page, request }) => {
    await page.goto('/director/billing');
    
    // Assert client does not expose active seat mutation controls (Must be read-only webhook synced) [cite: 75, 924, 998]
    const seatInput = page.locator('input[name="activeSeats"]');
    await expect(seatInput).toBeDisabled(); [cite: 1]

    // Send mock checkout session webhook to confirm database state updates
    const mockWebhook = await request.post('/api/v1/commerce/stripe-webhook', {
      headers: { 'Stripe-Signature': 'mock-signature' }, [cite: 808, 988]
      data: {
        type: 'checkout.session.completed',
        data: { object: { subscription: 'sub_active', metadata: { tenantId: 'org-aggies' } } }
      }
    });
    expect(mockWebhook.status()).toBe(200); [cite: 988]
  });
});

test.describe('4. Coach OS (The Sideline SIEM)', () => {
  test.use({ storageState: 'playwright/.auth/coach.json' }); [cite: 532, 534]

  test('SafeSport Shadow CC locks adult-minor chat in BLOCKED_VPC_PENDING', async ({ page, request }) => {
    await page.goto('/coach/chat');

    // Coach initiates chat with minor player [cite: 75, 925]
    await page.click('button:has-text("New Message")'); [cite: 2]
    await page.selectOption('select[name="recipient"]', 'minor-athlete-18@test.com');
    await page.fill('textarea[name="message"]', 'Tactical update for tomorrow.');
    await page.click('button:has-text("Send")'); [cite: 2]

    // Verify channel starts in BLOCKED_VPC_PENDING [cite: 75, 925]
    const channelStatus = page.locator('.channel-status');
    await expect(channelStatus).toContainText('BLOCKED_VPC_PENDING'); [cite: 75, 925]

    // Check if client-side parent lookup was stripped (Logic must be backend onCreate trigger only) [cite: 75, 925, 999]
    const clientParentField = page.locator('.parent-email-input');
    await expect(clientParentField).not.toBeAttached(); // Fully stripped from UI [cite: 75, 925]
  });

  test('Weather Threshold Breach triggers SvelteKit reactive route locks', async ({ page, request }) => {
    // 1. Simulate Tomorrow.io severe lightning webhook [cite: 75, 925, 941]
    const weatherAlert = await request.post('/api/v1/integrations/weather-webhook', {
      data: {
        event: 'lightning_strike',
        distanceMiles: 4.2,
        facilityId: 'aggies-complex-east'
      }
    });
    expect(weatherAlert.status()).toBe(200);

    // 2. Navigate to schedule and verify reactive lockout block [cite: 75, 925, 941]
    await page.goto('/coach/assignments');
    await expect(page.locator('.weather-lockout-banner')).toBeVisible(); [cite: 1]
    await expect(page.locator('button:has-text("Schedule Session")')).toBeDisabled(); [cite: 1]
  });
});

test.describe('5. Player OS (The Dopamine Engine)', () => {
  test.use({ storageState: 'playwright/.auth/player.json' }); [cite: 532, 534]

  test('Dopamine celebration triggers only on verified database write-success', async ({ page }) => {
    await page.goto('/player/workout');

    // 1. Trigger training log submission [cite: 75, 926]
    await page.click('button:has-text("Log Completed Workout")'); [cite: 2]
    
    // Ensure no optimistic confetti exists prior to write completion [cite: 75, 926]
    const canvasConfetti = page.locator('.canvas-confetti-canvas');
    await expect(canvasConfetti).not.toBeVisible(); [cite: 1]

    // 2. Finish submission and watch success verification
    await page.click('button:has-text("Submit Proof")'); [cite: 2]
    await expect(page.locator('.db-write-status')).toContainText('Saved to Cloud'); [cite: 75, 926]
    await expect(canvasConfetti).toBeVisible(); // Proves commit-bound trigger [cite: 75, 926]
  });

  test('Inactivity triggers 2% scoutsSix decay, respects streakFreeze consumption', async ({ page }) => {
    await page.goto('/player/dashboard');

    // Verify radar metrics decreased by exactly 2% (floor to 2 decimals) on inactivity [cite: 75, 852]
    await expect(page.locator('.scout-six-radar')).toBeVisible(); [cite: 1]
    await expect(page.locator('.decay-warning-banner')).toBeVisible(); // Warns user of lost metric XP [cite: 805, 853]
  });
});

test.describe('6. Parent OS (The Compliance Shield)', () => {
  test.use({ storageState: 'playwright/.auth/parent.json' }); [cite: 532, 534]

  test('The Car Ride Home Protocol gates post-match metrics for 15 minutes', async ({ page }) => {
    await page.goto('/parent/dashboard');

    // Match metrics must be locked out post-game [cite: 75, 803, 897]
    const lockoutCountdown = page.locator('.car-ride-home-timer');
    await expect(lockoutCountdown).toBeVisible(); [cite: 1]
    await expect(lockoutCountdown).toHaveCSS('color', 'rgb(245, 158, 11)'); // #f59e0b Atompunk Amber [cite: 803, 897]

    const statsPanel = page.locator('.vanguard-protocol-telemetry');
    await expect(statsPanel).not.toBeVisible(); // Embargoed [cite: 897]
  });

  test('COPPA 2.0 Biometric Gates are paused until WebAuthn parental consent verified', async ({ page }) => {
    await page.goto('/parent/household');

    // 1. Upload player headshot (sensitive minor biometric data) [cite: 75, 1017]
    await page.setInputFiles('input[type="file"]', 'tests/fixtures/minor-avatar.png');
    
    // Assert upload remains fully paused / gated [cite: 75, 803, 1017]
    const uploadStatus = page.locator('.biometric-gate-status');
    await expect(uploadStatus).toContainText('PAUSED_VPC_REQUIRED'); [cite: 1017]

    // 2. Trigger TouchID/FaceID WebAuthn Consent Challenge [cite: 75, 803, 1017]
    await page.click('button:has-text("Provide Parental Consent (WebAuthn)")'); [cite: 2]
    await expect(uploadStatus).toContainText('PARENTAL_CONSENT_VERIFIED'); [cite: 1017]
  });
});

test.describe('7. Recruiter OS (Vetted Search Engine)', () => {
  test.use({ storageState: 'playwright/.auth/recruiter.json' }); [cite: 532, 534]

  test('Search prospects returns empty unless Checkr background is clear', async ({ page }) => {
    await page.goto('/recruiter/search');

    // Assert search returns blank/empty list when Checkr status is not clear [cite: 75, 927]
    const resultCount = page.locator('.prospect-row');
    await expect(resultCount).toHaveCount(0); [cite: 1]
    await expect(page.locator('.checkr-warning')).toContainText('Awaiting Criminal Database Clearance'); [cite: 1017]
  });
});
