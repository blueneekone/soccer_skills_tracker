// modules/auth.js
import { auth, db } from "../firebase-config.js";
import { signInWithRedirect, signInWithPopup, getRedirectResult, GoogleAuthProvider, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Reusable Error UI
export const showAuthError = (msg) => {
    const errEl = document.getElementById("authErrorMsg");
    if(errEl) {
        errEl.style.display = 'block';
        errEl.innerText = msg;
    } else {
        alert(msg);
    }
};

// --- LOGIN & SIGNUP ACTIONS ---
export const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
        // Force ALL devices to use Popup. Redirect breaks iOS/Android PWAs!
        await signInWithPopup(auth, provider); 
    } catch (error) {
        showAuthError("Google Login Failed: " + error.message);
    }
};

export const checkMobileRedirect = () => {
    getRedirectResult(auth).then((result) => {
        if (result) console.log("Mobile redirect successful!");
    }).catch(e => {
        showAuthError("Google Login Failed: " + e.message);
    });
};

export const handleEmailLogin = () => {
    const e = document.getElementById("authEmail").value;
    const p = document.getElementById("authPassword").value;
    if(!e || !p) return showAuthError("Please enter both an email and password.");
    signInWithEmailAndPassword(auth, e, p).catch(err => showAuthError(err.message));
};

export const handleEmailSignup = () => {
    const e = document.getElementById("authEmail").value;
    const p = document.getElementById("authPassword").value;
    if(!e || !p) return showAuthError("Please enter an email and a password to sign up.");
    createUserWithEmailAndPassword(auth, e, p).catch(err => showAuthError(err.message));
};

export const handleLogout = async () => {
    try {
        await signOut(auth);
        window.location.replace(window.location.pathname); // Hard reload
    } catch (error) {
        alert("Logout Failed: " + error.message);
    }
};

// --- ACCOUNT SETUP ACTIONS ---
// --- ACCOUNT SETUP ACTIONS ---
export const initSetupDropdowns = (clubs, teams) => {
    const clubSelect = document.getElementById('setupClubSelect');
    const teamSelect = document.getElementById('setupTeamSelect');
    const playerSelect = document.getElementById('setupPlayerDropdown');
    const manualEntry = document.getElementById('setupManualEntry');

    if(!clubSelect || !teamSelect || !playerSelect) return;

    // 1. POPULATE CLUBS
    clubSelect.innerHTML = '<option value="">Select your club...</option>';
    (clubs || []).forEach(club => {
        const option = document.createElement('option');
        option.value = club.id;
        option.textContent = club.name;
        clubSelect.appendChild(option);
    });
    clubSelect.innerHTML += '<option value="independent">Independent / Unattached</option>';

    // 2. THE TRIPWIRE: Club Selection -> Unlocks Teams
    clubSelect.onchange = (e) => {
        const selectedClubId = e.target.value;
        
        teamSelect.innerHTML = '<option value="">Select a team...</option>';
        playerSelect.innerHTML = '<option value="">Select a team first...</option>';
        teamSelect.disabled = true;
        playerSelect.disabled = true;
        manualEntry.classList.add('d-none');

        if (!selectedClubId) return;

        // Filter Teams by Club ID
        const filteredTeams = (teams || []).filter(team => {
            if (selectedClubId === "independent") return !team.clubId;
            return team.clubId === selectedClubId;
        });

        filteredTeams.forEach(team => {
            const option = document.createElement('option');
            option.value = team.id;       
            option.textContent = team.name; 
            teamSelect.appendChild(option);
        });
        
        teamSelect.disabled = false;
    };

    // 3. THE TRIPWIRE: Team Selection -> Unlocks Players
    teamSelect.onchange = async (e) => {
        const selectedTeamId = e.target.value;
        
        playerSelect.innerHTML = '<option value="">Loading players...</option>';
        playerSelect.disabled = true;
        manualEntry.classList.add('d-none');

        if (!selectedTeamId) return;

        try {
            // Fetch the specific team's roster from the database
            const rosterSnap = await getDoc(doc(db, "rosters", selectedTeamId));
            let players = [];
            if (rosterSnap.exists()) {
                players = rosterSnap.data().players || [];
            }

            playerSelect.innerHTML = '<option value="">Select your name...</option>';
            players.sort().forEach(p => {
                const option = document.createElement('option');
                option.value = p;       
                option.textContent = p; 
                playerSelect.appendChild(option);
            });
            
            playerSelect.innerHTML += '<option value="manual">My name is not listed (Type it manually)</option>';
            playerSelect.disabled = false;
        } catch (err) {
            console.error("Error loading roster:", err);
            playerSelect.innerHTML = '<option value="">Error loading. Try again.</option>';
        }
    };

    // 4. THE TRIPWIRE: Player Selection -> Manual Entry
    playerSelect.onchange = (e) => {
        if (e.target.value === "manual") {
            manualEntry.classList.remove('d-none');
        } else {
            manualEntry.classList.add('d-none');
        }
    };
};

export const completeUserSetup = async () => {
    // 1. Grab the new IDs we created for the cascading flow
    const clubId = document.getElementById("setupClubSelect").value;
    const tid = document.getElementById("setupTeamSelect").value;
    let pname = document.getElementById("setupPlayerDropdown").value;

    // Handle the manual name entry if they chose that option
    if (pname === "manual") {
        pname = document.getElementById("setupPlayerManual").value.trim();
    }

    // 2. Comprehensive Validation
    if (!clubId || !tid || !pname) {
        return alert("Please ensure Club, Team, and Player Name are all selected.");
    }

    try {
        const userEmail = auth.currentUser.email.toLowerCase();
        
        // 3. The Database Write
        // We are now explicitly adding clubId to the profile
        await setDoc(doc(db, "users", userEmail), { 
            clubId: clubId,
            teamId: tid, 
            playerName: pname, 
            joinedAt: new Date() 
        }, { merge: true });

        console.log("Profile saved successfully for:", userEmail);
        
        // 4. Only reload ONCE the database confirms success
        window.location.reload(); 
    } catch (error) {
        console.error("Error saving profile:", error);
        alert("Failed to save profile: " + error.message);
    }
};