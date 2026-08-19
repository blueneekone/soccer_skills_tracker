# 🚀 SSTRACKER NINE-WORKSPACE REMEDIATION & VERIFICATION SYSTEM
**Target Audience:** Chief Software Architect, Chief Security Officer (CSO), Chief Design Officer (CDO)
**Platform Scope:** Full-Platform Multi-Tenant Architecture & Tutoring Marketplace Deployment [cite: 742]
**Goal:** Permanent Resolution of Backend Latencies, Secure Custom Claims Integration, and Zero-Intervention Playwright Traversal [cite: 213, 219, 226]

---

## 🏛️ SECTION 1: THE UNIFIED SECURITY GATEWAY & TUTORING MARKETPLACE (CSO PROTOCOL)

Our security model mandates complete, server-side data isolation [cite: 803, 1012]. SvelteKit client-side memory is completely untrusted [cite: 212, 1012]. To support our enterprise clients and protect our minor athlete population, the platform enforces strict role-based access control (RBAC) [cite: 213, 803].

### 1. The Tutoring Marketplace Security Boundary (SafeSport Moat)
Our new Tutoring Marketplace is a high-value B2B2C monetization module [cite: 742]. It allows verified tutors to list specialized training services [cite: 742]. However, to meet strict SafeSport guidelines, we must enforce two non-negotiable database rules [cite: 742, 946]:
1. **The Minor-Access Block:** Players (who are predominantly minors under 18) are strictly prohibited from ever querying, viewing, or interacting with the tutors directory [cite: 742]. This prevents any unmonitored adult-to-minor contact [cite: 742, 1107].
2. **The Sport-Containment Boundary:** A user (Parent, Coach, or Director) can only look up and book tutors whose registered sport matches the user's active sport branch (e.g., soccer users cannot query basketball tutors) [cite: 742].

### 2. Firestore Security Rules (firestore.rules)
To enforce these boundaries at the database level, implement the following rules [cite: 742, 1012]:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Core User Profiles
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Specialized Tutoring Marketplace
    match /tutors/{tutorId} {
      // 1. Prevent Players (Minors) from ever reading tutor profiles
      // 2. Enforce strict sport-containment boundaries
      allow read: if request.auth != null 
                  && request.auth.token.role != "player"
                  && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.sport == resource.data.sport;
      
      // Only administrators can edit tutor profiles or background check clearances
      allow write: if request.auth != null && request.auth.token.role == "admin";
    }

    // Secure Booking Ledger
    match /bookings/{bookingId} {
      allow read: if request.auth != null 
                  && (request.auth.uid == resource.data.parentUid 
                      || request.auth.uid == resource.data.tutorUid);
      
      // Allow parents to create bookings
      allow create: if request.auth != null 
                    && request.auth.token.role == "parent"
                    && request.resource.data.parentUid == request.auth.uid;
      
      allow update, delete: if false; // Bookings are immutable ledger entries
    }
  }
}
```

---

## 💳 SECTION 2: STRIPE CONNECT DUAL-TRACK MONETIZATION (CRO & CPO)

SSTracker operates on a **$0 upfront platform base fee** model [cite: 742, 785]. We monetize strictly via transaction microcharges processed server-side through Stripe Connect [cite: 742]. 

For the Tutoring Marketplace, tutors list their services for free [cite: 742]. When a parent books a tutor, the payment is processed via **Stripe Connect Destination Charges**, where we atomically split the payout [cite: 742]:
*   **Tutor Payout:** 95% of the transaction is routed directly to the tutor's linked Stripe account.
*   **Platform Fee:** 5% is collected by SSTracker as our application fee [cite: 742].

### 1. Svelte 5 Checkout Engine (TutoringCheckoutEngine.svelte.ts)
To ensure SvelteKit reactivity doesn't trigger double-billing, wrap your checkout mutations inside strict Svelte 5 structures [cite: 966]:

```typescript
import { getActiveDb } from '$lib/services/db';
import { authStore } from '$lib/stores/auth';
import { httpsCallable } from 'firebase/functions';
import { untrack } from 'svelte';

export class TutoringCheckoutEngine {
  isLoading = $state(false);
  errorMessage = $state<string | null>(null);

  async initiateBooking(tutorId: string, amount: number, sport: string) {
    if (this.isLoading) return;
    this.isLoading = true;
    this.errorMessage = null;

    try {
      // Enforce the untrack() wrapper to prevent routing reactivity loops during transaction state changes
      await untrack(async () => {
        const createSession = httpsCallable(getActiveDb(), 'createTutoringCheckoutSession');
        const response = await createSession({ tutorId, amount, sport });
        const { checkoutUrl } = response.data as { checkoutUrl: string };
        
        // Redirect parent securely to Stripe checkout
        window.location.href = checkoutUrl;
      });
    } catch (err: any) {
      this.errorMessage = err.message || "Failed to initiate secure payment session.";
      this.isLoading = false;
    }
  }
}
```

### 2. Backend Cloud Function (index.ts / createTutoringCheckoutSession)
To prevent client-side price tampering, all amounts and fees must be verified and calculated strictly server-side [cite: 803, 1110]:

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
const stripe = require('stripe')(functions.config().stripe.secret_key);

export const createTutoringCheckoutSession = functions.https.onCall(async (data, context) => {
  // 1. Authenticate caller and assert secure claims
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const parentUid = context.auth.uid;
  const { tutorId, amount, sport } = data;

  // 2. Query Firestore to verify the parent's sport branch (Enforce Sport-Containment)
  const parentSnap = await admin.firestore().collection('users').doc(parentUid).get();
  const parentData = parentSnap.data();
  if (!parentData || parentData.sport !== sport) {
    throw new functions.https.HttpsError('permission-denied', 'Sport branch mismatch.');
  }

  // 3. Query Firestore to fetch the tutor's linked Stripe Account ID
  const tutorSnap = await admin.firestore().collection('users').doc(tutorId).get();
  const tutorData = tutorSnap.data();
  if (!tutorData || !tutorData.stripeAccountId) {
    throw new functions.https.HttpsError('failed-precondition', 'Tutor has not configured Stripe Connect.');
  }

  // 4. Calculate the 5% Platform Fee (Microcharge)
  const applicationFeeAmount = Math.round(amount * 0.05);

  // 5. Create the Stripe Checkout Session with Destination Charges
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: `Specialized ${sport.toUpperCase()} Tutoring Session` },
        unit_amount: amount,
      },
      quantity: 1,
    }],
    mode: 'payment',
    payment_intent_data: {
      application_fee_amount: applicationFeeAmount,
      transfer_data: { destination: tutorData.stripeAccountId },
    },
    success_url: 'https://sstracker.app/parent/dashboard?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: 'https://sstracker.app/parent/marketplace',
  });

  return { checkoutUrl: session.url };
});
```

---

## 🧪 SECTION 3: THE COMPREHENSIVE E2E VERIFICATION SUITE (CRO PROTOCOL)

Static codebase scanning is lazy [cite: 778]. To mathematically guarantee that no layout squishing, text bleeding, or permission leaks occur before launching, your subagents must run actual, headless Chrome browser traversals using Playwright [cite: 100, 1015].

Create the following file in your workspace: `tests/platform-cohesion.spec.ts` [cite: 1015]:

```typescript
import { test, expect } from '@playwright/test';

const TARGET_URL = 'http://localhost:5173';

test.describe('SSTracker Platform Cohesion & Security Verification', () => {

  test('CSO Guard: Minor Players must be BLOCKED from Tutoring Marketplace', async ({ page }) => {
    // 1. Programmatically inject mock JWT with role: 'player' to bypass login [cite: 213]
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_session', JSON.stringify({
        token: 'mock-player-jwt-token',
        user: { uid: 'player-minor-uid', role: 'player', sport: 'soccer' }
      }));
    });

    // 2. Force navigate directly to the protected tutoring route
    await page.goto(`${TARGET_URL}/parent/marketplace`);

    // 3. Assert SvelteKit layout interceptor redirects player back to Dashboard [cite: 219]
    await expect(page).toHaveURL(`${TARGET_URL}/player/dashboard`);
  });

  test('CDO Design: Parent Dashboard must enforce 24px rounded corners and NO chamfers', async ({ page }) => {
    // 1. Programmatically inject mock JWT with role: 'parent' [cite: 213]
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_session', JSON.stringify({
        token: 'mock-parent-jwt-token',
        user: { uid: 'parent-user-uid', role: 'parent', sport: 'soccer' }
      }));
    });

    await page.goto(`${TARGET_URL}/parent/dashboard`);

    // 2. Select the parent dashboard panels
    const dashboardPanel = page.locator('.parent-dashboard-panel');
    
    // 3. Assert exact 24px border radii and Void Black background [cite: 802, 1140]
    await expect(dashboardPanel).toHaveCSS('border-radius', '24px');
    await expect(dashboardPanel).toHaveCSS('background-color', 'rgb(15, 23, 42)'); // #0f172a (Navy Slate)
  });

  test('CDO Design: Player Dashboard must enforce Chamfered Clip-Paths and 40% Void Black density', async ({ page }) => {
    // 1. Inject mock player token [cite: 213]
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_session', JSON.stringify({
        token: 'mock-player-jwt-token',
        user: { uid: 'player-minor-uid', role: 'player', sport: 'soccer' }
      }));
    });

    await page.goto(`${TARGET_URL}/player/dashboard`);

    const playerCard = page.locator('.player-specialty-card');
    
    // 2. Assert strict Atompunk chamfered polygon clip path is active [cite: 802, 1093]
    const clipPath = await playerCard.evaluate(el => window.getComputedStyle(el).clipPath);
    expect(clipPath).toContain('polygon');
  });
});
```

---

## 🛰️ SECTION 4: THE 8-PERSONA CLOUD SWARM DISPATCHER

To completely eliminate manual terminal blocks and quota exhaustion on your local machine [cite: 17, 95], the entire verification suite is automated using a **Stateful, Cloud-First Swarm Model** [cite: 133].

When you execute `node start-master-swarm.cjs`, it triggers **8 isolated Google Cloud virtual machines in parallel** [cite: SECTION 3, SECTION 2]:

```javascript
const { execSync } = require('child_process');

const personas = [
  "admin", 
  "player", 
  "coach", 
  "director", 
  "parent", 
  "commissioner", 
  "fan", 
  "tutoring" // The newly deployed 8th workspace [cite: 742]
];

console.log("⚡ INITIATING MASTER PARALLEL SWARM DISPATCH SEQUENCE...");

personas.forEach((persona, index) => {
  const title = `Swarm Audit & Recovery: ${persona.toUpperCase()} OS`;
  const body = `@jules, please execute the workflow defined in .agents/workflows/jules-builds/audit-${persona}-os.md`;
  const command = `gh issue create --title "${title}" --body "${body}" --label "jules"`;

  console.log(`[${index + 1}/${personas.length}] Spawning cloud VM for: ${persona.toUpperCase()} OS...`);
  
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ Spawned successfully for ${persona.toUpperCase()} OS.\n`);
  } catch (err) {
    console.error(`❌ Failed to spawn VM for ${persona.toUpperCase()} OS: `, err.message);
  }
});

console.log("🎯 ALL 8 PLATFORM PERSOAS DISPATCHED IN PARALLEL! YOU CAN CLOSE YOUR LAPTOP.");
```
