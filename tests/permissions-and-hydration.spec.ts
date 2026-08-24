import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Permissions and Hydration', () => {
	test('freeze protection - quick layout mount', async ({ page }) => {
		// Mock out VITE_E2E_BYPASS_AUTH hydration mechanism
		await page.goto('/login');

		const start = Date.now();
		// Setting up local storage to trigger hydration guard
		await page.evaluate(() => {
			window.localStorage.setItem('sstracker_e2e_bypass', 'true');
			window.localStorage.setItem('auth_state', JSON.stringify({
				uid: 'director123',
				role: 'director',
				email: 'director@test.com',
				clubId: 'test_club_1',
				isProfileComplete: true
			}));
		});

		await page.goto('/director/dashboard');
		const end = Date.now();

		// Assert that navigating to /login and loading Director OS dashboard completes in under 800ms
		expect(end - start).toBeLessThan(800);
	});

	test('organization sandboxing - server delegated coach creation', async () => {
		// Verifying that the codebase uses the secure Cloud Function rather than raw updateDoc
		// This evaluates the codebase integrity statically
		const editAdminModalCode = fs.readFileSync(path.resolve('src/lib/components/admin/EditAdminModal.svelte'), 'utf-8');
		const usersPageCode = fs.readFileSync(path.resolve('src/routes/(app)/admin/organizations/[clubId]/users/+page.svelte'), 'utf-8');

		expect(editAdminModalCode).toContain("httpsCallable(functions, 'updateUserRole')");
		expect(usersPageCode).toContain("httpsCallable(functions, 'updateUserRole')");

		// Expect the role field to have been decoupled from the general patch object.
		expect(editAdminModalCode).toContain("const { role: newRole, roleUpdatedAt, roleUpdatedBy, ...otherPatchFields } = patch;");
		expect(editAdminModalCode).toContain("if (Object.keys(otherPatchFields).length > 0) {");
		expect(editAdminModalCode).toContain("updateDoc(doc(db, 'users', admin.id), otherPatchFields);");
	});

	test('bidirectional mapping - coach and team records', async () => {
		// Verify that the EditAdminModal contains the new dropdown for coach team binding
		const editAdminModalCode = fs.readFileSync(path.resolve('src/lib/components/admin/EditAdminModal.svelte'), 'utf-8');
		expect(editAdminModalCode).toContain("for=\"eam-team\">Assign Team");
		expect(editAdminModalCode).toContain("httpsCallable(functions, 'directorInviteCoach')");

		// Verify the new [ TACTICS HUB ] route exists and implements binding
		const tacticsHubCode = fs.readFileSync(path.resolve('src/routes/(app)/coach/tactics-hub/+page.svelte'), 'utf-8');
		expect(tacticsHubCode).toContain("[ ACTIVE TEAM BINDING ]");
		expect(tacticsHubCode).toContain("if (!db || !authStore.isAuthenticated) return;");
		expect(tacticsHubCode).toContain("httpsCallable(functions, 'directorInviteCoach')");
	});
});
