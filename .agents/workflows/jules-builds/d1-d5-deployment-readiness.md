# Sprint D1-D5: Production Deployment Readiness Gates

## Execution Environment: Google Jules Cloud VM
## Governance: Run `pnpm run check` + targeted tests after each sprint. Hard gates before merge.

---

### TASK 1 — Sprint D1: Firestore Security Rules Audit

Audit `firestore.rules` (510 lines) against actual collection paths in the codebase:

Required collection paths to verify coverage:
- `/tenants/{tenantId}` — multi-tenant root
- `/devices/{deviceId}` — WebAuthn passkey storage
- `/clubs/{clubId}` — must check `request.auth.token.clubId == clubId`
- `/team_assignments/{assignmentId}` — must check `request.auth.token.role`
- `teams/{teamId}/matches` — coach write, parent read (post Car Ride lockout)
- `match_sessions` — coach write only
- `users` — PII: TTL read rules, owner-only write
- `passports` — PII: TTL read rules, owner-only write
- `consents` — legal retention: read-only after write, multi-year retention

For any missing rule, add using existing pattern:
```
match /newCollection/{docId} {
  allow read: if request.auth != null && request.auth.token.clubId == resource.data.clubId;
  allow write: if request.auth != null && request.auth.token.role == 'coach';
}
```

Verify no rule allows unauthenticated writes.

---

### TASK 2 — Sprint D2: Service Worker & PWA Caching Audit

Audit `src/service-worker.ts`:
- API endpoints and Firebase Callables → `NetworkFirst` strategy
- Hashed static assets (JS, CSS, images) → `CacheFirst` strategy
- Offline fallback: any uncached page → serve `/offline.html`

In `vite.config.js`, verify file-hash versioning is enabled:
```js
build: {
  rollupOptions: {
    output: {
      entryFileNames: 'assets/[name].[hash].js',
      chunkFileNames: 'assets/[name].[hash].js',
      assetFileNames: 'assets/[name].[hash][extname]'
    }
  }
}
```

Verify `InstallPrompt.svelte` handles `onupdatefound` service worker lifecycle event.

---

### TASK 3 — Sprint D3: End-to-End Smoke Test Suite

Create `e2e/production-smoke.spec.ts` with Playwright:

```typescript
import { test, expect } from '@playwright/test';

const PERSONAS = [
  { role: 'coach', route: '/coach', email: process.env.TEST_COACH_EMAIL! },
  { role: 'player', route: '/player', email: process.env.TEST_PLAYER_EMAIL! },
  { role: 'parent', route: '/parent', email: process.env.TEST_PARENT_EMAIL! },
  { role: 'director', route: '/director', email: process.env.TEST_DIRECTOR_EMAIL! },
];

// Test 1: Landing page renders with correct SEO meta
test('landing page has correct SEO meta', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('title')).not.toBeEmpty();
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.{50,}/);
});

// Test 2: No white screen of death on primary routes
for (const persona of PERSONAS) {
  test(`${persona.role} dashboard renders without crash`, async ({ page }) => {
    // Login flow then navigate
    await page.goto(persona.route);
    await expect(page.locator('body')).not.toContainText('Error');
    await expect(page.locator('body')).not.toContainText('undefined');
  });
}
```

Add smoke test to `.github/workflows/ci.yml`:
```yaml
- name: Run smoke tests
  run: npx playwright test e2e/production-smoke.spec.ts
```

---

### TASK 4 — Sprint D4: Environment Variable & Secret Audit

1. Verify `.env.example` contains all required keys:
   - `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_AUTH_DOMAIN`
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
   - `RESEND_API_KEY`
   - `GOOGLE_MAPS_API_KEY`
   - `CHECKR_API_KEY`
   - `OPENAI_API_KEY` or `GEMINI_API_KEY`

2. Run git log to ensure no secrets are committed:
   ```bash
   git log --all --full-history -- "**/.env" | head -20
   ```

3. Verify `firebase.json` `codebase` entries point to correct source directories for all 7 codebases.

---

### TASK 5 — Sprint D5: Legacy Test Triage

Run: `npx vitest run 2>&1 | grep "FAIL" > /tmp/failing-tests.txt`

For each of the 35 failing test files:
1. Open the file and determine the root cause
2. If failure is due to stale path references or outdated assertions → fix the test
3. If failure is unrelated to any recent change → add the file path to the exemption array at the top of `vanguardTrinity.test.ts`:
   ```typescript
   const LEGACY_EXEMPT = ['path/to/legacy.test.ts'];
   ```
4. If genuine regression → create targeted fix

Target: 0 failing test files. 100% green on `npx vitest run`.

---

### FINAL COMMIT

```bash
git config user.name "Nexus Command Automation"
git commit -am "feat(D1-D5): firestore rules audit, PWA caching, smoke tests, env audit, test triage"
git push origin head
```
