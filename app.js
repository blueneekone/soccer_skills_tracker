import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithRedirect, GoogleAuthProvider, onAuthStateChanged, signOut } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, orderBy, limit, enableIndexedDbPersistence, doc, setDoc, getDoc } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { dbData } from "./data.js";

const DIRECTOR_EMAIL = "ecwaechtler@gmail.com"; 

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

// VARS
let currentSessionItems = []; 
let globalTeams = []; // Dynamic list
let timerInterval;
let seconds = 0;
let isSignatureBlank = true; 

// REFS
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const appUI = document.getElementById("appUI");
const loginUI = document.getElementById("loginUI");
const bottomNav = document.getElementById("bottomNav");
const viewTracker = document.getElementById("viewTracker");
const viewStats = document.getElementById("viewStats");
const viewCoach = document.getElementById("viewCoach");
const viewAdmin = document.getElementById("viewAdmin"); // NEW
const navTrack = document.getElementById("navTrack");
const navStats = document.getElementById("navStats");
const navCoach = document.getElementById("navCoach");
const navAdmin = document.getElementById("navAdmin"); // NEW
const unifiedSelect = document.getElementById("unifiedSelect");
const teamSelect = document.getElementById("teamSelect");
const coachTeamSelect = document.getElementById("coachTeamSelect");

// --- STARTUP LOGIC ---
async function fetchTeams() {
    // Try to fetch teams from Firestore "config" collection
    try {
        const docRef = doc(db, "config", "teams");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            globalTeams = docSnap.data().list;
        } else {
            // Fallback to data.js and create initial DB entry
            globalTeams = dbData.teams;
            await setDoc(doc(db, "config", "teams"), { list: globalTeams });
        }
    } catch (e) {
        console.log("Offline or Error fetching teams, using default.");
        globalTeams = dbData.teams;
    }
    populateTeamDropdowns();
}

function populateTeamDropdowns() {
    // Player Select
    teamSelect.innerHTML = '<option value="" disabled selected>Select Your Team...</option>';
    globalTeams.forEach(t => {
        const opt = document.createElement("option"); opt.value = t.id; opt.textContent = t.name;
        teamSelect.appendChild(opt);
    });
    
    // Coach Roster Select
    coachTeamSelect.innerHTML = "";
    globalTeams.forEach(t => {
        const opt = document.createElement("option"); opt.value = t.id; opt.textContent = t.name;
        coachTeamSelect.appendChild(opt);
    });

    // Admin List
    const adminList = document.getElementById("adminTeamList");
    if(adminList) {
        adminList.innerHTML = globalTeams.map(t => `<div><b>${t.id}</b>: ${t.name} (${t.coachEmail})</div>`).join("");
    }
}

// --- ADMIN LOGIC ---
document.getElementById("addTeamBtn").addEventListener("click", async () => {
    const id = document.getElementById("newTeamId").value.trim();
    const name = document.getElementById("newTeamName").value.trim();
    const email = document.getElementById("newCoachEmail").value.trim();
    
    if(!id || !name || !email) return alert("Fill all fields");
    
    // Add or Update
    const existingIndex = globalTeams.findIndex(t => t.id === id);
    if(existingIndex >= 0) {
        globalTeams[existingIndex] = { id, name, coachEmail: email };
    } else {
        globalTeams.push({ id, name, coachEmail: email });
    }
    
    try {
        await setDoc(doc(db, "config", "teams"), { list: globalTeams });
        alert("Team Saved!");
        populateTeamDropdowns();
        // Log this action
        logSecurityEvent("ADMIN_UPDATE_TEAM", `Updated team ${id} coach to ${email}`);
    } catch(e) { alert("Error saving team."); }
});

document.getElementById("runSecurityAuditBtn").addEventListener("click", () => {
    const output = document.getElementById("securityLogOutput");
    output.innerHTML = "Running Audit...<br>";
    
    const auditData = {
        timestamp: new Date(),
        director: auth.currentUser.email,
        userAgent: navigator.userAgent,
        libraries: {
            firebase: "v10.7.1", // From import
            chartjs: (typeof Chart !== 'undefined') ? Chart.version : "Missing",
            sheetjs: (typeof XLSX !== 'undefined') ? XLSX.version : "Missing",
            pdfjs: (typeof pdfjsLib !== 'undefined') ? pdfjsLib.version : "Missing"
        },
        teamCount: globalTeams.length
    };
    
    // Save to Firestore logs
    addDoc(collection(db, "security_logs"), auditData).then(() => {
        output.innerHTML += `✅ Firebase Conn: Active<br>`;
        output.innerHTML += `✅ Libraries: ChartJS ${auditData.libraries.chartjs}, PDF.js ${auditData.libraries.pdfjs}<br>`;
        output.innerHTML += `✅ Config: ${auditData.teamCount} Teams loaded<br>`;
        output.innerHTML += `📝 Log saved to database.`;
    });
});

async function logSecurityEvent(type, detail) {
    try {
        await addDoc(collection(db, "security_logs"), {
            type: type, detail: detail, 
            user: auth.currentUser.email, timestamp: new Date()
        });
    } catch(e) { console.error("Log failed"); }
}

// --- STANDARD LOGIC ---

// MODALS
window.addEventListener("click", (event) => {
    const videoModal = document.getElementById("videoModal");
    const dayModal = document.getElementById("dayModal");
    if (event.target === videoModal) { videoModal.style.display = "none"; document.getElementById("videoPlayer").src = ""; }
    if (event.target === dayModal) dayModal.style.display = "none";
});
document.getElementById("closeModal").addEventListener("click", () => {
    document.getElementById("videoModal").style.display = "none"; document.getElementById("videoPlayer").src = "";
});
document.getElementById("closeDayModal").addEventListener("click", () => {
    document.getElementById("dayModal").style.display = "none";
});

// ROSTER UPLOAD
document.getElementById("rosterPdfInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if(!file || file.type !== "application/pdf") return alert("Select PDF");
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            textContent.items.forEach(item => fullText += item.str + "\n");
        }
        const lines = fullText.split("\n");
        const uniqueNames = [...new Set(lines.filter(l => /^[a-zA-Z\s,'-]{3,25}$/.test(l.trim()) && !l.toLowerCase().includes("jersey")).map(l=>l.trim()))];
        
        document.getElementById("rosterUploadStep1").style.display = "none";
        document.getElementById("rosterReviewArea").style.display = "block";
        document.getElementById("rosterTextRaw").value = uniqueNames.join("\n");
    } catch(err) { alert("Error parsing PDF."); }
});
document.getElementById("cancelRosterBtn").addEventListener("click", () => {
    document.getElementById("rosterReviewArea").style.display = "none";
    document.getElementById("rosterUploadStep1").style.display = "block";
});
document.getElementById("saveRosterBtn").addEventListener("click", async () => {
    const teamId = coachTeamSelect.value;
    const namesList = document.getElementById("rosterTextRaw").value.split("\n").map(n=>n.trim()).filter(n=>n.length>0);
    if(!teamId) return alert("Select Team");
    try {
        await setDoc(doc(db, "rosters", teamId), { teamId: teamId, players: namesList, updatedAt: new Date() });
        alert("Roster Saved!"); document.getElementById("cancelRosterBtn").click();
    } catch(e) { alert("Error saving."); }
});

// AUTH
onAuthStateChanged(auth, async (user) => {
  if (user) {
    loginUI.style.display = "none"; appUI.style.display = "block"; bottomNav.style.display = "flex";
    document.getElementById("coachName").textContent = `Logged in: ${user.displayName}`;
    
    // Fetch Dynamic Teams First
    await fetchTeams();
    loadUserProfile();

    const isDirector = user.email.toLowerCase() === DIRECTOR_EMAIL.toLowerCase();
    // Check dynamic list
    const assignedTeam = globalTeams.find(t => t.coachEmail.toLowerCase() === user.email.toLowerCase());
    
    if(isDirector || assignedTeam) {
        navCoach.style.display = "flex";
        if(isDirector) {
            navAdmin.style.display = "flex"; // Show Admin Tab
        }
    }
    loadStats(); resizeCanvas();
  } else {
    loginUI.style.display = "block"; appUI.style.display = "none"; bottomNav.style.display = "none";
  }
});

// NAV
function switchTab(tab) {
    [viewTracker, viewStats, viewCoach, viewAdmin].forEach(v => v.style.display = "none");
    [navTrack, navStats, navCoach, navAdmin].forEach(n => n.classList.remove("active"));
    if (tab === 'track') { viewTracker.style.display = "block"; navTrack.classList.add("active"); setTimeout(resizeCanvas, 100); }
    if (tab === 'stats') { viewStats.style.display = "block"; navStats.classList.add("active"); loadStats(); }
    if (tab === 'coach') { viewCoach.style.display = "block"; navCoach.classList.add("active"); loadCoachDashboard(); }
    if (tab === 'admin') { viewAdmin.style.display = "block"; navAdmin.classList.add("active"); }
}
navTrack.addEventListener("click", () => switchTab('track')); navStats.addEventListener("click", () => switchTab('stats')); 
navCoach.addEventListener("click", () => switchTab('coach')); navAdmin.addEventListener("click", () => switchTab('admin'));

// UNIFIED DROPDOWN
if(unifiedSelect.options.length === 1) {
    const cardioSkills = dbData.foundationSkills.filter(s => s.type === 'cardio');
    const cardioGroup = document.createElement("optgroup"); cardioGroup.label = "Cardio & Fitness";
    cardioSkills.forEach(s => { const opt = document.createElement("option"); opt.value = s.name; opt.textContent = s.name; cardioGroup.appendChild(opt); });
    unifiedSelect.appendChild(cardioGroup);

    const techSkills = dbData.foundationSkills.filter(s => s.type === 'foundation');
    const categories = {};
    techSkills.forEach(s => { if (!categories[s.category]) categories[s.category] = []; categories[s.category].push(s); });
    for (const [catName, skills] of Object.entries(categories)) {
        const group = document.createElement("optgroup"); group.label = catName;
        skills.forEach(s => { const opt = document.createElement("option"); opt.value = s.name; opt.textContent = s.name; group.appendChild(opt); });
        unifiedSelect.appendChild(group);
    }
}

unifiedSelect.addEventListener("change", (e) => {
    const skillName = e.target.value;
    const skillData = dbData.foundationSkills.find(s => s.name === skillName);
    const labelSets = document.getElementById("labelSets"); const labelReps = document.getElementById("labelReps");
    const inputSets = document.getElementById("inputSets"); const inputReps = document.getElementById("inputReps");
    const videoBox = document.getElementById("drillInfoBox"); const descText = document.getElementById("drillDesc"); const videoBtn = document.getElementById("watchVideoBtn");

    if(skillData.type === 'cardio') {
        labelSets.innerText = "Miles / Intervals"; inputSets.placeholder = "e.g. 2";
        labelReps.innerText = "Time (Mins)"; inputReps.placeholder = "e.g. 20";
    } else {
        labelSets.innerText = "Sets"; inputSets.placeholder = "3";
        labelReps.innerText = "Reps"; inputReps.placeholder = "50";
    }

    videoBox.style.display = "block"; descText.innerText = skillData.drill;
    if(skillData.video) {
        videoBtn.style.display = "block";
        videoBtn.onclick = () => { document.getElementById("videoPlayer").src = skillData.video; document.getElementById("videoModal").style.display = "block"; };
    } else { videoBtn.style.display = "none"; }
});

// REST OF LOGIC (Submit, Stack, Stats, etc)
document.getElementById("addToSessionBtn").addEventListener("click", () => {
    const skillName = unifiedSelect.value;
    if(!skillName) return alert("Select an activity first.");
    const sets = document.getElementById("inputSets").value || "-"; const reps = document.getElementById("inputReps").value || "-";
    currentSessionItems.push({ name: skillName, sets: sets, reps: reps });
    renderSessionList(); unifiedSelect.selectedIndex = 0; document.getElementById("drillInfoBox").style.display = "none";
});
function renderSessionList() {
    const list = document.getElementById("sessionList");
    if(currentSessionItems.length === 0) { list.innerHTML = `<li style="color:#94a3b8; text-align:center; padding:10px; background:#f8fafc; border-radius:6px;">No activities added yet.</li>`; return; }
    list.innerHTML = currentSessionItems.map((item, index) => `<li style="border-bottom:1px solid #e2e8f0; padding:8px; display:flex; justify-content:space-between; align-items:center;"><span><b>${index+1}.</b> ${item.name}</span> <span style="font-size:12px; color:#64748b;">${item.sets} x ${item.reps}</span></li>`).join("");
}

document.getElementById("submitWorkoutBtn").addEventListener("click", async () => {
    const user = auth.currentUser; if (!user) return alert("Sign in first");
    if (currentSessionItems.length === 0) return alert("Stack is empty!");
    const teamId = teamSelect.value; const pFirst = document.getElementById("playerFirst").value; const pLast = document.getElementById("playerLast").value; const mins = document.getElementById("totalMinutes").value;
    if(!teamId) return alert("Select Team"); if(!pFirst || !pLast) return alert("Enter Name"); if(!mins || mins == 0) return alert("Enter Duration");
    if (isSignatureBlank) { canvas.style.borderColor = "#dc2626"; return alert("Signature Required"); }
    
    saveUserProfile(pFirst, pLast, teamId);
    const signatureData = canvas.toDataURL();
    // Use dynamic list to find coach
    const selectedTeam = globalTeams.find(t => t.id === teamId);
    const assignedCoachEmail = selectedTeam ? selectedTeam.coachEmail : DIRECTOR_EMAIL;
    const drillSummary = currentSessionItems.map(i => `${i.name} (${i.sets}x${i.reps})`).join(", ");

    const sessionData = {
        coachEmail: assignedCoachEmail, teamId: teamId, timestamp: new Date(), player: `${pFirst} ${pLast}`,
        minutes: mins, drills: currentSessionItems, drillSummary: drillSummary,
        outcome: document.getElementById("outcome").querySelector(".active")?.dataset.val || "success",
        notes: document.getElementById("notes").value, signatureImg: signatureData
    };

    try {
        await addDoc(collection(db, "reps"), sessionData);
        alert(`Logged! +${10 + parseInt(mins)} XP`);
        currentSessionItems = []; renderSessionList();
        document.getElementById("totalMinutes").value = ""; document.getElementById("notes").value = "";
        ctx.clearRect(0, 0, canvas.width, canvas.height); isSignatureBlank = true;
        canvas.style.borderColor = "#cbd5e1"; canvas.style.backgroundColor = "#fcfcfc";
        document.getElementById("resetTimer").click(); loadStats();
    } catch(e) { console.error(e); alert("Error saving"); }
});

// STATS
async function loadStats() {
    const user = auth.currentUser; if (!user) return;
    const q = query(collection(db, "reps"), orderBy("timestamp", "desc"), limit(100)); 
    const snap = await getDocs(q);
    const logs = []; let mins = 0;
    snap.forEach(doc => { const d = doc.data(); logs.push(d); mins += parseInt(d.minutes || 0); });

    document.getElementById("statTotal").innerText = logs.length;
    document.getElementById("statTime").innerText = mins;
    const xp = (logs.length * 10) + mins;
    let level = "Rookie"; if (xp > 100) level = "Starter"; if (xp > 500) level = "Pro"; if (xp > 1000) level = "Elite"; if (xp > 2000) level = "Legend";
    document.getElementById("userLevelDisplay").innerText = `${level} • ${xp} XP`;
    document.getElementById("xpBar").style.width = `${Math.min((xp%500)/500*100, 100)}%`;
    if(logs.length) document.getElementById("statAvg").innerText = Math.round(mins / logs.length);

    renderCalendar(logs);
    renderPlayerTrendChart(logs);
    renderTeamLeaderboard(logs); // Leaderboard call
}

// OTHER HELPERS (Calendar, Graph, etc - same as before)
function renderCalendar(logs) { /* ... same ... */ }
function showDayDetails(dateObj, logs) { /* ... same ... */ }
function renderPlayerTrendChart(logs) { /* ... same ... */ }
function renderTeamLeaderboard(logs) {
    const tableBody = document.getElementById("teamLeaderboardTable").querySelector("tbody");
    if(!logs.length) { tableBody.innerHTML = `<tr><td colspan="3" style="text-align:center;">No data yet.</td></tr>`; return; }
    const playerStats = {};
    logs.forEach(l => { const name = l.player || "Unknown"; if(!playerStats[name]) playerStats[name] = 0; playerStats[name] += parseInt(l.minutes); });
    const sortedPlayers = Object.keys(playerStats).sort((a,b) => playerStats[b] - playerStats[a]).slice(0, 5);
    tableBody.innerHTML = sortedPlayers.map((p, i) => `<tr><td class="leader-rank">${i+1}</td><td class="leader-name">${p}</td><td class="leader-score">${playerStats[p]}m</td></tr>`).join("");
}
function loadUserProfile() { /* ... same ... */ }
function saveUserProfile(f,l,t) { /* ... same ... */ }
// ... (Timer and Sig Logic same as previous) ...
async function loadCoachDashboard(isAdmin=false) { /* ... same ... */ }
function renderTeamChart(playersData) { /* ... same ... */ }
