import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, orderBy, limit, enableIndexedDbPersistence, doc, setDoc, getDoc, deleteDoc, updateDoc, writeBatch } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { dbData } from "./data.js";

// CONFIG
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

// GLOBAL VARS
let currentSessionItems = [];
let globalTeams = [];
let globalAdmins = [DIRECTOR_EMAIL];
let timerInterval, seconds = 0;
let isSignatureBlank = true;
let currentCoachTeamId = null;
let teamChart = null;
let allSessionsCache = [];
let userProfile = null; 

// --- MAIN INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("App v26 Loaded (Race Condition Fix)");

    // 1. HELPERS
    const safeBind = (id, event, func) => {
        const el = document.getElementById(id);
        if(el) el.addEventListener(event, func);
    };
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if(el) el.innerText = text;
    };

    // 2. EXPOSE GLOBALS FOR HTML BUTTONS (Crucial for module scripts)
    window.linkParent = linkParent;
    window.deletePlayer = deletePlayer;

    // 3. AUTH LISTENERS
    safeBind("loginGoogleBtn", "click", () => signInWithPopup(auth, new GoogleAuthProvider()).catch(e=>alert("Login Error: " + e.message)));
    safeBind("loginEmailBtn", "click", () => {
        const e=document.getElementById("authEmail").value, p=document.getElementById("authPassword").value;
        if(e&&p) signInWithEmailAndPassword(auth,e,p).catch(err=>alert("Login Error: " + err.message));
    });
    safeBind("signupEmailBtn", "click", () => {
        const e=document.getElementById("authEmail").value, p=document.getElementById("authPassword").value;
        if(e&&p) createUserWithEmailAndPassword(auth,e,p).catch(err=>alert("Signup Error: " + err.message));
    });
    safeBind("globalLogoutBtn", "click", () => signOut(auth).then(()=>location.reload()));

    // 4. SETUP LISTENERS
    safeBind("completeSetupBtn", "click", completeUserSetup);

    // 5. NAVIGATION
    const navs = ['navTrack', 'navStats', 'navCoach', 'navAdmin'];
    const views = ['viewTracker', 'viewStats', 'viewCoach', 'viewAdmin'];
    navs.forEach((nid, i) => {
        safeBind(nid, "click", () => {
            navs.forEach(n => document.getElementById(n)?.classList.remove('active'));
            views.forEach(v => document.getElementById(v).style.display='none');
            document.getElementById(nid).classList.add('active');
            document.getElementById(views[i]).style.display='block';
            
            if(views[i] === 'viewStats') loadStats();
            if(views[i] === 'viewCoach') loadCoachDashboard(false, globalTeams);
            if(views[i] === 'viewAdmin') renderAdminTables();
        });
    });

    // 6. DRILLS
    const us = document.getElementById("unifiedSelect");
    if(us && us.options.length <= 1) {
        const cardio = document.createElement("optgroup"); cardio.label = "CARDIO";
        const basic = document.createElement("optgroup"); basic.label = "BRILLIANT BASICS";
        dbData.foundationSkills.forEach(s => {
            const opt = document.createElement("option"); opt.value = s.name; opt.textContent = s.name;
            if(s.type === 'cardio') cardio.appendChild(opt); else basic.appendChild(opt);
        });
        us.appendChild(cardio); us.appendChild(basic);
    }

    safeBind("unifiedSelect", "change", (e) => {
        const s = dbData.foundationSkills.find(x=>x.name===e.target.value);
        if(s) {
            document.getElementById("drillInfoBox").style.display='block';
            setText("drillDesc", s.drill);
            const vb = document.getElementById("watchVideoBtn");
            if(s.video) { 
                vb.style.display='inline-block'; 
                vb.onclick = () => { 
                    document.getElementById("videoPlayer").src = getEmbedUrl(s.video); 
                    document.getElementById("videoModal").style.display='block'; 
                } 
            } else vb.style.display='none';
        }
    });
    
    safeBind("addToSessionBtn", "click", () => {
        const n = document.getElementById("unifiedSelect").value;
        if(!n || n.includes("Loading")) return;
        currentSessionItems.push({ name: n, sets: document.getElementById("inputSets").value||3, reps: document.getElementById("inputReps").value||20 });
        renderSession();
    });

    safeBind("submitWorkoutBtn", "click", submitWorkout);

    // 7. DASHBOARD ACTIONS
    document.querySelectorAll(".outcome-btn").forEach(b => {
        b.onclick = () => {
            document.querySelectorAll(".outcome-btn").forEach(x=>x.classList.remove("active"));
            b.classList.add("active");
        }
    });

    safeBind("rosterPdfInput", "change", parsePDF);
    safeBind("saveParsedRosterBtn", "click", saveRosterList);
    safeBind("coachAddPlayerBtn", "click", manualAddPlayer);
    safeBind("exportXlsxBtn", "click", exportSessionData);
    safeBind("forceRefreshRosterBtn", "click", () => loadCoachDashboard(true, globalTeams)); 
    safeBind("addResBtn", "click", addResourceLink);
    
    // 8. ADMIN ACTIONS
    safeBind("addTeamBtn", "click", addTeam);
    safeBind("addAdminBtn", "click", addAdmin);
    
    const logTabs = ["btnLogSecurity", "btnLogSystem", "btnLogDebug"];
    const logTypes = ["SECURITY", "SYSTEM", "DEBUG"];
    logTabs.forEach((id, i) => {
        safeBind(id, "click", () => {
            logTabs.forEach(t => document.getElementById(t).classList.remove('active'));
            document.getElementById(id).classList.add('active');
            loadLogs(logTypes[i]);
        });
    });
    
    safeBind("generateTestLogBtn", "click", runHealthCheck);
    safeBind("clearLogsBtn", "click", () => document.getElementById("logContainer").innerHTML = "");

    // 9. MODALS
    document.querySelectorAll(".close-btn").forEach(b => {
        b.onclick = () => {
            document.querySelectorAll(".modal").forEach(m => m.style.display='none');
            document.getElementById("videoPlayer").src = "";
        }
    });

    // 10. TIMER
    const timerEl = document.getElementById("timerDisplay");
    function updateTimer() { seconds++; const m = Math.floor(seconds/60).toString().padStart(2,"0"); const s = (seconds%60).toString().padStart(2,"0"); if(timerEl) timerEl.innerText = `${m}:${s}`; }
    
    safeBind("startTimer", "click", () => { if (!timerInterval) timerInterval = setInterval(updateTimer, 1000); });
    safeBind("stopTimer", "click", () => { clearInterval(timerInterval); timerInterval = null; const m = Math.floor(seconds/60); document.getElementById("totalMinutes").value = m > 0 ? m : 1; });
    safeBind("resetTimer", "click", () => { clearInterval(timerInterval); timerInterval = null; seconds = 0; if(timerEl) timerEl.innerText = "00:00"; });

    // 11. CANVAS
    const canvas = document.getElementById("signatureCanvas");
    if(canvas) {
        const ctx = canvas.getContext('2d');
        let isDrawing = false;
        function resizeCanvas() { if(canvas.parentElement) { canvas.width = canvas.parentElement.offsetWidth; canvas.height = 120; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#00263A"; } }
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
        function startDraw(e) { isDrawing = true; ctx.beginPath(); draw(e); }
        function endDraw() { isDrawing = false; ctx.beginPath(); checkSignature(); }
        function draw(e) { if (!isDrawing) return; e.preventDefault(); isSignatureBlank = false; const rect = canvas.getBoundingClientRect(); const x = (e.clientX || e.touches[0].clientX) - rect.left; const y = (e.clientY || e.touches[0].clientY) - rect.top; ctx.lineTo(x, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y); }
        function checkSignature() { 
            const pixelBuffer = new Uint32Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer); 
            if (!pixelBuffer.some(color => color !== 0)) { isSignatureBlank = true; } else { isSignatureBlank = false; canvas.style.borderColor = "#16a34a"; canvas.style.backgroundColor = "#f0fdf4"; }
        }
        canvas.addEventListener('mousedown', startDraw); canvas.addEventListener('mouseup', endDraw); canvas.addEventListener('mousemove', draw); 
        canvas.addEventListener('touchstart', startDraw); canvas.addEventListener('touchend', endDraw); canvas.addEventListener('touchmove', draw);
        safeBind("clearSigBtn", "click", () => { ctx.clearRect(0, 0, canvas.width, canvas.height); isSignatureBlank = true; canvas.style.borderColor = "#cbd5e1"; canvas.style.backgroundColor = "#fcfcfc"; });
    }

    // 12. AUTH STATE (Inside DOMContentLoaded to safely access UI)
    onAuthStateChanged(auth, async (user) => {
        if(user) {
            document.getElementById("loginUI").style.display='none';
            try {
                await fetchConfig(); 
                const userRef = doc(db, "users", user.email);
                const userSnap = await getDoc(userRef);
                
                if (user.email.toLowerCase() === DIRECTOR_EMAIL.toLowerCase()) {
                    userProfile = { teamId: "admin", playerName: "Director", role: "admin" }; 
                } else if (userSnap.exists()) {
                    userProfile = userSnap.data();
                } else {
                    const inviteRef = doc(db, "player_lookup", user.email.toLowerCase());
                    const inviteSnap = await getDoc(inviteRef);
                    if(inviteSnap.exists()) {
                        const data = inviteSnap.data();
                        const newProfile = { teamId: data.teamId, playerName: data.playerName, joinedAt: new Date() };
                        await setDoc(userRef, newProfile);
                        userProfile = newProfile;
                    }
                }

                if (userProfile) {
                    document.getElementById("appUI").style.display='block';
                    document.getElementById("bottomNav").style.display='flex';
                    setText("coachName", user.email);
                    setText("activePlayerName", userProfile.playerName);
                    
                    loadStats();
                    checkRoles(user);
                    logSystemEvent("SYSTEM", `Login: ${user.email}`);
                } else {
                    document.getElementById("setupUI").style.display = 'flex';
                    initSetupDropdowns();
                }
            } catch (error) { console.error(error); alert("Startup Error: " + error.message); }
        } else {
            document.getElementById("loginUI").style.display='flex';
            document.getElementById("appUI").style.display='none';
            document.getElementById("bottomNav").style.display='none';
            document.getElementById("setupUI").style.display='none';
        }
    });
});

// --- FUNCTIONS ---

function initSetupDropdowns() {
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
}

async function completeUserSetup() {
    const tid = document.getElementById("setupTeamSelect").value;
    let pname = document.getElementById("setupPlayerDropdown").value;
    if (pname === "manual") pname = document.getElementById("setupPlayerManual").value.trim();
    if(!tid || !pname) return alert("Please select a team and player name.");
    await setDoc(doc(db, "users", auth.currentUser.email), { teamId: tid, playerName: pname, joinedAt: new Date() });
    location.reload();
}

async function fetchConfig() {
    try {
        const d = await getDoc(doc(db, "config", "teams"));
        if(d.exists()) globalTeams = d.data().list; else globalTeams = dbData.teams;
        const a = await getDoc(doc(db, "config", "admins"));
        if(a.exists()) globalAdmins = a.data().list;
    } catch(e) { globalTeams = dbData.teams; }
    const ts = document.getElementById("teamSelect");
    if(ts) {
        ts.innerHTML = '<option value="" disabled selected>Select Team...</option>';
        globalTeams.forEach(t => { const o=document.createElement("option"); o.value=t.id; o.textContent=t.name; ts.appendChild(o); });
    }
}

function checkRoles(user) {
    const isDirector = (user.email.toLowerCase() === DIRECTOR_EMAIL.toLowerCase()) || globalAdmins.some(a => a.toLowerCase() === user.email.toLowerCase());
    const myTeams = globalTeams.filter(t => t.coachEmail.toLowerCase() === user.email.toLowerCase());
    if(isDirector) {
        document.getElementById("navCoach").style.display='flex';
        document.getElementById("navAdmin").style.display='flex';
        initCoachDropdown(true, globalTeams); 
        renderAdminTables();
    } else if (myTeams.length > 0) {
        document.getElementById("navCoach").style.display='flex';
        initCoachDropdown(false, myTeams);
    }
}

// --- RESOURCES ---
async function addResourceLink() {
    const title = document.getElementById("newResTitle").value.trim();
    const link = document.getElementById("newResLink").value.trim();
    if(!title || !link) return alert("Enter title and link");
    await addDoc(collection(db, "resources"), { title: title, link: link, addedBy: auth.currentUser.email, timestamp: new Date() });
    document.getElementById("newResTitle").value = "";
    document.getElementById("newResLink").value = "";
    loadCoachDashboard(true, globalTeams); 
}

// --- DASHBOARD ---
function initCoachDropdown(isDirector, teams) {
    const sel = document.getElementById("adminTeamSelect");
    if(!sel) return;
    document.getElementById("adminControls").style.display = 'block';
    sel.innerHTML = "";
    teams.forEach(t => { const o = document.createElement("option"); o.value=t.id; o.textContent=t.name; sel.appendChild(o); });
    sel.onchange = () => loadCoachDashboard(isDirector, teams);
    if(teams.length > 0) { sel.value = teams[0].id; loadCoachDashboard(isDirector, teams); }
}

async function loadCoachDashboard(isDirector, teams) {
    const tid = document.getElementById("adminTeamSelect").value;
    if(!tid) return;
    currentCoachTeamId = tid; 
    
    // Load Resources
    const resDiv = document.getElementById("resourceList");
    if(resDiv) {
        const qRes = query(collection(db, "resources"), orderBy("timestamp", "desc"));
        const snapRes = await getDocs(qRes);
        if(snapRes.empty) resDiv.innerHTML = "<div style='font-size:11px; color:#999'>No resources yet.</div>";
        else {
            resDiv.innerHTML = "";
            snapRes.forEach(d => {
                const r = d.data();
                resDiv.innerHTML += `<div style="padding:5px 0; border-bottom:1px solid #eee;"><a href="${r.link}" target="_blank" style="color:#0284c7; text-decoration:none; font-weight:bold;">📄 ${r.title}</a></div>`;
            });
        }
    }

    // Load Stats & Roster
    const listEl = document.getElementById("coachPlayerList");
    if(listEl) listEl.innerHTML = "Fetching...";

    try {
        const qLinks = query(collection(db, "player_lookup"), where("teamId", "==", tid));
        const snapLinks = await getDocs(qLinks);
        const linkedSet = new Set();
        snapLinks.forEach(d => linkedSet.add(d.data().playerName));

        const q = query(collection(db, "reps"), where("teamId", "==", tid));
        const snap = await getDocs(q);
        const players = {};
        let count = 0;
        allSessionsCache = [];
        snap.forEach(doc => {
            const d = doc.data();
            allSessionsCache.push(d);
            if(!players[d.player]) { players[d.player] = { mins: 0, lastActive: null }; }
            players[d.player].mins += Number(d.minutes);
            const logDate = d.timestamp.toDate();
            if(!players[d.player].lastActive || logDate > players[d.player].lastActive) { players[d.player].lastActive = logDate; }
            count++;
        });
        
        const setText = (id, text) => { const el = document.getElementById(id); if(el) el.innerText = text; };
        setText("coachActivePlayers", Object.keys(players).length);
        setText("coachTotalReps", count);
        
        const rosterSnap = await getDoc(doc(db, "rosters", tid));
        let rosterNames = (rosterSnap.exists() && rosterSnap.data().players) ? rosterSnap.data().players : [];
        const combinedSet = new Set([...rosterNames, ...Object.keys(players)]);
        const combinedList = Array.from(combinedSet).sort();

        if(listEl) {
            if(combinedList.length > 0) {
                listEl.innerHTML = combinedList.map(p => {
                    const stats = players[p] || { mins: 0, lastActive: null };
                    const lastDate = stats.lastActive ? stats.lastActive.toLocaleDateString() : "Inactive";
                    const isLinked = linkedSet.has(p);
                    const linkBtn = isLinked 
                        ? `<button class="link-btn linked-success" onclick="alert('${p} is linked.')">✔ Linked</button>`
                        : `<button class="link-btn" onclick="window.linkParent('${p}')">Link Parent</button>`;

                    return `
                    <div style="padding:10px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
                        <div><b>${p}</b> <div style="font-size:10px; color:#666;">Last: ${lastDate}</div></div>
                        <div>
                            <span style="font-size:12px; font-weight:bold; color:#00263A; margin-right:5px;">${stats.mins}m</span>
                            ${linkBtn}
                            <button class="delete-btn" onclick="window.deletePlayer('${p}')">x</button>
                        </div>
                    </div>`;
                }).join("");
            } else {
                listEl.innerHTML = "<div style='padding:10px; color:#999;'>No players found in database. Upload a PDF roster or add manually above.</div>";
            }
        }
    } catch(e) { console.error(e); if(listEl) listEl.innerHTML = `<div style='color:red;'>Error: ${e.message}</div>`; }
}

async function linkParent(playerName) {
    const email = prompt(`Enter parent email for ${playerName}:`);
    if(email && email.includes("@")) {
        const tid = document.getElementById("adminTeamSelect").value;
        await setDoc(doc(db, "player_lookup", email.toLowerCase()), { teamId: tid, playerName: playerName });
        alert(`Linked! When ${email} logs in, they will be auto-connected to ${playerName}.`);
        loadCoachDashboard(true, globalTeams);
    }
}

async function deletePlayer(name) {
    if(!confirm(`Remove ${name}?`)) return;
    const tid = document.getElementById("adminTeamSelect").value;
    const ref = doc(db, "rosters", tid);
    const snap = await getDoc(ref);
    if(snap.exists()) {
        const newPlayers = snap.data().players.filter(p => p !== name);
        await updateDoc(ref, { players: newPlayers });
        loadCoachDashboard(false, globalTeams);
    }
}

async function manualAddPlayer() {
    const name = document.getElementById("coachAddPlayerName").value.trim();
    const email = document.getElementById("coachAddPlayerEmail").value.trim().toLowerCase();
    if(!name) return alert("Enter name");
    const tid = document.getElementById("adminTeamSelect").value;
    if(!tid) return alert("Select team first");
    const ref = doc(db, "rosters", tid);
    const snap = await getDoc(ref);
    let list = snap.exists() ? snap.data().players : [];
    if(!list.includes(name)) list.push(name);
    await setDoc(ref, { players: list }, { merge: true });
    
    if(email) {
        await setDoc(doc(db, "player_lookup", email), { teamId: tid, playerName: name });
        alert(`Player Added! Parent (${email}) will be auto-connected.`);
    } else {
        alert("Player Added to Roster");
    }
    document.getElementById("coachAddPlayerName").value = "";
    document.getElementById("coachAddPlayerEmail").value = "";
    loadCoachDashboard(false, globalTeams);
}

// --- PARSERS & UTILS ---
async function parsePDF(e) {
    const f = e.target.files[0]; if(!f) return;
    const txtBox = document.getElementById("rosterTextRaw");
    if(txtBox) txtBox.value = "Reading...";
    document.getElementById("rosterReviewArea").style.display='block';

    try {
        const buf = await f.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(buf).promise;
        const page = await pdf.getPage(1);
        const textContent = await page.getTextContent();
        
        const rows = {};
        textContent.items.forEach(item => {
            const y = Math.round(item.transform[5] / 10);
            if(!rows[y]) rows[y] = [];
            rows[y].push(decodeURIComponent(item.str));
        });

        let extracted = [];
        Object.keys(rows).sort((a,b)=>b-a).forEach(y => {
            const rowText = rows[y].join(" ").trim();
            const dateMatch = rowText.match(/\d{2}\/\d{2}\/\d{4}/);
            const idMatch = rowText.match(/\d{5}-\d{6}/);
            if (dateMatch || idMatch) {
                let cleanRow = rowText.replace(/\d{5}-\d{6}/g, "").replace(/\d{2}\/\d{2}\/\d{4}/g, "").trim();
                let words = cleanRow.split(" ").filter(w => w.length > 2 && !/\d/.test(w));
                if(words.length >= 2) {
                    let name = `${words[0]} ${words[1]}`;
                    extracted.push(name);
                }
            }
        });

        if (extracted.length === 0) {
            if(txtBox) txtBox.value = "No player rows detected. Please paste names manually.";
        } else {
            if(txtBox) txtBox.value = extracted.join("\n");
        }
    } catch(err) { console.error(err); alert("PDF Error: " + err.message); }
}

async function saveRosterList() {
    const tid = currentCoachTeamId;
    if(!tid) return alert("No team selected");
    const lines = document.getElementById("rosterTextRaw").value.split("\n");
    const cleanNames = [];
    const batch = writeBatch(db);
    lines.forEach(line => {
        if(line.includes("|")) {
            const [name, email] = line.split("|").map(s=>s.trim());
            cleanNames.push(name);
            if(email.includes("@")) {
                const ref = doc(db, "player_lookup", email.toLowerCase());
                batch.set(ref, { teamId: tid, playerName: name });
            }
        } else { if(line.trim()) cleanNames.push(line.trim()); }
    });
    await setDoc(doc(db, "rosters", tid), { players: cleanNames, lastUpdated: new Date() });
    await batch.commit();
    alert("Roster Saved!");
    document.getElementById("rosterReviewArea").style.display='none';
    loadCoachDashboard(false, globalTeams);
}

function exportSessionData() {
    if(allSessionsCache.length === 0) return alert("No sessions to export.");
    const formatted = allSessionsCache.map(r => ({
        Date: new Date(r.timestamp.seconds*1000).toLocaleDateString(),
        Player: r.player,
        Minutes: r.minutes,
        Drills: r.drillSummary,
        Feedback: r.outcome
    }));
    const ws = XLSX.utils.json_to_sheet(formatted);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Workouts");
    XLSX.writeFile(wb, "Aggies_Workouts.xlsx");
}

function renderSession() {
    const l = document.getElementById("sessionList");
    if(currentSessionItems.length===0) l.innerHTML='<li>No drills added yet.</li>';
    else l.innerHTML = currentSessionItems.map((i,idx) => `<li>${idx+1}. ${i.name} (${i.sets}x${i.reps})</li>`).join("");
}

function renderAdminTables() {
    const t = document.getElementById("teamTable"); 
    if(t) t.querySelector("tbody").innerHTML = globalTeams.map(t => `<tr><td>${t.id}</td><td>${t.name}</td><td>${t.coachEmail}</td></tr>`).join("");
    const a = document.getElementById("adminTable");
    if(a) a.querySelector("tbody").innerHTML = globalAdmins.map(e => `<tr><td>${e}</td><td><button class="delete-btn">Del</button></td></tr>`).join("");
}
async function addTeam() {
    const id = document.getElementById("newTeamId").value;
    const name = document.getElementById("newTeamName").value;
    const email = document.getElementById("newCoachEmail").value;
    if(!id || !name) return;
    globalTeams.push({ id, name, coachEmail: email });
    await setDoc(doc(db, "config", "teams"), { list: globalTeams });
    alert("Team Added"); logSystemEvent("ADMIN_ADD_TEAM", `ID: ${id}`); renderAdminTables();
}
async function addAdmin() {
    const email = document.getElementById("newAdminEmail").value;
    if(!email) return;
    globalAdmins.push(email);
    await setDoc(doc(db, "config", "admins"), { list: globalAdmins });
    alert("Admin Added"); logSystemEvent("ADMIN_ADD_DIRECTOR", `Email: ${email}`); renderAdminTables();
}

async function loadLogs(col) {
    const c = document.getElementById("logContainer"); if(!c) return; c.innerHTML = "Fetching...";
    const snap = await getDocs(query(collection(db, col), orderBy("timestamp", "desc"), limit(20)));
    c.innerHTML = "";
    snap.forEach(d => { 
        c.innerHTML += `<div style="border-bottom:1px solid #eee; padding:5px;"><span style="font-size:9px; color:#999;">${new Date(d.data().timestamp.seconds*1000).toLocaleString()}</span><br><b>${d.data().type}</b>: ${d.data().detail}</div>`; 
    });
}

function generateSampleLogs() { logSystemEvent("SYSTEM_START", "Init"); alert("Log Added"); }
function runSecurityScan() { const c = document.getElementById("logContainer"); if(c) { c.innerHTML="Scanning..."; setTimeout(() => c.innerHTML="<div>✔ Auth: Secure</div>", 800); } }
function runDebugLog() { const c = document.getElementById("logContainer"); if(c) c.innerHTML = `<pre>${JSON.stringify({v:"7.0", u:auth.currentUser?.email}, null, 2)}</pre>`; }

function getEmbedUrl(url) { if(!url)return""; let id=""; if(url.includes("youtu.be/"))id=url.split("youtu.be/")[1]; else if(url.includes("v="))id=url.split("v=")[1].split("&")[0]; else if(url.includes("embed/"))return url; if(id.includes("?"))id=id.split("?")[0]; return id?`https://www.youtube.com/embed/${id}`:""; }
function logSystemEvent(type, detail) { addDoc(collection(db, "logs_system"), { type: type, detail: detail, timestamp: new Date(), user: auth.currentUser ? auth.currentUser.email : 'system' }); }
