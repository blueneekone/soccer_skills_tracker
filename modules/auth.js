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
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    try {
        if (isMobile) signInWithRedirect(auth, provider); 
        else await signInWithPopup(auth, provider); 
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
export const initSetupDropdowns = (globalTeams) => {
    const sel = document.getElementById("setupTeamSelect");
    if(!sel) return;
    sel.innerHTML = '<option value="">Select Team...</option>';
    globalTeams.forEach(t => { const o = document.createElement("option"); o.value = t.id; o.textContent = t.name; sel.appendChild(o); });
    
    sel.onchange = async (e) => {
        const tid = e.target.value;
        const pSel = document.getElementById("setupPlayerDropdown");
        pSel.disabled = false;
        pSel.innerHTML = '<option value="">Loading Roster...</option>';
        const snap = await getDoc(doc(db, "rosters", tid));
        pSel.innerHTML = '<option value="">Select Your Child...</option>';
        if(snap.exists() && snap.data().players) {
            snap.data().players.sort().forEach(p => { const o = document.createElement("option"); o.value=p; o.textContent=p; pSel.appendChild(o); });
        }
        pSel.innerHTML += '<option value="manual">Not Listed? (Type Name)</option>';
    };
    
    const drop = document.getElementById("setupPlayerDropdown");
    if(drop) drop.onchange = (e) => { document.getElementById("setupManualEntry").style.display = (e.target.value === "manual") ? "block" : "none"; };
};

export const completeUserSetup = async () => {
    const tid = document.getElementById("setupTeamSelect").value;
    let pname = document.getElementById("setupPlayerDropdown").value;
    if (pname === "manual") pname = document.getElementById("setupPlayerManual").value.trim();
    if(!tid || !pname) return alert("Please select a team and player name.");
    await setDoc(doc(db, "users", auth.currentUser.email), { teamId: tid, playerName: pname, joinedAt: new Date() });
    location.reload();
};