process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ projectId: 'demo-sstracker' });

const db = getFirestore();

async function check() {
  console.log("Checking ecwaechtler+coach@gmail.com...");
  const user = await db.collection('users').doc('ecwaechtler+coach@gmail.com').get();
  console.log("User doc:", user.data());
  
  if (user.data()?.clubId) {
    const clubId = user.data().clubId;
    console.log("Club ID:", clubId);
    
    console.log("Checking club members...");
    const members = await db.collection('clubs').doc(clubId).collection('members').get();
    members.forEach(m => console.log("Member:", m.id, m.data()));
    
    console.log("Checking teams...");
    const teams = await db.collection('teams').where('clubId', '==', clubId).get();
    teams.forEach(t => {
      console.log("Team:", t.id, t.data().name);
      console.log("  Coaches:", t.data().coaches);
    });
  }
}

check().catch(console.error);
