import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithRedirect, GoogleAuthProvider, onAuthStateChanged, signOut } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, orderBy, limit, enableIndexedDbPersistence, doc, setDoc, getDoc, deleteDoc } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { dbData } from "./data.js";

// MASTER FALLBACK
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
let globalTeams = [];
let globalAdmins = [DIRECTOR_EMAIL]; 
let timerInterval;
let seconds = 0;
let isSignatureBlank = true; 
let teamChart = null; // Defined explicitly to prevent errors

// REFS
const loginBtn = document.getElementById("loginBtn");
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

// LOGGING
async function logSystemEvent(type, detail) {
    addDoc(collection(db, "logs_system"), { type: type, detail: detail, user: auth.currentUser ? auth.currentUser.email : "system", timestamp: new Date() });
}
async function logSecurityEvent(type, detail) {
    addDoc(collection(db, "logs_security"), { type: type, detail: detail, user: auth.currentUser ? auth.currentUser.email : "system", timestamp: new Date() });
}

// CONFIG
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

// --- NEW: SMART ROSTER SELECTOR (With Auto-Select Fix) ---
teamSelect.addEventListener("change", async (e) => {
    const teamId = e.target.value;
    
    // 1. Get saved profile to try and auto-match
    const savedFirst = document.getElementById("playerFirst").value.trim().toLowerCase();
    const savedLast = document.getElementById("playerLast").value.trim().toLowerCase();
    const fullSavedName = `${savedFirst} ${savedLast}`;

    // Reset UI
    playerSelectArea.style.display = "none";
    manualNameArea.style.display = "block";
    playerDropdown.innerHTML = '<option value="" disabled selected>Select Player...</option>';
    
    if (teamId === "unassigned") return; // Keep manual

    try {
        const docRef = doc(db, "rosters", teamId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().players && docSnap.data().players.length > 0) {
            // Roster Exists!
            const players = docSnap.data().players.sort();
            
            // Populate Dropdown
            let matchFound = false;
            players.forEach(p => {
                const opt = document.createElement("option");
                opt.value = p;
                opt.textContent = p;
                // AUTO SELECT IF MATCHES PROFILE
                if (p.toLowerCase() === fullSavedName) {
                    opt.selected = true;
                    matchFound = true;
                }
                playerDropdown.appendChild(opt);
            });
            
            // Add "Manual" Option
            const manualOpt = document.createElement("option");
            manualOpt.value = "manual";
            manualOpt.textContent = "name not listed? (type manually)";
            manualOpt.style.color = "#8A8D8F";
            playerDropdown.appendChild(manualOpt);

            // Show Dropdown, Hide Manual
            playerSelectArea.style.display = "block";
            manualNameArea.style.display = "none";
        }
    } catch (e) { console.error("Roster fetch error", e); }
});

// If they select "Manual" in dropdown, show the inputs
playerDropdown.addEventListener("change", (e) => {
    if (e.target.value === "manual") {
        manualNameArea.style.display = "block";
        document.getElementById("playerFirst").focus();
    } else {
        manualNameArea.style.display = "none";
    }
});

// ADMIN LOGIC
function renderAdminTables() {
    const teamTbody = document.getElementById("teamTable").querySelector("tbody");
    teamTbody.innerHTML = globalTeams.map(t => `<tr><td>${t.id}</td><td>${t.name}</td><td>${t.coachEmail}</td><td><button class="admin-action-btn btn-delete" onclick="window.deleteTeam('${t.id}')">Delete</button></td></tr>`).join("");
    const adminTbody = document.getElementById("adminTable").querySelector("tbody");
    adminTbody.innerHTML = globalAdmins.map(email => `<tr><td>${email}</td><td>${email.toLowerCase() === DIRECTOR_EMAIL.toLowerCase() ? '<span style="color:#aaa">Master</span>' : `<button class="admin-action-btn btn-delete" onclick="window.deleteAdmin('${email}')">Remove</button>`}</td></tr>`).join("");
}
window.deleteTeam = async (id) => {
    if(!confirm(`Delete team ${id}?`)) return;
    globalTeams = globalTeams.filter(t => t.id !== id);
    await setDoc(doc(db, "config", "teams"), { list: globalTeams });
    renderAdminTables(); populateDropdowns(); logSystemEvent("TEAM_DELETED", `ID: ${id}`);
};
window.deleteAdmin = async (email) => {
    if(!confirm(`Remove admin access for ${email}?`)) return;
    globalAdmins = globalAdmins.filter(e => e !== email);
    await setDoc(doc(db, "config", "admins"), { list: globalAdmins });
    renderAdminTables(); logSecurityEvent("ADMIN_REMOVED", `Removed: ${email}`);
};
document.getElementById("addTeamBtn").addEventListener("click", async () => {
    const id = document.getElementById("newTeamId").value.trim();
    const name = document.getElementById("newTeamName").value.trim();
    const email = document.getElementById("newCoachEmail").value.trim();
    if(!id || !name || !email) return alert("Fill all fields");
    const idx = globalTeams.findIndex(t => t.id === id);
    if(idx >= 0) globalTeams[idx] = { id, name, coachEmail: email }; else globalTeams.push({ id, name, coachEmail: email });
    await setDoc(doc(db, "config", "teams"), { list: globalTeams });
    alert("Team Saved"); document.getElementById("newTeamId").value=""; document.getElementById("newTeamName").value=""; document.getElementById("newCoachEmail").value=""; renderAdminTables(); populateDropdowns(); logSystemEvent("TEAM_UPDATED", `Team: ${id}`);
});
document.getElementById("addAdminBtn").addEventListener("click", async () => {
    const email = document.getElementById("newAdminEmail").value.trim().toLowerCase();
    if(!email || globalAdmins.includes(email)) return;
    globalAdmins.push(email); await setDoc(doc(db, "config", "admins"), { list: globalAdmins });
    alert("Admin Added"); document.getElementById("newAdminEmail").value=""; renderAdminTables(); logSecurityEvent("ADMIN_ADDED", `Added: ${email}`);
});
document.getElementById("tabSysLogs").addEventListener("click", () => loadLogs("logs_system"));
document.getElementById("tabSecLogs").addEventListener("click", () => loadLogs("logs_security"));
async function loadLogs(collectionName) {
    document.querySelectorAll(".log-tab").forEach(b => b.classList.remove("active"));
    if(collectionName === "logs_system") document.getElementById("tabSysLogs").classList.add("active"); else document.getElementById("tabSecLogs").classList.add("active");
    const container = document.getElementById("logContainer"); container.innerHTML = "Loading...";
    const q = query(collection(db, collectionName), orderBy("timestamp", "desc"), limit(20));
    const snap = await getDocs(q);
    if(snap.empty) { container.innerHTML = "No logs found."; return; }
    container.innerHTML = "";
    snap.forEach(doc => {
        const d = doc.data(); const date = new Date(d.timestamp.seconds*1000).toLocaleString();
        const styleClass = collectionName === "logs_security" ? "log-sec" : "log-type";
        container.innerHTML += `<div class="log-entry"><span class="log-time">[${date}]</span><span class="${styleClass}">${d.type}</span>: ${d.detail} (${d.user})</div>`;
    });
}
document.getElementById("runSecurityAuditBtn").addEventListener("click", () => {
    logSecurityEvent("MANUAL_AUDIT", "Audit triggered by user"); alert("Audit log entry created."); loadLogs("logs_security");
});

// MODAL
window.addEventListener("click", (event) => {
    const videoModal = document.getElementById("videoModal"); const dayModal = document.getElementById("dayModal");
    if (event.target === videoModal) { videoModal.style.display = "none"; document.getElementById("videoPlayer").src = ""; }
    if (event.target === dayModal) dayModal.style.display = "none";
});
document.getElementById("closeModal").addEventListener("click", () => { document.getElementById("videoModal").style.display = "none"; document.getElementById("videoPlayer").src = ""; });
document.getElementById("closeDayModal").addEventListener("click", () => { document.getElementById("dayModal").style.display = "none"; });

// --- ROSTER UPLOAD (SMART ROW PARSING) ---
document.getElementById("rosterPdfInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if(!file || file.type !== "application/pdf") return alert("Please select a PDF file.");

    const btn = document.getElementById("rosterPdfInput");
    const statusText = document.createElement("div"); 
    statusText.innerText = "Scanning PDF structure...";
    btn.parentNode.appendChild(statusText);
    btn.disabled = true;

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
        let extractedRows = [];

        // 1. Loop through all pages
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            // 2. Map items with their Y-Coordinate
            const items = textContent.items.map(item => ({
                text: item.str.trim(),
                y: Math.round(item.transform[5]), 
                x: Math.round(item.transform[4]) 
            })).filter(i => i.text.length > 0);

            // 3. Group by Y-Coordinate (Create Rows)
            const rows = {};
            items.forEach(item => {
                if (!rows[item.y]) rows[item.y] = [];
                rows[item.y].push(item);
            });

            // 4. Flatten to sorted array of rows (Top to Bottom)
            const sortedY = Object.keys(rows).sort((a, b) => b - a); 
            
            sortedY.forEach(y => {
                const cols = rows[y].sort((a, b) => a.x - b.x);
                extractedRows.push(cols.map(c => c.text));
            });
        }

        // 5. "Smart" Filter Logic
        const cleanNames = extractedRows.filter(row => {
            const rowString = row.join(" ");
            const hasDate = /\d{1,2}\/\d{1,2}\/\d{4}/.test(rowString);
            const isHeader = rowString.toLowerCase().includes("last name") || rowString.toLowerCase().includes("printed on");
            return hasDate && !isHeader;
        })
        .map(row => {
            // 6. Extraction: Isolate the Name
            const textOnly = row.filter(str => {
                return !/\d/.test(str) && !['Male','Female','Boy','Girl','Approved'].includes(str);
            });

            if (textOnly.length >= 2) {
                return `${textOnly[1]} ${textOnly[0]}`; 
            } else {
                return textOnly.join(" ");
            }
        });

        // 7. Update UI
        document.getElementById("rosterUploadStep1").style.display = "none";
        document.getElementById("rosterReviewArea").style.display = "block";
        document.getElementById("rosterTextRaw").value = cleanNames.join("\n");
        statusText.remove();

    } catch(err) {
        console.error(err);
        statusText.innerText = "Error parsing. Please enter manually.";
        alert("Could not parse PDF layout.");
    }
    btn.disabled = false;
});

// --- NEW: SAVE ROSTER BUTTON LOGIC ---
const saveRosterBtn = document.getElementById("saveParsedRosterBtn"); 
if (saveRosterBtn) {
    saveRosterBtn.addEventListener("click", async () => {
        const rawText = document.getElementById("rosterTextRaw").value;
        const targetTeamId = document.getElementById("adminTeamSelect").value; 

        if (!targetTeamId || targetTeamId === "unassigned" || targetTeamId === "all") {
            return alert("Please select a specific team in the Admin panel (above) to attach this roster to.");
        }

        if (!rawText) return alert("Roster list is empty.");

        // Split text by new lines to get array
        const playerList = rawText.split("\n").map(name => name.trim()).filter(name => name.length > 0);

        try {
            await setDoc(doc(db, "rosters", targetTeamId), {
                players: playerList,
                lastUpdated: new Date()
            });
            
            alert(`Success! Saved ${playerList.length} players to team: ${targetTeamId}`);
            
            // Cleanup UI
            document.getElementById("rosterReviewArea").style.display = "none";
            document.getElementById("rosterPdfInput").value = ""; 
            document.getElementById("rosterUploadStep1").style.display = "block";
            
        } catch (error) {
            console.error("Error saving roster:", error);
            alert("Error saving to database.");
        }
    });
}


// AUTH & STARTUP
onAuthStateChanged(auth, async (user) => {
  if (user) {
    loginUI.style.display = "none"; appUI.style.display = "block"; bottomNav.style.display = "flex";
    globalLogoutBtn.style.display = "block"; 
    document.getElementById("coachName").textContent = `Logged in: ${user.displayName}`;
    await fetchConfig(); loadUserProfile();
    
    const isDirector = globalAdmins.map(e => e.toLowerCase()).includes(user.email.toLowerCase());
    const assignedTeam = globalTeams.find(t => t.coachEmail.toLowerCase() === user.email.toLowerCase());
    
    if(isDirector || assignedTeam) {
        navCoach.style.display = "flex";
        if(isDirector) {
            navAdmin.style.display = "flex"; document.getElementById("adminControls").style.display = "block";
            if(adminTeamSelect.options.length <= 1) { 
                adminTeamSelect.innerHTML = '<option value="all">All Teams</option>';
                globalTeams.forEach(t => { const opt = document.createElement("option"); opt.value = t.id; opt.textContent = t.name; adminTeamSelect.appendChild(opt); }); 
                adminTeamSelect.addEventListener("change", () => loadCoachDashboard(true)); 
            }
            renderAdminTables(); loadLogs("logs_system");
        }
    }
    loadStats(); resizeCanvas();
  } else {
    loginUI.style.display = "block"; appUI.style.display = "none"; bottomNav.style.display = "none";
    globalLogoutBtn.style.display = "none";
  }
});

// STANDARD HELPERS
function saveUserProfile(first, last, team) { localStorage.setItem("aggie_first", first); localStorage.setItem("aggie_last", last); localStorage.setItem("aggie_team", team); }
function loadUserProfile() { const f = localStorage.getItem("aggie_first"); const l = localStorage.getItem("aggie_last"); const t = localStorage.getItem("aggie_team"); if(f) document.getElementById("playerFirst").value = f; if(l) document.getElementById("playerLast").value = l; if(t) { document.getElementById("teamSelect").value = t; /* Trigger change for smart roster */ const event = new Event('change'); document.getElementById("teamSelect").dispatchEvent(event); } }
loginBtn.addEventListener("click", () => { const provider = new GoogleAuthProvider(); signInWithRedirect(auth, provider); });
globalLogoutBtn.addEventListener("click", () => { signOut(auth).then(() => location.reload()); });
function switchTab(tab) { [viewTracker, viewStats, viewCoach, viewAdmin].forEach(v => v.style.display = "none"); [navTrack, navStats, navCoach, navAdmin].forEach(n => n.classList.remove("active")); if (tab === 'track') { viewTracker.style.display = "block"; navTrack.classList.add("active"); setTimeout(resizeCanvas, 100); } if (tab === 'stats') { viewStats.style.display = "block"; navStats.classList.add("active"); loadStats(); } if (tab === 'coach') { viewCoach.style.display = "block"; navCoach.classList.add("active"); loadCoachDashboard(); } if (tab === 'admin') { viewAdmin.style.display = "block"; navAdmin.classList.add("active"); } }
navTrack.addEventListener("click", () => switchTab('track')); navStats.addEventListener("click", () => switchTab('stats')); navCoach.addEventListener("click", () => switchTab('coach')); navAdmin.addEventListener("click", () => switchTab('admin'));

// UNIFIED
if(unifiedSelect.options.length === 1) {
    const cardioSkills = dbData.foundationSkills.filter(s => s.type === 'cardio');
    const cardioGroup = document.createElement("optgroup"); cardioGroup.label = "Cardio & Fitness";
    cardioSkills.forEach(s => { const opt = document.createElement("option"); opt.value = s.name; opt.textContent = s.name; cardioGroup.appendChild(opt); }); unifiedSelect.appendChild(cardioGroup);
    const techSkills = dbData.foundationSkills.filter(s => s.type === 'foundation');
    const categories = {}; techSkills.forEach(s => { if (!categories[s.category]) categories[s.category] = []; categories[s.category].push(s); });
    for (const [catName, skills] of Object.entries(categories)) { const group = document.createElement("optgroup"); group.label = catName; skills.forEach(s => { const opt = document.createElement("option"); opt.value = s.name; opt.textContent = s.name; group.appendChild(opt); }); unifiedSelect.appendChild(group); }
}
unifiedSelect.addEventListener("change", (e) => {
    const skillName = e.target.value; const skillData = dbData.foundationSkills.find(s => s.name === skillName);
    const labelSets = document.getElementById("labelSets"); const labelReps = document.getElementById("labelReps"); const inputSets = document.getElementById("inputSets"); const inputReps = document.getElementById("inputReps");
    const videoBox = document.getElementById("drillInfoBox"); const descText = document.getElementById("drillDesc"); const videoBtn = document.getElementById("watchVideoBtn");
    if(skillData.type === 'cardio') { labelSets.innerText = "Miles / Intervals"; inputSets.placeholder = "e.g. 2"; labelReps.innerText = "Time (Mins)"; inputReps.placeholder = "e.g. 20"; } else { labelSets.innerText = "Sets"; inputSets.placeholder = "3"; labelReps.innerText = "Reps"; inputReps.placeholder = "50"; }
    videoBox.style.display = "block"; descText.innerText = skillData.drill;
    if(skillData.video) { videoBtn.style.display = "block"; videoBtn.onclick = () => { document.getElementById("videoPlayer").src = skillData.video; document.getElementById("videoModal").style.display = "block"; }; } else { videoBtn.style.display = "none"; }
});
document.getElementById("addToSessionBtn").addEventListener("click", () => {
    const skillName = unifiedSelect.value; if(!skillName) return alert("Select Activity");
    const sets = document.getElementById("inputSets").value || "-"; const reps = document.getElementById("inputReps").value || "-";
    currentSessionItems.push({ name: skillName, sets: sets, reps: reps }); renderSessionList(); unifiedSelect.selectedIndex = 0; document.getElementById("drillInfoBox").style.display = "none";
});
function renderSessionList() {
    const list = document.getElementById("sessionList");
    if(currentSessionItems.length === 0) { list.innerHTML = `<li style="color:#94a3b8; text-align:center; padding:10px; background:#f8fafc; border-radius:6px;">No activities added yet.</li>`; return; }
    list.innerHTML = currentSessionItems.map((item, index) => `<li style="border-bottom:1px solid #e2e8f0; padding:8px; display:flex; justify-content:space-between; align-items:center;"><span><b>${index+1}.</b> ${item.name}</span> <span style="font-size:12px; color:#64748b;">${item.sets} x ${item.reps}</span></li>`).join("");
}
document.getElementById("submitWorkoutBtn").addEventListener("click", async () => {
    const user = auth.currentUser; if (!user) return alert("Sign in first");
    if (currentSessionItems.length === 0) return alert("Stack is empty!");
    const teamId = teamSelect.value; const mins = document.getElementById("totalMinutes").value;
    
    // NEW: NAME HANDLING
    let playerName = "";
    if(playerSelectArea.style.display !== "none" && playerDropdown.value !== "manual") {
        playerName = playerDropdown.value; // From Dropdown
    } else {
        const f = document.getElementById("playerFirst").value;
        const l = document.getElementById("playerLast").value;
        if(f && l) playerName = `${f} ${l}`; // From Manual
    }

    if(!teamId) return alert("Select Team"); 
    if(!playerName) return alert("Select or Enter Name"); 
    if(!mins || mins == 0) return alert("Enter Duration");
    if (isSignatureBlank) { canvas.style.borderColor = "#dc2626"; return alert("Signature Required"); }
    
    // Only save profile if manual entry was used
    if(manualNameArea.style.display !== "none") {
        saveUserProfile(document.getElementById("playerFirst").value, document.getElementById("playerLast").value, teamId);
    } else {
        localStorage.setItem("aggie_team", teamId); // Still save team preference
    }

    const signatureData = canvas.toDataURL();
    let assignedCoachEmail = DIRECTOR_EMAIL;
    if (teamId !== "unassigned") {
        const selectedTeam = globalTeams.find(t => t.id === teamId);
        if (selectedTeam && selectedTeam.coachEmail) assignedCoachEmail = selectedTeam.coachEmail;
    }

    const drillSummary = currentSessionItems.map(i => `${i.name} (${i.sets}x${i.reps})`).join(", ");
    const sessionData = { coachEmail: assignedCoachEmail, teamId: teamId, timestamp: new Date(), player: playerName, minutes: mins, drills: currentSessionItems, drillSummary: drillSummary, outcome: document.getElementById("outcome").querySelector(".active")?.dataset.val || "success", notes: document.getElementById("notes").value, signatureImg: signatureData };
    try { await addDoc(collection(db, "reps"), sessionData); alert(`Logged! +${10 + parseInt(mins)} XP`); logSystemEvent("SESSION_LOGGED", `Player: ${playerName}, Team: ${teamId}, Mins: ${mins}`); currentSessionItems = []; renderSessionList(); document.getElementById("totalMinutes").value = ""; document.getElementById("notes").value = ""; ctx.clearRect(0, 0, canvas.width, canvas.height); isSignatureBlank = true; canvas.style.borderColor = "#cbd5e1"; canvas.style.backgroundColor = "#fcfcfc"; document.getElementById("resetTimer").click(); loadStats(); } catch(e) { console.error(e); alert("Error saving"); }
});

// TIMER
function updateTimer() { seconds++; const m = Math.floor(seconds / 60).toString().padStart(2, "0"); const s = (seconds % 60).toString().padStart(2, "0"); timerDisplay.innerText = `${m}:${s}`; }
document.getElementById("startTimer").addEventListener("click", () => { if (!timerInterval) timerInterval = setInterval(updateTimer, 1000); });
document.getElementById("stopTimer").addEventListener("click", () => { clearInterval(timerInterval); timerInterval = null; const m = Math.floor(seconds / 60); minsInput.value = m > 0 ? m : 1; });
document.getElementById("resetTimer").addEventListener("click", () => { clearInterval(timerInterval); timerInterval = null; seconds = 0; timerDisplay.innerText = "00:00"; });

// SIGNATURE
function resizeCanvas() { if(!canvas.parentElement) return; canvas.width = canvas.parentElement.offsetWidth; canvas.height = 150; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#00263A"; }
window.addEventListener('resize', resizeCanvas);
function startDraw(e) { isDrawing = true; ctx.beginPath(); draw(e); }
function endDraw() { isDrawing = false; ctx.beginPath(); checkSignature(); }
function draw(e) { if (!isDrawing) return; e.preventDefault(); isSignatureBlank = false; const rect = canvas.getBoundingClientRect(); const x = (e.clientX || e.touches[0].clientX) - rect.left; const y = (e.clientY || e.touches[0].clientY) - rect.top; ctx.lineTo(x, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y); }
function isCanvasBlank(canvas) { const context = canvas.getContext('2d'); const pixelBuffer = new Uint32Array(context.getImageData(0, 0, canvas.width, canvas.height).data.buffer); return !pixelBuffer.some(color => color !== 0); }
function checkSignature() { if (!isCanvasBlank(canvas)) { canvas.style.borderColor = "#16a34a"; canvas.style.backgroundColor = "#f0fdf4"; } }
canvas.addEventListener('mousedown', startDraw); canvas.addEventListener('mouseup', endDraw); canvas.addEventListener('mousemove', draw); canvas.addEventListener('touchstart', startDraw); canvas.addEventListener('touchend', endDraw); canvas.addEventListener('touchmove', draw);
document.getElementById("clearSigBtn").addEventListener("click", () => { ctx.clearRect(0, 0, canvas.width, canvas.height); isSignatureBlank = true; canvas.style.borderColor = "#cbd5e1"; canvas.style.backgroundColor = "#fcfcfc"; });

// HELPERS
function getPlayerColor(name) { let hash = 0; for (let i = 0; i < name.length; i++) { hash = name.charCodeAt(i) + ((hash << 5) - hash); } const hue = Math.abs(hash % 360); return `hsl(${hue}, 70%, 40%)`; }
async function loadStats() {
    const user = auth.currentUser; if (!user) return;
    const q = query(collection(db, "reps"), orderBy("timestamp", "desc"), limit(100)); const snap = await getDocs(q); const logs = []; let mins = 0;
    snap.forEach(doc => { const d = doc.data(); logs.push(d); mins += parseInt(d.minutes || 0); });
    document.getElementById("statTotal").innerText = logs.length; document.getElementById("statTime").innerText = mins;
    const xp = (logs.length * 10) + mins; let level = "Rookie"; if (xp > 100) level = "Starter"; if (xp > 500) level = "Pro"; if (xp > 1000) level = "Elite"; if (xp > 2000) level = "Legend";
    document.getElementById("userLevelDisplay").innerText = `${level} • ${xp} XP`; document.getElementById("xpBar").style.width = `${Math.min((xp%500)/500*100, 100)}%`; if(logs.length) document.getElementById("statAvg").innerText = Math.round(mins / logs.length);
    renderCalendar(logs); renderPlayerTrendChart(logs); renderTeamLeaderboard(logs);
}
function renderCalendar(logs) {
    const grid = document.getElementById("calendarDays"); const header = document.getElementById("calMonthYear"); grid.innerHTML = "";
    const activeDates = new Set(logs.map(l => new Date(l.timestamp.seconds*1000).toDateString()));
    const today = new Date(); const currentMonth = today.getMonth(); const currentYear = today.getFullYear();
    header.innerText = today.toLocaleString('default', { month: 'long', year: 'numeric' });
    const firstDay = new Date(currentYear, currentMonth, 1).getDay(); const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    for (let i = 0; i < firstDay; i++) { grid.appendChild(document.createElement("div")); }
    for (let i = 1; i <= daysInMonth; i++) {
        const dateObj = new Date(currentYear, currentMonth, i); const dayDiv = document.createElement("div"); dayDiv.className = "cal-day"; dayDiv.innerHTML = `<span>${i}</span>`;
        if (i === today.getDate()) dayDiv.classList.add("today"); if (activeDates.has(dateObj.toDateString())) { dayDiv.classList.add("has-log"); dayDiv.innerHTML += `<div class="cal-dot"></div>`; dayDiv.addEventListener("click", () => showDayDetails(dateObj, logs)); } grid.appendChild(dayDiv);
    }
}
function showDayDetails(dateObj, logs) {
    const modal = document.getElementById("dayModal"); const content = document.getElementById("dayModalContent"); document.getElementById("dayModalDate").innerText = dateObj.toDateString();
    const dayLogs = logs.filter(l => new Date(l.timestamp.seconds*1000).toDateString() === dateObj.toDateString());
    content.innerHTML = dayLogs.length === 0 ? "<p>No sessions.</p>" : dayLogs.map(l => `<div class="day-session-item"><div class="day-session-header"><span>${l.player}</span><span>${l.minutes}m (${l.signatureImg ? '✓' : 'X'})</span></div><div class="day-session-drills">${l.drillSummary}</div></div>`).join("");
    modal.style.display = "block";
}
let playerTrendChart = null;
function renderPlayerTrendChart(logs) {
    const ctx = document.getElementById('playerTrendChart').getContext('2d'); if (playerTrendChart) playerTrendChart.destroy();
    const labels = []; const dataPoints = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(new Date().getDate() - i); labels.push(d.toLocaleDateString('en-US', {weekday:'short'})); const dayMins = logs.filter(l => new Date(l.timestamp.seconds*1000).toDateString() === d.toDateString()).reduce((sum, l) => sum + parseInt(l.minutes), 0); dataPoints.push(dayMins); }
    playerTrendChart = new Chart(ctx, { type: 'bar', data: { labels: labels, datasets: [{ label: 'Minutes', data: dataPoints, backgroundColor: '#00263A', borderRadius: 4 }] }, options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { display: false } }, x: { grid: { display: false } } } } });
}
function renderTeamLeaderboard(logs) {
    const tableBody = document.getElementById("teamLeaderboardTable").querySelector("tbody");
    if(!logs.length) { tableBody.innerHTML = `<tr><td colspan="3" style="text-align:center;">No data yet.</td></tr>`; return; }
    const playerStats = {}; logs.forEach(l => { const name = l.player || "Unknown"; if(!playerStats[name]) playerStats[name] = 0; playerStats[name] += parseInt(l.minutes); });
    const sortedPlayers = Object.keys(playerStats).sort((a,b) => playerStats[b] - playerStats[a]).slice(0, 5);
    tableBody.innerHTML = sortedPlayers.map((p, i) => `<tr><td class="leader-rank">${i+1}</td><td class="leader-name">${p}</td><td class="leader-score">${playerStats[p]}m</td></tr>`).join("");
}
async function loadCoachDashboard(isAdmin=false) {
    const user = auth.currentUser; const listDiv = document.getElementById("coachPlayerList"); listDiv.innerHTML = "Loading...";
    let q; if (isAdmin) { const teamFilter = document.getElementById("adminTeamSelect").value; if(teamFilter === "all") { q = query(collection(db, "reps"), orderBy("timestamp", "desc")); } else { q = query(collection(db, "reps"), where("teamId", "==", teamFilter), orderBy("timestamp", "desc")); } } else { q = query(collection(db, "reps"), where("coachEmail", "==", user.email), orderBy("timestamp", "desc")); }
    try {
        const snap = await getDocs(q); const players = {}; const allSessions = [];
        snap.forEach(doc => { const d = doc.data(); allSessions.push(d); const p = d.player || "Unknown"; if(!players[p]) players[p] = { count: 0, mins: 0, history: [] }; players[p].count++; players[p].mins += parseInt(d.minutes || 0); players[p].history.push(new Date(d.timestamp.seconds * 1000).toLocaleDateString()); });
        document.getElementById("coachTotalReps").innerText = allSessions.length; document.getElementById("coachActivePlayers").innerText = Object.keys(players).length;
        renderTeamChart(players);
        listDiv.innerHTML = Object.keys(players).map(p => `<div style="padding:10px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between;"><b>${p}</b> <span>${players[p].mins}m / ${players[p].count} Sessions</span></div>`).join("");
        document.getElementById("exportXlsxBtn").onclick = () => { const formatted = allSessions.map(r => ({ Date: new Date(r.timestamp.seconds*1000).toLocaleDateString(), Team: r.teamId || "N/A", Player: r.player, Duration_Mins: r.minutes, Drills: r.drillSummary, Verified: r.signatureImg ? "Signed" : "Not Signed", Notes: r.notes })); const ws = XLSX.utils.json_to_sheet(formatted); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "TrainingData"); XLSX.writeFile(wb, "AggiesFC_Export.xlsx"); };
    } catch (e) { listDiv.innerHTML = "No data found or permission denied."; console.error(e); }
}
function renderTeamChart(playersData) {
    const ctx = document.getElementById('teamChart').getContext('2d'); if (teamChart) teamChart.destroy();
    const dates = []; for(let i=6; i>=0; i--) { const d = new Date(); d.setDate(new Date().getDate() - i); dates.push(d.toLocaleDateString()); }
    const datasets = Object.keys(playersData).map(p => { const dailyMins = dates.map(dateStr => { return playersData[p].history.includes(dateStr) ? 1 : 0; }); const color = getPlayerColor(p); return { label: p, data: dailyMins, borderColor: color, tension: 0.3, fill: false }; });
    teamChart = new Chart(ctx, { type: 'line', data: { labels: dates, datasets: datasets }, options: { responsive: true, plugins: { legend: { display: true, position: 'bottom' } }, scales: { y: { beginAtZero: true, title: {display:true, text:'Active?'} } } } });
}