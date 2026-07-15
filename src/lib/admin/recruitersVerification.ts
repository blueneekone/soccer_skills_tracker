import { db } from '$lib/firebase.js';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { logSecurityEvent } from '$lib/utils/security.js';
import type { RecruiterRow, VerificationStatus } from './recruitersLoad.js';

export async function updateRecruiterVerification(
	row: Pick<RecruiterRow, 'id' | 'email'>,
	next: VerificationStatus,
	reason: string,
	adminEmail: string = 'super_admin'
): Promise<boolean> {
	const ref = doc(db, 'recruiters', row.id);
	const patch: Record<string, unknown> = {
		verificationStatus: next,
		verificationUpdatedAt: serverTimestamp(),
		verificationUpdatedBy: adminEmail
	};
	if (next === 'rejected') {
		patch.rejectionReason = reason.trim().slice(0, 500);
	} else {
		patch.rejectionReason = '';
	}
	await updateDoc(ref, patch);

	await logSecurityEvent(
		next === 'verified'
			? 'RECRUITER_APPROVE'
			: next === 'rejected'
				? 'RECRUITER_REJECT'
				: 'RECRUITER_RESET',
		row.email,
		reason
	);

	return true;
}
