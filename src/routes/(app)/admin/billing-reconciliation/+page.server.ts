import { fail } from '@sveltejs/kit';
// @ts-ignore
import { env } from '$env/dynamic/public';

export const actions = {
  forceSync: async ({ request, locals }) => {
    // Universal Admin Privilege Check
    // @ts-ignore
    if (locals.user?.role !== 'admin') {
      return fail(403, { message: 'Unauthorized: Admin privileges required.' });
    }

    const formData = await request.formData();
    const clubId = formData.get('clubId')?.toString();
    const activeSeats = formData.get('activeSeats')?.toString();

    if (!clubId || !activeSeats) {
      return fail(400, { message: 'Missing clubId or activeSeats parameter.' });
    }

    // The Dry-Run Switch: Prevent active execution, but simulate clean transactions
    if (env.PUBLIC_USE_FIREBASE_EMULATOR === 'true' || process.env.NODE_ENV !== 'production') {
      console.log(`[DRY-RUN] Simulating Stripe entitlement sync for ${clubId} to ${activeSeats} seats`);

      // Simulate Stripe API delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      return {
        success: true,
        dryRun: true,
        syncedClubId: clubId,
        syncedSeats: parseInt(activeSeats),
        auditLog: `[DRY-RUN SUCCESS] Stripe metadata synced for ${clubId}. Seat capacity forced to ${activeSeats}. No live Stripe mutation occurred.`
      };
    }

    // Production Fallback: Securely log that the feature is locked during launch-day SLA
    return fail(501, {
      message: 'Feature Locked: Live Stripe Entitlement overwrites are restricted during the launch window to prevent ledger corruption. Adjust via Stripe Dashboard directly.'
    });
  }
};
