'use strict';

const {onSchedule} = require('firebase-functions/v2/scheduler');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

/** Lazy Firestore accessor — defers init until first call. */
const db = () => admin.firestore();

/**
 * Scheduled: daily sweep to chase past-due Stripe subscriptions.
 * Sends escalating reminders and downgrades to canceled after 30 days.
 */
exports.autoChaseEngine = onSchedule('every 24 hours', async () => {
  const snap = await db().collection('license_entitlements')
      .where('subscription_status', '==', 'past_due')
      .limit(100)
      .get();

  let ops = 0;
  let batch = db().batch();
  
  for (const doc of snap.docs) {
    const data = doc.data();
    const clubId = doc.id;
    const updatedAt = data.updatedAt ? data.updatedAt.toDate() : new Date();
    
    const daysPastDue = Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
    const dunningLevel = typeof data.dunningLevel === 'number' ? data.dunningLevel : 0;

    let newLevel = dunningLevel;
    let shouldCancel = false;

    if (daysPastDue >= 30) {
      shouldCancel = true;
    } else if (daysPastDue >= 14 && dunningLevel < 3) {
      newLevel = 3;
      await queueDunningReminder(batch, clubId, newLevel, daysPastDue);
    } else if (daysPastDue >= 7 && dunningLevel < 2) {
      newLevel = 2;
      await queueDunningReminder(batch, clubId, newLevel, daysPastDue);
    } else if (daysPastDue >= 3 && dunningLevel < 1) {
      newLevel = 1;
      await queueDunningReminder(batch, clubId, newLevel, daysPastDue);
    }

    if (shouldCancel) {
      batch.set(
        db().collection('license_entitlements').doc(clubId),
        {
          subscription_status: 'canceled',
          dunningLevel: 4,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: 'system:autoChaseEngine',
        },
        {merge: true}
      );
      ops++;
      
      // Flip org-side billingModel to transaction_billing (Session E)
      batch.set(
        db().collection('organizations').doc(clubId),
        {
          billingModel: 'transaction_billing',
          billingModelMigratedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        {merge: true}
      );
      ops++;
      
      logger.info(`autoChaseEngine: canceled subscription for club ${clubId} after 30 days past due`);
    } else if (newLevel !== dunningLevel) {
      batch.set(
        db().collection('license_entitlements').doc(clubId),
        {
          dunningLevel: newLevel,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: 'system:autoChaseEngine',
        },
        {merge: true}
      );
      ops++;
    }

    if (ops >= 450) {
      await batch.commit();
      batch = db().batch();
      ops = 0;
    }
  }

  if (ops > 0) {
    await batch.commit();
  }
});

async function queueDunningReminder(batch, clubId, level, daysPastDue) {
  batch.set(
    db().collection('audit_logs').doc(),
    {
      action: 'DUNNING_REMINDER_SENT',
      tenantId: clubId,
      dunningLevel: level,
      daysPastDue,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    }
  );
  logger.info(`autoChaseEngine: queued reminder level ${level} for club ${clubId} (${daysPastDue} days past due)`);
}
