// Use this when you are importing an old team into the new Enterprise system. It hunts down their raw workout history (the reps collection) using their old Team ID, moves it to the new Team ID, and stamps every document with the required Club ID so the new security rules don't hide the data. //

async function migrateLegacyData() {
    console.log("Initiating Legacy Data Migration...");
    const { getFirestore, collection, getDocs, writeBatch, query, where } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
    const db = getFirestore();
    const batch = writeBatch(db);

    // --- CONFIGURATION ---
    const oldTeamId = "15bew"; // The V1 ID
    const newTeamId = "aggiesfc_15bew"; // The Enterprise ID
    const newClubId = "aggiesfc";
    // ---------------------

    let counts = { reps: 0 };

    const repsQuery = query(collection(db, "reps"), where("teamId", "==", oldTeamId));
    const repsSnap = await getDocs(repsQuery);
    
    repsSnap.forEach(d => {
        batch.update(d.ref, { 
            teamId: newTeamId, 
            clubId: newClubId 
        });
        counts.reps++;
    });

    if (counts.reps > 0) {
        await batch.commit();
    }
    
    console.log(`✅ SUCCESS! Migrated and stamped ${counts.reps} raw workout records.`);
}
migrateLegacyData();