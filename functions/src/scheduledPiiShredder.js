"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduledPiiShredder = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-admin/firestore");
const v2_1 = require("firebase-functions/v2");
exports.scheduledPiiShredder = (0, scheduler_1.onSchedule)('every day 00:00', async () => {
    const db = (0, firestore_1.getFirestore)();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    async function shredCollection(collectionName) {
        const query = db
            .collection(collectionName)
            .where('lastActivityTimestamp', '<', twentyFourHoursAgo);
        let snapshot = await query.limit(500).get();
        let totalProcessed = 0;
        while (!snapshot.empty) {
            const batch = db.batch();
            snapshot.docs.forEach((doc) => {
                batch.update(doc.ref, {
                    name: 'Anonymized',
                    phone: null,
                    bio: null,
                    birthdate: null,
                    shreddedAt: new Date(),
                });
            });
            await batch.commit();
            totalProcessed += snapshot.size;
            const lastDoc = snapshot.docs[snapshot.docs.length - 1];
            snapshot = await query.startAfter(lastDoc).limit(500).get();
        }
        v2_1.logger.info(`Shredded ${totalProcessed} ghost profiles in ${collectionName}`);
    }
    try {
        await shredCollection('users');
        await shredCollection('passports');
    }
    catch (err) {
        v2_1.logger.error('Error during PII shredding:', err);
    }
});
