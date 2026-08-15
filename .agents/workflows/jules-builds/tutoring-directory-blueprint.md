# 🚀 SSTracker Launch Day Expansion: Tutoring Directory Lookup Spec
## Technical Design Blueprint, Security Gates, and Commerce Pipeline
**Status**: Staged for Development (Staged on `dev` branch)  
**Target Launch Alignment**: Phase 4 Expansion  
**Authors**: Chief Software Architect, CTO, Chief Security Officer, Lead Frontend & UX Architect  

---

## 1. Executive Summary & Business Architecture (CTO)
To further capitalize on our platform's SaaS economics, we are introducing the **SSTracker Tutoring Directory Lookup Tool**. This directory acts as an internal marketplace connecting parents, coaches, and directors with specialized on-platform tutors [cite: user_query]. 

### The Core Constraints:
1. **Persona Access Matrices**:
   * 🟢 **Allowed Access**: `Director`, `Coach`, `Parent` [cite: user_query].
   * 🔴 **Explicitly Restricted**: `Admin` (Super Users), `Commissioner` (State Federation), and `Player` (Minors / SafeSport protection) [cite: user_query].
2. **Platform Containment**: Tutors must be registered and authenticated users on our platform [cite: user_query]. Searches and results must be strictly segregated **per sport** (e.g., soccer, basketball) to maintain contextual relevance and tenant boundaries [cite: user_query].
3. **Monetization (Zero-Cost Listing, Microcharge Transaction Mechanics)**: Tutors list their availability for **free** [cite: user_query]. The platform collects a **microcharge (Application Fee)** on every processed tutoring booking/payout via Stripe Connect Destination Charges [cite: user_query], replicating our club seat transactional models [cite: 424].

---

## 2. Secure Data Plane Schema (Chief Software Architect)
Tutors are represented as canonical user profiles with a specialized nested `tutorProfile` map inside the primary `/users/{email}` collection [cite: 113, 424].

```typescript
// Firestore: /users/{email} (Canonical Document)
interface UserDocument {
    uid: string;
    email: string; // Lowercase canonical ID
    displayName: string;
    role: 'director' | 'coach' | 'parent' | 'player' | 'commissioner' | 'tutor'; // Tutor role added
    sport: string; // e.g. "soccer" (containment scope)
    tutorProfile?: {
        isListingActive: boolean;
        skills: string[]; // e.g. ["shooting", "goalkeeping", "agility"]
        ratePerHour: number;
        stripeConnectedAccountId: string; // For automated payouts
        backgroundCheckStatus: 'clear' | 'pending' | 'failed'; // Checked via Checkr
    };
}

// Firestore: /clubs/{clubId}/tutoring_transactions/{transactionId}
interface TutoringTransaction {
    transactionId: string;
    parentEmail: string;
    tutorEmail: string;
    sport: string;
    amountGross: number; // e.g. 50.00
    amountFee: number;   // SSTracker Microcharge (e.g. 1.50)
    amountNet: number;   // Tutor Payout (e.g. 48.50)
    status: 'pending' | 'completed' | 'refunded';
    stripeTransferId: string;
}
```

---

## 3. Zero-Trust Security Rules & Access Gates (CSO)
To enforce the restriction preventing admins, commissioners, and players from accessing this directory, we enforce database-layer validation rules inside `firestore.rules` [cite: 428, 445].

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: Verify requesting user is a Parent, Coach, or Director
    function canAccessDirectory() {
      return request.auth != null && 
        (request.auth.token.role == "parent" || 
         request.auth.token.role == "coach" || 
         request.auth.token.role == "director");
    }

    // Helper: Grab user's sport context for strict containment matching
    function getUserSport(email) {
      return get(/databases/$(database)/documents/users/$(email)).data.sport;
    }

    // Secure Directory Rules
    match /users/{tutorEmail} {
      // Allow directory reads only if the requester is authorized and shares the same sport
      allow read: if canAccessDirectory() 
                  && resource.data.role == "tutor"
                  && resource.data.sport == getUserSport(request.auth.token.email)
                  && resource.data.tutorProfile.isListingActive == true;
                  
      // Prevent unauthorized client-side updates to tutor roles
      allow write: if false; // All listings/registration handled server-side via functions-compliance
    }
  }
}
```

---

## 4. Frontend Bento-Grid Interface (Lead Frontend & UX Architect)
The directory interface is mapped onto our high-density, responsive 12-column Bento Grid system [cite: 2, user_query] using **Svelte 5 compiler runes** [cite: 53, 516].

### The B815 Hydration Guard Integration:
To prevent unauthenticated hydration loops from hammering Firebase and exceeding our read quotas, the query subscription is strictly wrapped inside an `$effect` rune protected by a defensive guard [cite: 431, 450].

```html
<!-- src/routes/(app)/directory/+page.svelte -->
<script lang="ts">
    import { untrack } from 'svelte';
    import { db, authStore } from '$lib/firebase/client';
    import { collection, query, where, getDocs } from 'firebase/firestore';

    // Svelte 5 Reactive States
    let tutors = $state<any[]>([]);
    let isLoading = $state(true);
    let searchSkill = $state("");

    // B815 Hydration-Guarded Query Block
    $effect(() => {
        // Hydration Guard: Kill execution if auth state or DB isn't mounted yet
        if (!db || !authStore.isAuthenticated) return;

        // Perform safe fetch
        async function fetchSportTutors() {
            try {
                // Ensure sport containment matching the logged-in user's profile
                const userSport = authStore.userProfile.sport;
                const tutorsRef = collection(db, 'users');
                const q = query(
                    tutorsRef,
                    where('role', '==', 'tutor'),
                    where('sport', '==', userSport),
                    where('tutorProfile.isListingActive', '==', true)
                );

                const snapshot = await getDocs(q);
                tutors = snapshot.docs.map(doc => doc.data());
            } catch (err) {
                console.error("Directory query blocked:", err);
            } finally {
                isLoading = false;
            }
        }

        fetchSportTutors();
    });

    // Svelte 5 Derived Filter for Skills Search
    let filteredTutors = $derived(
        tutors.filter(t => 
            searchSkill === "" || 
            t.tutorProfile.skills.some(s => s.toLowerCase().includes(searchSkill.toLowerCase()))
        )
    );
</script>

<!-- 12-Column Bento Directory Layout -->
<div class="grid grid-cols-12 gap-6 p-6">
    <!-- Search Banner (Span 12) -->
    <div class="col-span-12 bg-gray-900 border border-teal-500/20 p-6 rounded-xl flex items-center justify-between">
        <h1 class="text-2xl font-bold text-white">Sport Tutoring Marketplace</h1>
        <input 
            type="text" 
            bind:value={searchSkill} 
            placeholder="Search by skill (e.g. Shooting, Agility)..." 
            class="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-teal-500 w-1/3"
        />
    </div>

    <!-- Tutor Card Loop -->
    {#if isLoading}
        <div class="col-span-12 text-center text-gray-500 py-12">Loading Marketplace Listings...</div>
    {:else}
        {#each filteredTutors as tutor}
            <!-- Individual Bento Card (Span 4 on large screens, Span 12 on mobile) -->
            <div class="col-span-12 md:col-span-4 bg-gray-900 border border-gray-800 hover:border-teal-500/50 transition p-6 rounded-xl flex flex-col justify-between h-64">
                <div>
                    <div class="flex justify-between items-start">
                        <h3 class="text-lg font-bold text-white">{tutor.displayName}</h3>
                        <!-- Nuclear Lime styling for active rates -->
                        <span class="text-[#daff0a] font-mono font-bold text-lg">${tutor.tutorProfile.ratePerHour}/hr</span>
                    </div>
                    <!-- Data Cyan typography tokens for sports tag -->
                    <span class="text-[#14b8a6] text-xs font-semibold uppercase tracking-wider block mt-1">{tutor.sport} Specialist</span>
                    
                    <!-- Skills Badge Container -->
                    <div class="flex flex-wrap gap-2 mt-4">
                        {#each tutor.tutorProfile.skills as skill}
                            <span class="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded-md">{skill}</span>
                        {/each}
                    </div>
                </div>

                <div class="flex justify-between items-center mt-6 pt-4 border-t border-gray-800">
                    <!-- Amber caution/warning token if background check is pending -->
                    {#if tutor.tutorProfile.backgroundCheckStatus !== 'clear'}
                        <span class="text-[#fbbf24] text-xs flex items-center gap-1 font-semibold">
                            ⚠ Background Check Pending
                        </span>
                    {:else}
                        <span class="text-teal-400 text-xs flex items-center gap-1 font-semibold">
                            ✔ Background Clear
                        </span>
                    {/if}
                    <button class="bg-[#14b8a6] hover:bg-[#0d9488] text-gray-950 font-bold px-4 py-2 rounded-lg text-sm transition">
                        Book Session
                    </button>
                </div>
            </div>
        {/each}
    {/if}
</div>
```

---

## 5. Payout & Microcharge Commerce Engine (CTO / CSA)
All booking payments and transaction microcharges are routed securely through a serverless function inside our **`functions-commerce`** codebase to bypass client manipulation [cite: 424].

Tutors link their bank accounts via Stripe Connect Standard/Express. When a Parent triggers a session booking, we execute a **Destination Charge** [cite: 60, 424].

```javascript
// functions-commerce/src/domains/tutoringOps.js
const functions = require('firebase-functions');

exports.bookTutoringSession = functions.https.onCall(async (data, context) => {
    // 🛡 SafeSport and Authenticated Context Verification
    const admin = await import('firebase-admin');
    if (!admin.apps.length) admin.initializeApp();
    const db = admin.firestore();
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Verification failed.');
    }

    const { tutorEmail, hours } = data;
    const parentEmail = context.auth.token.email;

    // 1. Enforce Persona Rules
    const parentSnap = await db.collection('users').doc(parentEmail).get();
    const parentRole = parentSnap.data().role;
    if (parentRole === 'player' || parentRole === 'admin' || parentRole === 'commissioner') {
        throw new functions.https.HttpsError('permission-denied', 'Unauthorized persona.');
    }

    // 2. Fetch Tutor Profile & Scopes
    const tutorSnap = await db.collection('users').doc(tutorEmail).get();
    const tutorData = tutorSnap.data();
    if (!tutorSnap.exists || tutorData.role !== 'tutor') {
        throw new functions.https.HttpsError('not-found', 'Tutor profile not found.');
    }

    // Enforce sport-containment boundaries
    if (tutorData.sport !== parentSnap.data().sport) {
        throw new functions.https.HttpsError('invalid-argument', 'Tutors are restricted to active sport branches.');
    }

    const hourlyRate = tutorData.tutorProfile.ratePerHour;
    const totalGross = hourlyRate * hours;
    
    // 3. Calculate SSTracker Transaction Microcharge (2.5% platform fee)
    const platformFee = Math.round(totalGross * 0.025 * 100); // Mapped in cents

    // 4. Dispatch Stripe Destination Charge (Microcharge remains in Platform Vault)
    const paymentIntent = await stripe.paymentIntents.create({
        amount: totalGross * 100, // Cents
        currency: 'usd',
        payment_method_types: ['card'],
        application_fee_amount: platformFee, // SSTracker Microcharge
        transfer_data: {
            destination: tutorData.tutorProfile.stripeConnectedAccountId, // Tutor Payout Account
        },
        metadata: {
            parentEmail,
            tutorEmail,
            sport: tutorData.sport
        }
    });

    return {
        clientSecret: paymentIntent.client_secret,
        amountGross: totalGross,
        platformFee: platformFee / 100
    };
});
```
