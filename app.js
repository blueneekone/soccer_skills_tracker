// 1. IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithRedirect, GoogleAuthProvider, onAuthStateChanged, signOut } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, orderBy, limit, enableIndexedDbPersistence } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { dbData } from "./data.js";

// --- CONFIGURATION ---
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

enableIndexedDbPersistence(db).catch((err) => {
    console.log('Persistence error:', err.code);
});

// --- UI REFERENCES ---
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

const actionSelect = document.getElementById("action");
const qualitiesDiv = document.getElementById("qualities");
const positionSelect = document.getElementById("positionSelect");

// 5. AUTH LOGIC
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginUI.style.display = "none";
    appUI.style.display = "block";
    bottomNav.style.display = "flex";
    document.getElementById("coachName").textContent = `Logged in as: ${user.displayName}`;
    
    // COACH CHECK (Case Insensitive)
    if(user.email.toLowerCase() === COACH_EMAIL.toLowerCase()) {
        navCoach.style.display = "flex";
    }

    loadStats(); 
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

// 6. NAVIGATION
function switchTab(tabName) {
    viewTracker.style.display = "none";
    viewStats.style.display = "none";
    viewCoach.style.display = "none";
    
    navTrack.classList.remove("active");
    navStats.classList.remove("active");
    navCoach.classList.remove("active");

    if (tabName === 'track') {
        viewTracker.style.display = "block";
        navTrack.classList.add("active");
    } else if (tabName === 'stats') {
        viewStats.style.display = "block";
        navStats.classList.add("active");
        loadStats();
    } else if (tabName === 'coach') {
        viewCoach.style.display = "block";
        navCoach.classList.add("active");
        loadCoachDashboard();
    }
}

navTrack.addEventListener("click", () => switchTab('track'));
navStats.addEventListener("click", () => switchTab('stats'));
navCoach.addEventListener("click", () => switchTab('coach'));

// 7. POPUP LOGIC
const modal = document.getElementById("videoModal");
const videoPlayer = document.getElementById("videoPlayer");
let currentSkillVideo = "";

document.getElementById("closeModal").addEventListener("click", () => {
    modal.style.display = "none";
    videoPlayer.src = "";
});
window.onclick = (event) => {
    if (event.target == modal) {
        modal.style.display = "none";
        videoPlayer.src = "";
    }
};

document.getElementById("watchVideoBtn").addEventListener("click", () => {
    if(currentSkillVideo) {
        const activeChip = document.querySelector("#skillSuggestions .chip.active");
        if(activeChip) document.getElementById("modalTitle").innerText = activeChip.innerText;
        videoPlayer.src = currentSkillVideo;
        modal.style.display = "block";
    }
});

// 8. DATA INITIALIZATION
if(positionSelect.options.length === 0) {
    dbData.positions.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.name;
        positionSelect.appendChild(opt);
    });
}
positionSelect.addEventListener("change", updateSkillSuggestions);

if(qualitiesDiv.innerHTML === "") {
    dbData.qualities.forEach(q => {
        const chip = document.createElement("div");
        chip.className = "chip";
        chip.dataset.val = q.id;
        chip.textContent = q.name;
        qualitiesDiv.appendChild(chip);
    });
}

const chips = {
    phase: document.getElementById("phase"),
    pressure: document.getElementById("pressure"),
    outcome: document.getElementById("outcome")
};

function getActiveChip(group) {
    return group.querySelector(".chip.active")?.dataset.val;
}

document.querySelectorAll(".chips").forEach(group => {
    group.addEventListener("click", (e) => {
        if(e.target.classList.contains("chip")) {
            if (group.id === "qualities") {
                e.target.classList.toggle("active");
                return;
            }
            Array.from(group.children).forEach(c => c.classList.remove("active"));
            e.target.classList.add("active");
            
            if (group.id === "phase") updateActionDropdown();
            if (group.id === "pressure") updateSkillSuggestions();
        }
    });
});

function updateActionDropdown() {
    const currentPhase = getActiveChip(chips.phase) || "attack";
    actionSelect.innerHTML = "";
    dbData.roadmapActions.filter(a => a.phase === currentPhase).forEach(a => {
        const opt = document.createElement("option");
        opt.value = a.id;
        opt.textContent = a.name;
        actionSelect.appendChild(opt);
    });
}

function updateSkillSuggestions() {
    const suggestionsDiv = document.getElementById("skillSuggestions");
    suggestionsDiv.innerHTML = "";
    
    const currentPressure = getActiveChip(chips.pressure);
    const currentPosition = positionSelect.value || "all";
    
    const relevantSkills = dbData.foundationSkills.filter(s => {
        const pressureMatch = (!currentPressure || currentPressure === "none") ? true : s.pressure.includes(currentPressure);
        const positionMatch = s.positions.includes("all") || s.positions.includes(currentPosition);
        return pressureMatch && positionMatch;
    });

    relevantSkills.forEach(s => {
        const chip = document.createElement("div");
        chip.className = "chip";
        chip.dataset.val = s.id;
        chip.innerText = s.name;
        
        if(s.positions.includes("all")) {
            chip.style.borderLeft = "3px solid #00263A"; 
        }

        chip.addEventListener("click", () => {
            Array.from(suggestionsDiv.children).forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
            
            const container = document.getElementById("watchBtnContainer");
            const drillText = document.getElementById("drillRecommendation");
            const drillImg = document.getElementById("drillImage");
            const videoBtn = document.getElementById("watchVideoBtn");

            if (s.drill) {
                drillText.innerHTML = `<b>🎯 Drill:</b> ${s.drill}`;
                container.style.display = "block";
            } else { drillText.innerHTML = ""; }

            if (s.image) {
                drillImg.src = s.image;
                drillImg.style.display = "block";
                container.style.display = "block";
            } else {
                drillImg.style.display = "none";
                drillImg.src = "";
            }

            if (s.video) {
                currentSkillVideo = s.video;
                videoBtn.style.display = "block";
                container.style.display = "block";
            } else {
                videoBtn.style.display = "none";
            }

            if(!s.drill && !s.image && !s.video) container.style.display = "none";
        });
        suggestionsDiv.appendChild(chip);
    });
}

// 9. SUBMIT
document.getElementById("logRep").addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return alert("Please sign in first");

    const pFirst = document.getElementById("playerFirst").value.trim();
    const pLast = document.getElementById("playerLast").value.trim();
    const sets = document.getElementById("sets").value || 0;
    const reps = document.getElementById("reps").value || 0;
    const mins = document.getElementById("minutes").value || 0;
    const sig = document.getElementById("parentSig").value.trim();

    if (!pFirst || !pLast) return alert("Please enter Player Name");
    if (!sig) return alert("Parent Initials required.");

    const repData = {
        coachEmail: user.email,
        timestamp: new Date(),
        playerFirst: pFirst,
        playerLast: pLast,
        player: `${pFirst} ${pLast}`,
        position: positionSelect.options[positionSelect.selectedIndex]?.text,
        sets: sets,
        reps: reps,
        minutes: mins,
        signature: sig,
        phase: getActiveChip(chips.phase),
        pressure: getActiveChip(chips.pressure),
        action: actionSelect.options[actionSelect.selectedIndex]?.text,
        skill: document.querySelector("#skillSuggestions .chip.active")?.innerText || "None",
        outcome: getActiveChip(chips.outcome),
        qualities: Array.from(qualitiesDiv.querySelectorAll(".active")).map(c => c.textContent),
        notes: document.getElementById("notes").value
    };

    const btn = document.getElementById("logRep");
    btn.textContent = "Saving...";
    btn.disabled = true;

    try {
        await addDoc(collection(db, "reps"), repData);
        document.getElementById("notes").value = "";
        document.getElementById("parentSig").value = "";
        document.getElementById("sets").value = "";
        document.getElementById("reps").value = "";
        document.getElementById("minutes").value = "";
        
        btn.textContent = "Log Session";
        btn.disabled = false;
        alert("Session Verified & Saved!");
        loadStats(); 
    } catch (e) {
        console.error("Error adding document: ", e);
        btn.textContent = "Error";
        alert("Error saving.");
    }
});

// 10. STATS
async function loadStats() {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
        collection(db, "reps"), 
        where("coachEmail", "==", user.email),
        orderBy("timestamp", "asc"), 
        limit(100)
    );

    const querySnapshot = await getDocs(q);
    const logs = [];
    const dailyStats = {};
    let totalMinutes = 0;

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        logs.push(data);
        totalMinutes += parseInt(data.minutes || 0);

        const dateObj = new Date(data.timestamp.seconds * 1000);
        const dateKey = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;

        if (!dailyStats[dateKey]) dailyStats[dateKey] = { total: 0, success: 0 };
        dailyStats[dateKey].total++;
        if (data.outcome === "success") dailyStats[dateKey].success++;
    });

    const today = new Date();
    let streak = 0;
    let checkDate = new Date(today);
    
    for (let i = 0; i < 365; i++) {
        const key = `${checkDate.getMonth() + 1}/${checkDate.getDate()}`;
        if (dailyStats[key]) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            if (i === 0) { checkDate.setDate(checkDate.getDate() - 1); continue; }
            break;
        }
    }
    document.getElementById("statStreak").innerText = streak;
    document.getElementById("statTotal").innerText = logs.length;
    document.getElementById("statTime").innerText = totalMinutes + "m";

    const labels = Object.keys(dailyStats);
    const dataPoints = labels.map(date => {
        const day = dailyStats[date];
        return Math.round((day.success / day.total) * 100);
    });
    renderChart(labels, dataPoints);

    const historyDiv = document.getElementById("historyList");
    historyDiv.innerHTML = logs.slice().reverse().map(l => `
        <div style="border-bottom:1px solid #e2e8f0; padding:12px 0;">
            <div style="display:flex; justify-content:space-between;">
                <b style="color:#0f172a">${l.skill}</b>
                <span class="small" style="color:#00263A; font-weight:bold;">${l.minutes}m</span>
            </div>
            <div class="small" style="margin-top:4px; color:#64748b;">
                ${l.sets} x ${l.reps} | Sig: ${l.signature}
            </div>
        </div>
    `).join("");
}

let myChart = null;

function renderChart(dates, percentages) {
    const ctx = document.getElementById('progressChart').getContext('2d');
    if (myChart) myChart.destroy();

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(0, 38, 58, 0.5)');
    gradient.addColorStop(1, 'rgba(0, 38, 58, 0.0)');

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Success %',
                data: percentages,
                borderColor: '#00263A',
                backgroundColor: gradient,
                borderWidth: 3,
                pointBackgroundColor: '#fff',
                pointRadius: 4,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, max: 100, grid: { color: '#e2e8f0' }, ticks: { color: '#64748b' } },
                x: { grid: { display: false }, ticks: { color: '#64748b' } }
            }
        }
    });
}

// 11. COACH DASHBOARD
async function loadCoachDashboard() {
    const listDiv = document.getElementById("coachPlayerList");
    listDiv.innerHTML = "Loading Team Data...";
    
    const q = query(collection(db, "reps"), orderBy("timestamp", "desc"));
    
    try {
        const snapshot = await getDocs(q);
        const players = {};
        let totalTeamLogs = 0;
        const allReps = []; 

        snapshot.forEach(doc => {
            const data = doc.data();
            allReps.push(data);
            totalTeamLogs++;
            
            const name = data.player || "Unknown";
            if (!players[name]) {
                players[name] = { logs: 0, minutes: 0, lastActive: data.timestamp };
            }
            players[name].logs++;
            players[name].minutes += parseInt(data.minutes || 0);
        });

        document.getElementById("coachTotalReps").innerText = totalTeamLogs;
        document.getElementById("coachActivePlayers").innerText = Object.keys(players).length;

        listDiv.innerHTML = Object.keys(players).map(p => {
            const stats = players[p];
            return `
            <div style="background:#f8fafc; padding:15px; margin-bottom:10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; border:1px solid #e2e8f0;">
                <div>
                    <div style="font-weight:bold; font-size:16px; color:#0f172a;">${p}</div>
                    <div class="small" style="color:#64748b;">Last: ${new Date(stats.lastActive.seconds * 1000).toLocaleDateString()}</div>
                </div>
                <div style="text-align:right;">
                    <div style="color:#00263A; font-weight:bold; font-size:18px;">${stats.minutes}m</div>
                    <div class="small">Total Time</div>
                </div>
            </div>
            `;
        }).join("");

        document.getElementById("exportCsvBtn").onclick = () => downloadCSV(allReps);
        
    } catch (err) {
        console.error("Coach Dashboard Error:", err);
        listDiv.innerHTML = "Error loading data. <br>Did you update Firebase Rules?";
    }
}

function downloadCSV(data) {
    const headers = ["Date", "Coach/Parent", "Player", "Position", "Phase", "Action", "Skill", "Sets", "Reps", "Minutes", "VerifiedBy", "Notes"];
    const rows = data.map(r => [
        new Date(r.timestamp.seconds * 1000).toLocaleDateString(),
        r.coachEmail,
        r.player,
        r.position,
        r.phase,
        r.action,
        r.skill,
        r.sets,
        r.reps,
        r.minutes,
        r.signature,
        `"${r.notes || ''}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "AggiesFC_Report.csv");
    document.body.appendChild(link);
    link.click();
}

// 12. INITIALIZE
updateActionDropdown();
updateSkillSuggestions();