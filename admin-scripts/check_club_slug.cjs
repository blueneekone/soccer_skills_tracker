'use strict';
const admin = require('firebase-admin');
const { resolve } = require('node:path');
const keyPath = resolve(__dirname, '..', 'serviceAccountKey.json');
const credential = admin.credential.cert(require(keyPath));
admin.initializeApp({ credential });

async function run() {
	const db = admin.firestore();
	const snap = await db.collection('clubs').get();
	snap.forEach(doc => {
		const data = doc.data();
		console.log(doc.id, '->', data.marketing?.publicSlug);
	});
	process.exit(0);
}
run();
