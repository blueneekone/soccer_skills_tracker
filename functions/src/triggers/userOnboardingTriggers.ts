import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { getWelcomeEmailTemplate } from '../templates/emailTemplateFactory';

export const onUserProfileCleared = onDocumentUpdated(
    'users/{userId}',
    async (event) => {
        const before = event.data?.before;
        const after = event.data?.after;

        if (!before || !after || !after.exists) {
            return;
        }

        const beforeData = before.data();
        const afterData = after.data();
        const userId = event.params.userId;

        const justCleared = beforeData.isCleared === false && afterData.isCleared === true;

        // Some roles might not require a background check and they become active just by setting a role
        const roleAssigned = !beforeData.role && !!afterData.role;

        // Depending on requirements, we can trigger if either they just got cleared,
        // or they just got a role that doesn't need clearance, assuming they are effectively "ready".
        // The issue specifies: "Fire only when before.isCleared == false and after.isCleared == true
        // (or when before.role is null and after.role is defined for roles that do not require background checks)"

        // For simplicity, let's say parent doesn't need background check, others do. Or we just trust the condition.
        const rolesWithoutBgCheck = ['parent'];
        const roleAssignedWithoutBgCheck = roleAssigned && rolesWithoutBgCheck.includes(afterData.role);

        if (!justCleared && !roleAssignedWithoutBgCheck) {
            return;
        }

        const email = afterData.email;
        const role = afterData.role;
        const name = afterData.firstName || 'User';

        if (!email || !role) {
            logger.warn(`User ${userId} lacks email or role, cannot send welcome email.`);
            return;
        }

        const { subject, html } = getWelcomeEmailTemplate(role, name);

        if (!html) {
             logger.warn(`No template found for role ${role}`);
             return;
        }

        // B815 Defensive Hydration: Write to outbound collection 'mail' instead of 'users' to avoid infinite loops
        try {
            await admin.firestore().collection('mail').doc(`${userId}-welcome`).set({
                to: email,
                message: {
                    subject: subject,
                    html: html
                },
                delivery: {
                    state: 'PENDING'
                },
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            logger.info(`Scheduled welcome email for user ${userId} (role: ${role})`);
        } catch (error) {
            logger.error(`Failed to write welcome email to mail collection for user ${userId}:`, error);
        }
    }
);
