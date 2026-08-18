const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// The Absolute Protected List (Zero-Trust Guardrails)
const PROTECTED_COLLECTIONS = [
  'config', 
  'platform_config', 
  'sports_configs', 
  'consent_logs', 
  'consent_records'
];

// Target Admin Email or UID to protect (Update this to your actual admin email)
const PROTECTED_ADMIN_EMAIL = 'admin@sstracker.com'; 

async function shredCollection(collectionPath, batchSize = 500) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, collectionPath, resolve).catch(reject);
  });
}

async function deleteQueryBatch(db, query, collectionPath, resolve) {
  const snapshot = await query.get();

  if (snapshot.size === 0) {
    resolve();
    return;
  }

  const batch = db.batch();
  let deletedCount = 0;

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    
    // 🛡️ SURGICAL BYPASS: Protect the Admin Account
    if (collectionPath === 'users') {
      // Shield based on role or explicit email
      if (data.role === 'admin' || data.email === PROTECTED_ADMIN_EMAIL) {
        console.log(`[SHIELD ACTIVE] Preserving Admin Account: ${data.email || doc.id}`);
        return; // Skip adding to the deletion batch
      }
    }

    batch.delete(doc.ref);
    deletedCount++;
  });

  // If we skipped documents (e.g., the admin) and deleted 0 in this batch, we must break the loop
  if (deletedCount === 0) {
     resolve();
     return;
  }

  await batch.commit();

  // Recurse on the next process tick
  process.nextTick(() => {
    deleteQueryBatch(db, query, collectionPath, resolve);
  });
}

async function executePreLaunchPurge() {
  console.log("🛰️ SSTracker Nexus Command | Initializing Selective Data Shredder v2.0...");
  
  const collections = await db.listCollections();
  
  for (const collection of collections) {
    const collectionId = collection.id;
    
    if (PROTECTED_COLLECTIONS.includes(collectionId)) {
      console.log(`[SKIPPED] Protected architecture collection: ${collectionId}`);
      continue;
    }

    console.log(`[SHREDDING] Purging test data from: ${collectionId}...`);
    try {
      await shredCollection(collectionId);
      console.log(`[SUCCESS] Collection ${collectionId} processed.`);
    } catch (error) {
      console.error(`[FATAL] Error shredding ${collectionId}:`, error);
    }
  }

  console.log("✅ Database defragmentation complete. Test data purged. Admin access retained.");
}

executePreLaunchPurge();