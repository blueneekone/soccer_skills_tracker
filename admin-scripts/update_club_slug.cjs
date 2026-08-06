'use strict';
const admin = require('firebase-admin');
const { resolve } = require('node:path');
const keyPath = resolve(__dirname, '..', 'serviceAccountKey.json');
const credential = admin.credential.cert(require(keyPath));
admin.initializeApp({ credential });

async function run() {
	const db = admin.firestore();
	await db.collection('clubs').doc('aggiesfc').update({
		'marketing.publicSlug': 'aggiesfc'
	});
	console.log('Updated aggiesfc publicSlug');
	process.exit(0);
}
run();
