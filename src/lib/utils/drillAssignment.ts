import { functions } from '$lib/firebase.js';
import { httpsCallable } from 'firebase/functions';

export async function submitDrillAssignment(
	teamId: string,
	drillId: string,
	assignDue: string,
	selectedEmails: string[]
): Promise<number> {
	if (!teamId || !drillId || !assignDue || selectedEmails.length === 0) {
		throw new Error('Missing required fields for assignment.');
	}
	const due = new Date(assignDue);
	if (Number.isNaN(due.getTime())) {
		throw new Error('Pick a valid due date and time.');
	}

	const secureAssignHomework = httpsCallable(functions, 'secureAssignHomework');
	const res = await secureAssignHomework({
		teamId,
		drillId,
		dueDate: due.toISOString(),
		playerEmails: selectedEmails,
	});

	const data = (res?.data || {}) as { assignedCount?: number };
	return typeof data.assignedCount === 'number' ? data.assignedCount : selectedEmails.length;
}
