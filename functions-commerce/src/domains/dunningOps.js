/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';

const {onSchedule} = require('firebase-functions/v2/scheduler');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const REGION = 'us-east1';
const db = () => admin.firestore();

exports.dunningCommsDispatch = onSchedule(
  {
    schedule: 'every day 00:00',
    timeZone: 'America/New_York',
    region: REGION,
  },
  async (event) => {
    logger.info('Starting dunningCommsDispatch cron job.');
    const now = admin.firestore.Timestamp.now();
    const nowMs = now.toMillis();
    const msInDay = 24 * 60 * 60 * 1000;

    // We process up to 500 documents per batch
    const snap = await db()
      .collection('license_entitlements')
      .where('billing_status', '==', 'past_due')
      .limit(500)
      .get();

    let emailsQueued = 0;
    const batch = db().batch();
    let ops = 0;

    for (const doc of snap.docs) {
      const data = doc.data();
      const failedAt = data.payment_failed_at;
      if (!failedAt) continue;

      const failedAtMs = failedAt.toMillis();
      const diffMs = nowMs - failedAtMs;
      const daysPastDue = Math.floor(diffMs / msInDay);

      let sendDay = 0;
      let templateName = '';

      if (daysPastDue >= 7 && !data.dunning_day7_sent) {
        sendDay = 7;
        templateName = 'dunning_day7_lockout_warning';
      } else if (daysPastDue >= 3 && !data.dunning_day7_sent && !data.dunning_day3_sent) {
        sendDay = 3;
        templateName = 'dunning_day3_reminder';
      } else if (daysPastDue >= 1 && !data.dunning_day7_sent && !data.dunning_day3_sent && !data.dunning_day1_sent) {
        sendDay = 1;
        templateName = 'dunning_day1_failed';
      }

      if (sendDay > 0) {
        // Fetch club details for email
        let clubName = 'Your Organization';
        let adminEmail = '';
        try {
          const clubDoc = await db().collection('organizations').doc(doc.id).get();
          if (clubDoc.exists) {
            clubName = clubDoc.data().name || clubName;
          }
          const adminsSnap = await db()
            .collection('users')
            .where('clubId', '==', doc.id)
            .where('role', 'in', ['director', 'super_admin'])
            .limit(5)
            .get();
          
          if (!adminsSnap.empty) {
             const emails = adminsSnap.docs.map(u => u.data().email).filter(Boolean);
             if (emails.length > 0) adminEmail = emails.join(',');
          }
        } catch (e) {
          logger.warn(`Failed to fetch club metadata for ${doc.id}`, e);
        }

        if (adminEmail) {
          const mailRef = db().collection('mail').doc();
          batch.set(mailRef, {
            to: adminEmail.split(','),
            template: {
              name: templateName,
              data: {
                clubName,
                daysPastDue,
              }
            },
            createdAt: now,
          });
          ops++;

          // Stamp the entitlement doc to prevent duplicate emails
          batch.update(doc.ref, {
            [`dunning_day${sendDay}_sent`]: true,
            updatedAt: now,
          });
          ops++;
          emailsQueued++;
        }
      }

      if (ops >= 400) {
        await batch.commit();
        ops = 0;
      }
    }

    if (ops > 0) {
      await batch.commit();
    }

    logger.info(`dunningCommsDispatch completed. Queued ${emailsQueued} emails.`);
  }
);
