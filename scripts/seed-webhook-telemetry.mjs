import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Load service account from local environment if available, or rely on application default credentials
let serviceAccount;
try {
  // If there's a local service account key for dev (optional)
  const keyPath = path.resolve(process.cwd(), 'service-account.json');
  if (fs.existsSync(keyPath)) {
    serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  }
} catch (e) {
  // Ignore
}

if (serviceAccount) {
  initializeApp({ credential: cert(serviceAccount) });
} else {
  initializeApp(); // Use Application Default Credentials
}

const db = getFirestore();

async function run() {
  console.log('Seeding webhook telemetry data into webhook_events...');

  const stripePayload = {
    id: `evt_stripe_mock_${Date.now()}`,
    type: 'checkout.session.completed',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: 'cs_test_mock_123',
        object: 'checkout.session',
        amount_total: 25000,
        currency: 'usd',
        customer: 'cus_mock_456',
        payment_status: 'paid',
        status: 'complete'
      }
    }
  };

  const checkrPayload = {
    id: `evt_checkr_mock_${Date.now()}`,
    type: 'checkr.report.completed',
    created_at: new Date().toISOString(),
    data: {
      object: {
        id: '4b34b7f75f7e',
        object: 'report',
        status: 'clear',
        candidate_id: 'e86b039cb011',
        package: 'tasker_standard'
      }
    }
  };

  const batch = db.batch();
  const colRef = db.collection('webhook_events');

  // Stripe Event
  const stripeRef = colRef.doc(`stripe_${Date.now()}`);
  batch.set(stripeRef, {
    source: 'stripe',
    eventType: 'checkout.session.completed',
    payload: stripePayload,
    status: 'processed',
    createdAt: FieldValue.serverTimestamp(),
    processedAt: FieldValue.serverTimestamp()
  });

  // Checkr Event
  const checkrRef = colRef.doc(`checkr_${Date.now()}`);
  batch.set(checkrRef, {
    source: 'checkr',
    eventType: 'checkr.report.completed',
    payload: checkrPayload,
    status: 'processing',
    createdAt: FieldValue.serverTimestamp(),
    processedAt: null
  });

  await batch.commit();
  console.log('✅ Webhook telemetry seeded successfully.');
}

run().catch(console.error);
