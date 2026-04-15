// se this if the My Stats page or Team Leaderboard is showing 0, or if you suspect the player's XP totals are out of sync with their actual logged workouts. This script ignores existing stat totals. It scans every single raw workout a player has ever done, recalculates the math from scratch, and generates a brand new, perfectly formatted player_stats document. //

async function rebuildEnterpriseStats() {
    console.log("Initiating Enterprise Stat Rebuild...");
    const { getFirestore, collection, getDocs, doc, writeBatch, query, where } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
    const db = getFirestore();
    const batch = writeBatch(db);

    // --- CONFIGURATION ---
    const targetTeamId = "aggiesfc_15bew";
    const targetClubId = "aggiesfc";
    // ---------------------

    const repsQuery = query(collection(db, "reps"), where("teamId", "==", targetTeamId));
    const repsSnap = await getDocs(repsQuery);

    if (repsSnap.empty) {
        return console.log("❌ No reps found! Ensure data is migrated first.");
    }

    let playerAggregates = {};
    let repCount = 0;

    repsSnap.forEach(d => {
        const data = d.data();
        const pName = data.player || "Unknown Player";

        if (!playerAggregates[pName]) {
            playerAggregates[pName] = { mins: 0, sessions: 0 };
        }

        const mins = Number(data.minutes) || Number(data.time) || 0;
        playerAggregates[pName].mins += mins;
        playerAggregates[pName].sessions += 1;
        repCount++;
    });

    let statDocsCreated = 0;
    for (const [pName, stats] of Object.entries(playerAggregates)) {
        const statRef = doc(db, "player_stats", pName);
        batch.set(statRef, {
            teamId: targetTeamId,
            clubId: targetClubId,
            playerName: pName,
            totalMins: stats.mins,
            totalWorkouts: stats.sessions,
            lastActive: new Date() 
        }, { merge: true });
        statDocsCreated++;
    }

    await batch.commit();
    console.log(`✅ SUCCESS! Scanned ${repCount} reps and rebuilt ${statDocsCreated} Player Stat profiles from scratch.`);
}
rebuildEnterpriseStats();