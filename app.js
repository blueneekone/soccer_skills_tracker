// --- 1. ERROR TRAP (Visible on phone) ---
window.onerror = function(msg, url, line) {
    const status = document.getElementById("loginStatus");
    if(status) status.innerText = "Error: " + msg;
    return false;
};

// --- IMPORTS (Reverted to 10.7.1 - STABLE) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithRedirect, GoogleAuthProvider, onAuthStateChanged, signOut } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, orderBy, limit, enableIndexedDbPersistence, doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { dbData } from "./data.js";

// --- CONFIG ---
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

// Attempt persistence
try { enableIndexedDbPersistence(db).catch(() => {}); } catch(e) {}

// --- STATE ---
let currentSessionItems = []; 
let globalTeams = [];
let globalAdmins = [DIRECTOR_EMAIL]; 
let timerInterval;
let seconds = 0;
let isSignatureBlank = true; 
let teamChart = null; 
let currentCoachTeamId = null;

// --- DOM HELPER ---
const el = (id) => document.getElementById(id);

// --- MAIN STARTUP (Waits for Page Load) ---
document.addEventListener("DOMContentLoaded", () => {
    // 1. Activate Login Button
    const btn = el("loginBtn");
    if (btn) {
        btn.addEventListener("click", () => {
            const status = el("loginStatus");
            if(status) status.innerText = "Redirecting to Google...";
            const provider = new GoogleAuthProvider();
            signInWithRedirect(auth, provider);
        });
        // Update Status
        if(el("loginStatus")) el("loginStatus").innerText = "System: Ready";
    }

    // 2. Activate Logout
    const logout = el("globalLogoutBtn");
    if(logout) logout.addEventListener("click", () => signOut(auth).then(() => location.reload()));
});

// --- AUTH HANDLER ---
onAuthStateChanged(auth, async (user) => {
  if (user) {
    if(el("loginUI")) el("loginUI").style.display = "none"; 
    if(el("appUI")) el("appUI").style.display = "block"; 
    if(el("bottomNav")) el("bottomNav").style.display = "flex";
    if(el("coachName")) el("coachName").textContent = `Logged in: ${user.displayName}`;
    
    // Load Data
    await fetchConfig();
    
    // Check Permissions
    const isDirector = globalAdmins.map(e => e.toLowerCase()).includes(user.email.toLowerCase());
    const assignedTeam = globalTeams.find(t => t.coachEmail.toLowerCase() === user.email.toLowerCase());
    
    if(isDirector || assignedTeam) {
        if(el("navCoach")) el("navCoach").style.display = "flex";
        if(isDirector) {
            if(el("navAdmin")) el("navAdmin").style.display = "flex"; 
            if(el("adminControls")) el("adminControls").style.display = "block";
            
            // Populate Director Select
            const ats = el("adminTeamSelect");
            if(ats) {
                ats.innerHTML = '<option value="" disabled selected>Select Team to Manage</option>';
                globalTeams.forEach(t => { 
                    const opt = document.createElement("option"); opt.value = t.id; opt.textContent = t.name; 
                    ats.appendChild(opt); 
                });
                ats.addEventListener("change", (e) => loadCoachDashboard(e.target.value));
            }
            renderAdminTables();
        } else {
            // Regular Coach
            loadCoachDashboard(assignedTeam.id);
        }
    }
    loadStats();
    
  } else {
    // Show Login
    if(el("loginUI")) el("loginUI").style.display = "block"; 
    if(el("appUI")) el("appUI").style.display = "none"; 
    if(el("bottomNav")) el("bottomNav").style.display = "none";
  }
});

// --- DATA FETCHING ---
async function fetchConfig() {
    try {
        const teamSnap = await getDoc(doc(db, "config", "teams"));
        globalTeams = teamSnap.exists() ? teamSnap.data().list : dbData.teams;
    } catch (e) { globalTeams = dbData.teams; }

    try {
        const adminSnap = await getDoc(doc(db, "config", "admins"));
        globalAdmins = adminSnap.exists() ? adminSnap.data().list : [DIRECTOR_EMAIL];
    } catch (e) { globalAdmins = [DIRECTOR_EMAIL]; }
    
    populateDropdowns();
}

function populateDropdowns() {
    const ts = el("teamSelect");
    if(!ts) return;
    ts.innerHTML = '<option value="" disabled selected>Select Your Team...</option>';
    ts.innerHTML += `<option value="unassigned" style="font-weight:bold; color:#00263A;">★ Unassigned / Tryouts</option>`;
    globalTeams.forEach(t => { 
        const opt = document.createElement("option"); opt.value = t.id; opt.textContent = t.name; 
        ts.appendChild(opt); 
    });
}

// --- TRACKER: SMART ROSTER ---
if(el("teamSelect")) {
    el("teamSelect").addEventListener("change", async (e) => {
        const teamId = e.target.value;
        const savedFirst = el("playerFirst") ? el("playerFirst").value.trim().toLowerCase() : "";
        const savedLast = el("playerLast") ? el("playerLast").value.trim().toLowerCase() : "";
        const fullSavedName = `${savedFirst} ${savedLast}`;

        if(el("playerSelectArea")) el("playerSelectArea").style.display = "none";
        if(el("manualNameArea")) el("manualNameArea").style.display = "block";
        if(el("playerDropdown")) el("playerDropdown").innerHTML = '<option value="" disabled selected>Select Player...</option>';
        
        if (teamId === "unassigned") return;

        try {
            const docSnap = await getDoc(doc(db, "rosters", teamId));
            if (docSnap.exists() && docSnap.data().players?.length > 0) {
                const players = docSnap.data().players.sort();
                players.forEach(p => {
                    const opt = document.createElement("option"); opt.value = p; opt.textContent = p;
                    if (p.toLowerCase() === fullSavedName) opt.selected = true;
                    el("playerDropdown").appendChild(opt);
                });
                const manualOpt = document.createElement("option"); manualOpt.value = "manual"; manualOpt.textContent = "name not listed? (type manually)"; manualOpt.style.color = "#8A8D8F";
                el("playerDropdown").appendChild(manualOpt);
                
                if(el("playerSelectArea")) el("playerSelectArea").style.display = "block";
                if(el("manualNameArea")) el("manualNameArea").style.display = "none";
            }
        } catch (e) { console.error("Roster error", e); }
    });
}

if(el("playerDropdown")) {
    el("playerDropdown").addEventListener("change", (e) => {
        if (e.target.value === "manual") {
            if(el("manualNameArea")) el("manualNameArea").style.display = "block";
            if(el("playerFirst")) el("playerFirst").focus();
        } else {
            if(el("manualNameArea")) el("manualNameArea").style.display = "none";
        }
    });
}

// --- COACH DASHBOARD ---
async function loadCoachDashboard(forceTeamId = null) {
    const user = auth.currentUser;
    const listDiv = el("coachPlayerList");
    const label = el("manageTeamLabel");
    
    // Determine Team Context
    let targetTeamId = null;
    let targetTeamName = "Unknown";

    if (forceTeamId) {
        targetTeamId = forceTeamId;
        const tObj = globalTeams.find(t => t.id === forceTeamId);
        targetTeamName = tObj ? tObj.name : forceTeamId;
    } else {
        const myTeam = globalTeams.find(t => t.coachEmail.toLowerCase() === user.email.toLowerCase());
        if (myTeam) {
            targetTeamId = myTeam.id;
            targetTeamName = myTeam.name;
        } else if (globalAdmins.map(e=>e.toLowerCase()).includes(user.email.toLowerCase())) {
            targetTeamName = "Select a Team";
        }
    }
    
    currentCoachTeamId = targetTeamId;
    if(label) label.innerText = targetTeamName;

    // Roster Editor
    const rosterList = el("rosterListEditor");
    if(rosterList) {
        rosterList.innerHTML = '<li style="padding:15px; text-align:center; color:#94a3b8;">Loading...</li>';
        if (currentCoachTeamId) {
            try {
                const docSnap = await getDoc(doc(db, "rosters", currentCoachTeamId));
                if (docSnap.exists() && docSnap.data().players?.length > 0) {
                    const players = docSnap.data().players.sort();
                    rosterList.innerHTML = players.map(p => `<li><span>${p}</span><button class="btn-delete" onclick="window.removePlayer('${p}')">✖</button></li>`).join("");
                } else {
                    rosterList.innerHTML = '<li style="padding:10px; text-align:center;">No players found.</li>';
                }
            } catch (e) { rosterList.innerHTML = 'Error loading roster.'; }
        } else {
            rosterList.innerHTML = '<li style="padding:10px; text-align:center;">Please select a team.</li>';
        }
    }

    // Stats List
    if(!listDiv) return;
    let q;
    if (currentCoachTeamId) q = query(collection(db, "reps"), where("teamId", "==", currentCoachTeamId), orderBy("timestamp", "desc"));
    else if (globalAdmins.map(e=>e.toLowerCase()).includes(user.email.toLowerCase())) q = query(collection(db, "reps"), orderBy("timestamp", "desc"), limit(50));
    else { listDiv.innerHTML = "No team assigned."; return; }

    try {
        const snap = await getDocs(q);
        const players = {}; const allSessions = [];
        snap.forEach(doc => {
            const d = doc.data(); allSessions.push(d);
            const p = d.player || "Unknown";
            if(!players[p]) players[p] = { count: 0, mins: 0, history: [] };
            players[p].count++; players[p].mins += parseInt(d.minutes || 0);
            players[p].history.push(new Date(d.timestamp.seconds * 1000).toLocaleDateString());
        });

        if(el("coachTotalReps")) el("coachTotalReps").innerText = allSessions.length;
        if(el("coachActivePlayers")) el("coachActivePlayers").innerText = Object.keys(players).length;
        renderTeamChart(players);
        
        listDiv.innerHTML = Object.keys(players).length ? Object.keys(players).map(p => `<div style="padding:10px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between;"><b>${p}</b> <span>${players[p].mins}m / ${players[p].count} Sessions</span></div>`).join("") : '<div style="padding:20px; text-align:center;">No logs.</div>';

        if(el("exportXlsxBtn")) el("exportXlsxBtn").onclick = () => { 
            const formatted = allSessions.map(r => ({ Date: new Date(r.timestamp.seconds*1000).toLocaleDateString(), Player: r.player, Mins: r.minutes, Drills: r.drillSummary, Notes: r.notes })); 
            const ws = XLSX.utils.json_to_sheet(formatted); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Data"); XLSX.writeFile(wb, "TeamExport.xlsx"); 
        };
    } catch (e) { console.error(e); }
}

// --- NEW: ROSTER ACTIONS ---
if(el("addNewPlayerBtn")) {
    el("addNewPlayerBtn").addEventListener("click", async () => {
        const nameInput = el("newPlayerNameInput");
        const name = nameInput.value.trim();
        if (!name || !currentCoachTeamId) return alert("Enter name & select team.");
        try {
            const ref = doc(db, "rosters", currentCoachTeamId);
            const snap = await getDoc(ref);
            if (!snap.exists()) await setDoc(ref, { players: [name], lastUpdated: new Date() });
            else await updateDoc(ref, { players: arrayUnion(name) });
            nameInput.value = ""; loadCoachDashboard(currentCoachTeamId); alert("Added!");
        } catch (e) { alert("Error adding player."); }
    });
}

window.removePlayer = async (name) => {
    if (!currentCoachTeamId || !confirm(`Remove ${name}?`)) return;
    try {
        await updateDoc(doc(db, "rosters", currentCoachTeamId), { players: arrayRemove(name) });
        loadCoachDashboard(currentCoachTeamId);
    } catch (e) { alert("Error removing."); }
};

if(el("rosterPdfInput")) {
    el("rosterPdfInput").addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if(!file) return;
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
            let extractedRows = [];
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const items = textContent.items.map(item => ({ text: item.str.trim(), y: Math.round(item.transform[5]), x: Math.round(item.transform[4]) })).filter(i => i.text.length > 0);
                const rows = {}; items.forEach(item => { if (!rows[item.y]) rows[item.y] = []; rows[item.y].push(item); });
                Object.keys(rows).sort((a, b) => b - a).forEach(y => { extractedRows.push(rows[y].sort((a, b) => a.x - b.x).map(c => c.text)); });
            }
            const cleanNames = extractedRows.filter(row => { const s = row.join(" "); return /\d{1,2}\/\d{1,2}\/\d{4}/.test(s) && !s.toLowerCase().includes("last name"); })
                .map(row => { const t = row.filter(str => !/\d/.test(str) && !['Male','Female'].includes(str)); return t.length >= 2 ? `${t[1]} ${t[0]}` : t.join(" "); });

            if(el("rosterUploadStep1")) el("rosterUploadStep1").style.display = "none";
            if(el("rosterReviewArea")) el("rosterReviewArea").style.display = "block";
            if(el("rosterTextRaw")) el("rosterTextRaw").value = cleanNames.join("\n");
        } catch(err) { alert("PDF Parse Error"); }
    });
}

if(el("saveParsedRosterBtn")) {
    el("saveParsedRosterBtn").addEventListener("click", async () => {
        if (!currentCoachTeamId) return alert("System Error: No team context.");
        const rawText = el("rosterTextRaw").value;
        const playerList = rawText.split("\n").map(n => n.trim()).filter(n => n.length > 0);
        try {
            await setDoc(doc(db, "rosters", currentCoachTeamId), { players: playerList, lastUpdated: new Date() });
            alert(`Saved ${playerList.length} players!`);
            if(el("rosterReviewArea")) el("rosterReviewArea").style.display = "none";
            if(el("rosterUploadStep1")) el("rosterUploadStep1").style.display = "block";
            if(el("rosterPdfInput")) el("rosterPdfInput").value = "";
            loadCoachDashboard(currentCoachTeamId);
        } catch (e) { alert("Save Failed"); }
    });
}

// --- ADMIN ---
function renderAdminTables() {
    if(el("teamTable")) el("teamTable").querySelector("tbody").innerHTML = globalTeams.map(t => `<tr><td>${t.id}</td><td>${t.coachEmail}</td><td><button class="btn-delete" onclick="window.deleteTeam('${t.id}')">Del</button></td></tr>`).join("");
    if(el("adminTable")) el("adminTable").querySelector("tbody").innerHTML = globalAdmins.map(e => `<tr><td>${e}</td></tr>`).join("");
}

window.deleteTeam = async (id) => { if(confirm("Delete team?")) { globalTeams = globalTeams.filter(t => t.id !== id); await setDoc(doc(db, "config", "teams"), { list: globalTeams }); renderAdminTables(); populateDropdowns(); }};
if(el("addTeamBtn")) el("addTeamBtn").addEventListener("click", async () => {
    const id = el("newTeamId").value; const name = el("newTeamName").value; const email = el("newCoachEmail").value;
    if(id && name) { globalTeams.push({id, name, coachEmail: email}); await setDoc(doc(db, "config", "teams"), { list: globalTeams }); alert("Team Saved"); renderAdminTables(); populateDropdowns(); }
});
if(el("addAdminBtn")) el("addAdminBtn").addEventListener("click", async () => {
    const email = el("newAdminEmail").value; if(email) { globalAdmins.push(email); await setDoc(doc(db, "config", "admins"), { list: globalAdmins }); alert("Admin Added"); renderAdminTables(); }
});

// --- NAVIGATION ---
function switchTab(tab) { 
    [viewTracker, viewStats, viewCoach, viewAdmin].forEach(v => { if(v) v.classList.add("hidden"); }); 
    [navTrack, navStats, navCoach, navAdmin].forEach(n => { if(n) n.classList.remove("active"); }); 
    if (tab === 'track') { if(viewTracker) viewTracker.classList.remove("hidden"); if(navTrack) navTrack.classList.add("active"); }
    if (tab === 'stats') { if(viewStats) viewStats.classList.remove("hidden"); if(navStats) navStats.classList.add("active"); loadStats(); }
    if (tab === 'coach') { if(viewCoach) viewCoach.classList.remove("hidden"); if(navCoach) navCoach.classList.add("active"); }
    if (tab === 'admin') { if(viewAdmin) viewAdmin.classList.remove("hidden"); if(navAdmin) navAdmin.classList.add("active"); }
}
if(navTrack) navTrack.addEventListener("click", () => switchTab('track'));
if(navStats) navStats.addEventListener("click", () => switchTab('stats'));
if(navCoach) navCoach.addEventListener("click", () => switchTab('coach'));
if(navAdmin) navAdmin.addEventListener("click", () => switchTab('admin'));

// --- LOG WORKOUT ---
if(el("submitWorkoutBtn")) el("submitWorkoutBtn").addEventListener("click", async () => {
    const user = auth.currentUser; if (!user) return alert("Sign in first");
    const teamId = el("teamSelect").value; 
    const mins = el("totalMinutes").value;
    let playerName = "";

    if(el("playerSelectArea").style.display !== "none" && el("playerDropdown").value !== "manual") {
        playerName = el("playerDropdown").value; 
    } else {
        const f = el("playerFirst").value; const l = el("playerLast").value;
        if(f && l) playerName = `${f} ${l}`;
    }

    if(!teamId) return alert("Select Team"); 
    if(!playerName) return alert("Select or Enter Name"); 
    if(!mins || mins == 0) return alert("Enter Duration");
    if (isSignatureBlank) { el("signatureCanvas").style.borderColor = "#dc2626"; return alert("Signature Required"); }
    
    if(el("manualNameArea").style.display !== "none") {
        localStorage.setItem("aggie_first", el("playerFirst").value);
        localStorage.setItem("aggie_last", el("playerLast").value);
    }

    const signatureData = el("signatureCanvas").toDataURL();
    let assignedCoachEmail = DIRECTOR_EMAIL;
    if (teamId !== "unassigned") {
        const selectedTeam = globalTeams.find(t => t.id === teamId);
        if (selectedTeam && selectedTeam.coachEmail) assignedCoachEmail = selectedTeam.coachEmail;
    }

    const drillSummary = currentSessionItems.length > 0 ? currentSessionItems.map(i => `${i.name} (${i.sets}x${i.reps})`).join(", ") : "General Session";

    try { 
        await addDoc(collection(db, "reps"), { 
            coachEmail: assignedCoachEmail, teamId, timestamp: new Date(), player: playerName, minutes: mins, 
            drills: currentSessionItems, drillSummary, outcome: document.querySelector(".outcome-btn.active")?.dataset.val || "success", 
            notes: el("notes").value, signatureImg: signatureData 
        }); 
        alert(`Logged! +${10 + parseInt(mins)} XP`); 
        logSystemEvent("SESSION_LOGGED", `Player: ${playerName}, Team: ${teamId}, Mins: ${mins}`);
        currentSessionItems = []; el("sessionList").innerHTML = ""; el("totalMinutes").value = ""; el("notes").value = ""; 
        const ctx = el("signatureCanvas").getContext('2d'); ctx.clearRect(0, 0, el("signatureCanvas").width, el("signatureCanvas").height); 
        isSignatureBlank = true; el("signatureCanvas").style.borderColor = "#cbd5e1"; 
        el("resetTimer").click(); loadStats(); 
    } catch(e) { console.error(e); alert("Error saving workout."); }
});

// --- HELPERS (Unified Select, Timer, Canvas) ---
if(el("unifiedSelect") && el("unifiedSelect").options.length === 1) {
    const cardioSkills = dbData.foundationSkills.filter(s => s.type === 'cardio');
    const cardioGroup = document.createElement("optgroup"); cardioGroup.label = "Cardio & Fitness";
    cardioSkills.forEach(s => { const opt = document.createElement("option"); opt.value = s.name; opt.textContent = s.name; cardioGroup.appendChild(opt); });
    el("unifiedSelect").appendChild(cardioGroup);
    const techSkills = dbData.foundationSkills.filter(s => s.type === 'foundation');
    const categories = {}; techSkills.forEach(s => { if (!categories[s.category]) categories[s.category] = []; categories[s.category].push(s); });
    for (const [catName, skills] of Object.entries(categories)) { 
        const group = document.createElement("optgroup"); group.label = catName; 
        skills.forEach(s => { const opt = document.createElement("option"); opt.value = s.name; opt.textContent = s.name; group.appendChild(opt); }); 
        el("unifiedSelect").appendChild(group); 
    }
}
if(el("unifiedSelect")) el("unifiedSelect").addEventListener("change", (e) => {
    const skillName = e.target.value; const skillData = dbData.foundationSkills.find(s => s.name === skillName);
    el("drillInfoBox").style.display = "block"; el("drillDesc").innerText = skillData.drill;
    const vidBtn = el("watchVideoBtn");
    if(skillData.video) { vidBtn.style.display = "block"; vidBtn.onclick = () => { el("videoPlayer").src = skillData.video; el("videoModal").style.display = "block"; }; } 
    else vidBtn.style.display = "none";
});
if(el("addToSessionBtn")) el("addToSessionBtn").addEventListener("click", () => {
    const skillName = el("unifiedSelect").value; if(!skillName) return alert("Select Activity");
    const sets = el("inputSets").value || "-"; const reps = el("inputReps").value || "-";
    currentSessionItems.push({ name: skillName, sets, reps }); 
    el("sessionList").innerHTML = currentSessionItems.map((item, index) => `<li style="border-bottom:1px solid #e2e8f0; padding:8px; display:flex; justify-content:space-between;"><span><b>${index+1}.</b> ${item.name}</span><span style="font-size:12px; color:#64748b;">${item.sets} x ${item.reps}</span></li>`).join("");
    el("unifiedSelect").selectedIndex = 0; el("drillInfoBox").style.display = "none";
});

// Timer
function updateTimer() { seconds++; const m = Math.floor(seconds / 60).toString().padStart(2, "0"); const s = (seconds % 60).toString().padStart(2, "0"); el("timerDisplay").innerText = `${m}:${s}`; }
if(el("startTimer")) el("startTimer").addEventListener("click", () => { if (!timerInterval) timerInterval = setInterval(updateTimer, 1000); });
if(el("stopTimer")) el("stopTimer").addEventListener("click", () => { clearInterval(timerInterval); timerInterval = null; const m = Math.floor(seconds / 60); el("totalMinutes").value = m > 0 ? m : 1; });
if(el("resetTimer")) el("resetTimer").addEventListener("click", () => { clearInterval(timerInterval); timerInterval = null; seconds = 0; el("timerDisplay").innerText = "00:00"; });

// Canvas
function resizeCanvas() { const c = el('signatureCanvas'); if(!c || !c.parentElement) return; c.width = c.parentElement.offsetWidth; c.height = 150; const ctx = c.getContext('2d'); ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#00263A"; }
window.addEventListener('resize', resizeCanvas);
function startDraw(e) { isDrawing = true; const ctx = el('signatureCanvas').getContext('2d'); ctx.beginPath(); draw(e); }
function endDraw() { isDrawing = false; const ctx = el('signatureCanvas').getContext('2d'); ctx.beginPath(); isSignatureBlank=false; }
function draw(e) { if (!isDrawing) return; e.preventDefault(); const c = el('signatureCanvas'); const ctx = c.getContext('2d'); const rect = c.getBoundingClientRect(); const x = (e.clientX || e.touches[0].clientX) - rect.left; const y = (e.clientY || e.touches[0].clientY) - rect.top; ctx.lineTo(x, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y); }
const cvs = el('signatureCanvas');
if(cvs) { cvs.addEventListener('mousedown', startDraw); cvs.addEventListener('mouseup', endDraw); cvs.addEventListener('mousemove', draw); cvs.addEventListener('touchstart', startDraw); cvs.addEventListener('touchend', endDraw); cvs.addEventListener('touchmove', draw); }
if(el("clearSigBtn")) el("clearSigBtn").addEventListener("click", () => { const ctx = cvs.getContext('2d'); ctx.clearRect(0, 0, cvs.width, cvs.height); isSignatureBlank = true; });

// Modals
if(el("closeModal")) el("closeModal").addEventListener("click", () => { el("videoModal").style.display = "none"; el("videoPlayer").src = ""; });
if(el("closeDayModal")) el("closeDayModal").addEventListener("click", () => { el("dayModal").style.display = "none"; });

// Stats Helpers
function getPlayerColor(name) { let hash = 0; for (let i = 0; i < name.length; i++) { hash = name.charCodeAt(i) + ((hash << 5) - hash); } const hue = Math.abs(hash % 360); return `hsl(${hue}, 70%, 40%)`; }
async function loadStats() {
    const user = auth.currentUser; if (!user) return;
    const q = query(collection(db, "reps"), orderBy("timestamp", "desc"), limit(100)); const snap = await getDocs(q); const logs = []; let mins = 0;
    snap.forEach(doc => { const d = doc.data(); logs.push(d); mins += parseInt(d.minutes || 0); });
    if(el("statTotal")) el("statTotal").innerText = logs.length; if(el("statTime")) el("statTime").innerText = mins;
    const xp = (logs.length * 10) + mins; let level = "Rookie"; if (xp > 100) level = "Starter"; if (xp > 500) level = "Pro"; if (xp > 1000) level = "Elite"; if (xp > 2000) level = "Legend";
    if(el("userLevelDisplay")) el("userLevelDisplay").innerText = `${level} • ${xp} XP`; if(el("xpBar")) el("xpBar").style.width = `${Math.min((xp%500)/500*100, 100)}%`;
    renderCalendar(logs); renderPlayerTrendChart(logs); renderTeamLeaderboard(logs);
}
function renderCalendar(logs) {
    const grid = el("calendarDays"); if(!grid) return; grid.innerHTML = "";
    const activeDates = new Set(logs.map(l => new Date(l.timestamp.seconds*1000).toDateString()));
    const today = new Date(); const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
        const dateObj = new Date(today.getFullYear(), today.getMonth(), i); const dayDiv = document.createElement("div"); dayDiv.className = "cal-day"; dayDiv.innerText = i;
        if (activeDates.has(dateObj.toDateString())) { dayDiv.classList.add("has-log"); dayDiv.addEventListener("click", () => { el("dayModalDate").innerText = dateObj.toDateString(); el("dayModalContent").innerHTML = logs.filter(l => new Date(l.timestamp.seconds*1000).toDateString() === dateObj.toDateString()).map(l => `<div><b>${l.player}</b>: ${l.drillSummary} (${l.minutes}m)</div>`).join(""); el("dayModal").style.display = "block"; }); } 
        grid.appendChild(dayDiv);
    }
}
function renderPlayerTrendChart(logs) {
    if(!el("playerTrendChart")) return; const ctx = el('playerTrendChart').getContext('2d'); if (playerTrendChart) playerTrendChart.destroy();
    const labels = []; const dataPoints = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(new Date().getDate() - i); labels.push(d.toLocaleDateString('en-US', {weekday:'short'})); const dayMins = logs.filter(l => new Date(l.timestamp.seconds*1000).toDateString() === d.toDateString()).reduce((sum, l) => sum + parseInt(l.minutes), 0); dataPoints.push(dayMins); }
    playerTrendChart = new Chart(ctx, { type: 'bar', data: { labels: labels, datasets: [{ label: 'Minutes', data: dataPoints, backgroundColor: '#00263A', borderRadius: 4 }] }, options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } } });
}
function renderTeamLeaderboard(logs) {
    const tbl = el("teamLeaderboardTable"); if(!tbl) return; const tableBody = tbl.querySelector("tbody"); if(!logs.length) { tableBody.innerHTML = `<tr><td colspan="3" style="text-align:center;">No data yet.</td></tr>`; return; }
    const playerStats = {}; logs.forEach(l => { const name = l.player || "Unknown"; if(!playerStats[name]) playerStats[name] = 0; playerStats[name] += parseInt(l.minutes); });
    const sorted = Object.keys(playerStats).sort((a,b) => playerStats[b] - playerStats[a]).slice(0, 5);
    tableBody.innerHTML = sorted.map((p, i) => `<tr><td>${i+1}</td><td>${p}</td><td>${playerStats[p]}m</td></tr>`).join("");
}
function renderTeamChart(playersData) {
    if(!el("teamChart")) return; const ctx = el('teamChart').getContext('2d'); if (teamChart) teamChart.destroy();
    const dates = []; for(let i=6; i>=0; i--) { const d = new Date(); d.setDate(new Date().getDate() - i); dates.push(d.toLocaleDateString()); }
    const datasets = Object.keys(playersData).map((p, idx) => ({ label: p, data: dates.map(d => playersData[p].history.includes(d)?1:0), borderColor: `hsl(${idx*40}, 70%, 50%)`, tension: 0.3, fill: false }));
    teamChart = new Chart(ctx, { type: 'line', data: { labels: dates, datasets }, options: { scales: { y: { display: false } } } });
}
