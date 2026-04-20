# Master Roadmap: SSTRACKER (Enterprise SaaS)

## 🟢 PHASE 1 & 2: MVP & Enterprise Architecture
**STATUS: COMPLETE.** * Secure routing, RBAC (Role-Based Access Control), multi-tenant DB normalization, Pro Coach tactics, and gamification foundation are live.

---

## 🟡 PHASE 2.5: Premium UX & Bug Squashing (WE ARE HERE)
**Goal:** Make the app look and feel like a billion-dollar product. Zero vertical scrolling on desktop, flawless Liquid Glass spacing, and premium gamification assets.

* **Sprint 2.5.1: Desktop Viewport & Spacing Polish**
  * Force `100vh` layout on desktop to eliminate vertical scrolling.
  * Consolidate multi-page dashboards into a single-icon tab system.
  * Fix CSS Bento gaps for "Team Schedule", "My Homework", "Set Selection", and "Submit Workout" areas.
  * Fix Command Center header spacing and the dark-mode text contrast bug.
  * Remove the "Position Specific" card from the dashboard.
* **Sprint 2.5.2: The Asset Upgrade & Missing Cards**
  * Replace ugly rank medals with premium SVG/CSS-styled glowing tier badges (Rookie to Legend).
  * Build the missing "My Stats" card for the Player dashboard.
  * Implement dynamic sport icons (e.g., change the football icon to a basketball or soccer ball based on the `clubId` settings).
* **Sprint 2.5.3: Super Admin Backend Fixes**
  * Fix the Cloud Functions / Firestore rules that are causing "Create License" and "Create New Sports Module" to fail.

---

## 🔵 PHASE 3: Monetization, Licensing & Sponsorships
**Goal:** Automate revenue generation and allow Directors to monetize their own clubs.

* **Sprint 3.1: Advanced Licensing Engine**
  * Expand the licensing module to support: Trial, Monthly, Quarterly, and Yearly tiers.
  * Integrate Stripe Checkout for automated billing and webhook updates.
* **Sprint 3.2: Director Sponsorship Module**
  * Add a "Sponsors" tab to the Director portal.
  * Allow Directors to upload sponsor logos and links, which will dynamically render on their players' dashboards and Pro Cards.
* **Sprint 3.3: Automated Onboarding**
  * Generate unique "Join Links" for parents/coaches.

---

## 🟣 PHASE 4: Real-Time Chat & Social Reach
**Goal:** Move from static messaging to real-time chat, and integrate enterprise marketing APIs.

* **Sprint 4.1: Real-Time Chat Platform**
  * Scrap the old "Messaging" system. 
  * Build a WebSocket or Firestore-listener based real-time Chat interface (Slack/Discord style) with channels (e.g., `#general`, `#coaches`, `#parents`).
* **Sprint 4.2: The Omnichannel Marketing Engine**
  * Integrate Chat with Broadcasting (Directors can drop a high-priority card directly into the chat).
  * **API Integrations:** Connect Meta (Facebook/Instagram) and X (Twitter) APIs.
  * Allow Directors to push a "Campaign" simultaneously to the in-app Chat AND their official Club Social Media pages.
* **Sprint 4.3: Push Notifications**
  * FCM backend triggers for chat tags and workout reminders.

---

## ⚪ PHASE 5 & 6: Premium Analytics & Scale
* **Epic 14:** Video Feedback & Storage (AWS/GCP Cloud Storage).
* **Epic 15:** Predictive Analytics & Automated PDF Scouting Reports.
* **Epic 16:** Deep Multi-Sport expansion (Dynamic XP algorithms per sport).