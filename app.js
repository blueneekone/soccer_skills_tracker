// 1. IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, orderBy, limit, enableIndexedDbPersistence } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { dbData } from "./data.js";

// 2. CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyDNmo6dACOLzOSkC93elMd5yMbFmsUXO1w",
  authDomain: "soccer-skills-tracker.firebaseapp.com",
  projectId: "soccer-skills-tracker",
  storageBucket: "soccer-skills-tracker.firebasestorage.app",
  messagingSenderId: "884044129977",
  appId: "1:884044129977:web:47d54f59c891340e505d68"
};

// 3. INITIALIZATION
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 4. OFFLINE PERSISTENCE
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.log('Persistence failed: Multiple tabs open');
    } else if (err.code == 'unimplemented') {
        console.log('Persistence not supported by browser');
    }
});

// --- UI REFERENCES ---
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const appUI = document.getElementById("appUI");
const loginUI = document.getElementById("loginUI");
const bottomNav = document.getElementById("bottomNav");
const viewTracker = document.getElementById("viewTracker");
const viewStats = document.getElementById("viewStats");
const navTrack = document.getElementById("navTrack");
const navStats = document.getElementById("navStats");
const actionSelect = document.getElementById("action");
const qualitiesDiv = document.getElementById("qualities");

// 5. AUTH LOGIC
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginUI.style.display = "none";
    appUI.style.display = "block";
    bottomNav.style.display = "flex";
    document.getElementById("coachName").textContent = user.displayName;
    loadStats(); 
  } else {
    loginUI.style.display = "block";
    appUI.style.display = "none";
    bottomNav.style.display = "none";
  }
});

loginBtn.addEventListener("click", () => {
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider).catch((error) => console.error("Login failed", error));
});

logoutBtn.addEventListener("click", () => {
    signOut(auth).then(() => location.reload());
});

// 6. NAVIGATION
navTrack.addEventListener("click", () => {
    viewTracker.style.display = "block";
    viewStats.style.display = "none";
    navTrack.classList.add("active");
    navStats.classList.remove("active");
});

navStats.addEventListener("click", () => {
    viewTracker.style.display = "none";
    viewStats.style.display = "block";
    navTrack.classList.remove("active");
    navStats.classList.add("active");
    loadStats();
});

// 7. VIDEO & DRILL POPUP LOGIC
const modal = document.getElementById("videoModal");
const closeModal = document.getElementById("closeModal");
const videoPlayer = document.getElementById("videoPlayer");
const watchBtn = document.getElementById("watchVideoBtn");
let currentSkillVideo = "";

closeModal.addEventListener("click", () => {
    modal.style.display = "none";
    videoPlayer.src = "";
});
window.onclick = (event) => {
    if (event.target == modal) {
        modal.style.display = "none";
        videoPlayer.src = "";
    }
};

watchBtn.addEventListener("click", () => {
    if(currentSkillVideo) {
        const activeChip = document.querySelector("#skillSuggestions .chip.active");
        if(activeChip) document.getElementById("modalTitle").innerText = activeChip.innerText;
        videoPlayer.src = currentSkillVideo;
        modal.style.display = "block";
    }
});

// 8. CHIPS & DROPDOWNS
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
    const filteredActions = dbData.roadmapActions.filter(a => a.phase === currentPhase);
    filteredActions.forEach(a => {
        const opt = document.createElement("option");
        opt.value = a.id;
        opt.textContent = a.name;
        actionSelect.appendChild(opt);
    });
}

function updateSkillSuggestions() {
    const suggestionsDiv = document.getElementById("skillSuggestions");
    suggestionsDiv.innerHTML = "";
    document.getElementById("watchBtnContainer").style.display = "none";
    
    const currentPressure = getActiveChip(chips.pressure);
    
    const relevantSkills = dbData.foundationSkills.filter(s => {
        if (!currentPressure || currentPressure === "none") return true;
        return s.pressure.includes(currentPressure);
    });

    relevantSkills.forEach(s => {
        const chip = document.createElement("div");
        chip.className = "chip";
        chip.dataset.val = s.id;
        chip.innerText = s.name;
        
        chip.addEventListener("click", () => {
            Array.from(suggestionsDiv.children).forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
            
            const container = document.getElementById("watchBtnContainer");
            const drillText = document.getElementById("drillRecommendation");
            const videoBtn = document.getElementById("watchVideoBtn");

            // LOGIC: Show Drill text if it exists
            if (s.drill) {
                drillText.innerHTML = `<b>🎯 Practice Drill:</b><br>${s.drill}`;
                container.style.display = "block";
            } else {
                drillText.innerHTML = "";
            }

            // LOGIC: Show Video button if URL exists
            if (s.video) {
                currentSkillVideo = s.video;
                videoBtn.style.display = "block";
                container.style.display = "block";
            } else {
                videoBtn.style.display = "none";
                // Only hide container if both drill and video are missing
                if(!s.drill) container.style.display = "none";
            }
        });
        suggestionsDiv.appendChild(chip);
    });
}

// 9. SUBMIT LOGIC (Split Names)
document.getElementById("logRep").addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return alert("Please sign in first");

    const pFirst = document.getElementById("playerFirst").value.trim();
    const pLast = document.getElementById("playerLast").value.trim();

    if (!pFirst || !pLast) return alert("Please enter First and Last Name");

    const repData = {
        coachEmail: user.email,
        timestamp: new Date(),
        playerFirst: pFirst,
        playerLast: pLast,
        player: `${pFirst} ${pLast}`,
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
        btn.textContent = "Log Rep";
        btn.disabled = false;
        alert("Saved!");
        loadStats(); // Instant Refresh
    } catch (e) {
        console.error("Error adding document: ", e);
        btn.textContent = "Error";
        alert("Error saving: Check console");
    }
});

// 10. STATS ENGINE (Streaks + Line Chart)
async function loadStats() {
    const user = auth.currentUser;
    if (!user) return;

    // Index Required: coachEmail (Asc) + timestamp (Asc)
    const q = query(
        collection(db, "reps"), 
        where("coachEmail", "==", user.email),
        orderBy("timestamp", "asc"), 
        limit(100)
    );

    const querySnapshot = await getDocs(q);
    const logs = [];
    const dailyStats = {};

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        logs.push(data);
        
        const dateObj = new Date(data.timestamp.seconds * 1000);
        const dateKey = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;

        if (!dailyStats[dateKey]) dailyStats[dateKey] = { total: 0, success: 0 };
        dailyStats[dateKey].total++;
        if (data.outcome === "success") dailyStats[dateKey].success++;
    });

    // A. STREAK LOGIC
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

    // B. CHART LOGIC
    const labels = Object.keys(dailyStats);
    const dataPoints = labels.map(date => {
        const day = dailyStats[date];
        return Math.round((day.success / day.total) * 100);
    });

    // C. TOTALS
    const totalReps = logs.length;
    const totalSuccess = logs.filter(l => l.outcome === "success").length;
    document.getElementById("statTotal").innerText = totalReps;
    document.getElementById("statSuccess").innerText = (totalReps > 0 ? Math.round((totalSuccess / totalReps) * 100) : 0) + "%";

    // D. HISTORY
    const historyDiv = document.getElementById("historyList");
    historyDiv.innerHTML = logs.slice().reverse().map(l => `
        <div style="border-bottom:1px solid #334155; padding:12px 0;">
            <span style="color:${l.outcome === 'success' ? '#22c55e' : '#ef4444'}; font-size:18px;">●</span> 
            <b style="color:#f1f5f9">${l.action}</b>
            <div class="small" style="margin-top:4px;">${l.skill}</div>
        </div>
    `).join("");

    renderChart(labels, dataPoints);
}

let myChart = null;

function renderChart(dates, percentages) {
    const ctx = document.getElementById('progressChart').getContext('2d');
    if (myChart) myChart.destroy();

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(34, 197, 94, 0.5)');
    gradient.addColorStop(1, 'rgba(34, 197, 94, 0.0)');

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Success %',
                data: percentages,
                borderColor: '#22c55e',
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
                y: { beginAtZero: true, max: 100, grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            }
        }
    });
}

// 11. STARTUP
updateActionDropdown();
updateSkillSuggestions();