// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { dbData } from "./data.js";

// --- CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyDNmo6dACOLzOSkC93elMd5yMbFmsUXO1w",
  authDomain: "soccer-skills-tracker.firebaseapp.com",
  projectId: "soccer-skills-tracker",
  storageBucket: "soccer-skills-tracker.firebasestorage.app",
  messagingSenderId: "884044129977",
  appId: "1:884044129977:web:47d54f59c891340e505d68"
};

// ... (Your Imports and Firebase Config stay the same) ...

// Import Chart.js logic (We will use this globally)
import { query, where, getDocs, orderBy, limit } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ... (Your Auth Listener stays the same, but add this line inside 'if (user)'):
    document.getElementById("bottomNav").style.display = "flex";
    loadStats(); // Load stats on login

// --- NAVIGATION LOGIC ---
const viewTracker = document.getElementById("viewTracker");
const viewStats = document.getElementById("viewStats");
const navTrack = document.getElementById("navTrack");
const navStats = document.getElementById("navStats");

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
    loadStats(); // Refresh data when tab clicked
});

// --- VIDEO MODAL LOGIC ---
const modal = document.getElementById("videoModal");
const closeModal = document.getElementById("closeModal");
const videoPlayer = document.getElementById("videoPlayer");
const watchBtnContainer = document.getElementById("watchBtnContainer");
const watchBtn = document.getElementById("watchVideoBtn");

let currentSkillVideo = ""; // Store the URL of the selected skill

closeModal.addEventListener("click", () => {
    modal.style.display = "none";
    videoPlayer.src = ""; // Stop video when closed
});

window.onclick = (event) => {
    if (event.target == modal) {
        modal.style.display = "none";
        videoPlayer.src = "";
    }
};

watchBtn.addEventListener("click", () => {
    if(currentSkillVideo) {
        document.getElementById("modalTitle").innerText = document.querySelector("#skillSuggestions .chip.active").innerText;
        videoPlayer.src = currentSkillVideo;
        modal.style.display = "block";
    }
});

// --- UPDATED SKILL SUGGESTION LOGIC ---
function updateSkillSuggestions() {
    const suggestionsDiv = document.getElementById("skillSuggestions");
    suggestionsDiv.innerHTML = "";
    watchBtnContainer.style.display = "none"; // Hide button initially
    
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
            // Highlight logic
            Array.from(suggestionsDiv.children).forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
            
            // Video Button Logic
            if (s.video) {
                currentSkillVideo = s.video;
                watchBtnContainer.style.display = "block";
            } else {
                watchBtnContainer.style.display = "none";
            }
        });
        suggestionsDiv.appendChild(chip);
    });
}

// --- UPDATED STATS ENGINE (Line Chart) ---

async function loadStats() {
    const user = auth.currentUser;
    if (!user) return;

    // 1. Query: Get last 100 reps for this user
    const q = query(
        collection(db, "reps"), 
        where("coachEmail", "==", user.email),
        orderBy("timestamp", "asc"), // Get oldest first to build the timeline
        limit(100)
    );

    const querySnapshot = await getDocs(q);
    const logs = [];
    
    // 2. Process Data: Group by Date
    // Object structure: { "1/14": {total: 10, success: 8}, "1/15": ... }
    const dailyStats = {};

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        logs.push(data);
        
        // Convert timestamp to simple date string (e.g., "1/14")
        const dateObj = new Date(data.timestamp.seconds * 1000);
        const dateKey = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;

        if (!dailyStats[dateKey]) {
            dailyStats[dateKey] = { total: 0, success: 0 };
        }

        dailyStats[dateKey].total++;
        if (data.outcome === "success") {
            dailyStats[dateKey].success++;
        }
    });

    // 3. Prepare Chart Data Arrays
    const labels = Object.keys(dailyStats); // Dates
    const dataPoints = labels.map(date => {
        const day = dailyStats[date];
        // Calculate percentage for that day
        return Math.round((day.success / day.total) * 100);
    });

    // 4. Update KPI Cards (Overall Totals)
    const totalReps = logs.length;
    const totalSuccess = logs.filter(l => l.outcome === "success").length;
    const globalRate = totalReps > 0 ? Math.round((totalSuccess / totalReps) * 100) : 0;

    document.getElementById("statTotal").innerText = totalReps;
    document.getElementById("statSuccess").innerText = globalRate + "%";

    // 5. Update History List (Show newest first)
    const historyDiv = document.getElementById("historyList");
    // Reverse logs to show newest at top of list
    historyDiv.innerHTML = logs.slice().reverse().map(l => `
        <div style="border-bottom:1px solid #334155; padding:12px 0;">
            <span style="color:${l.outcome === 'success' ? '#22c55e' : '#ef4444'}; font-size:18px;">●</span> 
            <b style="color:#f1f5f9">${l.action}</b>
            <div class="small" style="margin-top:4px;">${l.skill}</div>
        </div>
    `).join("");

    // 6. Render the Line Chart
    renderChart(labels, dataPoints);
}

let myChart = null;

function renderChart(dates, percentages) {
    const ctx = document.getElementById('progressChart').getContext('2d');
    
    if (myChart) myChart.destroy(); // Clear old chart

    // Create Gradient for the line
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(34, 197, 94, 0.5)'); // Green top
    gradient.addColorStop(1, 'rgba(34, 197, 94, 0.0)'); // Fade to bottom

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Success Rate (%)',
                data: percentages,
                borderColor: '#22c55e', // Green Line
                backgroundColor: gradient,
                borderWidth: 3,
                pointBackgroundColor: '#fff',
                pointRadius: 4,
                fill: true, // Fill area under line
                tension: 0.3 // Curvy line (0.0 is straight, 1.0 is very curvy)
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }, // Hide legend to save space
                tooltip: { 
                    callbacks: { label: (c) => ` ${c.raw}% Success` }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100, // Percentage is always 0-100
                    grid: { color: '#334155' }, // Dark grid lines
                    ticks: { color: '#94a3b8' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                }
            }
        }
    });
}

// ... (Rest of logic: Chip handlers, Submit logic matches previous version) ...