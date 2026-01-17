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
const foundationSelect = document.getElementById("foundationSelect");
const cardioSelect = document.getElementById("cardioSelect");
const addSkillBtn = document.getElementById("addSkillBtn"); // NEW
const selectedSkillsList = document.getElementById("selectedSkillsList"); // NEW

// TIMER
let timerInterval;
let seconds = 0;
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
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = 150;
    ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#00263A";
}
window.addEventListener('resize', resizeCanvas);
function startDraw(e) { isDrawing = true; ctx.beginPath(); draw(e); }
function endDraw() { isDrawing = false; ctx.beginPath(); }
function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx.lineTo(x, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y);
}
canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('mouseup', endDraw);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('touchstart', startDraw);
canvas.addEventListener('touchend', endDraw);
canvas.addEventListener('touchmove', draw);
document.getElementById("clearSigBtn").addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// AUTH
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginUI.style.display = "none";
    appUI.style.display = "block";
    bottomNav.style.display = "flex";
    document.getElementById("coachName").textContent = `Logged in: ${user.displayName}`;
    if(user.email.toLowerCase() === COACH_EMAIL.toLowerCase()) navCoach.style.display = "flex";
    loadStats(); resizeCanvas();
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
    
    if (tab === 'track') { viewTracker.style.display = "block"; navTrack.classList.add("active"); setTimeout(resizeCanvas, 100); }
    if (tab === 'stats') { viewStats.style.display = "block"; navStats.classList.add("active"); loadStats(); }
    if (tab === 'coach') { viewCoach.style.display = "block"; navCoach.classList.add("active"); loadCoachDashboard(); }
}
navTrack.addEventListener("click", () => switchTab('track'));
navStats.addEventListener("click", () => switchTab('stats'));
navCoach.addEventListener("click", () => switchTab('coach'));

// POPULATE DROPDOWNS
if(cardioSelect.options.length === 1) {
    dbData.foundationSkills.filter(s => s.type === "cardio").forEach(s => {
        const opt = document.createElement("option"); opt.value = s.name; opt.textContent = s.name;
        cardioSelect.appendChild(opt);
    });
}

if(foundationSelect.options.length === 1) {
    const foundations = dbData.foundationSkills.filter(s => s.type === "foundation");
    const categories = {};
    foundations.forEach(s => {
        if (!categories[s.category]) categories[s.category] = [];
        categories[s.category].push(s);
    });

    for (const [catName, skills] of Object.entries(categories)) {
        const group = document.createElement("optgroup"); group.label = catName;
        skills.forEach(s => {
            const opt = document.createElement("option"); opt.value = s.name; opt.textContent = s.name;
            group.appendChild(opt);
        });
        foundationSelect.appendChild(group);
    }
}

// === MULTI-SELECT LOGIC ===
let currentRoutine = [];

// Add Button Logic
addSkillBtn.addEventListener("click", () => {
    const val = foundationSelect.value;
    if (!val) return;
    
    // Check if already in list
    if (currentRoutine.includes(val)) return;

    // Add to stack
    currentRoutine.push(val);
    renderRoutineStack();
    
    // Reset dropdown
    foundationSelect.selectedIndex = 0;
});

function renderRoutineStack() {
    selectedSkillsList.innerHTML = "";
    currentRoutine.forEach((skill, index) => {
        const chip = document.createElement("div");
        chip.className = "chip active";
        chip.style.display = "inline-flex";
        chip.style.alignItems = "center";
        chip.style.gap = "5px";
        chip.innerHTML = `<span>${skill}</span> <span style='font-size:16px; font-weight:bold; cursor:pointer;'>&times;</span>`;
        
        // Remove on click
        chip.addEventListener("click", () => {
            currentRoutine.splice(index, 1);
            renderRoutineStack();
        });
        selectedSkillsList.appendChild(chip);
    });
}

// EVENTS FOR DROPDOWNS
cardioSelect.addEventListener("change", (e) => {
    if(e.target.value !== "") {
        // Clearing routine if they switch to cardio
        currentRoutine = [];
        renderRoutineStack();
        document.getElementById("watchBtnContainer").style.display = "none";
    }
});

// Watch popup on dropdown change
foundationSelect.addEventListener("change", (e) => {
    cardioSelect.selectedIndex = 0;
    const skillName = e.target.value;
    const skillData = dbData.foundationSkills.find(s => s.name === skillName);
    
    // Clear Tactical
    document.querySelectorAll("#skillSuggestions .chip.active").forEach(c => c.classList.remove("active"));
    
    showDrillPopup(skillData);
});

// TACTICAL CHIPS
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

    const tacticalSkills = dbData.foundationSkills.filter(s => {
        if(s.type !== "tactical") return false;
        return (!currentPressure) ? true : s.pressure.includes(currentPressure);
    });

    tacticalSkills.forEach(s => {
        const chip = document.createElement("div"); chip.className = "chip"; chip.textContent = s.name;
        chip.addEventListener("click", () => {
             foundationSelect.selectedIndex = 0; 
             cardioSelect.selectedIndex = 0;
             currentRoutine = []; // clear basics
             renderRoutineStack();
             selectTacticalSkill(chip, s);
        });
        tacticalDiv.appendChild(chip);
    });
}

function selectTacticalSkill(chipElement, skillData) {
    document.querySelectorAll(".chip.active").forEach(c => {
        if(c.parentElement.id === "pressure" || c.parentElement.id === "outcome") return; 
        c.classList.remove("active");
    });
    chipElement.classList.add("active");
    showDrillPopup(skillData);
}

function showDrillPopup(skillData) {
    const container = document.getElementById("watchBtnContainer");
    const title = document.getElementById("drillRecommendation");
    const img = document.getElementById("drillImage");
    const btn = document.getElementById("watchVideoBtn");
    const modal = document.getElementById("videoModal");
    const videoPlayer = document.getElementById("videoPlayer");

    if(!skillData) { container.style.display = "none"; return; }

    container.style.display = "block";
    title.innerHTML = `Selected: ${skillData.drill}`;
    
    if(skillData.image) { img.src = skillData.image; img.style.display = "block"; } else { img.style.display = "none"; }
    if(skillData.video) {
        btn.style.display = "inline-block";
        btn.onclick = () => { videoPlayer.src = skillData.video; modal.style.display = "block"; }
    } else { btn.style.display = "none"; }
}

document.getElementById("closeModal").onclick = () => { document.getElementById("videoModal").style.display = "none"; document.getElementById("videoPlayer").src = ""; };

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
    
    // Determine active skill string
    let skillString = "";

    // 1. Check Cardio
    if (cardioSelect.value !== "") {
        skillString = cardioSelect.value;
    }
    // 2. Check Routine Stack (Basics)
    else if (currentRoutine.length > 0) {
        skillString = currentRoutine.join(" + ");
    }
    // 3. Check Single Dropdown Select (if they didn't hit +)
    else if (foundationSelect.value !== "") {
        skillString = foundationSelect.value;
    }
    // 4. Check Tactical
    else {
        const activeChip = document.querySelector("#skillSuggestions .active");
        if(activeChip) skillString = activeChip.textContent;
    }

    const signatureData = canvas.toDataURL(); 

    if(!pFirst || !pLast) return alert("Enter Name");
    if(skillString === "") return alert("Select a skill or build a routine");

    const repData = {
        coachEmail: user.email,
        timestamp: new Date(),
        player: `${pFirst} ${pLast}`,
        skill: skillString,
        sets: document.getElementById("sets").value,
        reps: document.getElementById("reps").value,
        minutes: document.getElementById("minutes").value,
        signatureImg: signatureData,
        outcome: document.querySelector("#outcome .active")?.dataset.val || "success",
        notes: document.getElementById("notes").value
    };

    const btn = document.getElementById("logRep");
    btn.disabled = true; btn.textContent = "Saving...";

    try {
        await addDoc(collection(db, "reps"), repData);
        alert("Logged! +10 XP");
        loadStats();
        // Reset
        document.getElementById("sets").value = "";
        document.getElementById("reps").value = "";
        document.getElementById("minutes").value = "";
        document.getElementById("notes").value = "";
        
        foundationSelect.selectedIndex = 0;
        cardioSelect.selectedIndex = 0;
        currentRoutine = [];
        renderRoutineStack();
        
        document.querySelectorAll(".chip.active").forEach(c => {
             if(c.parentElement.id === "pressure" || c.parentElement.id === "outcome") return;
             c.classList.remove("active");
        });
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        document.getElementById("resetTimer").click(); 
    } catch(e) { console.error(e); alert("Error saving"); }
    
    btn.disabled = false; btn.textContent = "Log Session";
});

// STATS & GAMIFICATION
async function loadStats() {
    const user = auth.currentUser;
    if (!user) return;
    const q = query(collection(db, "reps"), where("coachEmail", "==", user.email), orderBy("timestamp", "asc"), limit(100));
    const snap = await getDocs(q);
    const logs = [];
    let mins = 0;
    
    snap.forEach(doc => {
        const d = doc.data(); logs.push(d);
        mins += parseInt(d.minutes || 0);
    });

    document.getElementById("statTotal").innerText = logs.length;
    document.getElementById("statTime").innerText = mins;
    
    const xp = (logs.length * 10) + mins;
    let level = "Rookie";
    if (xp > 100) level = "Starter";
    if (xp > 500) level = "Pro";
    if (xp > 1000) level = "Elite";
    if (xp > 2000) level = "Legend";
    
    document.getElementById("userLevelDisplay").innerText = `${level} • ${xp} XP`;
    const barPercent = Math.min((xp % 500) / 500 * 100, 100); 
    document.getElementById("xpBar").style.width = `${barPercent}%`;

    renderCalendar(logs);

    document.getElementById("historyList").innerHTML = logs.slice().reverse().map(l => `
        <div style="border-bottom:1px solid #e2e8f0; padding:10px;">
            <b>${l.skill}</b> <span style="float:right; color:#00263A; font-weight:bold;">${l.minutes}m</span>
            <div style="font-size:11px; color:#64748b;">${l.sets}x${l.reps} • ${new Date(l.timestamp.seconds*1000).toLocaleDateString()}</div>
        </div>`).join("");
}

function renderCalendar(logs) {
    const grid = document.getElementById("calendarGrid");
    grid.innerHTML = "";
    const activeDates = new Set(logs.map(l => new Date(l.timestamp.seconds*1000).toDateString()));
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(today.getDate() - i);
        const dayDiv = document.createElement("div"); dayDiv.className = "cal-day"; dayDiv.innerText = d.getDate();
        if (activeDates.has(d.toDateString())) dayDiv.classList.add("active");
        if (d.toDateString() === today.toDateString()) dayDiv.classList.add("today");
        grid.appendChild(dayDiv);
    }
}

// COACH DASHBOARD
async function loadCoachDashboard() {
    const listDiv = document.getElementById("coachPlayerList");
    listDiv.innerHTML = "Loading...";
    const q = query(collection(db, "reps"), orderBy("timestamp", "desc"));
    try {
        const snap = await getDocs(q);
        const players = {};
        const allReps = [];
        snap.forEach(doc => {
            const d = doc.data(); allReps.push(d);
            const p = d.player || "Unknown";
            if(!players[p]) players[p] = { count: 0, mins: 0, history: [] };
            players[p].count++; players[p].mins += parseInt(d.minutes || 0);
            players[p].history.push(new Date(d.timestamp.seconds * 1000).toLocaleDateString());
        });

        document.getElementById("coachTotalReps").innerText = allReps.length;
        document.getElementById("coachActivePlayers").innerText = Object.keys(players).length;
        renderTeamChart(players);

        listDiv.innerHTML = Object.keys(players).map(p => `
            <div style="padding:10px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between;">
                <b>${p}</b> <span>${players[p].mins}m / ${players[p].count} logs</span>
            </div>`).join("");
        
        document.getElementById("exportXlsxBtn").onclick = () => {
            const wb = XLSX.utils.book_new();
            const formattedData = allReps.map(r => ({
                Date: new Date(r.timestamp.seconds * 1000).toLocaleDateString(),
                Player: r.player,
                Skill: r.skill,
                Sets: r.sets,
                Reps: r.reps,
                Minutes: r.minutes,
                Outcome: r.outcome,
                Notes: r.notes
            }));
            const ws = XLSX.utils.json_to_sheet(formattedData);
            XLSX.utils.book_append_sheet(wb, ws, "TeamData");
            XLSX.writeFile(wb, "AggiesFC_Report.xlsx");
        };
    } catch (e) { listDiv.innerHTML = "Error loading. Check Rules."; console.error(e); }
}

let teamChart = null;
function renderTeamChart(playersData) {
    const ctx = document.getElementById('teamChart').getContext('2d');
    if (teamChart) teamChart.destroy();
    const dates = [];
    for(let i=6; i>=0; i--) {
        const d = new Date(); d.setDate(new Date().getDate() - i);
        dates.push(d.toLocaleDateString());
    }
    const datasets = Object.keys(playersData).map(p => {
        const dailyMins = dates.map(dateStr => playersData[p].history.filter(h => h === dateStr).length);
        return { label: p, data: dailyMins, borderColor: `hsl(${Math.random() * 360}, 70%, 50%)`, tension: 0.3, fill: false };
    });
    teamChart = new Chart(ctx, {
        type: 'line', data: { labels: dates, datasets: datasets },
        options: { responsive: true, plugins: { legend: { display: true, position: 'bottom' } }, scales: { y: { beginAtZero: true, title: {display:true, text:'Sessions'} } } }
    });
}

updateTacticalSkills();
