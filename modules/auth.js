export const completeUserSetup = async () => {
    const clubSelect = document.getElementById('setupClubSelect');
    const teamSelect = document.getElementById('setupTeamSelect');
    const playerSelect = document.getElementById('setupPlayerDropdown');
    const manualEntry = document.getElementById('setupPlayerManual');

    const clubId = clubSelect? clubSelect.value : null;
    const teamId = teamSelect? teamSelect.value : null;
    const playerDropVal = playerSelect? playerSelect.value : null;
    const manualName = manualEntry? manualEntry.value.trim() : "";

    const finalName = playerDropVal === 'manual'? manualName : playerDropVal;

    if (!clubId ||!teamId ||!finalName) {
        return showAuthError("Please select a club, team, and player name.");
    }

    const btn = document.getElementById("completeSetupBtn");
    if(btn) { btn.innerText = "Saving Profile..."; btn.disabled = true; }

    try {
        const userEmail = auth.currentUser.email.toLowerCase();
        const userRef = doc(db, "users", userEmail);

        const newProfileData = {
            clubId: clubId,
            teamId: teamId,
            playerName: finalName,
            joinedAt: new Date()
        };

        // Save to database, preserving existing roles
        await setDoc(userRef, newProfileData, { merge: true });

        // 🟢 ENTERPRISE FIX: Dispatch an event to seamlessly transition the UI without reloading
        window.dispatchEvent(new CustomEvent('profileSetupComplete', { detail: newProfileData }));

    } catch (error) {
        console.error("Setup Error:", error);
        showAuthError("Error saving profile: " + error.message);
        if(btn) { btn.innerText = "Complete Setup"; btn.disabled = false; }
    }
};