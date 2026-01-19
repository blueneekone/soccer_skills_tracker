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
const navTrack = document.getElementById("navTrack");
const navStats = document.getElementById("navStats");
const navCoach = document.getElementById("navCoach");
const activitySelect = document.getElementById("activitySelect");
const foundationSelect = document.getElementById("foundationSelect");
const cardioSelect = document.getElementById("cardioSelect");
const teamSelect = document.getElementById("teamSelect");
const adminTeamSelect = document.getElementById("adminTeamSelect");
const coachTeamSelect = document.getElementById("coachTeamSelect");

// --- MODAL LOGIC ---
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

// --- HELPER: COLOR ---
function getPlayerColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) { hash = name.charCodeAt(i) + ((hash << 5) - hash); }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 40%)`;
}

// --- ROSTER UPLOAD LOGIC (NEW) ---
document.getElementById("rosterPdfInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    
    if(file.type !== "application/pdf") return alert("Please select a PDF file.");

    const btn = document.getElementById("rosterPdfInput");
    btn.disabled = true; // Prevent double click

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
        let fullText = "";

        // Loop through all pages
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            // Extract strings
            textContent.items.forEach(item => {
                // Stack Sports typically lists: "First Last" or "Last, First" in specific columns
                // We'll just grab all text for now and let the user filter
                fullText += item.str + "\n";
            });
        }

        // Heuristic Parsing: Clean up the mess
        // 1. Remove short lines (dates, numbers, "Jersey")
        // 2. Look for lines with 2-3 words (likely names)
        const lines = fullText.split("\n");
        const potentialNames = lines.filter(line => {
            const clean = line.trim();
            // Regex: Starts with letter, 3-25 chars long, no digits
            const looksLikeName = /^[a-zA-Z\s,'-]{3,25}$/.test(clean);
            return looksLikeName && !clean.toLowerCase().includes("jersey") && !clean.toLowerCase().includes("coach");
        }).map(l => l.trim());

        // Unique names
        const uniqueNames = [...new Set(potentialNames)];

        // Show Review Area
        document.getElementById("rosterUploadStep1").style.display = "none";
        document.getElementById("rosterReviewArea").style.display = "block";
        document.getElementById("rosterTextRaw").value = uniqueNames.join("\n");

    } catch(err) {
        console.error(err);
        alert("Error parsing PDF. Try manual entry.");
    }
    btn.disabled = false;
});

document.getElementById("cancelRosterBtn").addEventListener("click", () => {
    document.getElementById("rosterReviewArea").style.display = "none";
    document.getElementById("rosterUploadStep1").style.display = "block";
    document.getElementById("rosterPdfInput").value = "";
});

document.getElementById("saveRosterBtn").addEventListener("click", async () => {
    const teamId = coachTeamSelect.value;
    const namesRaw = document.getElementById("rosterTextRaw").value;
    
    if(!namesRaw.trim()) return alert("Roster is empty.");
    if(!teamId) return alert("Select a team.");

    const namesList = namesRaw.split("\n").map(n => n.trim()).filter(n => n.length > 0);

    try {
        // Save to Firestore: collection "rosters", docID = teamId
        await setDoc(doc(db, "rosters", teamId), {
            teamId: teamId,
            players: namesList,
            updatedAt: new Date()
        });
        
        alert(`Success! Saved ${namesList.length} players to ${teamId}.`);
        document.getElementById("cancelRosterBtn").click(); // Reset UI
    } catch(e) {
        console.error(e);
        alert("Error saving to database.");
    }
});

// TIMER
const timerDisplay = document.getElementById("stopwatch");
const minsInput = document.getElementById("minutes");
function updateTimer() {
    seconds++;
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    timerDisplay.innerText = `${m}:${s}`;
}
document.getElementById("startTimer").addEventListener("click", () => { if (!timerInterval) timerInterval = setInterval(updateTimer, 1000); });
document.getElementById("stopTimer").addEventListener("click", () => {
    clearInterval(timerInterval); timerInterval = null;
    const m = Math.floor(seconds / 60); minsInput.value = m > 0 ? m : 1; 
});
document.getElementById("resetTimer").addEventListener("click", () => {
    clearInterval(timerInterval); timerInterval = null; seconds = 0; timerDisplay.innerText = "00:00";
});

// SIGNATURE
const canvas = document.getElementById("signaturePad");
const ctx = canvas.getContext("2d");
let isDrawing = false;
function resizeCanvas() {
    if(!canvas.parentElement) return;
    canvas.width = canvas.parentElement.offsetWidth; canvas.height = 150;
    ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#00263A";
}
window.addEventListener('resize', resizeCanvas);
function startDraw(e) { isDrawing = true; ctx.beginPath(); draw(e); }
function endDraw() { isDrawing = false; ctx.beginPath(); checkSignature(); }
function draw(e) {
    if (!isDrawing) return; e.preventDefault();
    isSignatureBlank = false;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx.lineTo(x, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y);
}
function isCanvasBlank(canvas) {
    const context = canvas.getContext('2d');
    const pixelBuffer = new Uint32Array(context.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
    return !pixelBuffer.some(color => color !== 0);
}
function checkSignature() {
    if (!isCanvasBlank(canvas)) { canvas.style.borderColor = "#16a34a"; canvas.style.backgroundColor = "#f0fdf4"; }
}
canvas.addEventListener('mousedown', startDraw); canvas.addEventListener('mouseup', endDraw);
canvas.addEventListener('mousemove', draw); canvas.addEventListener('touchstart', startDraw);
canvas.addEventListener('touchend', endDraw); canvas.addEventListener('touchmove', draw);
document.getElementById("clearSigBtn").addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height); isSignatureBlank = true;
    canvas.style.borderColor = "#cbd5e1"; canvas.style.backgroundColor = "#fcfcfc"; 
});

// AUTH
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginUI.style.display = "none"; appUI.style.display = "block"; bottomNav.style.display = "flex";
    document.getElementById("coachName").textContent = `Logged in: ${user.displayName}`;
    loadUserProfile();

    const isDirector = user.email.toLowerCase() === DIRECTOR_EMAIL.toLowerCase();
    const assignedTeam = dbData.teams.find(t => t.coachEmail.toLowerCase() === user.email.toLowerCase());
    
    if(isDirector || assignedTeam) {
        navCoach.style.display = "flex";
        
        // Populate Coach Team Select (for roster upload)
        if(coachTeamSelect.options.length === 0) {
            dbData.teams.forEach(t => {
                // If director, show all. If coach, show only theirs.
                if(isDirector || t.coachEmail.toLowerCase() === user.email.toLowerCase()) {
                    const opt = document.createElement("option"); opt.value = t.id; opt.textContent = t.name;
                    coachTeamSelect.appendChild(opt);
                }
            });
        }

        if(isDirector) {
            document.getElementById("adminControls").style.display = "block";
            if(adminTeamSelect.options.length === 1) {
                dbData.teams.forEach(t => {
                    const opt = document.createElement("option"); opt.value = t.id; opt.textContent = t.name;
                    adminTeamSelect.appendChild(opt);
                });
                adminTeamSelect.addEventListener("change", () => loadCoachDashboard(true));
            }
        }
    }
    loadStats(); resizeCanvas();
  } else {
    loginUI.style.display = "block"; appUI.style.display = "none"; bottomNav.style.display = "none";
  }
});

// PROFILE HELPERS
function saveUserProfile(first, last, team) {
    localStorage.setItem("aggie_first", first); localStorage.setItem("aggie_last", last); localStorage.setItem("aggie_team", team);
}
function loadUserProfile() {
    const f = localStorage.getItem("aggie_first"); const l = localStorage.getItem("aggie_last"); const t = localStorage.getItem("aggie_team");
    if(f) document.getElementById("playerFirst").value = f;
    if(l) document.getElementById("playerLast").value = l;
    if(t) document.getElementById("teamSelect").value = t;
}

loginBtn.addEventListener("click", () => { const provider = new GoogleAuthProvider(); signInWithRedirect(auth, provider); });
logoutBtn.addEventListener("click", () => { signOut(auth).then(() => location.reload()); });

function switchTab(tab) {
    [viewTracker, viewStats, viewCoach].forEach(v => v.style.display = "none");
    [navTrack, navStats, navCoach].forEach(n => n.classList.remove("active"));
    if (tab === 'track') { viewTracker.style.display = "block"; navTrack.classList.add("active"); setTimeout(resizeCanvas, 100); }
    if (tab === 'stats') { viewStats.style.display = "block"; navStats.classList.add("active"); loadStats(); }
    if (tab === 'coach') { viewCoach.style.display = "block"; navCoach.classList.add("active"); loadCoachDashboard(); }
}
navTrack.addEventListener("click", () => switchTab('track')); navStats.addEventListener("click", () => switchTab('stats')); navCoach.addEventListener("click", () => switchTab('coach'));

// INIT DROPDOWNS
if(teamSelect.options.length === 1) { dbData.teams.forEach(t => { const opt = document.createElement("option"); opt.value = t.id; opt.textContent = t.name; teamSelect.appendChild(opt); }); }
if(cardioSelect.options.length === 1) { dbData.foundationSkills.filter(s => s.type === "cardio").forEach(s => { const opt = document.createElement("option"); opt.value = s.name; opt.textContent = s.name; cardioSelect.appendChild(opt); }); }
if(foundationSelect.options.length === 1) {
    const foundations = dbData.foundationSkills.filter(s => s.type === "foundation");
    const categories = {};
    foundations.forEach(s => { if (!categories[s.category]) categories[s.category] = []; categories[s.category].push(s); });
    for (const [catName, skills] of Object.entries(categories)) {
        const group = document.createElement("optgroup"); group.label = catName;
        skills.forEach(s => { const opt = document.createElement("option"); opt.value = s.name; opt.textContent = s.name; group.appendChild(opt); });
        foundationSelect.appendChild(group);
    }
}

cardioSelect.addEventListener("change", (e) => {
    if(e.target.value !== "") { foundationSelect.selectedIndex = 0; document.getElementById("watchBtnContainer").style.display = "none"; }
});
foundationSelect.addEventListener("change", (e) => {
    cardioSelect.selectedIndex = 0;
    const skillName = e.target.value; const skillData = dbData.foundationSkills.find(s => s.name === skillName);
    showDrillPopup(skillData);
});

function showDrillPopup(skillData) {
    const container = document.getElementById("watchBtnContainer"); const title = document.getElementById("drillRecommendation"); const img = document.getElementById("drillImage"); const btn = document.getElementById("watchVideoBtn");
    if(!skillData) { container.style.display = "none"; return; }
    container.style.display = "block"; title.innerHTML = `Selected: ${skillData.drill}`;
    if(skillData.image) { img.src = skillData.image; img.style.display = "block"; } else { img.style.display = "none"; }
    if(skillData.video) { btn.style.display = "inline-block"; btn.onclick = () => { document.getElementById("videoPlayer").src = skillData.video; document.getElementById("videoModal").style.display = "block"; } } else { btn.style.display = "none"; }
}
const outcomeChips = document.getElementById("outcome");
outcomeChips.addEventListener("click", (e) => {
    if(e.target.classList.contains("chip")) { Array.from(outcomeChips.children).forEach(c => c.classList.remove("active")); e.target.classList.add("active"); }
});

document.getElementById("addToSessionBtn").addEventListener("click", () => {
    let activeSkillName = "";
    if (cardioSelect.value !== "") activeSkillName = cardioSelect.value;
    else if (foundationSelect.value !== "") activeSkillName = foundationSelect.value;
    if(!activeSkillName) return alert("Select an activity first.");
    const sets = document.getElementById("sets").value || "-"; const reps = document.getElementById("reps").value || "-";
    const item = { name: activeSkillName, sets: sets, reps: reps };
    currentSessionItems.push(item);
    renderSessionList();
    cardioSelect.selectedIndex = 0; foundationSelect.selectedIndex = 0;
    document.getElementById("watchBtnContainer").style.display = "none";
});
function renderSessionList() {
    const list = document.getElementById("sessionList");
    if(currentSessionItems.length === 0) { list.innerHTML = `<li style="color:#94a3b8; text-align:center;">Empty Stack</li>`; return; }
    list.innerHTML = currentSessionItems.map((item, index) => `<li style="border-bottom:1px solid #e2e8f0; padding:8px; display:flex; justify-content:space-between; align-items:center;"><span><b>${index+1}.</b> ${item.name}</span> <span style="font-size:12px; color:#64748b;">${item.sets} x ${item.reps}</span></li>`).join("");
}

document.getElementById("submitWorkoutBtn").addEventListener("click", async () => {
    const user = auth.currentUser; if (!user) return alert("Sign in first");
    if (currentSessionItems.length === 0) return alert("Your stack is empty!");
    const teamId = teamSelect.value; const pFirst = document.getElementById("playerFirst").value; const pLast = document.getElementById("playerLast").value; const mins = document.getElementById("minutes").value;
    if(!teamId) return alert("Select Team"); if(!pFirst || !pLast) return alert("Enter Name"); if(!mins || mins == 0) return alert("Enter Duration");
    if (isCanvasBlank(canvas)) { canvas.style.borderColor = "#dc2626"; return alert("Signature Required"); }
    
    saveUserProfile(pFirst, pLast, teamId);
    const signatureData = canvas.toDataURL();
    const selectedTeam = dbData.teams.find(t => t.id === teamId);
    const assignedCoachEmail = selectedTeam ? selectedTeam.coachEmail : DIRECTOR_EMAIL;
    const drillSummary = currentSessionItems.map(i => `${i.name} (${i.sets}x${i.reps})`).join(", ");

    const sessionData = {
        coachEmail: assignedCoachEmail, teamId: teamId, timestamp: new Date(), player: `${pFirst} ${pLast}`,
        minutes: mins, drills: currentSessionItems, drillSummary: drillSummary,
        outcome: document.getElementById("outcome").querySelector(".active")?.dataset.val || "success",
        notes: document.getElementById("notes").value, signatureImg: signatureData
    };

    const btn = document.getElementById("submitWorkoutBtn"); btn.disabled = true; btn.textContent = "Saving...";
    try {
        await addDoc(collection(db, "reps"), sessionData);
        alert(`Logged! +${10 + parseInt(mins)} XP`);
        currentSessionItems = []; renderSessionList();
        document.getElementById("minutes").value = ""; document.getElementById("notes").value = "";
        ctx.clearRect(0, 0, canvas.width, canvas.height); isSignatureBlank = true;
        canvas.style.borderColor = "#cbd5e1"; canvas.style.backgroundColor = "#fcfcfc";
        document.getElementById("resetTimer").click(); loadStats();
    } catch(e) { console.error(e); alert("Error saving"); }
    btn.disabled = false; btn.textContent = "✅ Submit Full Session";
});

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

    // Advanced Stats
    if(logs.length) {
        document.getElementById("statAvg").innerText = Math.round(mins / logs.length);
        
        // Streak Logic (Approximate)
        let streak = 0;
        const dates = [...new Set(logs.map(l => new Date(l.timestamp.seconds*1000).toDateString()))];
        const today = new Date().toDateString();
        if(dates.includes(today)) streak = 1;
        // Simple streak for demo
        document.getElementById("statStreak").innerText = streak;
    }

    renderCalendar(logs);
    renderPlayerTrendChart(logs);
}

function renderCalendar(logs) {
    const grid = document.getElementById("calendarDays");
    const header = document.getElementById("calMonthYear");
    grid.innerHTML = "";
    
    const activeDates = new Set(logs.map(l => new Date(l.timestamp.seconds*1000).toDateString()));
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    header.innerText = `${monthNames[currentMonth]} ${currentYear}`;

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) { grid.appendChild(document.createElement("div")); }

    for (let i = 1; i <= daysInMonth; i++) {
        const dateObj = new Date(currentYear, currentMonth, i);
        const dayDiv = document.createElement("div"); dayDiv.className = "cal-day";
        dayDiv.innerHTML = `<span>${i}</span>`;
        if (i === today.getDate()) dayDiv.classList.add("today");
        if (activeDates.has(dateObj.toDateString())) {
            dayDiv.classList.add("has-log");
            dayDiv.innerHTML += `<div class="cal-dot"></div>`;
            dayDiv.addEventListener("click", () => showDayDetails(dateObj, logs));
        }
        grid.appendChild(dayDiv);
    }
}

function showDayDetails(dateObj, logs) {
    const modal = document.getElementById("dayModal");
    const content = document.getElementById("dayModalContent");
    const title = document.getElementById("dayModalDate");
    const dateStr = dateObj.toDateString();
    title.innerText = dateStr;
    const dayLogs = logs.filter(l => new Date(l.timestamp.seconds*1000).toDateString() === dateStr);
    
    if(dayLogs.length === 0) {
        content.innerHTML = "<p>No sessions recorded.</p>";
    } else {
        content.innerHTML = dayLogs.map(l => `
            <div class="day-session-item">
                <div class="day-session-header">
                    <span>${l.player}</span>
                    <span>${l.minutes}m (${l.signatureImg ? '✓' : 'X'})</span>
                </div>
                <div class="day-session-drills">${l.drillSummary ? l.drillSummary : l.skill}</div>
            </div>
        `).join("");
    }
    modal.style.display = "block";
}

let playerTrendChart = null;
function renderPlayerTrendChart(logs) {
    const ctx = document.getElementById('playerTrendChart').getContext('2d');
    if (playerTrendChart) playerTrendChart.destroy();
    const labels = []; const dataPoints = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(new Date().getDate() - i); const dateStr = d.toDateString();
        labels.push(d.toLocaleDateString('en-US', {weekday:'short'}));
        const dayMins = logs.filter(l => new Date(l.timestamp.seconds*1000).toDateString() === dateStr).reduce((sum, l) => sum + parseInt(l.minutes), 0);
        dataPoints.push(dayMins);
    }
    playerTrendChart = new Chart(ctx, {
        type: 'bar', data: { labels: labels, datasets: [{ label: 'Minutes', data: dataPoints, backgroundColor: '#00263A', borderRadius: 4 }] },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { display: false } }, x: { grid: { display: false } } } }
    });
}

async function loadCoachDashboard(isAdmin = false) {
    const user = auth.currentUser;
    const listDiv = document.getElementById("coachPlayerList");
    listDiv.innerHTML = "Loading...";
    let q;
    if (isAdmin) {
        const teamFilter = document.getElementById("adminTeamSelect").value;
        if(teamFilter === "all") { q = query(collection(db, "reps"), orderBy("timestamp", "desc")); }
        else { q = query(collection(db, "reps"), where("teamId", "==", teamFilter), orderBy("timestamp", "desc")); }
    } else {
        q = query(collection(db, "reps"), where("coachEmail", "==", user.email), orderBy("timestamp", "desc"));
    }
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
        document.getElementById("coachTotalReps").innerText = allSessions.length;
        document.getElementById("coachActivePlayers").innerText = Object.keys(players).length;
        renderTeamChart(players);
        listDiv.innerHTML = Object.keys(players).map(p => `<div style="padding:10px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between;"><b>${p}</b> <span>${players[p].mins}m / ${players[p].count} Sessions</span></div>`).join("");
        document.getElementById("exportXlsxBtn").onclick = () => {
            const formatted = allSessions.map(r => ({ Date: new Date(r.timestamp.seconds*1000).toLocaleDateString(), Team: r.teamId || "N/A", Player: r.player, Duration_Mins: r.minutes, Drills: r.drillSummary, Verified: r.signatureImg ? "Signed" : "Not Signed", Notes: r.notes }));
            const ws = XLSX.utils.json_to_sheet(formatted); const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "TrainingData"); XLSX.writeFile(wb, "AggiesFC_Export.xlsx");
        };
    } catch (e) { listDiv.innerHTML = "No data found or permission denied."; console.error(e); }
}

let teamChart = null;
function renderTeamChart(playersData) {
    const ctx = document.getElementById('teamChart').getContext('2d');
    if (teamChart) teamChart.destroy();
    const dates = [];
    for(let i=6; i>=0; i--) { const d = new Date(); d.setDate(new Date().getDate() - i); dates.push(d.toLocaleDateString()); }
    const datasets = Object.keys(playersData).map(p => {
        const dailyMins = dates.map(dateStr => { return playersData[p].history.includes(dateStr) ? 1 : 0; });
        const color = getPlayerColor(p);
        return { label: p, data: dailyMins, borderColor: color, tension: 0.3, fill: false };
    });
    teamChart = new Chart(ctx, { type: 'line', data: { labels: dates, datasets: datasets }, options: { responsive: true, plugins: { legend: { display: true, position: 'bottom' } }, scales: { y: { beginAtZero: true, title: {display:true, text:'Active?'} } } } });
}