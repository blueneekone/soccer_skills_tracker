import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithRedirect, GoogleAuthProvider, onAuthStateChanged, signOut } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, orderBy, limit, enableIndexedDbPersistence } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { dbData } from "./data.js";

const COACH_EMAIL = "ecwaechtler@gmail.com"; 

const firebaseConfig = {
  apiKey: "AIzaSyDNmo6dACOLzOSkC93elMd5yMbFmsUXO1w",
  authDomain: "soccer-skills-tracker.firebaseapp.com",
  projectId: "soccer-skills-tracker",
  storageBucket: "soccer-skills-tracker.firebasestorage.app",
  messagingSenderId: "884044129977",
  appId: "1:884044129977:web:47d54f59c891340e505d68"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

enableIndexedDbPersistence(db).catch((err) => console.log(err.code));

// REFS
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const appUI = document.getElementById("appUI");
const loginUI = document.getElementById("loginUI");
const bottomNav = document.getElementById("bottomNav");
const viewTracker = document.getElementById("viewTracker");
const viewStats = document.getElementById("viewStats");
const viewCoach = document.getElementById("viewCoach");
const navTrack = document.getElementById("navTrack");
const navStats = document.getElementById("navStats");
const navCoach = document.getElementById("navCoach");
const positionSelect = document.getElementById("positionSelect");

// AUTH
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginUI.style.display = "none";
    appUI.style.display = "block";
    bottomNav.style.display = "flex";
    document.getElementById("coachName").textContent = user.displayName;
    if(user.email.toLowerCase() === COACH_EMAIL.toLowerCase()) navCoach.style.display = "flex";
    loadStats(); 
  } else {
    loginUI.style.display = "block";
    appUI.style.display = "none";
    bottomNav.style.display = "none";
  }
});

loginBtn.addEventListener("click", () => {
  const provider = new GoogleAuthProvider();
  signInWithRedirect(auth, provider);
});
logoutBtn.addEventListener("click", () => {
    signOut(auth).then(() => location.reload());
});

// NAV
function switchTab(tab) {
    [viewTracker, viewStats, viewCoach].forEach(v => v.style.display = "none");
    [navTrack, navStats, navCoach].forEach(n => n.classList.remove("active"));
    
    if (tab === 'track') { viewTracker.style.display = "block"; navTrack.classList.add("active"); }
    if (tab === 'stats') { viewStats.style.display = "block"; navStats.classList.add("active"); loadStats(); }
    if (tab === 'coach') { viewCoach.style.display = "block"; navCoach.classList.add("active"); loadCoachDashboard(); }
}
navTrack.addEventListener("click", () => switchTab('track'));
navStats.addEventListener("click", () => switchTab('stats'));
navCoach.addEventListener("click", () => switchTab('coach'));

// INIT DROPDOWNS & LISTS
if(positionSelect.options.length === 0) {
    dbData.positions.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.name;
        positionSelect.appendChild(opt);
    });
}
positionSelect.addEventListener("change", updateTacticalSkills);

// LOAD FOUNDATION SKILLS (Always visible)
const foundationList = document.getElementById("foundationList");
if(foundationList.innerHTML === "") {
    const foundations = dbData.foundationSkills.filter(s => s.type === "foundation");
    foundations.forEach(s => {
        const chip = document.createElement("div");
        chip.className = "chip";
        chip.textContent = s.name;
        chip.addEventListener("click", () => selectSkill(chip, s));
        foundationList.appendChild(chip);
    });
}

// TACTICAL SKILLS (Filtered)
const pressureChips = document.getElementById("pressure");
pressureChips.addEventListener("click", (e) => {
    if(e.target.classList.contains("chip")) {
        Array.from(pressureChips.children).forEach(c => c.classList.remove("active"));
        e.target.classList.add("active");
        updateTacticalSkills();
    }
});

function updateTacticalSkills() {
    const tacticalDiv = document.getElementById("skillSuggestions");
    tacticalDiv.innerHTML = "";
    
    const currentPressure = pressureChips.querySelector(".active")?.dataset.val;
    const currentPos = positionSelect.value;

    const tacticalSkills = dbData.foundationSkills.filter(s => {
        if(s.type !== "tactical") return false;
        const pressureMatch = (!currentPressure) ? true : s.pressure.includes(currentPressure);
        const posMatch = s.positions.includes("all") || s.positions.includes(currentPos);
        return pressureMatch && posMatch;
    });

    tacticalSkills.forEach(s => {
        const chip = document.createElement("div");
        chip.className = "chip";
        chip.textContent = s.name;
        chip.addEventListener("click", () => selectSkill(chip, s));
        tacticalDiv.appendChild(chip);
    });
}

// UNIVERSAL SKILL SELECTOR (Handles click for both lists)
function selectSkill(chipElement, skillData) {
    // Clear all active chips in both lists
    document.querySelectorAll(".chip.active").forEach(c => {
        if(c.parentElement.id === "pressure" || c.parentElement.id === "outcome") return; // Don't clear filters
        c.classList.remove("active");
    });
    
    chipElement.classList.add("active");
    
    const container = document.getElementById("watchBtnContainer");
    const title = document.getElementById("drillRecommendation");
    const img = document.getElementById("drillImage");
    const btn = document.getElementById("watchVideoBtn");
    const modal = document.getElementById("videoModal");
    const videoPlayer = document.getElementById("videoPlayer");

    container.style.display = "block";
    title.innerHTML = `Selected: ${skillData.drill}`;
    
    if(skillData.image) {
        img.src = skillData.image;
        img.style.display = "block";
    } else {
        img.style.display = "none";
    }

    if(skillData.video) {
        btn.style.display = "block";
        btn.onclick = () => {
            videoPlayer.src = skillData.video;
            modal.style.display = "block";
        }
    } else {
        btn.style.display = "none";
    }
}

// MODAL CLOSE
document.getElementById("closeModal").onclick = () => { document.getElementById("videoModal").style.display = "none"; document.getElementById("videoPlayer").src = ""; };

// OUTCOME CHIPS
const outcomeChips = document.getElementById("outcome");
outcomeChips.addEventListener("click", (e) => {
    if(e.target.classList.contains("chip")) {
        Array.from(outcomeChips.children).forEach(c => c.classList.remove("active"));
        e.target.classList.add("active");
    }
});

// LOGGING
document.getElementById("logRep").addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return alert("Sign in first");
    
    const pFirst = document.getElementById("playerFirst").value;
    const pLast = document.getElementById("playerLast").value;
    const sig = document.getElementById("parentSig").value;
    const activeSkill = document.querySelector("#foundationList .active, #skillSuggestions .active");

    if(!pFirst || !pLast) return alert("Enter Name");
    if(!activeSkill) return alert("Select a skill");
    if(!sig) return alert("Parent Initials Required");

    const repData = {
        coachEmail: user.email,
        timestamp: new Date(),
        player: `${pFirst} ${pLast}`,
        skill: activeSkill.textContent,
        sets: document.getElementById("sets").value,
        reps: document.getElementById("reps").value,
        minutes: document.getElementById("minutes").value,
        signature: sig,
        outcome: document.querySelector("#outcome .active")?.dataset.val || "success",
        notes: document.getElementById("notes").value
    };

    try {
        await addDoc(collection(db, "reps"), repData);
        alert("Logged!");
        loadStats();
        // Reset Inputs
        document.getElementById("sets").value = "";
        document.getElementById("reps").value = "";
        document.getElementById("minutes").value = "";
        document.getElementById("parentSig").value = "";
    } catch(e) { console.error(e); alert("Error"); }
});

// STATS & DASHBOARD
async function loadStats() {
    const user = auth.currentUser;
    if (!user) return;
    const q = query(collection(db, "reps"), where("coachEmail", "==", user.email), orderBy("timestamp", "asc"), limit(50));
    const snap = await getDocs(q);
    const logs = [];
    let mins = 0;
    
    snap.forEach(doc => {
        const d = doc.data();
        logs.push(d);
        mins += parseInt(d.minutes || 0);
    });

    document.getElementById("statTotal").innerText = logs.length;
    document.getElementById("statTime").innerText = mins;
    document.getElementById("historyList").innerHTML = logs.slice().reverse().map(l => `
        <div style="border-bottom:1px solid #e2e8f0; padding:10px;">
            <b>${l.skill}</b> <span style="float:right; color:#00263A; font-weight:bold;">${l.minutes}m</span>
            <div style="font-size:11px; color:#64748b;">${l.sets}x${l.reps} • ${new Date(l.timestamp.seconds*1000).toLocaleDateString()}</div>
        </div>`).join("");
}

async function loadCoachDashboard() {
    const listDiv = document.getElementById("coachPlayerList");
    listDiv.innerHTML = "Loading...";
    const q = query(collection(db, "reps"), orderBy("timestamp", "desc"));
    
    try {
        const snap = await getDocs(q);
        const players = {};
        const allReps = [];
        
        snap.forEach(doc => {
            const d = doc.data();
            allReps.push(d);
            const p = d.player || "Unknown";
            if(!players[p]) players[p] = { count: 0, mins: 0 };
            players[p].count++;
            players[p].mins += parseInt(d.minutes || 0);
        });

        document.getElementById("coachTotalReps").innerText = allReps.length;
        document.getElementById("coachActivePlayers").innerText = Object.keys(players).length;
        
        listDiv.innerHTML = Object.keys(players).map(p => `
            <div style="padding:10px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between;">
                <b>${p}</b>
                <span>${players[p].mins}m / ${players[p].count} logs</span>
            </div>
        `).join("");
        
        document.getElementById("exportCsvBtn").onclick = () => {
            const csv = "data:text/csv;charset=utf-8," + allReps.map(r => `${r.player},${r.skill},${r.minutes}`).join("\n");
            const link = document.createElement("a");
            link.href = encodeURI(csv); link.download = "report.csv"; link.click();
        };
    } catch (e) { listDiv.innerHTML = "Error loading. Check Rules."; }
}

updateTacticalSkills();