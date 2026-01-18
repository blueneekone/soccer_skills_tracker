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

// HELPER: COLOR
function getPlayerColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) { hash = name.charCodeAt(i) + ((hash << 5) - hash); }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 40%)`;
}

// TIMER
const timerDisplay = document.getElementById("stopwatch");
const minsInput = document.getElementById("minutes");
function updateTimer() {
    seconds++;
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    timerDisplay.innerText = `${m}:${s}`;
}
document.getElementById("startTimer").addEventListener("click", () => {
    if (!timerInterval) timerInterval = setInterval(updateTimer, 1000);
});
document.getElementById("stopTimer").addEventListener("click", () => {
    clearInterval(timerInterval);
    timerInterval = null;
    const m = Math.floor(seconds / 60);
    minsInput.value = m > 0 ? m : 1; 
});
document.getElementById("resetTimer").addEventListener("click", () => {
    clearInterval(timerInterval);
    timerInterval = null;
    seconds = 0;
    timerDisplay.innerText = "00:00";
});

// SIGNATURE
const canvas = document.getElementById("signaturePad");
const ctx = canvas.getContext("2d");
let isDrawing = false;
function resizeCanvas() {
    if(!canvas.parentElement) return;
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = 150;
    ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#00263A";
}
window.addEventListener('resize', resizeCanvas);
function startDraw(e) { isDrawing = true; ctx.beginPath(); draw(e); }
function endDraw() { isDrawing = false; ctx.beginPath(); checkSignature(); }
function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();
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
canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('mouseup', endDraw);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('touchstart', startDraw);
canvas.addEventListener('touchend', endDraw);
canvas.addEventListener('touchmove', draw);
document.getElementById("clearSigBtn").addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    isSignatureBlank = true;
    canvas.style.borderColor = "#cbd5e1"; canvas.style.backgroundColor = "#fcfcfc"; 
});

// AUTH
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginUI.style.display = "none";
    appUI.style.display = "block";
    bottomNav.style.display = "flex";
    document.getElementById("coachName").textContent = `Logged in: ${user.displayName}`;
    
    // Check Director/Coach
    const isDirector = user.email.toLowerCase() === "ecwaechtler@gmail.com";
    const assignedTeam = dbData.teams.find(t => t.coachEmail.toLowerCase() === user.email.toLowerCase());
    
    if(isDirector || assignedTeam) {
        navCoach.style.display = "flex";
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

loginBtn.addEventListener("click", () => {
  const provider = new GoogleAuthProvider(); signInWithRedirect(auth, provider);
});
logoutBtn.addEventListener("click", () => { signOut(auth).then(() => location.reload()); });

// NAV
function switchTab(tab) {
    [viewTracker, viewStats, viewCoach].forEach(v => v.style.display = "none");
    [navTrack, navStats, navCoach].forEach(n => n.classList.remove("active"));
    if (tab === 'track') { viewTracker.style.display = "block"; navTrack.classList.add("active"); setTimeout(resizeCanvas, 100); }
    if (tab === 'stats') { viewStats.style.display = "block"; navStats.classList.add("active"); loadStats(); }
    if (tab === 'coach') { viewCoach.style.display = "block"; navCoach.classList.add("active"); loadCoachDashboard(); }
}
navTrack.addEventListener("click", () => switchTab('track'));
navStats.addEventListener("click", () => switchTab('stats'));
navCoach.addEventListener("click", () => switchTab('coach'));

// INIT DROPDOWNS
if(teamSelect.options.length === 1) {
    dbData.teams.forEach(t => { const opt = document.createElement("option"); opt.value = t.id; opt.textContent = t.name; teamSelect.appendChild(opt); });
}
if(cardioSelect.options.length === 1) {
    dbData.foundationSkills.filter(s => s.type === "cardio").forEach(s => { const opt = document.createElement("option"); opt.value = s.name; opt.textContent = s.name; cardioSelect.appendChild(opt); });
}
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

// SELECTION
cardioSelect.addEventListener("change", (e) => {
    if(e.target.value !== "") {
        foundationSelect.selectedIndex = 0; document.getElementById("watchBtnContainer").style.display = "none"; 
        document.querySelectorAll(".chip.active").forEach(c => { if(c.parentElement.id === "pressure" || c.parentElement.id === "outcome") return; c.classList.remove("active"); });
    }
});
foundationSelect.addEventListener("change", (e) => {
    cardioSelect.selectedIndex = 0;
    const skillName = e.target.value; const skillData = dbData.foundationSkills.find(s => s.name === skillName);
    document.querySelectorAll(".chip.active").forEach(c => { if(c.parentElement.id === "pressure" || c.parentElement.id === "outcome") return; c.classList.remove("active"); });
    showDrillPopup(skillData);
});

// TACTICAL
const pressureChips = document.getElementById("pressure");
pressureChips.addEventListener("click", (e) => {
    if(e.target.classList.contains("chip")) {
        Array.from(pressureChips.children).forEach(c => c.classList.remove("active"));
        e.target.classList.add("active");
        updateTacticalSkills();
    }
});
function updateTacticalSkills() {
    const tacticalDiv = document.getElementById("skillSuggestions"); tacticalDiv.innerHTML = "";
    const currentPressure = pressureChips.querySelector(".active")?.dataset.val;
    const tacticalSkills = dbData.foundationSkills.filter(s => {
        if(s.type !== "tactical") return false;
        return (!currentPressure) ? true : s.pressure.includes(currentPressure);
    });
    tacticalSkills.forEach(s => {
        const chip = document.createElement("div"); chip.className = "chip"; chip.textContent = s.name;
        chip.addEventListener("click", () => { foundationSelect.selectedIndex = 0; cardioSelect.selectedIndex = 0; selectTacticalSkill(chip, s); });
        tacticalDiv.appendChild(chip);
    });
}
function selectTacticalSkill(chipElement, skillData) {
    document.querySelectorAll(".chip.active").forEach(c => { if(c.parentElement.id === "pressure" || c.parentElement.id === "outcome") return; c.classList.remove("active"); });
    chipElement.classList.add("active"); showDrillPopup(skillData);
}
function showDrillPopup(skillData) {
    const container = document.getElementById("watchBtnContainer"); const title = document.getElementById("drillRecommendation"); const img = document.getElementById("drillImage"); const btn = document.getElementById("watchVideoBtn");
    if(!skillData) { container.style.display = "none"; return; }
    container.style.display = "block"; title.innerHTML = `Selected: ${skillData.drill}`;
    if(skillData.image) { img.src = skillData.image; img.style.display = "block"; } else { img.style.display = "none"; }
    if(skillData.video) { btn.style.display = "inline-block"; btn.onclick = () => { document.getElementById("videoPlayer").src = skillData.video; document.getElementById("videoModal").style.display = "block"; } } else { btn.style.display = "none"; }
}
document.getElementById("closeModal").onclick = () => { document.getElementById("videoModal").style.display = "none"; document.getElementById("videoPlayer").src = ""; };
const outcomeChips = document.getElementById("outcome");
outcomeChips.addEventListener("click", (e) => {
    if(e.target.classList.contains("chip")) { Array.from(outcomeChips.children).forEach(c => c.classList.remove("active")); e.target.classList.add("active"); }
});

// STACK ADD
document.getElementById("addToSessionBtn").addEventListener("click", () => {
    let activeSkillName = "";
    if (cardioSelect.value !== "") activeSkillName = cardioSelect.value;
    else if (foundationSelect.value !== "") activeSkillName = foundationSelect.value;
    else { const activeChip = document.querySelector("#skillSuggestions .active"); if(activeChip) activeSkillName = activeChip.textContent; }

    if(!activeSkillName) return alert("Select an activity first.");
    const sets = document.getElementById("sets").value || "-"; const reps = document.getElementById("reps").value || "-";
    const item = { name: activeSkillName, sets: sets, reps: reps };
    currentSessionItems.push(item);
    renderSessionList();
    cardioSelect.selectedIndex = 0; foundationSelect.selectedIndex = 0;
    document.querySelectorAll(".chip.active").forEach(c => { if(c.parentElement.id === "pressure" || c.parentElement.id === "outcome") return; c.classList.remove("active"); });
    document.getElementById("watchBtnContainer").style.display = "none";
});
function renderSessionList() {
    const list = document.getElementById("sessionList");
    if(currentSessionItems.length === 0) { list.innerHTML = `<li style="color:#94a3b8; text-align:center;">Empty Stack</li>`; return; }
    list.innerHTML = currentSessionItems.map((item, index) => `
        <li style="border-bottom:1px solid #e2e8f0; padding:8px; display:flex; justify-content:space-between; align-items:center;">
            <span><b>${index+1}.</b> ${item.name}</span> <span style="font-size:12px; color:#64748b;">${item.sets} x ${item.reps}</span>
        </li>`).join("");
}

// SUBMIT
document.getElementById("submitWorkoutBtn").addEventListener("click", async () => {
    const user = auth.currentUser; if (!user) return alert("Sign in first");
    if (currentSessionItems.length === 0) return alert("Your stack is empty!");
    const teamId = teamSelect.value; const pFirst = document.getElementById("playerFirst").value; const pLast = document.getElementById("playerLast").value; const mins = document.getElementById("minutes").value;
    if(!teamId) return alert("Select Team"); if(!pFirst || !pLast) return alert("Enter Name"); if(!mins || mins == 0) return alert("Enter Duration");
    if (isCanvasBlank(canvas)) { canvas.style.borderColor = "#dc2626"; return alert("Signature Required"); }
    
    const signatureData = canvas.toDataURL();
    const selectedTeam = dbData.teams.find(t => t.id === teamId);
    const assignedCoachEmail = selectedTeam ? selectedTeam.coachEmail : "ecwaechtler@gmail.com";
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

// STATS
async function loadStats() {
    const user = auth.currentUser; if (!user) return;
    const q = query(collection(db, "reps"), where("coachEmail", "==", user.email), orderBy("timestamp", "asc"), limit(100));
    const snap = await getDocs(q);
    const logs = []; let mins = 0;
    snap.forEach(doc => { const d = doc.data(); logs.push(d); mins += parseInt(d.minutes || 0); });

    document.getElementById("statTotal").innerText = logs.length;
    document.getElementById("statTime").innerText = mins;
    const xp = (logs.length * 10) + mins;
    let level = "Rookie"; if (xp > 100) level = "Starter"; if (xp > 500) level = "Pro"; if (xp > 1000) level = "Elite"; if (xp > 2000) level = "Legend";
    document.getElementById("userLevelDisplay").innerText = `${level} • ${xp} XP`;
    document.getElementById("xpBar").style.width = `${Math.min((xp%500)/500*100, 100)}%`;

    renderCalendar(logs);
    document.getElementById("historyList").innerHTML = logs.slice().reverse().map(l => `
        <div style="border-bottom:1px solid #e2e8f0; padding:10px;">
            <b>${new Date(l.timestamp.seconds*1000).toLocaleDateString()}</b> <span style="float:right; color:#00263A; font-weight:bold;">${l.minutes}m</span>
            <div style="font-size:11px; color:#64748b;">${l.drills ? l.drills.length : 1} Exercises • ${l.signatureImg ? '✅ Verified' : '❌'}</div>
        </div>`).join("");
}

// NEW: GOOGLE CALENDAR RENDER
function renderCalendar(logs) {
    const grid = document.getElementById("calendarDays");
    const header = document.getElementById("calMonthYear");
    grid.innerHTML = "";
    
    // Set for easy lookup of logged dates
    const activeDates = new Set(logs.map(l => new Date(l.timestamp.seconds*1000).toDateString()));
    
    // Get Current Month Data
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Set Header
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    header.innerText = `${monthNames[currentMonth]} ${currentYear}`;

    const firstDay = new Date(currentYear, currentMonth, 1).getDay(); // Day of week (0-6)
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // 1. Padding for previous month
    for (let i = 0; i < firstDay; i++) {
        const blank = document.createElement("div");
        grid.appendChild(blank);
    }

    // 2. Days
    for (let i = 1; i <= daysInMonth; i++) {
        const dateObj = new Date(currentYear, currentMonth, i);
        const dayDiv = document.createElement("div");
        dayDiv.className = "cal-day";
        
        // Number Span
        const numSpan = document.createElement("span");
        numSpan.innerText = i;
        dayDiv.appendChild(numSpan);

        // Check if Today
        if (i === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
            dayDiv.classList.add("today");
        }

        // Check if Workout Logged
        if (activeDates.has(dateObj.toDateString())) {
            dayDiv.classList.add("has-log");
            const dot = document.createElement("div");
            dot.className = "cal-dot";
            dayDiv.appendChild(dot);
        }

        grid.appendChild(dayDiv);
    }
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
        const players = {};
        const allSessions = [];
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
        listDiv.innerHTML = Object.keys(players).map(p => `
            <div style="padding:10px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between;">
                <b>${p}</b> <span>${players[p].mins}m / ${players[p].count} Sessions</span>
            </div>`).join("");
        
        document.getElementById("exportXlsxBtn").onclick = () => {
            const formatted = allSessions.map(r => ({
                Date: new Date(r.timestamp.seconds*1000).toLocaleDateString(),
                Team: r.teamId || "N/A", Player: r.player, Duration_Mins: r.minutes,
                Drills: r.drillSummary, Verified: r.signatureImg ? "Signed" : "Not Signed", Notes: r.notes
            }));
            const ws = XLSX.utils.json_to_sheet(formatted);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "TrainingData");
            XLSX.writeFile(wb, "AggiesFC_Export.xlsx");
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
    teamChart = new Chart(ctx, {
        type: 'line', data: { labels: dates, datasets: datasets },
        options: { responsive: true, plugins: { legend: { display: true, position: 'bottom' } }, scales: { y: { beginAtZero: true, title: {display:true, text:'Active?'} } } }
    });
}
document.getElementById("closeModal").onclick = () => { document.getElementById("videoModal").style.display = "none"; document.getElementById("videoPlayer").src = ""; };