import admin from 'firebase-admin';
import fs from 'fs';

// Initialize the default Firebase Admin SDK using production keys if VITE_USE_PROD=true
const activeProjectId = process.env.VITE_USE_PROD === 'true' ? 'soccer-skills-tracker' : 'sports-skill-tracker-dev';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: activeProjectId
  });
}

const db = admin.firestore();

async function migrate() {
  console.log(`Starting audit log migration for projectId: ${activeProjectId}...`);
  let totalMigrated = 0;

  const collectionsToMigrate = [
    { name: 'audit_logs', type: 'GENERAL_AUDIT' },
    { name: 'consent_logs', type: 'PARENTAL_CONSENT' },
    { name: 'security_audits', type: 'SECURITY_AUDIT_DUPE' },
    { name: 'messaging_audit', type: 'MESSAGING_EVENT' }
  ];

  for (const coll of collectionsToMigrate) {
    console.log(`Migrating ${coll.name}...`);
    try {
      const snap = await db.collection(coll.name).get();
      if (snap.empty) {
        console.log(`  No documents in ${coll.name}.`);
        continue;
      }
      
      const batch = db.batch();
      let count = 0;
      
      for (const doc of snap.docs) {
        const data = doc.data();
        const destRef = db.collection('security_audit').doc(doc.id);
        
        const timestamp = data.timestamp || data.createdAt || data.at || admin.firestore.FieldValue.serverTimestamp();
        const action = data.action || coll.type;
        const adminUser = data.admin || data.actorUid || data.fromEmail || data.parentEmail || data.directorEmail || data.coachEmail || 'System';
        
        const payload = {
          ...data,
          action,
          admin: adminUser,
          target: data.target || data.channelId || data.teamId || data.childEmail || 'Platform',
          details: data.details || `Migrated from ${coll.name}`,
          createdAt: timestamp,
          migrated: true
        };
        
        batch.set(destRef, payload, { merge: true });
        count++;
        totalMigrated++;
        
        if (count >= 400) {
          await batch.commit();
          count = 0;
        }
      }
      
      if (count > 0) {
        await batch.commit();
      }
      console.log(`  Migrated ${count} documents from ${coll.name}.`);
    } catch (e) {
      console.error(`  Failed to migrate ${coll.name}:`, e);
    }
  }

  console.log(`Migration complete! Total documents written to security_audit: ${totalMigrated}`);
}

migrate().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
