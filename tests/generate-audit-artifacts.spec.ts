import { test, expect } from '@playwright/test';

test.describe('Generate Persona Audit Screenshots', () => {
  test('Admin OS', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('sstracker_e2e_bypass', 'true');
      localStorage.setItem('auth_token', 'mock-admin');
      window.localStorage.setItem('sstracker_e2e_bypass', 'true');
      window.localStorage.setItem('auth_state', JSON.stringify({
        isAuthenticated: true, isLoading: false, user: { uid: 'admin', email: 'admin@test.com', role: 'admin', isProfileComplete: true }
      }));
    });
    await page.goto('/admin/overview');
    await page.waitForSelector('.pd-page-root');
    await page.screenshot({ path: 'audit-artifacts/admin/overview.png' });
  });

  test('Commissioner OS', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_token', 'mock-comm');
      window.localStorage.setItem('auth_state', JSON.stringify({
        isAuthenticated: true, isLoading: false, user: { uid: 'comm', email: 'comm@test.com', role: 'commissioner', isProfileComplete: true }
      }));
    });
    await page.goto('/commissioner/dashboard');
    await page.waitForSelector('.pd-page-root');
    await page.screenshot({ path: 'audit-artifacts/commissioner/dashboard.png' });
  });

  test('Director OS', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_token', 'mock-dir');
      window.localStorage.setItem('auth_state', JSON.stringify({
        isAuthenticated: true, isLoading: false, user: { uid: 'dir', email: 'dir@test.com', role: 'director', clubId: 'aggiesfc', isProfileComplete: true }
      }));
    });
    await page.goto('/director/dashboard');
    await page.waitForSelector('.pd-page-root');
    await page.screenshot({ path: 'audit-artifacts/director/dashboard.png' });
  });

  test('Coach OS', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_token', 'mock-coach');
      window.localStorage.setItem('auth_state', JSON.stringify({
        isAuthenticated: true, isLoading: false, user: { uid: 'coach', email: 'coach@test.com', role: 'coach', clubId: 'aggiesfc', isProfileComplete: true, clearance: { status: 'cleared' } }
      }));
    });
    await page.goto('/coach/war-room');
    await page.waitForSelector('.pd-page-root');
    await page.screenshot({ path: 'audit-artifacts/coach/war-room.png' });
  });

  test('Player OS', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_token', 'mock-player');
      window.localStorage.setItem('auth_state', JSON.stringify({
        isAuthenticated: true, isLoading: false, user: { uid: 'player', email: 'player@test.com', role: 'player', clubId: 'aggiesfc', isProfileComplete: true }
      }));
    });
    await page.goto('/player/dashboard');
    await page.waitForSelector('.pd-page-root');
    await page.screenshot({ path: 'audit-artifacts/player/dashboard.png' });
  });

  test('Parent OS', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_token', 'mock-parent');
      window.localStorage.setItem('auth_state', JSON.stringify({
        isAuthenticated: true, isLoading: false, user: { uid: 'parent', email: 'parent@test.com', role: 'parent', isProfileComplete: true }
      }));
    });
    await page.goto('/parent/dashboard');
    await page.waitForSelector('.pd-page-root');
    await page.screenshot({ path: 'audit-artifacts/parent/dashboard.png' });
  });
});
