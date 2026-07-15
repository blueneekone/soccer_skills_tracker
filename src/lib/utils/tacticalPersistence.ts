import { db } from '$lib/firebase.js';
import { doc, updateDoc } from 'firebase/firestore';

export async function saveTacticalCanvas(
	clubId: string,
	facilityId: string,
	canvasJson: string
): Promise<void> {
	if (!clubId || !facilityId || !canvasJson) {
		throw new Error('Missing required arguments');
	}
	await updateDoc(doc(db, 'clubs', clubId, 'facilities', facilityId), {
		tacticalCanvasJson: canvasJson,
	});
}
