// modules/challenges.js
import { auth, db } from "../firebase-config.js";
import { collection, query, where, getDocs, doc, setDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- 1. MODAL PROGRESSION ---
window.nextChallengeStep = (step) => {
    document.getElementById("stepIntro").classList.add("d-none");
    document.getElementById("stepCh1").classList.remove("d-none");
};

window.verifyChallengeReadiness = () => {
    const btn = document.getElementById("imReadyBtn");
    if(document.getElementById("chkWatched").checked && document.getElementById("chkReady").checked) {
        btn.disabled = false;
        btn.classList.remove("btn-disabled");
        btn.classList.add("btn-gold");
    } else {
        btn.disabled = true;
        btn.classList.remove("btn-gold");
        btn.classList.add("btn-disabled");
    }
};

// --- 2. UNLOCK & TELEPORT ---
export const finalizeChallengeUnlock = async (userProfile, getEmbedUrl) => {
    try {
        await setDoc(doc(db, "users", auth.currentUser.email), {
            hasViewedBasicsChallenge: true
        }, { merge: true });
        
        userProfile.hasViewedBasicsChallenge = true;
        document.getElementById("challengeModal").style.display = "none";
        
        const banner = document.getElementById("challenge250Banner");
        if(banner) banner.classList.add("d-none");
        
        // Stop modal videos
        ['vidIntro', 'vidCh1', 'vidCh2', 'vidCh3'].forEach(id => {
            const v = document.getElementById(id);
            if(v) v.src = "";
        });

        // Load the videos directly into the actual Challenge Page
        document.getElementById("chalPageVid1").src = getEmbedUrl("https://youtu.be/QytqZ-zieSc");
        document.getElementById("chalPageVid2").src = getEmbedUrl("https://youtu.be/p-75lxTdksg");
        document.getElementById("chalPageVid3").src = getEmbedUrl("https://youtu.be/u51A9mWPBXo");
        
        // Teleport them
        window.navigateTo('viewChallenge', null);
    } catch (err) { alert("Error unlocking challenges: " + err.message); }
};

// --- 3. DYNAMIC SCORE MATH ---
export const setupChallengeCalculators = () => {
    const setText = (id, text) => { const el = document.getElementById(id); if(el) el.innerText = text; };
    const calcTotal = (s1, s2, s3) => (parseFloat(document.getElementById(s1).value)||0) + (parseFloat(document.getElementById(s2).value)||0) + (parseFloat(document.getElementById(s3).value)||0);
    
    const bindSum = (prefix) => {
        const update = () => setText(`${prefix}Total`, calcTotal(`${prefix}Score1`, `${prefix}Score2`, `${prefix}Score3`));
        [1,2,3].forEach(i => {
            const el = document.getElementById(`${prefix}Score${i}`);
            if(el) el.addEventListener("input", update);
        });
    };

    const calcTime = () => {
        const times = [parseFloat(document.getElementById("timeScore1").value), parseFloat(document.getElementById("timeScore2").value), parseFloat(document.getElementById("timeScore3").value)].filter(t => t > 0);
        setText("timeTotal", times.length > 0 ? Math.min(...times) + "s" : "0s");
    };

    bindSum("pass");
    bindSum("shot");
    [1,2,3].forEach(i => {
        const el = document.getElementById(`timeScore${i}`);
        if(el) el.addEventListener("input", calcTime);
    });
};

// --- 4. DATABASE SUBMISSION ---
export const submitTrialScore = async (type, userProfile) => {
    let prefix = type === 'Passing' ? 'pass' : (type === 'Shooting' ? 'shot' : 'time');
    
    const skill = document.getElementById(`${prefix}SkillName`).value;
    const a1 = document.getElementById(`${prefix}Score1`).value;
    const a2 = document.getElementById(`${prefix}Score2`).value || 0;
    const a3 = document.getElementById(`${prefix}Score3`).value || 0;
    const resVal = document.getElementById(`${prefix}Total`).innerText;

    if(!skill || !a1) return alert(`Please enter the skill name and at least Score 1 for your ${type} trial.`);

    try {
        await addDoc(collection(db, "trials"), {
            player: userProfile.playerName,
            teamId: userProfile.teamId,
            type: type,
            skill: skill,
            a1: a1, a2: a2, a3: a3,
            result: resVal,
            timestamp: new Date()
        });
        
        alert(`${type} Trial Saved Successfully! Your coach has been notified.`);
        
        // Clear the form
        document.getElementById(`${prefix}SkillName`).value = "";
        document.getElementById(`${prefix}Score1`).value = "";
        document.getElementById(`${prefix}Score2`).value = "";
        document.getElementById(`${prefix}Score3`).value = "";
        document.getElementById(`${prefix}Total`).innerText = type === 'Time' ? "0s" : "0";
        
    } catch(e) { alert("Error saving trial: " + e.message); }
};