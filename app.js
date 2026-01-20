import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, orderBy, limit, enableIndexedDbPersistence, doc, setDoc, getDoc, deleteDoc } 
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

// VARS
let currentSessionItems = [];
let globalTeams = [];
let globalAdmins = [DIRECTOR_EMAIL];
let timerInterval, seconds = 0;
let isSignatureBlank = true;
let currentCoachTeamId = null;
let teamChart = null;

// --- WAIT FOR DOM BEFORE ATTACHING LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("App initialized. Waiting for Auth...");

    // AUTH LISTENERS
    document.getElementById("loginGoogleBtn").addEventListener("click", () => {
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider).catch(err => alert("Google Error: " + err.message));
    });

    document.getElementById("loginEmailBtn").addEventListener("click", () => {
        const e = document.getElementById("authEmail").value;
        const p = document.getElementById("authPassword").value;
        if(!e || !p) return alert("Enter email and password");
        signInWithEmailAndPassword(auth, e, p).catch(err => {
            document.getElementById("authErrorMsg").innerText = err.message;
            document.getElementById("authErrorMsg").style.display = "block";
        });
    });

    document.getElementById("signupEmailBtn").addEventListener("click", () => {
        const e = document.getElementById("authEmail").value;
        const p = document.getElementById("authPassword").value;
        if(!e || !p) return alert("Enter email and password");
        createUserWithEmailAndPassword(auth, e, p).catch(err => {
            document.getElementById("authErrorMsg").innerText = err.message;
            document.getElementById("authErrorMsg").style.display = "block";
        });
    });

    document.getElementById("globalLogoutBtn").addEventListener("click", () => signOut(auth).then(()=>location.reload()));

    // NAV LISTENERS
    const views = ['viewTracker', 'viewStats', 'viewCoach', 'viewAdmin'];
    const navs = ['navTrack', 'navStats', 'navCoach', 'navAdmin'];
    navs.forEach((navId, idx) => {
        document.getElementById(navId).addEventListener("click", () => {
            views.forEach(v => document.getElementById(v).style.display = 'none');
            navs.forEach(n => document.getElementById(n).classList.remove('active'));
            document.getElementById(views[idx]).style.display = 'block';
            document.getElementById(navId).classList.add('active');
            
            // Refresh Data on Tab Switch
            if(views[idx] === 'viewStats') loadStats();
            if(views[idx] === 'viewCoach') loadCoachDashboard(false, globalTeams);
            if(views[idx] === 'viewTracker') setTimeout(resizeCanvas, 100);
        });
    });

    // TRACKER LISTENERS
    document.getElementById("addToSessionBtn").addEventListener("click", addToSession);
    document.getElementById("submitWorkoutBtn").addEventListener("click", submitWorkout);
    document.getElementById("startTimer").addEventListener("click", () => { if(!timerInterval) timerInterval=setInterval(()=>{seconds++;updateTimer();},1000); });
    document.getElementById("stopTimer").addEventListener("click", () => { clearInterval(timerInterval); timerInterval=null; document.getElementById("totalMinutes").value=Math.floor(seconds/60)||1; });
    document.getElementById("resetTimer").addEventListener("click", () => { clearInterval(timerInterval); timerInterval=null; seconds=0; document.getElementById("timerDisplay").innerText="00:00"; });
    
    // CANVAS
    const canvas = document.getElementById("signatureCanvas");
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    canvas.addEventListener('mousedown', e => { isDrawing=true; ctx.beginPath(); draw(e, ctx, canvas); });
    canvas.addEventListener('mousemove', e => { if(isDrawing) draw(e, ctx, canvas); });
    window.addEventListener('mouseup', () => { isDrawing=false; if(!isCanvasBlank(canvas)) isSignatureBlank=false; });
    canvas.addEventListener('touchstart', e => { isDrawing=true; ctx.beginPath(); draw(e, ctx, canvas); });
    canvas.addEventListener('touchmove', e => { if(isDrawing) draw(e, ctx, canvas); });
    document.getElementById("clearSigBtn").addEventListener("click", () => { ctx.clearRect(0,0,canvas.width,canvas.height); isSignatureBlank=true; });

    // SELECTORS
    const uSelect = document.getElementById("unifiedSelect");
    if(uSelect.options.length === 1) {
        dbData.foundationSkills.forEach(s => {
            const opt = document.createElement("option"); opt.value = s.name; opt.textContent = s.name; uSelect.appendChild(opt);
        });
    }
    
    // ROSTER & ADMIN
    document.getElementById("rosterPdfInput").addEventListener("change", parseRosterPDF);
    document.getElementById("saveParsedRosterBtn").addEventListener("click", saveRoster);
    document.getElementById("addTeamBtn").addEventListener("click", addTeam);
    document.getElementById("runSecurityAuditBtn").addEventListener("click", () => loadLogs('logs_security'));
});

// --- AUTH STATE ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById("loginUI").style.display = "none";
        document.getElementById("appUI").style.display = "block";
        document.getElementById("bottomNav").style.display = "flex";
        document.getElementById("coachName").innerText = user.email;
        
        await fetchConfig();
        
        // Roles
        const isDirector = globalAdmins.some(a => a.toLowerCase() === user.email.toLowerCase());
        const myTeams = globalTeams.filter(t => t.coachEmail.toLowerCase() === user.email.toLowerCase());
        
        if (isDirector || myTeams.length > 0) {
            document.getElementById("navCoach").style.display = "flex";
            populateCoachDropdown(isDirector, myTeams);
        }
        if (isDirector) document.getElementById("navAdmin").style.display = "flex";
        
        loadStats();
    } else {
        document.getElementById("loginUI").style.display = "flex";
        document.getElementById("appUI").style.display = "none";
        document.getElementById("bottomNav").style.display = "none";
    }
});

// --- CORE FUNCTIONS ---

function updateTimer() {
    const m = Math.floor(seconds/60).toString().padStart(2,'0');
    const s = (seconds%60).toString().padStart(2,'0');
    document.getElementById("timerDisplay").innerText = `${m}:${s}`;
}

function draw(e, ctx, canvas) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke(); ctx.beginPath(); ctx.moveTo(clientX - rect.left, clientY - rect.top);
}

function isCanvasBlank(canvas) {
    const context = canvas.getContext('2d');
    const pixelBuffer = new Uint32Array(context.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
    return !pixelBuffer.some(color => color !== 0);
}

function addToSession() {
    const name = document.getElementById("unifiedSelect").value;
    if (name === "Select Drill...") return alert("Pick a drill first");
    const sets = document.getElementById("inputSets").value || "-";
    const reps = document.getElementById("inputReps").value || "-";
    currentSessionItems.push({ name, sets, reps });
    renderSession();
}

function renderSession() {
    const list = document.getElementById("sessionList");
    list.innerHTML = currentSessionItems.map((i,idx) => `<li>${idx+1}. ${i.name} (${i.sets} x ${i.reps})</li>`).join("");
}

async function submitWorkout() {
    if (currentSessionItems.length === 0) return alert("Add drills first!");
    const teamId = document.getElementById("teamSelect").value;
    const mins = document.getElementById("totalMinutes").value;
    
    // Name Logic
    let player = "";
    const dd = document.getElementById("playerDropdown");
    if (dd && dd.offsetParent !== null && dd.value !== "") player = dd.value;
    else player = `${document.getElementById("playerFirst").value} ${document.getElementById("playerLast").value}`;
    
    if(!teamId || !player || !mins) return alert("Fill all fields");
    if(isSignatureBlank) return alert("Sign needed");

    try {
        await addDoc(collection(db, "reps"), {
            timestamp: new Date(),
            player: player,
            teamId: teamId,
            coachEmail: globalTeams.find(t=>t.id===teamId)?.coachEmail || DIRECTOR_EMAIL,
            minutes: mins,
            drills: currentSessionItems,
            drillSummary: currentSessionItems.map(i=>i.name).join(", "),
            signature: document.getElementById("signatureCanvas").toDataURL()
        });
        alert("Saved! +XP");
        currentSessionItems = []; renderSession(); 
        document.getElementById("totalMinutes").value = "";
        loadStats();
    } catch(e) { alert("Save error: " + e.message); }
}

async function fetchConfig() {
    // Teams
    try {
        const s = await getDoc(doc(db, "config", "teams"));
        if(s.exists()) globalTeams = s.data().list;
        else globalTeams = dbData.teams; 
    } catch(e) { globalTeams = dbData.teams; }
    
    // Populate Team Select
    const ts = document.getElementById("teamSelect");
    ts.innerHTML = '<option value="" disabled selected>Select Team...</option>';
    globalTeams.forEach(t => {
        const opt = document.createElement("option"); opt.value = t.id; opt.textContent = t.name; ts.appendChild(opt);
    });
    
    // Roster Logic
    ts.addEventListener("change", async (e) => {
        const tid = e.target.value;
        const rRef = await getDoc(doc(db, "rosters", tid));
        const pDrop = document.getElementById("playerDropdown");
        const pArea = document.getElementById("playerSelectArea");
        const mArea = document.getElementById("manualNameArea");
        
        if (rRef.exists() && rRef.data().players) {
            pDrop.innerHTML = '<option value="">Select You...</option>';
            rRef.data().players.sort().forEach(p => {
                const o = document.createElement("option"); o.value=p; o.textContent=p; pDrop.appendChild(o);
            });
            pDrop.innerHTML += '<option value="manual">-- Not Listed --</option>';
            pArea.style.display = "block"; mArea.style.display = "none";
        } else {
            pArea.style.display = "none"; mArea.style.display = "block";
        }
    });
    
    document.getElementById("playerDropdown").addEventListener("change", (e) => {
        document.getElementById("manualNameArea").style.display = (e.target.value === "manual") ? "block" : "none";
    });
}

// --- COACH & ADMIN ---
function populateCoachDropdown(isDirector, myTeams) {
    const sel = document.getElementById("adminTeamSelect");
    document.getElementById("adminControls").style.display = "block";
    sel.innerHTML = "";
    
    const list = isDirector ? globalTeams : myTeams;
    list.forEach(t => {
        const o = document.createElement("option"); o.value = t.id; o.textContent = t.name; sel.appendChild(o);
    });
    
    if(list.length > 0) {
        currentCoachTeamId = list[0].id;
        loadCoachDashboard(isDirector, list);
    }
    
    sel.addEventListener("change", (e) => {
        currentCoachTeamId = e.target.value;
        loadCoachDashboard(isDirector, list);
    });
}

async function loadCoachDashboard(isDirector, teams) {
    const tid = document.getElementById("adminTeamSelect").value || (teams[0]?.id);
    if(!tid) return;
    
    const q = query(collection(db, "reps"), where("teamId", "==", tid), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    const players = {};
    let logs = 0;
    
    snap.forEach(d => {
        const p = d.data().player;
        if(!players[p]) players[p] = 0;
        players[p] += parseInt(d.data().minutes);
        logs++;
    });
    
    document.getElementById("coachActivePlayers").innerText = Object.keys(players).length;
    document.getElementById("coachTotalReps").innerText = logs;
    
    // List
    document.getElementById("coachPlayerList").innerHTML = Object.keys(players).map(p => 
        `<div style="padding:10px; border-bottom:1px solid #eee; display:flex; justify-content:space-between;">
            <b>${p}</b> <span>${players[p]}m</span>
        </div>`
    ).join("");
}

async function parseRosterPDF(e) {
    const file = e.target.files[0];
    if(!file) return;
    try {
        const buf = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(buf).promise;
        let txt = "";
        for(let i=1; i<=pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            txt += content.items.map(x=>x.str).join(" ");
        }
        // Dumb parser: Finds capitalized names roughly
        const words = txt.split(" ").filter(w => /^[A-Z][a-z]+$/.test(w));
        const names = [];
        for(let i=0; i<words.length-1; i+=2) names.push(words[i] + " " + words[i+1]);
        
        document.getElementById("rosterTextRaw").value = names.join("\n");
        document.getElementById("rosterReviewArea").style.display = "block";
    } catch(err) { alert("PDF Error"); }
}

async function saveRoster() {
    const tid = document.getElementById("adminTeamSelect").value;
    const txt = document.getElementById("rosterTextRaw").value;
    if(!tid) return alert("Select team in dropdown first");
    await setDoc(doc(db, "rosters", tid), { players: txt.split("\n"), lastUpdated: new Date() });
    alert("Roster Saved!");
    document.getElementById("rosterReviewArea").style.display = "none";
}

async function addTeam() {
    const id = document.getElementById("newTeamId").value;
    const name = document.getElementById("newTeamName").value;
    const email = document.getElementById("newCoachEmail").value;
    if(!id || !name) return alert("Fill fields");
    globalTeams.push({ id, name, coachEmail: email });
    await setDoc(doc(db, "config", "teams"), { list: globalTeams });
    alert("Team Added. Refresh to see.");
}

async function loadLogs(col) {
    const c = document.getElementById("logContainer");
    c.innerHTML = "Loading...";
    const snap = await getDocs(query(collection(db, col), orderBy("timestamp", "desc"), limit(20)));
    c.innerHTML = "";
    snap.forEach(d => {
        c.innerHTML += `<div style="border-bottom:1px solid #eee; padding:5px;">${d.data().detail}</div>`;
    });
}

function resizeCanvas() {
    const c = document.getElementById("signatureCanvas");
    if(c && c.parentElement) { c.width = c.parentElement.offsetWidth; c.height = 150; }
}

async function loadStats() {
    // Basic stats for demo
    const snap = await getDocs(query(collection(db, "reps"), orderBy("timestamp", "desc"), limit(5)));
    let html = "";
    let total = 0;
    snap.forEach(d => {
        total += parseInt(d.data().minutes);
        html += `<tr><td>${d.data().player}</td><td>${d.data().minutes}m</td></tr>`;
    });
    document.getElementById("teamLeaderboardTable").querySelector("tbody").innerHTML = html;
    document.getElementById("statTime").innerText = total;
}