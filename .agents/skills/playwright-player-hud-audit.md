---
name: playwright-player-hud-audit
description: Guide for fixing Playwright timeouts and visual hover test errors during Player OS / HUD audits.
triggers: playwright, timeout, networkidle, hover, visual-regression, player
---

# Playwright Player HUD Audit Guide

This guide explains how to properly audit the Player OS using Playwright, handling specific nuances related to the real-time Svelte 5 application.

## Resolving networkidle Timeouts

**Issue:**
Playwright tests using `page.goto(url, { waitUntil: 'networkidle' })` will time out on Player OS routes (e.g. `/player/dashboard`).

**Reason:**
Player OS routes initialize persistent, live Firestore database streams via `onSnapshot` listeners. These streams establish long-lived connections, so the network is never considered "idle" by Playwright.

**Solution: Explicit Hydration Gating**
Instead of waiting for `networkidle`, wait for `load` and then explicitly wait for the Svelte 5 components (like `.player-dossier-root` or `.vanguard-panel`) to mount and render.

```typescript
// 1. Wait only for standard load event
await page.goto(route.path, { waitUntil: 'load' });

// 2. Explicitly wait for the Player OS Root wrapper
await page.waitForSelector('.player-dossier-root, .st-bento, .pd-page-root', {
  state: 'visible',
  timeout: 10000
});

// 3. Wait for telemetry charts to render
await page.waitForSelector('.vanguard-panel, canvas', {
  state: 'visible',
  timeout: 10000
});

// 4. Wait for kinetic transition animations to settle
await page.waitForTimeout(300);
```

## Bypassing Authentication

To mock an authenticated user state quickly and reliably, inject the mock user data using `page.addInitScript` into the appropriate `localStorage` key (`sst_auth_state_v1`). Note: do not overwrite `window.__TEST_PROFILE__` if the app expects `localStorage.setItem('sst_auth_state_v1', ...)` unless you have correctly implemented the E2E bypass logic in Svelte layout.

## Testing Hover Accents on Interactive Elements

**Issue:**
Generic locators like `'a, button, .vanguard-link'` may hit elements like a utility button that resolves to an un-accented off-white color (like `slate-50` / `rgb(241, 245, 249)`), causing assertions checking for Data Cyan or Atompunk Amber to fail.

**Solution:**
1.  **Refine Locators:** Use a precise locator targeting brand-accented items:
    ```typescript
    await verifyInteractiveHoverState(page, '.vanguard-link, .pd-nav-link, .st-bento a:not(.quest-hero__cta)');
    ```
2.  **Whitelist Fallback Colors:** If you must check generic elements, whitelist the fallback color (e.g., `rgb(241, 245, 249)`).
