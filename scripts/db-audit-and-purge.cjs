// 🛡️ SSTracker Enterprise Database Compliance Controller
// Executed locally with zero cloud token overhead. Standardized on Zero-Trust.

const admin = require('firebase-admin');
const fs = require('fs');

// Check if running against local Firestore emulator
if (process.env.FIRESTORE_EMULATOR_HOST) {
    console.log(`📡 Connecting to local Firestore Emulator: ${process.env.FIRESTORE_EMULATOR_HOST}`);
}

// Initialize Admin SDK with Application Default Credentials (ADC)
if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault()
    });
}

const db = admin.firestore();

async function run() {
    const args = process.argv.slice(2);
    const mode = args.includes('--purge') ? 'purge' : 'audit';
    
    // Parse target email to protect
    let keepEmail = '';
    const emailArg = args.find(arg => arg.startsWith('--keep-email='));
    if (emailArg) {
        keepEmail = emailArg.split('=')[1].toLowerCase().trim();
    }

    if (mode === 'purge' && !keepEmail) {
        console.error('❌ ERROR: You must specify --keep-email=your-admin-email@domain.com to run a purge operation!');
        process.exit(1);
    }

    console.log('================================================================');
    console.log(`🛰️  SSTracker Database Controller | Active Mode: ${mode.toUpperCase()}`);
    if (mode === 'purge') {
        console.log(`🛡️  Target Profile Shield Active: Protecting 'users/${keepEmail}' and 'Aggies FC' collection groups.`);
    }
    console.log('================================================================\n');

    try {
        // Fetch all root-level collections
        const collections = await db.listCollections();
        console.log(`🔍 Detected ${collections.length} active Firestore collections in your project database.\n`);

        for (const col of collections) {
            const colId = col.id;
            const snapshot = await col.get();
            const count = snapshot.size;

            console.log(`📂 Collection [${colId}]`);
            console.log(`   - Total Document Count: ${count}`);

            if (count > 0) {
                // Peek schema fields from first document
                const sampleDoc = snapshot.docs[0];
                const fields = Object.keys(sampleDoc.data());
                console.log(`   - Sample Fields Detected: [${fields.join(', ')}]`);
            }

            if (mode === 'purge') {
                const batch = db.batch();
                let deleteCount = 0;

                for (const doc of snapshot.docs) {
                    const docId = doc.id;
                    const docData = doc.data();

                    // PROTECT: Admin account inside 'users' collection
                    if (colId === 'users' && docId.toLowerCase() === keepEmail) {
                        console.log(`   🛡️  [SHIELDED] Preserving admin user account: users/${docId}`);
                        continue;
                    }

                    // PROTECT: Aggies FC club and linked teams/assignments
                    const clubId = docData.clubId || docData.tenantId;
                    if (clubId === 'aggies-fc' || docId === 'aggies-fc') {
                        console.log(`   🛡️  [SHIELDED] Preserving Aggies FC organizational data: ${colId}/${docId}`);
                        continue;
                    }

                    // Delete the document
                    batch.delete(doc.ref);
                    deleteCount++;
                }

                if (deleteCount > 0) {
                    await batch.commit();
                    console.log(`   🔥 [PURGED] Successfully shredded ${deleteCount} mock documents from collection [${colId}].`);
                } else {
                    console.log(`   ✔  No cleanable items remaining in collection [${colId}].`);
                }
            }
            console.log('----------------------------------------------------------------');
        }

        console.log('\n✔  Database compliance operation completed successfully.');
    } catch (err) {
        console.error('\n❌ Operational Crash:', err.message);
        console.log('\n💡 Solution Checklist:');
        console.log('  1. Ensure you have authorized your terminal via: gcloud auth application-default login');
        console.log('  2. If using local emulators, make sure the Firestore emulator is actively running.');
    }
}

run();
