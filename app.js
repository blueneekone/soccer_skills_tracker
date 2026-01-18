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

// --- GLOBAL VARIABLES ---
let currentSessionItems = []; 
let timerInterval;
let seconds = 0;
let isSignatureBlank = true; // TRACK SIGNATURE STATE

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

// TIMER LOGIC
const timerDisplay = document.getElementById("stopwatch");
const minsInput = document.getElementById("totalMinutes");

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

// SIGNATURE LOGIC (UPDATED FOR VALIDATION)
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
    // If they draw, mark as NOT blank
    isSignatureBlank = false;
    
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
    isSignatureBlank = true; // Reset validation flag
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

// --- SESSION STACKING LOGIC ---

// 1. Populate Dropdown
if(activitySelect.options.length === 1) {
    const allSkills = [...dbData.foundationSkills].sort((a,b) => {
        if (a.type === 'cardio' && b.type !== 'cardio') return -1;
        if (a.type !== 'cardio' && b.type === 'cardio') return 1;
        return 0;
    });

    const categories = {};
    allSkills.forEach(s => {
        if (!categories[s.category]) categories[s.category] = [];
        categories[s.category].push(s);
    });

    for (const [catName, skills] of Object.entries(categories)) {
        const group = document.createElement("optgroup");
        group.label = catName;
        skills.forEach(s => {
            const opt = document.createElement("option");
            opt.value = s.name;
            opt.textContent = s.name;
            group.appendChild(opt);
        });
        activitySelect.appendChild(group);
    }
}

// 2. Activity Select Changed
activitySelect.addEventListener("change", (e) => {
    const skillName = e.target.value;
    const skillData = dbData.foundationSkills.find(s => s.name === skillName);
    
    const popup = document.getElementById("drillInfoBox");
    const title = document.getElementById("drillDesc");
    const btn = document.getElementById("watchVideoBtn");
    const inputSets = document.getElementById("inputSets");
    const inputReps = document.getElementById("inputReps");

    if(skillData.type === 'cardio') {
        inputSets.placeholder = "e.g., 2 miles";
        inputSets.previousElementSibling.innerText = "Distance / Sets";
        inputReps.placeholder = "e.g., 20 mins";
        inputReps.previousElementSibling.innerText = "Time / Reps";
    } else {
        inputSets.placeholder = "e.g., 3";
        inputSets.previousElementSibling.innerText = "Sets";
        inputReps.placeholder = "e.g., 50";
        inputReps.previousElementSibling.innerText = "Reps";
    }

    if(skillData) {
        popup.style.display = "block";
        title.innerText = skillData.drill;
        if(skillData.video) {
            btn.style.display = "inline-block";
            btn.onclick = () => { 
                document.getElementById("videoPlayer").src = skillData.video; 
                document.getElementById("videoModal").style.display = "block"; 
            }
        } else { btn.style.display = "none"; }
    }
});

// 3. Add to Session List
document.getElementById("addToSessionBtn").addEventListener("click", () => {
    const skillName = activitySelect.value;
    const setsVal = document.getElementById("inputSets").value;
    const repsVal = document.getElementById("inputReps").value;

    if(!skillName) return alert("Select an activity first.");

    const item = {
        name: skillName,
        sets: setsVal || "-",
        reps: repsVal || "-"
    };
    currentSessionItems.push(item);

    renderSessionList();
    
    // Clear Inputs
    activitySelect.selectedIndex = 0;
    document.getElementById("inputSets").value = "";
    document.getElementById("inputReps").value = "";
    document.getElementById("drillInfoBox").style.display = "none";
});

function renderSessionList() {
    const list = document.getElementById("sessionList");
    const count = document.getElementById("sessionCount");
    
    if(currentSessionItems.length === 0) {
        list.innerHTML = `<li style="color:#94a3b8; text-align:center;">No activities added yet.</li>`;
        count.innerText = "0 Items";
        return;
    }

    list.innerHTML = currentSessionItems.map((item, index) => `
        <li style="border-bottom:1px solid #e2e8f0; padding:8px; display:flex; justify-content:space-between; align-items:center;">
            <span><b>${index+1}.</b> ${item.name}</span>
            <span style="font-size:12px; color:#64748b;">${item.sets} x ${item.reps}</span>
        </li>
    `).join("");
    
    count.innerText = `${currentSessionItems.length} Items`;
}

// 4. SUBMIT WORKOUT (STRICT VALIDATION)
document.getElementById("submitWorkoutBtn").addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return alert("Sign in first");

    if (currentSessionItems.length === 0) return alert("Your session is empty! Add activities first.");

    const pFirst = document.getElementById("playerFirst").value;
    const pLast = document.getElementById("playerLast").value;
    const mins = document.getElementById("totalMinutes").value;
    
    // STRICT CHECK: Is the signature pad touched?
    if (isSignatureBlank) {
        return alert("Parent Signature is REQUIRED to verify this session.");
    }
    const signatureData = canvas.toDataURL();

    if(!pFirst || !pLast) return alert("Enter Name");
    if(!mins || mins == 0) return alert("Enter Total Duration (or use Timer)");

    const drillSummary = currentSessionItems.map(i => `${i.name} (${i.sets} x ${i.reps})`).join(", ");

    const sessionData = {
        coachEmail: user.email,
        timestamp: new Date(),
        player: `${pFirst} ${pLast}`,
        minutes: mins,
        drills: currentSessionItems,
        drillSummary: drillSummary,
        outcome: document.getElementById("sessionOutcome").value,
        notes: document.getElementById("notes").value,
        signatureImg: signatureData
    };

    const btn = document.getElementById("submitWorkoutBtn");
    btn.disabled = true; btn.textContent = "Saving...";

    try {
        await addDoc(collection(db, "reps"), sessionData);
        alert(`Workout Logged! +${10 + parseInt(mins)} XP`);
        
        // Reset
        currentSessionItems = [];
        renderSessionList();
        document.getElementById("totalMinutes").value = "";
        document.getElementById("notes").value = "";
        
        // CLEAR SIG
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        isSignatureBlank = true; 
        
        document.getElementById("resetTimer").click(); 
        loadStats();
    } catch(e) { console.error(e); alert("Error saving"); }
    
    btn.disabled = false; btn.textContent = "✅ Submit Workout";
});

// STATS & COACH
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
    document.getElementById("xpBar").style.width = `${Math.min((xp%500)/500*100, 100)}%`;

    renderCalendar(logs);

    document.getElementById("historyList").innerHTML = logs.slice().reverse().map(l => `
        <div style="border-bottom:1px solid #e2e8f0; padding:10px;">
            <b>${new Date(l.timestamp.seconds*1000).toLocaleDateString()}</b> 
            <span style="float:right; color:#00263A; font-weight:bold;">${l.minutes}m</span>
            <div style="font-size:11px; color:#64748b; margin-top:4px;">
                ${l.drills ? l.drills.length : 1} Exercises • ${l.signatureImg ? '✅ Verified' : '❌ Unverified'}
            </div>
        </div>`).join("");
}

function renderCalendar(logs) {
    const grid = document.getElementById("calendarGrid");
    grid.innerHTML = "";
    const activeDates = new Set(logs.map(l => new Date(l.timestamp.seconds*1000).toDateString()));
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(today.getDate() - i);
        const dayDiv = document.createElement("div"); dayDiv.className = "cal-day";
        dayDiv.innerText = d.getDate();
        if (activeDates.has(d.toDateString())) dayDiv.classList.add("active");
        if (d.toDateString() === today.toDateString()) dayDiv.classList.add("today");
        grid.appendChild(dayDiv);
    }
}

async function loadCoachDashboard() {
    const listDiv = document.getElementById("coachPlayerList");
    listDiv.innerHTML = "Loading...";
    const q = query(collection(db, "reps"), orderBy("timestamp", "desc"));
    try {
        const snap = await getDocs(q);
        const players = {};
        const allSessions = [];
        
        snap.forEach(doc => {
            const d = doc.data(); allSessions.push(d);
            const p = d.player || "Unknown";
            if(!players[p]) players[p] = { count: 0, mins: 0, history: [] };
            players[p].count++; 
            players[p].mins += parseInt(d.minutes || 0);
            players[p].history.push(new Date(d.timestamp.seconds * 1000).toLocaleDateString());
        });

        document.getElementById("coachTotalReps").innerText = allSessions.length;
        document.getElementById("coachActivePlayers").innerText = Object.keys(players).length;
        
        renderTeamChart(players);

        listDiv.innerHTML = Object.keys(players).map(p => `
            <div style="padding:10px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between;">
                <b>${p}</b> <span>${players[p].mins}m / ${players[p].count} Sessions</span>
            </div>`).join("");
        
        // EXCEL EXPORT (CLEANED UP)
        document.getElementById("exportXlsxBtn").onclick = () => {
            const formatted = allSessions.map(r => ({
                Date: new Date(r.timestamp.seconds*1000).toLocaleDateString(),
                Player: r.player,
                Duration_Mins: r.minutes,
                Drill_Count: r.drills ? r.drills.length : 1,
                Summary: r.drillSummary || r.skill,
                Parent_Verified: r.signatureImg ? "Signed" : "Not Signed", // SIMPLE TEXT
                Notes: r.notes
            }));
            const ws = XLSX.utils.json_to_sheet(formatted);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "TrainingData");
            XLSX.writeFile(wb, "AggiesFC_Export.xlsx");
        };

    } catch (e) { listDiv.innerHTML = "Error loading."; console.error(e); }
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
        const dailyMins = dates.map(dateStr => {
            return playersData[p].history.includes(dateStr) ? 1 : 0;
        });
        const color = `hsl(${Math.random() * 360}, 70%, 50%)`;
        return { label: p, data: dailyMins, borderColor: color, tension: 0.3, fill: false };
    });
    teamChart = new Chart(ctx, {
        type: 'line',
        data: { labels: dates, datasets: datasets },
        options: {
            responsive: true,
            plugins: { legend: { display: true, position: 'bottom' } },
            scales: { y: { beginAtZero: true, title: {display:true, text:'Active? (1/0)'} } }
        }
    });
}
document.getElementById("closeModal").onclick = () => { document.getElementById("videoModal").style.display = "none"; document.getElementById("videoPlayer").src = ""; };
