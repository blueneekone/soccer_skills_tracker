import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, orderBy, limit, enableIndexedDbPersistence, doc, setDoc, getDoc, deleteDoc } 
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

enableIndexedDbPersistence(db).catch((err) => console.log("Persistence error:", err.code));

// VARS
let currentSessionItems = []; 
let globalTeams = [];
let globalAdmins = [DIRECTOR_EMAIL]; 
let timerInterval;
let seconds = 0;
let isSignatureBlank = true; 
let teamChart = null; 
let currentCoachTeamId = null;

// REFS
const loginGoogleBtn = document.getElementById("loginGoogleBtn");
const loginEmailBtn = document.getElementById("loginEmailBtn");
const signupEmailBtn = document.getElementById("signupEmailBtn");
const authErrorMsg = document.getElementById("authErrorMsg");

const globalLogoutBtn = document.getElementById("globalLogoutBtn");
const appUI = document.getElementById("appUI");
const loginUI = document.getElementById("loginUI");
const bottomNav = document.getElementById("bottomNav");
const viewTracker = document.getElementById("viewTracker");
const viewStats = document.getElementById("viewStats");
const viewCoach = document.getElementById("viewCoach");
const viewAdmin = document.getElementById("viewAdmin");
const navTrack = document.getElementById("navTrack");
const navStats = document.getElementById("navStats");
const navCoach = document.getElementById("navCoach");
const navAdmin = document.getElementById("navAdmin");
const unifiedSelect = document.getElementById("unifiedSelect");
const teamSelect = document.getElementById("teamSelect");
const adminTeamSelect = document.getElementById("adminTeamSelect");
const coachTeamSelect = document.getElementById("coachTeamSelect");
const playerDropdown = document.getElementById("playerDropdown");
const playerSelectArea = document.getElementById("playerSelectArea");
const manualNameArea = document.getElementById("manualNameArea");

// --- LOGGING ---
async function logSystemEvent(type, detail) {
    addDoc(collection(db, "logs_system"), { type: type, detail: detail, user: auth.currentUser ? auth.currentUser.email : "system", timestamp: new Date() });
}
async function logSecurityEvent(type, detail) {
    addDoc(collection(db, "logs_security"), { type: type, detail: detail, user: auth.currentUser ? auth.currentUser.email : "system", timestamp: new Date() });
}

// --- CONFIG LOAD ---
async function fetchConfig() {
    try {
        const teamSnap = await getDoc(doc(db, "config", "teams"));
        if (teamSnap.exists()) globalTeams = teamSnap.data().list;
        else { globalTeams = dbData.teams; await setDoc(doc(db, "config", "teams"), { list: globalTeams }); }
    } catch (e) { globalTeams = dbData.teams; }

    try {
        const adminSnap = await getDoc(doc(db, "config", "admins"));
        if (adminSnap.exists()) globalAdmins = adminSnap.data().list;
        else { globalAdmins = [DIRECTOR_EMAIL]; await setDoc(doc(db, "config", "admins"), { list: globalAdmins }); }
    } catch (e) { globalAdmins = [DIRECTOR_EMAIL]; }
    
    populateDropdowns();
}

function populateDropdowns() {
    teamSelect.innerHTML = '<option value="" disabled selected>Select Your Team...</option>';
    teamSelect.innerHTML += `<option value="unassigned" style="font-weight:bold; color:#00263A;">★ Unassigned / Tryouts</option>`;
    globalTeams.forEach(t => { const opt = document.createElement("option"); opt.value = t.id; opt.textContent = t.name; teamSelect.appendChild(opt); });
    
    if(coachTeamSelect) {
        coachTeamSelect.innerHTML = "";
        globalTeams.forEach(t => { const opt = document.createElement("option"); opt.value = t.id; opt.textContent = t.name; coachTeamSelect.appendChild(opt); });
    }
}

// --- AUTHENTICATION ---
if(loginGoogleBtn) {
    loginGoogleBtn.addEventListener("click", () => {
        console.log("Google Login Clicked");
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider) // Changed to Popup to prevent loop
            .then(() => { console.log("Google Sign In Success"); })
            .catch((error) => {
                console.error("Google Error:", error);
                authErrorMsg.textContent = error.message;
                authErrorMsg.style.display = "block";
            });
    });
}

if(loginEmailBtn) {
    loginEmailBtn.addEventListener("click", () => {
        const email = document.getElementById("authEmail").value;
        const pass = document.getElementById("authPassword").value;
        if(!email || !pass) { authErrorMsg.textContent = "Enter email & password"; authErrorMsg.style.display = "block"; return; }
        signInWithEmailAndPassword(auth, email, pass).catch((e) => { authErrorMsg.textContent = e.message; authErrorMsg.style.display = "block"; });
    });
}

if(signupEmailBtn) {
    signupEmailBtn.addEventListener("click", () => {
        const email = document.getElementById("authEmail").value;
        const pass = document.getElementById("authPassword").value;
        if(!email || !pass) { authErrorMsg.textContent = "Enter email & password"; authErrorMsg.style.display = "block"; return; }
        createUserWithEmailAndPassword(auth, email, pass).catch((e) => { authErrorMsg.textContent = e.message; authErrorMsg.style.display = "block"; });
    });
}

// --- AUTH STATE MONITOR ---
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("User logged in:", user.email);
    loginUI.style.display = "none"; 
    appUI.style.display = "block"; 
    bottomNav.style.display = "flex";
    
    document.getElementById("coachName").textContent = `Logged in: ${user.email}`;
    await fetchConfig(); 
    loadUserProfile();
    
    const isDirector = globalAdmins.map(e => e.toLowerCase()).includes(user.email.toLowerCase());
    const myTeams = globalTeams.filter(t => t.coachEmail.toLowerCase() === user.email.toLowerCase());
    
    if(isDirector || myTeams.length > 0) {
        navCoach.style.display = "flex";
        const adminControls = document.getElementById("adminControls");
        adminTeamSelect.innerHTML = "";
        
        if (isDirector) {
            navAdmin.style.display = "flex"; 
            adminControls.style.display = "block"; 
            const allOpt = document.createElement("option"); allOpt.value = "all"; allOpt.textContent = "View All Teams";
            adminTeamSelect.appendChild(allOpt);
            globalTeams.forEach(t => { const opt = document.createElement("option"); opt.value = t.id; opt.textContent = t.name; adminTeamSelect.appendChild(opt); });
            currentCoachTeamId = "all";
        } else {
            if (myTeams.length > 1) {
                adminControls.style.display = "block"; 
                myTeams.forEach(t => { const opt = document.createElement("option"); opt.value = t.id; opt.textContent = t.name; adminTeamSelect.appendChild(opt); });
                currentCoachTeamId = myTeams[0].id;
            } else {
                adminControls.style.display = "none"; 
                currentCoachTeamId = myTeams[0].id;
            }
        }
        
        adminTeamSelect.addEventListener("change", (e) => { currentCoachTeamId = e.target.value; loadCoachDashboard(isDirector, myTeams); });
        if(isDirector) { renderAdminTables(); loadLogs("logs_system"); }
    }
    
    loadStats(); resizeCanvas();
  } else {
    console.log("User logged out");
    loginUI.style.display = "flex"; // Ensure centered flex layout
    appUI.style.display = "none"; 
    bottomNav.style.display = "none";
  }
});

// --- SMART ROSTER ---
teamSelect.addEventListener("change", async (e) => {
    const teamId = e.target.value;
    const savedFirst = document.getElementById("playerFirst").value.trim().toLowerCase();
    const savedLast = document.getElementById("playerLast").value.trim().toLowerCase();
    const fullSavedName = `${savedFirst} ${savedLast}`;

    playerSelectArea.style.display = "none"; manualNameArea.style.display = "block";
    playerDropdown.innerHTML = '<option value="" disabled selected>Select Player...</option>';
    if (teamId === "unassigned") return; 

    try {
        const docRef = doc(db, "rosters", teamId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().players && docSnap.data().players.length > 0) {
            const players = docSnap.data().players.sort();
            players.forEach(p => {
                const opt = document.createElement("option"); opt.value = p; opt.textContent = p;
                if (p.toLowerCase() === fullSavedName) opt.selected = true;
                playerDropdown.appendChild(opt);
            });
            const manualOpt = document.createElement("option"); manualOpt.value = "manual"; manualOpt.textContent = "Not listed? (Type Manual)"; manualOpt.style.color = "#8A8D8F";
            playerDropdown.appendChild(manualOpt);
            playerSelectArea.style.display = "block"; manualNameArea.style.display = "none";
        }
    } catch (e) { console.error("Roster error", e); }
});

playerDropdown.addEventListener("change", (e) => {
    if (e.target.value === "manual") { manualNameArea.style.display = "block"; document.getElementById("playerFirst").focus(); } 
    else { manualNameArea.style.display = "none"; }
});

// --- ADMIN ---
function renderAdminTables() {
    const teamTbody = document.getElementById("teamTable").querySelector("tbody");
    teamTbody.innerHTML = globalTeams.map(t => `<tr><td>${t.id}</td><td>${t.name}</td><td>${t.coachEmail}</td><td><button class="action-btn btn-delete" onclick="window.deleteTeam('${t.id}')">X</button></td></tr>`).join("");
    const adminTbody = document.getElementById("adminTable").querySelector("tbody");
    adminTbody.innerHTML = globalAdmins.map(email => `<tr><td>${email}</td><td>${email.toLowerCase() === DIRECTOR_EMAIL.toLowerCase() ? 'Master' : `<button class="action-btn btn-delete" onclick="window.deleteAdmin('${email}')">X</button>`}</td></tr>`).join("");
}
window.deleteTeam = async (id) => { if(!confirm(`Delete ${id}?`)) return; globalTeams = globalTeams.filter(t => t.id !== id); await setDoc(doc(db, "config", "teams"), { list: globalTeams }); renderAdminTables(); populateDropdowns(); };
window.deleteAdmin = async (email) => { if(!confirm(`Remove ${email}?`)) return; globalAdmins = globalAdmins.filter(e => e !== email); await setDoc(doc(db, "config", "admins"), { list: globalAdmins }); renderAdminTables(); };
document.getElementById("addTeamBtn").addEventListener("click", async () => {
    const id = document.getElementById("newTeamId").value.trim(); const name = document.getElementById("newTeamName").value.trim(); const email = document.getElementById("newCoachEmail").value.trim();
    if(!id || !name) return alert("Missing fields");
    const idx = globalTeams.findIndex(t => t.id === id); if(idx >= 0) globalTeams[idx] = { id, name, coachEmail: email }; else globalTeams.push({ id, name, coachEmail: email });
    await setDoc(doc(db, "config", "teams"), { list: globalTeams }); alert("Saved"); renderAdminTables(); populateDropdowns();
});
document.getElementById("addAdminBtn").addEventListener("click", async () => {
    const email = document.getElementById("newAdminEmail").value.trim().toLowerCase();
    if(!email || globalAdmins.includes(email)) return; globalAdmins.push(email); await setDoc(doc(db, "config", "admins"), { list: globalAdmins }); alert("Added"); renderAdminTables();
});

// --- LOGS ---
document.getElementById("tabSysLogs").addEventListener("click", () => loadLogs("logs_system"));
document.getElementById("tabSecLogs").addEventListener("click", () => loadLogs("logs_security"));
async function loadLogs(collectionName) {
    document.querySelectorAll(".log-tab").forEach(b => { b.classList.remove("active"); b.style.background = "#f8fafc"; });
    const activeTab = collectionName === "logs_system" ? document.getElementById("tabSysLogs") : document.getElementById("tabSecLogs");
    activeTab.classList.add("active"); activeTab.style.background = "white";
    const container = document.getElementById("logContainer"); container.innerHTML = "Loading...";
    const q = query(collection(db, collectionName), orderBy("timestamp", "desc"), limit(20));
    const snap = await getDocs(q);
    if(snap.empty) { container.innerHTML = "No logs."; return; }
    container.innerHTML = "";
    snap.forEach(doc => { const d = doc.data(); const date = new Date(d.timestamp.seconds*1000).toLocaleString();
        container.innerHTML += `<div style="border-bottom:1px solid #eee; padding:4px;"><span style="color:#888; font-size:10px;">${date}</span> <b>${d.type}</b>: ${d.detail}</div>`;
    });
}
document.getElementById("runSecurityAuditBtn").addEventListener("click", () => { logSecurityEvent("MANUAL_AUDIT", "Triggered by user"); alert("Logged."); loadLogs("logs_security"); });
document.getElementById("generateTestLogBtn").addEventListener("click", () => { logSystemEvent("TEST_LOG", "Test entry."); alert("Logged."); loadLogs("logs_system"); });

// --- NAVIGATION ---
globalLogoutBtn.addEventListener("click", () => { signOut(auth).then(() => location.reload()); });
function switchTab(tab) { 
    [viewTracker, viewStats, viewCoach, viewAdmin].forEach(v => v.style.display = "none"); 
    [navTrack, navStats, navCoach, navAdmin].forEach(n => n.classList.remove("active")); 
    if (tab === 'track') { viewTracker.style.display = "block"; navTrack.classList.add("active"); setTimeout(resizeCanvas, 100); } 
    if (tab === 'stats') { viewStats.style.display = "block"; navStats.classList.add("active"); loadStats(); } 
    if (tab === 'coach') { viewCoach.style.display = "block"; navCoach.classList.add("active"); loadCoachDashboard(globalAdmins.map(e=>e.toLowerCase()).includes(auth.currentUser.email.toLowerCase()), globalTeams.filter(t => t.coachEmail.toLowerCase() === auth.currentUser.email.toLowerCase())); } 
    if (tab === 'admin') { viewAdmin.style.display = "block"; navAdmin.classList.add("active"); } 
}
navTrack.addEventListener("click", () => switchTab('track')); navStats.addEventListener("click", () => switchTab('stats')); navCoach.addEventListener("click", () => switchTab('coach')); navAdmin.addEventListener("click", () => switchTab('admin'));

// --- DRILL SELECTOR ---
if(unifiedSelect.options.length === 1) {
    const cardioGroup = document.createElement("optgroup"); cardioGroup.label = "Cardio";
    dbData.foundationSkills.filter(s => s.type === 'cardio').forEach(s => { const opt = document.createElement("option"); opt.value = s.name; opt.textContent = s.name; cardioGroup.appendChild(opt); }); unifiedSelect.appendChild(cardioGroup);
    const techSkills = dbData.foundationSkills.filter(s => s.type === 'foundation');
    const categories = {}; techSkills.forEach(s => { if (!categories[s.category]) categories[s.category] = []; categories[s.category].push(s); });
    for (const [cat, skills] of Object.entries(categories)) { const group = document.createElement("optgroup"); group.label = cat; skills.forEach(s => { const opt = document.createElement("option"); opt.value = s.name; opt.textContent = s.name; group.appendChild(opt); }); unifiedSelect.appendChild(group); }
}
unifiedSelect.addEventListener("change", (e) => {
    const skill = dbData.foundationSkills.find(s => s.name === e.target.value);
    document.getElementById("drillInfoBox").style.display = "block"; document.getElementById("drillDesc").innerText = skill.drill;
    const vidBtn = document.getElementById("watchVideoBtn");
    if(skill.video) { vidBtn.style.display="inline-block"; vidBtn.onclick = () => { document.getElementById("videoPlayer").src = skill.video; document.getElementById("videoModal").style.display = "block"; }; } else { vidBtn.style.display = "none"; }
});
document.getElementById("addToSessionBtn").addEventListener("click", () => {
    const name = unifiedSelect.value; if(!name) return alert("Select Drill");
    const sets = document.getElementById("inputSets").value || "-"; const reps = document.getElementById("inputReps").value || "-";
    currentSessionItems.push({ name, sets, reps }); renderSessionList();
});
function renderSessionList() {
    const list = document.getElementById("sessionList");
    if(currentSessionItems.length === 0) { list.innerHTML = `<li style="text-align:center; padding:15px; color:#94a3b8;">Empty</li>`; return; }
    list.innerHTML = currentSessionItems.map((i, idx) => `<li><b>${idx+1}. ${i.name}</b> <span style="float:right">${i.sets}x${i.reps}</span></li>`).join("");
}

document.getElementById("submitWorkoutBtn").addEventListener("click", async () => {
    if (currentSessionItems.length === 0) return alert("Empty Session");
    const teamId = teamSelect.value; const mins = document.getElementById("totalMinutes").value;
    let playerName = (playerSelectArea.style.display !== "none" && playerDropdown.value !== "manual") ? playerDropdown.value : `${document.getElementById("playerFirst").value} ${document.getElementById("playerLast").value}`;
    if(!teamId || !playerName || !mins) return alert("Missing Info");
    if (isSignatureBlank) { canvas.style.borderColor = "#dc2626"; return alert("Sign Required"); }
    
    if(manualNameArea.style.display !== "none") saveUserProfile(document.getElementById("playerFirst").value, document.getElementById("playerLast").value, teamId);
    else localStorage.setItem("aggie_team", teamId);

    const sig = canvas.toDataURL();
    const selectedTeam = globalTeams.find(t => t.id === teamId);
    const session = { coachEmail: selectedTeam ? selectedTeam.coachEmail : DIRECTOR_EMAIL, teamId, timestamp: new Date(), player: playerName, minutes: mins, drills: currentSessionItems, drillSummary: currentSessionItems.map(i=>`${i.name}(${i.sets}x${i.reps})`).join(", "), outcome: document.getElementById("outcome").querySelector(".active").dataset.val, notes: document.getElementById("notes").value, signatureImg: sig };
    try { await addDoc(collection(db, "reps"), session); alert("Saved!"); logSystemEvent("SESSION", `${playerName} - ${mins}m`); currentSessionItems = []; renderSessionList(); document.getElementById("totalMinutes").value=""; document.getElementById("notes").value=""; ctx.clearRect(0,0,canvas.width,canvas.height); isSignatureBlank=true; loadStats(); } catch(e) { alert("Error"); }
});

// --- UTILS ---
function updateTimer() { seconds++; const m = Math.floor(seconds/60).toString().padStart(2,"0"); const s = (seconds%60).toString().padStart(2,"0"); document.getElementById("timerDisplay").innerText = `${m}:${s}`; }
document.getElementById("startTimer").addEventListener("click", () => { if(!timerInterval) timerInterval=setInterval(updateTimer,1000); });
document.getElementById("stopTimer").addEventListener("click", () => { clearInterval(timerInterval); timerInterval=null; document.getElementById("totalMinutes").value = Math.floor(seconds/60) || 1; });
document.getElementById("resetTimer").addEventListener("click", () => { clearInterval(timerInterval); timerInterval=null; seconds=0; document.getElementById("timerDisplay").innerText="00:00"; });
function resizeCanvas() { if(canvas.parentElement) { canvas.width = canvas.parentElement.offsetWidth; canvas.height = 150; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#00263A"; } }
window.addEventListener('resize', resizeCanvas);
const canvas = document.getElementById("signatureCanvas"); const ctx = canvas.getContext("2d");
let isDrawing = false;
function startDraw(e) { isDrawing=true; ctx.beginPath(); draw(e); }
function endDraw() { isDrawing=false; ctx.beginPath(); checkSignature(); }
function draw(e) { if(!isDrawing) return; e.preventDefault(); isSignatureBlank=false; const rect = canvas.getBoundingClientRect(); const x = (e.clientX || e.touches[0].clientX) - rect.left; const y = (e.clientY || e.touches[0].clientY) - rect.top; ctx.lineTo(x, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y); }
function checkSignature() { canvas.style.borderColor = "#16a34a"; }
canvas.addEventListener('mousedown', startDraw); canvas.addEventListener('mouseup', endDraw); canvas.addEventListener('mousemove', draw); canvas.addEventListener('touchstart', startDraw); canvas.addEventListener('touchend', endDraw); canvas.addEventListener('touchmove', draw);
document.getElementById("clearSigBtn").addEventListener("click", () => { ctx.clearRect(0,0,canvas.width,canvas.height); isSignatureBlank=true; canvas.style.borderColor="#cbd5e1"; });

async function loadStats() {
    const q = query(collection(db, "reps"), orderBy("timestamp", "desc"), limit(50)); const snap = await getDocs(q); const logs = []; let mins = 0;
    snap.forEach(d => { logs.push(d.data()); mins += parseInt(d.data().minutes || 0); });
    document.getElementById("statTotal").innerText = logs.length; document.getElementById("statTime").innerText = mins;
    const xp = (logs.length * 10) + mins; let level = "Rookie"; if(xp>100) level="Starter"; if(xp>500) level="Pro"; if(xp>1000) level="Elite";
    document.getElementById("userLevelDisplay").innerText = `${level}`; document.getElementById("xpBar").style.width = `${Math.min((xp%500)/500*100, 100)}%`;
    renderCalendar(logs); renderPlayerTrendChart(logs); renderTeamLeaderboard(logs);
}
function renderCalendar(logs) {
    const grid = document.getElementById("calendarDays"); grid.innerHTML=""; const today=new Date(); const daysInMonth = new Date(today.getFullYear(), today.getMonth()+1, 0).getDate();
    for(let i=1; i<=daysInMonth; i++) {
        const d = new Date(today.getFullYear(), today.getMonth(), i); const hasLog = logs.some(l => new Date(l.timestamp.seconds*1000).toDateString() === d.toDateString());
        grid.innerHTML += `<div class="cal-day ${i===today.getDate()?'today':''} ${hasLog?'has-log':''}" onclick="${hasLog?`showDayDetails('${d.toDateString()}')`:''}">${i}${hasLog?'<div class="cal-dot"></div>':''}</div>`;
    }
    // Fix scope for inline onclick
    window.showDayDetails = (dateStr) => {
        document.getElementById("dayModalDate").innerText = dateStr; 
        const dayLogs = logs.filter(l => new Date(l.timestamp.seconds*1000).toDateString() === dateStr);
        document.getElementById("dayModalContent").innerHTML = dayLogs.map(l => `<div style="border-bottom:1px solid #eee; padding:5px;"><b>${l.player}</b>: ${l.drillSummary} (${l.minutes}m)</div>`).join("");
        document.getElementById("dayModal").style.display = "block";
    };
}
function renderPlayerTrendChart(logs) {
    const ctx = document.getElementById('playerTrendChart').getContext('2d'); if(teamChart) teamChart.destroy();
    const data = Array(7).fill(0); const labels = [];
    for(let i=6; i>=0; i--) { const d = new Date(); d.setDate(new Date().getDate()-i); labels.push(d.toLocaleDateString('en-US',{weekday:'short'})); data[6-i] = logs.filter(l=>new Date(l.timestamp.seconds*1000).toDateString() === d.toDateString()).reduce((s,l)=>s+parseInt(l.minutes),0); }
    teamChart = new Chart(ctx, { type: 'bar', data: { labels, datasets: [{ data, backgroundColor: "#00263A", borderRadius: 4 }] }, options: { plugins: { legend: {display:false} }, scales: { x: {grid:{display:false}}, y:{beginAtZero:true} } } });
}
function renderTeamLeaderboard(logs) {
    const stats = {}; logs.forEach(l => { stats[l.player] = (stats[l.player] || 0) + parseInt(l.minutes); });
    document.getElementById("teamLeaderboardTable").querySelector("tbody").innerHTML = Object.entries(stats).sort((a,b)=>b[1]-a[1]).slice(0,5).map((e,i) => `<tr><td>${i+1}</td><td>${e[0]}</td><td>${e[1]}m</td></tr>`).join("");
}

// ROSTER UPLOAD HANDLER
const rosterInput = document.getElementById("rosterPdfInput");
if(rosterInput) {
    rosterInput.addEventListener("change", async (e) => {
        const file = e.target.files[0]; if(!file) return;
        const btn = document.getElementById("rosterPdfInput"); btn.disabled = true;
        try {
            const buf = await file.arrayBuffer(); const pdf = await pdfjsLib.getDocument(buf).promise;
            let text = "";
            for(let i=1; i<=pdf.numPages; i++) { const page = await pdf.getPage(i); const content = await page.getTextContent(); text += content.items.map(i=>i.str).join(" ") + "\n"; }
            // Simple logic: Extract likely names (2 words, no numbers)
            const names = text.split(/\s+/).filter(w => /^[A-Z][a-z]+$/.test(w)); 
            // Pair them up loosely for demo (In real app, needs strict row parsing)
            const paired = []; for(let i=0; i<names.length-1; i+=2) paired.push(names[i] + " " + names[i+1]);
            document.getElementById("rosterTextRaw").value = paired.join("\n");
            document.getElementById("rosterUploadStep1").style.display = "none"; document.getElementById("rosterReviewArea").style.display = "block";
        } catch(err) { alert("PDF Error"); }
        btn.disabled = false;
    });
}
document.getElementById("saveParsedRosterBtn").addEventListener("click", async () => {
    const text = document.getElementById("rosterTextRaw").value;
    const tid = currentCoachTeamId || "unassigned";
    if(tid==="unassigned") return alert("Select Team First");
    await setDoc(doc(db, "rosters", tid), { players: text.split("\n"), lastUpdated: new Date() });
    alert("Saved!"); document.getElementById("rosterReviewArea").style.display="none"; document.getElementById("rosterUploadStep1").style.display="block";
});

// CLOSE MODALS
window.onclick = (e) => { if(e.target.className === "modal") e.target.style.display = "none"; };
document.querySelectorAll(".close-btn").forEach(b => b.onclick = () => b.closest(".modal").style.display="none");