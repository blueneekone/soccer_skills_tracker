const admin = require('firebase-admin');

// Do NOT use emulator, connect to production
admin.initializeApp({ projectId: 'sports-skill-tracker-dev' });
const db = admin.firestore();

async function assignTeam() {
  try {
    const email = 'ecwaechtler+coach@gmail.com';
    const userRef = db.collection('users').doc(email);
    await userRef.set({
      clubId: 'aggiesfc',
      teamId: 'aggiesfc_u11_16gew',
      role: 'coach',
      playerName: 'Coach Eric'
    }, { merge: true });
    
    console.log(`Successfully assigned team to ${email} in production!`);
    process.exit(0);
  } catch (error) {
    console.error('Error assigning team:', error);
    process.exit(1);
  }
}

assignTeam();
