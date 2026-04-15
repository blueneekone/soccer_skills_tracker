// Use this if a Coach or Player is stuck on the Setup Screen, or if their account is missing the proper Enterprise tags (clubId and teamId). This forcefully binds an email address to a specific team and grants them Coach privileges. //

async function forceAccountAlignment() {
    console.log("Initiating Account Alignment...");
    const { getFirestore, doc, writeBatch } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
    const db = getFirestore();
    const batch = writeBatch(db);

    // --- CONFIGURATION ---
    const targetEmail = "ewaechtler@outlook.com"; // Change to the target user's email
    const targetTeamId = "aggiesfc_15bew";
    const targetClubId = "aggiesfc";
    const targetRole = "coach"; // "coach" or "player"
    // ---------------------

    batch.set(doc(db, "users", targetEmail), {
        role: targetRole,
        teamId: targetTeamId,
        clubId: targetClubId
    }, { merge: true });
    
    if (targetRole === "coach") {
        batch.set(doc(db, "coach_lookup", targetEmail), {
            role: targetRole,
            teamId: targetTeamId,
            clubId: targetClubId
        }, { merge: true });
    }

    await batch.commit();
    console.log(`✅ SUCCESS! ${targetEmail} forcefully bound to ${targetTeamId} as ${targetRole}.`);
}
forceAccountAlignment();