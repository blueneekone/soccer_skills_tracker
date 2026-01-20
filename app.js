import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithRedirect, GoogleAuthProvider, onAuthStateChanged, signOut } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, orderBy, limit, enableIndexedDbPersistence, doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { dbData } from "./data.js";

// --- MASTER CONFIG ---
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

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.log("Persistence failed: Multiple tabs open.");
    } else if (err.code == 'unimplemented') {
        console.log("Persistence not supported by browser.");
    }
});

// --- GLOBAL STATE ---
let currentSessionItems = []; 
let globalTeams = [];
let globalAdmins = [DIRECTOR_EMAIL]; 
let timerInterval;
let seconds = 0;
let isSignatureBlank = true; 
let teamChart = null; 
let currentCoachTeamId = null; // Tracks which team the coach is currently managing

// --- DOM REFERENCES ---
const loginBtn = document.getElementById("loginBtn");
const globalLogoutBtn = document.getElementById("globalLogoutBtn");
const appUI = document.getElementById("appUI");
const loginUI = document.getElementById("loginUI");
const bottomNav = document.getElementById("bottomNav");

// Views
const viewTracker = document.getElementById("viewTracker");
const viewStats = document.getElementById("viewStats");
const viewCoach = document.getElementById("viewCoach");
const viewAdmin = document.getElementById("viewAdmin");

// Nav Items
const navTrack = document.getElementById("navTrack");
const navStats = document.getElementById("navStats");
const navCoach = document.getElementById("navCoach");
const navAdmin = document.getElementById("navAdmin");

// Inputs
const teamSelect = document.getElementById("teamSelect");
const adminTeamSelect = document.getElementById("adminTeamSelect");
const playerDropdown = document.getElementById("playerDropdown");
const manualNameArea = document.getElementById("manualNameArea");
const playerSelectArea = document.getElementById("playerSelectArea");

// --- LOGGING ---
async function logSystemEvent(type, detail) { 
    try {
        await addDoc(collection(db, "logs_system"), { 
            type: type, 
            detail: detail, 
            user: auth.currentUser ? auth.currentUser.email : "system", 
            timestamp: new Date() 
        });
    } catch(e) { console.error("Log error", e); }
}

// --- CONFIG LOADING ---
async function fetchConfig() {
    // Load Teams
    try {
        const teamSnap = await getDoc(doc(db, "config", "teams"));
        if (teamSnap.exists()) globalTeams = teamSnap.data().list;
        else {
            globalTeams = dbData.teams; 
            await setDoc(doc(db, "config", "teams"), { list: globalTeams }); 
        }
    } catch (e) { globalTeams = dbData.teams; }

    // Load Admins
    try {
        const adminSnap = await getDoc(doc(db, "config", "admins"));
        if (adminSnap.exists()) globalAdmins = adminSnap.data().list;
        else {
            globalAdmins = [DIRECTOR_EMAIL];
            await setDoc(doc(db, "config", "admins"), { list: globalAdmins });
        }
    } catch (e) { globalAdmins = [DIRECTOR_EMAIL]; }
    
    populateDropdowns();
}

function populateDropdowns() {
    teamSelect.innerHTML = '<option value="" disabled selected>Select Your Team...</option>';
    teamSelect.innerHTML += `<option value="unassigned" style="font-weight:bold; color:#00263A;">★ Unassigned / Tryouts</option>`;
    
    globalTeams.forEach(t => { 
        const opt = document.createElement("option"); 
        opt.value = t.id; 
        opt.textContent = t.name; 
        teamSelect.appendChild(opt); 
    });
}

// --- TRACKER: SMART ROSTER LOGIC ---
teamSelect.addEventListener("change", async (e) => {
    const teamId = e.target.value;
    
    // Capture manual inputs before resetting
    const savedFirst = document.getElementById("playerFirst").value.trim().toLowerCase();
    const savedLast = document.getElementById("playerLast").value.trim().toLowerCase();
    const fullSavedName = `${savedFirst} ${savedLast}`;

    // Reset UI
    playerSelectArea.style.display = "none";
    manualNameArea.style.display = "block";
    playerDropdown.innerHTML = '<option value="" disabled selected>Select Player...</option>';
    
    if (teamId === "unassigned") return;

    // Check DB for Roster
    try {
        const docRef = doc(db, "rosters", teamId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().players && docSnap.data().players.length > 0) {
            const players = docSnap.data().players.sort();
            
            players.forEach(p => {
                const opt = document.createElement("option"); 
                opt.value = p; 
                opt.textContent = p;
                // Auto-select if matches saved name
                if (p.toLowerCase() === fullSavedName) opt.selected = true;
                playerDropdown.appendChild(opt);
            });
            
            // Add Manual Option
            const manualOpt = document.createElement("option"); 
            manualOpt.value = "manual"; 
            manualOpt.textContent = "name not listed? (type manually)"; 
            manualOpt.style.color = "#8A8D8F";
            playerDropdown.appendChild(manualOpt);

            playerSelectArea.style.display = "block";
            manualNameArea.style.display = "none";
        }
    } catch (e) { console.error("Roster fetch error", e); }
});

playerDropdown.addEventListener("change", (e) => {
    if (e.target.value === "manual") {
        manualNameArea.style.display = "block";
        document.getElementById("playerFirst").focus();
    } else {
        manualNameArea.style.display = "none";
    }
});

// --- COACH DASHBOARD LOGIC ---
async function loadCoachDashboard(forceTeamId = null) {
    const user = auth.currentUser;
    const listDiv = document.getElementById("coachPlayerList");
    const label = document.getElementById("manageTeamLabel");
    
    // 1. DETERMINE TEAM CONTEXT
    let targetTeamId = null;
    let targetTeamName = "Unknown";

    if (forceTeamId) {
        // Director selected a team
        targetTeamId = forceTeamId;
        const tObj = globalTeams.find(t => t.id === forceTeamId);
        targetTeamName = tObj ? tObj.name : forceTeamId;
    } else {
        // Find coach's assigned team
        const myTeam = globalTeams.find(t => t.coachEmail.toLowerCase() === user.email.toLowerCase());
        if (myTeam) {
            targetTeamId = myTeam.id;
            targetTeamName = myTeam.name;
        } else if (globalAdmins.map(e=>e.toLowerCase()).includes(user.email.toLowerCase())) {
            // Director defaults
            targetTeamName = "Select a Team";
        }
    }
    
    // Update Global State
    currentCoachTeamId = targetTeamId;
    label.innerText = targetTeamName;

    // 2. LOAD & RENDER ROSTER (For Editing)
    const rosterList = document.getElementById("rosterListEditor");
    rosterList.innerHTML = '<li style="padding:15px; text-align:center; color:#94a3b8;">Loading roster...</li>';
    
    if (currentCoachTeamId) {
        try {
            const docRef = doc(db, "rosters", currentCoachTeamId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().players) {
                const players = docSnap.data().players.sort();
                if(players.length === 0) {
                    rosterList.innerHTML = '<li style="padding:10px; text-align:center;">No players found. Add one!</li>';
                } else {
                    rosterList.innerHTML = players.map(p => `
                        <li>
                            <span>${p}</span>
                            <button class="btn-delete" onclick="window.removePlayer('${p}')">✖</button>
                        </li>
                    `).join("");
                }
            } else {
                rosterList.innerHTML = '<li style="padding:10px; text-align:center;">No roster created yet.</li>';
            }
        } catch (e) { 
            console.error(e);
            rosterList.innerHTML = '<li style="padding:10px; text-align:center;">Error loading roster.</li>'; 
        }
    } else {
        rosterList.innerHTML = '<li style="padding:10px; text-align:center;">Please select a team above.</li>';
    }

    // 3. LOAD STATS
    let q;
    if (currentCoachTeamId) {
        q = query(collection(db, "reps"), where("teamId", "==", currentCoachTeamId), orderBy("timestamp", "desc"));
    } else if (globalAdmins.map(e=>e.toLowerCase()).includes(user.email.toLowerCase())) {
        // Director see all recent if no team selected
        q = query(collection(db, "reps"), orderBy("timestamp", "desc"), limit(50));
    } else {
        listDiv.innerHTML = "No team assigned."; return;
    }

    try {
        const snap = await getDocs(q);
        const players = {}; 
        const allSessions = [];
        
        snap.forEach(doc => {
            const d = doc.data();
            allSessions.push(d);
            const p = d.player || "Unknown";
            if(!players[p]) players[p] = { count: 0, mins: 0, history: [] };
            players[p].count++;
            players[p].mins += parseInt(d.minutes || 0);
            players[p].history.push(new Date(d.timestamp.seconds * 1000).toLocaleDateString());
        });

        document.getElementById("coachTotalReps").innerText = allSessions.length;
        document.getElementById("coachActivePlayers").innerText = Object.keys(players).length;
        renderTeamChart(players);
        
        if (Object.keys(players).length === 0) {
            listDiv.innerHTML = '<div style="padding:20px; text-align:center; color:#ccc;">No workout logs yet.</div>';
        } else {
            listDiv.innerHTML = Object.keys(players).map(p => `
                <div style="padding:10px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between;">
                    <b>${p}</b> <span>${players[p].mins}m / ${players[p].count} Sessions</span>
                </div>`).join("");
        }

        // Excel Export
        document.getElementById("exportXlsxBtn").onclick = () => { 
            const formatted = allSessions.map(r => ({ 
                Date: new Date(r.timestamp.seconds*1000).toLocaleDateString(), 
                Player: r.player, 
                Mins: r.minutes, 
                Drills: r.drillSummary, 
                Notes: r.notes 
            })); 
            const ws = XLSX.utils.json_to_sheet(formatted); 
            const wb = XLSX.utils.book_new(); 
            XLSX.utils.book_append_sheet(wb, ws, "Data"); 
            XLSX.writeFile(wb, "TeamExport.xlsx"); 
        };
    } catch (e) { console.error(e); }
}

// --- ROSTER MANAGEMENT (ADD/REMOVE/PDF) ---

// 1. ADD PLAYER
document.getElementById("addNewPlayerBtn").addEventListener("click", async () => {
    const nameInput = document.getElementById("newPlayerNameInput");
    const name = nameInput.value.trim();
    
    if (!name) return alert("Enter a name.");
    if (!currentCoachTeamId) return alert("No team selected.");

    try {
        const rosterRef = doc(db, "rosters", currentCoachTeamId);
        const docSnap = await getDoc(rosterRef);
        
        if (!docSnap.exists()) {
            await setDoc(rosterRef, { players: [name], lastUpdated: new Date() });
        } else {
            await updateDoc(rosterRef, { players: arrayUnion(name) });
        }
        
        nameInput.value = "";
        loadCoachDashboard(currentCoachTeamId); // Refresh
        alert("Player added!");
    } catch (e) { console.error(e); alert("Error adding player."); }
});

// 2. REMOVE PLAYER (Exposed to Window)
window.removePlayer = async (name) => {
    if (!currentCoachTeamId) return;
    if (!confirm(`Remove ${name} from roster?`)) return;

    try {
        const rosterRef = doc(db, "rosters", currentCoachTeamId);
        await updateDoc(rosterRef, { players: arrayRemove(name) });
        loadCoachDashboard(currentCoachTeamId); 
    } catch (e) { console.error(e); alert("Error removing player."); }
};

// 3. UPLOAD PDF
document.getElementById("rosterPdfInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    
    const btn = document.getElementById("rosterPdfInput");
    btn.disabled = true;

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
        let extractedRows = [];

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            const items = textContent.items.map(item => ({
                text: item.str.trim(),
                y: Math.round(item.transform[5]), 
                x: Math.round(item.transform[4]) 
            })).filter(i => i.text.length > 0);

            const rows = {};
            items.forEach(item => {
                if (!rows[item.y]) rows[item.y] = [];
                rows[item.y].push(item);
            });

            const sortedY = Object.keys(rows).sort((a, b) => b - a);
            sortedY.forEach(y => {
                const cols = rows[y].sort((a, b) => a.x - b.x);
                extractedRows.push(cols.map(c => c.text));
            });
        }

        const cleanNames = extractedRows.filter(row => {
            const rowString = row.join(" ");
            const hasDate = /\d{1,2}\/\d{1,2}\/\d{4}/.test(rowString);
            const isHeader = rowString.toLowerCase().includes("last name");
            return hasDate && !isHeader;
        })
        .map(row => {
            const textOnly = row.filter(str => {
                return !/\d/.test(str) && !['Male','Female'].includes(str);
            });
            if (textOnly.length >= 2) return `${textOnly[1]} ${textOnly[0]}`; 
            return textOnly.join(" ");
        });

        document.getElementById("rosterUploadStep1").style.display = "none";
        document.getElementById("rosterReviewArea").style.display = "block";
        document.getElementById("rosterTextRaw").value = cleanNames.join("\n");

    } catch(err) {
        console.error(err);
        alert("Could not parse PDF layout.");
    }
    btn.disabled = false;
});

document.getElementById("saveParsedRosterBtn").addEventListener("click", async () => {
    if (!currentCoachTeamId) return alert("System Error: No team context found.");
    
    const rawText = document.getElementById("rosterTextRaw").value;
    if (!rawText) return alert("Roster list is empty.");

    const playerList = rawText.split("\n").map(name => name.trim()).filter(name => name.length > 0);

    try {
        await setDoc(doc(db, "rosters", currentCoachTeamId), {
            players: playerList,
            lastUpdated: new Date()
        });
        
        alert(`Success! Saved ${playerList.length} players to team.`);
        
        // Reset UI
        document.getElementById("rosterReviewArea").style.display = "none";
        document.getElementById("rosterPdfInput").value = ""; 
        document.getElementById("rosterUploadStep1").style.display = "block";
        loadCoachDashboard(currentCoachTeamId);

    } catch (error) {
        console.error("Error saving roster:", error);
        alert("Error saving to database.");
    }
});


// --- ADMIN LOGIC ---
function renderAdminTables() {
    const teamTbody = document.getElementById("teamTable").querySelector("tbody");
    teamTbody.innerHTML = globalTeams.map(t => `<tr><td>${t.id}</td><td>${t.coachEmail}</td><td><button class="btn-delete" onclick="window.deleteTeam('${t.id}')">Del</button></td></tr>`).join("");
    
    const adminTbody = document.getElementById("adminTable").querySelector("tbody");
    adminTbody.innerHTML = globalAdmins.map(email => `<tr><td>${email}</td></tr>`).join("");
}

window.deleteTeam = async (id) => {
    if(!confirm(`Delete team ${id}?`)) return;
    globalTeams = globalTeams.filter(t => t.id !== id);
    await setDoc(doc(db, "config", "teams"), { list: globalTeams });
    renderAdminTables();
    populateDropdowns();
};

document.getElementById("addTeamBtn").addEventListener("click", async () => {
    const id = document.getElementById("newTeamId").value.trim();
    const name = document.getElementById("newTeamName").value.trim();
    const email = document.getElementById("newCoachEmail").value.trim();
    if(!id || !name || !email) return alert("Fill all fields");
    
    globalTeams.push({ id, name, coachEmail: email });
    await setDoc(doc(db, "config", "teams"), { list: globalTeams });
    alert("Team Saved");
    renderAdminTables();
    populateDropdowns();
});

document.getElementById("addAdminBtn").addEventListener("click", async () => {
    const email = document.getElementById("newAdminEmail").value.trim().toLowerCase();
    if(!email) return;
    globalAdmins.push(email); 
    await setDoc(doc(db, "config", "admins"), { list: globalAdmins });
    alert("Admin Added");
    renderAdminTables();
});

// --- AUTH HANDLER ---
onAuthStateChanged(auth, async (user) => {
  if (user) {
    loginUI.style.display = "none"; 
    appUI.style.display = "block"; 
    bottomNav.style.display = "flex";
    document.getElementById("coachName").textContent = `Logged in: ${user.displayName}`;
    
    await fetchConfig();
    
    const isDirector = globalAdmins.map(e => e.toLowerCase()).includes(user.email.toLowerCase());
    const assignedTeam = globalTeams.find(t => t.coachEmail.toLowerCase() === user.email.toLowerCase());
    
    if(isDirector || assignedTeam) {
        navCoach.style.display = "flex";
        if(isDirector) {
            navAdmin.style.display = "flex"; 
            document.getElementById("adminControls").style.display = "block";
            
            // Populate Director's Team Select
            adminTeamSelect.innerHTML = '<option value="" disabled selected>Select Team to Manage</option>';
            globalTeams.forEach(t => { 
                const opt = document.createElement("option"); 
                opt.value = t.id; 
                opt.textContent = t.name; 
                adminTeamSelect.appendChild(opt); 
            });
            
            adminTeamSelect.addEventListener("change", (e) => loadCoachDashboard(e.target.value));
            renderAdminTables();
        } else {
            // Regular Coach: Load their dashboard immediately
            loadCoachDashboard(assignedTeam.id);
        }
    }
    
    // Default load
    loadStats();
    
  } else {
    loginUI.style.display = "block"; 
    appUI.style.display = "none"; 
    bottomNav.style.display = "none";
  }
});

// --- NAVIGATION ---
function switchTab(tab) { 
    [viewTracker, viewStats, viewCoach, viewAdmin].forEach(v => v.classList.add("hidden")); 
    [navTrack, navStats, navCoach, navAdmin].forEach(n => n.classList.remove("active")); 
    
    if (tab === 'track') { viewTracker.classList.remove("hidden"); navTrack.classList.add("active"); }
    if (tab === 'stats') { viewStats.classList.remove("hidden"); navStats.classList.add("active"); loadStats(); }
    if (tab === 'coach') { viewCoach.classList.remove("hidden"); navCoach.classList.add("active"); }
    if (tab === 'admin') { viewAdmin.classList.remove("hidden"); navAdmin.classList.add("active"); }
}
navTrack.addEventListener("click", () => switchTab('track'));
navStats.addEventListener("click", () => switchTab('stats'));
navCoach.addEventListener("click", () => switchTab('coach'));
navAdmin.addEventListener("click", () => switchTab('admin'));

// --- LOG WORKOUT SUBMIT ---
document.getElementById("submitWorkoutBtn").addEventListener("click", async () => {
    const user = auth.currentUser; 
    if (!user) return alert("Sign in first");

    const teamId = teamSelect.value; 
    const mins = document.getElementById("totalMinutes").value;
    
    // Name Handling
    let playerName = "";
    if(playerSelectArea.style.display !== "none" && playerDropdown.value !== "manual") {
        playerName = playerDropdown.value; 
    } else {
        const f = document.getElementById("playerFirst").value;
        const l = document.getElementById("playerLast").value;
        if(f && l) playerName = `${f} ${l}`;
    }

    if(!teamId) return alert("Select Team"); 
    if(!playerName) return alert("Select or Enter Name"); 
    if(!mins || mins == 0) return alert("Enter Duration");
    if (isSignatureBlank) { canvas.style.borderColor = "#dc2626"; return alert("Signature Required"); }
    
    // Save User Profile locally for next time
    if(manualNameArea.style.display !== "none") {
        localStorage.setItem("aggie_first", document.getElementById("playerFirst").value);
        localStorage.setItem("aggie_last", document.getElementById("playerLast").value);
    }

    const signatureData = canvas.toDataURL();
    
    // Find Coach Email for this team
    let assignedCoachEmail = DIRECTOR_EMAIL;
    if (teamId !== "unassigned") {
        const selectedTeam = globalTeams.find(t => t.id === teamId);
        if (selectedTeam && selectedTeam.coachEmail) assignedCoachEmail = selectedTeam.coachEmail;
    }

    // Build Drill Summary
    let drillSummary = "General Session";
    if (currentSessionItems.length > 0) {
        drillSummary = currentSessionItems.map(i => `${i.name} (${i.sets}x${i.reps})`).join(", ");
    }

    const sessionData = { 
        coachEmail: assignedCoachEmail, 
        teamId: teamId, 
        timestamp: new Date(), 
        player: playerName, 
        minutes: mins, 
        drills: currentSessionItems, 
        drillSummary: drillSummary, 
        outcome: document.querySelector(".outcome-btn.active")?.dataset.val || "success", 
        notes: document.getElementById("notes").value, 
        signatureImg: signatureData 
    };

    try { 
        await addDoc(collection(db, "reps"), sessionData); 
        alert(`Logged! +${10 + parseInt(mins)} XP`); 
        
        // Log System Event
        logSystemEvent("SESSION_LOGGED", `Player: ${playerName}, Team: ${teamId}, Mins: ${mins}`);
        
        // Reset Form
        currentSessionItems = []; 
        document.getElementById("sessionList").innerHTML = "";
        document.getElementById("totalMinutes").value = ""; 
        document.getElementById("notes").value = ""; 
        
        // Clear Sig
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height); 
        isSignatureBlank = true; 
        canvas.style.borderColor = "#cbd5e1"; 
        canvas.style.backgroundColor = "#fcfcfc"; 
        
        document.getElementById("resetTimer").click(); 
        loadStats(); 

    } catch(e) { 
        console.error(e); 
        alert("Error saving workout to database."); 
    }
});

// --- BUTTONS & HELPERS ---
loginBtn.addEventListener("click", () => { 
    const provider = new GoogleAuthProvider(); 
    signInWithRedirect(auth, provider); 
});

globalLogoutBtn.addEventListener("click", () => { 
    signOut(auth).then(() => location.reload()); 
});

// Unified Select Logic
if(document.getElementById("unifiedSelect").options.length === 1) {
    const cardioSkills = dbData.foundationSkills.filter(s => s.type === 'cardio');
    const cardioGroup = document.createElement("optgroup"); cardioGroup.label = "Cardio & Fitness";
    cardioSkills.forEach(s => { 
        const opt = document.createElement("option"); opt.value = s.name; opt.textContent = s.name; 
        cardioGroup.appendChild(opt); 
    });
    document.getElementById("unifiedSelect").appendChild(cardioGroup);
    
    const techSkills = dbData.foundationSkills.filter(s => s.type === 'foundation');
    const categories = {}; 
    techSkills.forEach(s => { if (!categories[s.category]) categories[s.category] = []; categories[s.category].push(s); });
    
    for (const [catName, skills] of Object.entries(categories)) { 
        const group = document.createElement("optgroup"); group.label = catName; 
        skills.forEach(s => { 
            const opt = document.createElement("option"); opt.value = s.name; opt.textContent = s.name; 
            group.appendChild(opt); 
        }); 
        document.getElementById("unifiedSelect").appendChild(group); 
    }
}

document.getElementById("unifiedSelect").addEventListener("change", (e) => {
    const skillName = e.target.value; 
    const skillData = dbData.foundationSkills.find(s => s.name === skillName);
    const videoBox = document.getElementById("drillInfoBox");
    
    videoBox.style.display = "block"; 
    document.getElementById("drillDesc").innerText = skillData.drill;
    
    const vidBtn = document.getElementById("watchVideoBtn");
    if(skillData.video) {
        vidBtn.style.display = "block";
        vidBtn.onclick = () => { 
            document.getElementById("videoPlayer").src = skillData.video; 
            document.getElementById("videoModal").style.display = "block"; 
        };
    } else {
        vidBtn.style.display = "none";
    }
});

document.getElementById("addToSessionBtn").addEventListener("click", () => {
    const skillName = document.getElementById("unifiedSelect").value; 
    if(!skillName) return alert("Select Activity");
    const sets = document.getElementById("inputSets").value || "-"; 
    const reps = document.getElementById("inputReps").value || "-";
    
    currentSessionItems.push({ name: skillName, sets: sets, reps: reps }); 
    
    const list = document.getElementById("sessionList");
    list.innerHTML = currentSessionItems.map((item, index) => 
        `<li style="border-bottom:1px solid #e2e8f0; padding:8px; display:flex; justify-content:space-between;">
            <span><b>${index+1}.</b> ${item.name}</span> 
            <span style="font-size:12px; color:#64748b;">${item.sets} x ${item.reps}</span>
         </li>`
    ).join("");
    
    document.getElementById("unifiedSelect").selectedIndex = 0; 
    document.getElementById("drillInfoBox").style.display = "none";
});

// Timer Logic
function updateTimer() { 
    seconds++; 
    const m = Math.floor(seconds / 60).toString().padStart(2, "0"); 
    const s = (seconds % 60).toString().padStart(2, "0"); 
    document.getElementById("timerDisplay").innerText = `${m}:${s}`; 
}
document.getElementById("startTimer").addEventListener("click", () => { if (!timerInterval) timerInterval = setInterval(updateTimer, 1000); });
document.getElementById("stopTimer").addEventListener("click", () => { clearInterval(timerInterval); timerInterval = null; const m = Math.floor(seconds / 60); document.getElementById("totalMinutes").value = m > 0 ? m : 1; });
document.getElementById("resetTimer").addEventListener("click", () => { clearInterval(timerInterval); timerInterval = null; seconds = 0; document.getElementById("timerDisplay").innerText = "00:00"; });

// Signature Canvas
function resizeCanvas() { 
    const canvas = document.getElementById('signatureCanvas');
    if(!canvas.parentElement) return; 
    canvas.width = canvas.parentElement.offsetWidth; 
    canvas.height = 150; 
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#00263A"; 
}
window.addEventListener('resize', resizeCanvas);

function startDraw(e) { isDrawing = true; const ctx = document.getElementById('signatureCanvas').getContext('2d'); ctx.beginPath(); draw(e); }
function endDraw() { isDrawing = false; const ctx = document.getElementById('signatureCanvas').getContext('2d'); ctx.beginPath(); isSignatureBlank=false; }
function draw(e) { 
    if (!isDrawing) return; 
    e.preventDefault(); 
    const canvas = document.getElementById('signatureCanvas');
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect(); 
    const x = (e.clientX || e.touches[0].clientX) - rect.left; 
    const y = (e.clientY || e.touches[0].clientY) - rect.top; 
    ctx.lineTo(x, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y); 
}
const cvs = document.getElementById('signatureCanvas');
cvs.addEventListener('mousedown', startDraw); cvs.addEventListener('mouseup', endDraw); cvs.addEventListener('mousemove', draw); 
cvs.addEventListener('touchstart', startDraw); cvs.addEventListener('touchend', endDraw); cvs.addEventListener('touchmove', draw);
document.getElementById("clearSigBtn").addEventListener("click", () => { 
    const ctx = cvs.getContext('2d'); ctx.clearRect(0, 0, cvs.width, cvs.height); isSignatureBlank = true; 
});

// Modals
document.getElementById("closeModal").addEventListener("click", () => { document.getElementById("videoModal").style.display = "none"; document.getElementById("videoPlayer").src = ""; });
document.getElementById("closeDayModal").addEventListener("click", () => { document.getElementById("dayModal").style.display = "none"; });

// Chart & Stats Helpers
function getPlayerColor(name) { let hash = 0; for (let i = 0; i < name.length; i++) { hash = name.charCodeAt(i) + ((hash << 5) - hash); } const hue = Math.abs(hash % 360); return `hsl(${hue}, 70%, 40%)`; }

async function loadStats() {
    const user = auth.currentUser; if (!user) return;
    const q = query(collection(db, "reps"), orderBy("timestamp", "desc"), limit(100)); 
    const snap = await getDocs(q); 
    const logs = []; 
    let mins = 0;
    
    snap.forEach(doc => { const d = doc.data(); logs.push(d); mins += parseInt(d.minutes || 0); });
    
    document.getElementById("statTotal").innerText = logs.length; 
    document.getElementById("statTime").innerText = mins;
    
    // XP
    const xp = (logs.length * 10) + mins; 
    let level = "Rookie"; if (xp > 100) level = "Starter"; if (xp > 500) level = "Pro"; if (xp > 1000) level = "Elite"; if (xp > 2000) level = "Legend";
    document.getElementById("userLevelDisplay").innerText = `${level} • ${xp} XP`; 
    document.getElementById("xpBar").style.width = `${Math.min((xp%500)/500*100, 100)}%`; 
    
    renderCalendar(logs); 
    renderPlayerTrendChart(logs); 
    renderTeamLeaderboard(logs);
}

function renderCalendar(logs) {
    const grid = document.getElementById("calendarDays"); 
    grid.innerHTML = "";
    const activeDates = new Set(logs.map(l => new Date(l.timestamp.seconds*1000).toDateString()));
    const today = new Date(); 
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    
    for (let i = 1; i <= daysInMonth; i++) {
        const dateObj = new Date(today.getFullYear(), today.getMonth(), i); 
        const dayDiv = document.createElement("div"); 
        dayDiv.className = "cal-day"; 
        dayDiv.innerText = i;
        if (activeDates.has(dateObj.toDateString())) { 
            dayDiv.classList.add("has-log"); 
            dayDiv.addEventListener("click", () => {
                document.getElementById("dayModalDate").innerText = dateObj.toDateString();
                document.getElementById("dayModalContent").innerHTML = logs
                    .filter(l => new Date(l.timestamp.seconds*1000).toDateString() === dateObj.toDateString())
                    .map(l => `<div><b>${l.player}</b>: ${l.drillSummary} (${l.minutes}m)</div>`).join("");
                document.getElementById("dayModal").style.display = "block";
            });
        } 
        grid.appendChild(dayDiv);
    }
}

function renderPlayerTrendChart(logs) {
    const ctx = document.getElementById('playerTrendChart').getContext('2d'); 
    if (playerTrendChart) playerTrendChart.destroy();
    
    const labels = []; const dataPoints = [];
    for (let i = 6; i >= 0; i--) { 
        const d = new Date(); d.setDate(new Date().getDate() - i); 
        labels.push(d.toLocaleDateString('en-US', {weekday:'short'})); 
        const dayMins = logs.filter(l => new Date(l.timestamp.seconds*1000).toDateString() === d.toDateString()).reduce((sum, l) => sum + parseInt(l.minutes), 0); 
        dataPoints.push(dayMins); 
    }
    
    playerTrendChart = new Chart(ctx, { 
        type: 'bar', 
        data: { labels: labels, datasets: [{ label: 'Minutes', data: dataPoints, backgroundColor: '#00263A', borderRadius: 4 }] }, 
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } } 
    });
}

function renderTeamLeaderboard(logs) {
    const tableBody = document.getElementById("teamLeaderboardTable").querySelector("tbody");
    if(!logs.length) { tableBody.innerHTML = `<tr><td colspan="3" style="text-align:center;">No data yet.</td></tr>`; return; }
    
    const playerStats = {}; 
    logs.forEach(l => { const name = l.player || "Unknown"; if(!playerStats[name]) playerStats[name] = 0; playerStats[name] += parseInt(l.minutes); });
    const sorted = Object.keys(playerStats).sort((a,b) => playerStats[b] - playerStats[a]).slice(0, 5);
    
    tableBody.innerHTML = sorted.map((p, i) => `<tr><td>${i+1}</td><td>${p}</td><td>${playerStats[p]}m</td></tr>`).join("");
}

function renderTeamChart(playersData) {
    const ctx = document.getElementById('teamChart').getContext('2d'); 
    if (teamChart) teamChart.destroy();
    const dates = []; for(let i=6; i>=0; i--) { const d = new Date(); d.setDate(new Date().getDate() - i); dates.push(d.toLocaleDateString()); }
    const datasets = Object.keys(playersData).map((p, idx) => ({ 
        label: p, 
        data: dates.map(d => playersData[p].history.includes(d)?1:0), 
        borderColor: `hsl(${idx*40}, 70%, 50%)`, 
        tension: 0.3,
        fill: false
    }));
    teamChart = new Chart(ctx, { type: 'line', data: { labels: dates, datasets }, options: { scales: { y: { display: false } } } });
}
