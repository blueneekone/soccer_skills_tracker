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
export const initSetupDropdowns = (teams) => {
    const clubSelect = document.getElementById('setupClubSelect');
    const teamSelect = document.getElementById('setupTeamSelect');
    const playerSelect = document.getElementById('setupPlayerDropdown');

    // 1. DATA EXTRACTION: Get unique clubs
    const uniqueClubs = [...new Set(teams.map(team => team.club || 'Independent'))];

    // 2. POPULATE CLUBS
    clubSelect.innerHTML = '<option value="">Select your club...</option>';
    uniqueClubs.forEach(club => {
        const option = document.createElement('option');
        option.value = club;
        option.textContent = club;
        clubSelect.appendChild(option);
    });

    // 3. THE TRIPWIRE: Club Selection -> Unlocks Teams
    clubSelect.addEventListener('change', (event) => {
        const selectedClub = event.target.value;

        // Reset the downstream dropdowns
        teamSelect.innerHTML = '<option value="">Select a team...</option>';
        playerSelect.innerHTML = '<option value="">Select a team first...</option>';
        teamSelect.disabled = true;
        playerSelect.disabled = true;

        if (!selectedClub) return; 

        // 4. THE FILTER: Grab only the teams belonging to the chosen club
        const filteredTeams = teams.filter(team => (team.club || 'Independent') === selectedClub);

        // Populate the Team dropdown
        filteredTeams.forEach(team => {
            const option = document.createElement('option');
            option.value = team.id;       
            option.textContent = team.name; 
            teamSelect.appendChild(option);
        });

        // Unlock the Team dropdown!
        teamSelect.disabled = false;
    });

    // 5. THE TRIPWIRE: Team Selection -> Unlocks Players
    teamSelect.addEventListener('change', async (event) => {
        const selectedTeamId = event.target.value;
        
        playerSelect.innerHTML = '<option value="">Loading players...</option>';
        playerSelect.disabled = true;

        if (!selectedTeamId) return;
        
        // --- WE WILL ADD THE PLAYER POPULATION LOGIC NEXT ---
    });
};

export const completeUserSetup = async () => {
    const tid = document.getElementById("setupTeamSelect").value;
    let pname = document.getElementById("setupPlayerDropdown").value;
    if (pname === "manual") pname = document.getElementById("setupPlayerManual").value.trim();
    if(!tid || !pname) return alert("Please select a team and player name.");
    await setDoc(doc(db, "users", auth.currentUser.email), { teamId: tid, playerName: pname, joinedAt: new Date() });
    location.reload();
};