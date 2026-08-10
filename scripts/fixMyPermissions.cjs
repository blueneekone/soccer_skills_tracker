const admin = require('firebase-admin');
const { resolve } = require('node:path');

const keyPath = resolve(__dirname, '..', 'serviceAccountKey.json');
const credential = admin.credential.cert(require(keyPath));

admin.initializeApp({
  credential,
  // auto
});

async function run() {
    const db = admin.firestore();
    const auth = admin.auth();

    const expectedState = {
        'ecwaechtler@gmail.com': {
            role: 'super_admin',
            clubId: 'qa_launch_2026',
            teamId: 'qa_launch_2026_ppc'
        },
        'ecwaechtler+coach@gmail.com': {
            role: 'coach',
            clubId: 'aggiesfc',
            teamId: 'aggiesfc_u11_16gew'
        },
        'ecwaechtler+director@gmail.com': {
            role: 'director',
            clubId: 'aggiesfc',
            teamId: null
        },
        'ecwaechtler+parent@gmail.com': {
            role: 'parent',
            clubId: null,
            teamId: null
        }
    };

    const list = await auth.listUsers();
    
    for (const user of list.users) {
        if (!expectedState[user.email]) continue;

        console.log(`Fixing ${user.email}...`);
        const state = expectedState[user.email];

        // 1. Update Auth Claims
        const newClaims = {
            ...user.customClaims,
            role: state.role,
            clubId: state.clubId,
            teamId: state.teamId,
            isSuperAdmin: state.role === 'super_admin' ? true : undefined,
            isGlobalAdmin: state.role === 'global_admin' ? true : undefined
        };
        await auth.setCustomUserClaims(user.uid, newClaims);
        console.log(` - Claims updated`);

        // 2. Update Firestore Email Document
        const emailRef = db.collection('users').doc(user.email);
        await emailRef.set({
            uid: user.uid,
            email: user.email,
            emailLower: user.email,
            role: state.role,
            clubId: state.clubId,
            teamId: state.teamId,
            isProfileComplete: true
        }, { merge: true });
        console.log(` - Email-keyed document updated`);

        // 3. Delete UID Document (Split Brain)
        const uidRef = db.collection('users').doc(user.uid);
        const uidSnap = await uidRef.get();
        if (uidSnap.exists) {
            await uidRef.delete();
            console.log(` - Deleted rogue UID-keyed document`);
        }
    }

    console.log('Done!');
    process.exit(0);
}

run();
