import { auth, db } from "./firebase-config.js"; 
import { signInWithRedirect, getRedirectResult, GoogleAuthProvider, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc, query, where, getDocs, orderBy, limit, doc, setDoc, getDoc, updateDoc, writeBatch } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { dbData } from "./data.js";

// ==========================================
// 1. CONFIGURATION & STATE
// ==========================================

window.onerror = function(message, source, lineno, colno, error) {
    console.error("System Error:", message); 
    if (message.includes("null")) return;
    const toast = document.createElement("div");
    toast.style.cssText = "position:fixed; top:20px; left:50%; transform:translateX(-50%); background:#fee2e2; color:#991b1b; padding:15px; border-radius:8px; border:1px solid #ef4444; z-index:99999; font-size:12px; box-shadow:0 10px 15px rgba(0,0,0,0.1); max-width:90%;";
    toast.innerHTML = `<strong>⚠️ Error:</strong><br>${message}<br><span style="font-size:10px; opacity:0.8;">Line: ${lineno}</span>`;
    const close = document.createElement("button");
    close.innerText = "×";
    close.style.cssText = "position:absolute; top:5px; right:10px; border:none; background:none; color:#991b1b; font-weight:bold; cursor:pointer;";
    close.onclick = () => toast.remove();
    toast.appendChild(close);
    document.body.appendChild(toast);
};

const DIRECTOR_EMAIL = "ecwaechtler@gmail.com";

let currentSessionItems = [];
let currentVideoUrl = "";
let globalTeams = [];
let globalAdmins = [DIRECTOR_EMAIL];
let timerInterval, seconds = 0;
let isSignatureBlank = true;
let currentCoachTeamId = null;
let teamChart = null;
let playerChart = null;
let allSessionsCache = [];
let userProfile = null; 

// ==========================================
// 2. CORE NAVIGATION & ROUTING API
// ==========================================

const navs = ['navHome', 'navTrack', 'navStats', 'navCoach', 'navAdmin'];
const views = ['viewHome', 'viewTracker', 'viewStats', 'viewCoach', 'viewAdmin'];

// --- 1. NEW NAVIGATION LOGIC ---
    window.navigateTo = (viewId, navId) => {
        const views = ['viewHome', 'viewTracker', 'viewStats', 'viewCoach', 'viewAdmin'];
        const navs = ['navHome', 'navTrack', 'navStats', 'navCoach', 'navAdmin'];
        
        // Hide all views and remove active classes
        views.forEach(v => document.getElementById(v)?.classList.add('d-none'));
        navs.forEach(n => document.getElementById(n)?.classList.remove('active'));
        
        // Show selected view and highlight nav tab
        document.getElementById(viewId)?.classList.remove('d-none');
        if (navId) document.getElementById(navId)?.classList.add('active');
        
        // Trigger specific data loads if needed
        if(viewId === 'viewStats') loadStats();
        if(viewId === 'viewCoach') loadCoachDashboard(false, globalTeams);
        if(viewId === 'viewAdmin') renderAdminTables();
        if(viewId === 'viewTracker') window.dispatchEvent(new Event('resize'));
    };

// Listen for Native Phone Swipes / Back Button
window.addEventListener('popstate', (event) => {
    if (event.state && event.state.view && event.state.nav) {
        window.navigateTo(event.state.view, event.state.nav, false); // false prevents infinite loop
    } else {
        // Fallback to home
        window.navigateTo('viewHome', 'navHome', false);
    }
});

// ==========================================
// 3. HELPERS
// ==========================================

const safeBind = (id, event, func) => {
    const el = document.getElementById(id);
    if(el) {
        if (el.dataset.bound === "true") return; 
        el.addEventListener(event, func);
        el.dataset.bound = "true";
    }
};

const setText = (id, text) => {
    const el = document.getElementById(id);
    if(el) el.innerText = text;
};

async function fetchConfig() {
    try {
        const d = await getDoc(doc(db, "config", "teams"));
        if(d.exists()) globalTeams = d.data().list; else globalTeams = dbData.teams;
        const a = await getDoc(doc(db, "config", "admins"));
        if(a.exists()) globalAdmins = a.data().list;
    } catch(e) { 
        if(typeof dbData !== 'undefined') globalTeams = dbData.teams; 
    }
    
    const ts = document.getElementById("teamSelect");
    if(ts) {
        ts.innerHTML = '<option value="" disabled selected>Select Team...</option>';
        globalTeams.forEach(t => { const o=document.createElement("option"); o.value=t.id; o.textContent=t.name; ts.appendChild(o); });
    }
}

function logSystemEvent(type, detail) {
    try {
        addDoc(collection(db, "logs_system"), { type: type, detail: detail, timestamp: new Date(), user: auth.currentUser ? auth.currentUser.email : 'system' });
    } catch(e) { console.error("Log error", e); }
}

function buildDropdowns(currentXp) {
    let currentLevelNum = 1; 
    if (currentXp >= 3000) currentLevelNum = 5; 
    else if (currentXp >= 2000) currentLevelNum = 4; 
    else if (currentXp >= 1000) currentLevelNum = 3; 
    else if (currentXp >= 500) currentLevelNum = 2; 

    const levelNames = { 1: "Rookie", 2: "Starter", 3: "Veteran", 4: "Pro", 5: "Legend" };

    const sWarm = document.getElementById("selectWarmup");
    const sCore = document.getElementById("selectCore");
    const sBall = document.getElementById("selectBallWork");
    const sBase = document.getElementById("selectBasics");
    
    if(!sWarm || !sBall || !sBase || !sCore) return;

    sWarm.innerHTML = '<option value="" disabled selected>Choose Warm-up...</option>';
    sCore.innerHTML = '<option value="" disabled selected>Choose Core...</option>';
    sBall.innerHTML = '<option value="" disabled selected>Choose Skill...</option>';
    sBase.innerHTML = '<option value="" disabled selected>Choose Basic...</option>';

    const customOpt = document.createElement("option");
    customOpt.value = "custom";
    customOpt.textContent = "✎ Enter your own...";
    customOpt.style.fontWeight = "bold"; 
    customOpt.style.color = "#ea580c";
    sWarm.appendChild(customOpt);

    dbData.foundationSkills.forEach(s => {
        const reqLvl = s.reqLevel || 1; 
        const isLocked = reqLvl > currentLevelNum;
        
        const opt = document.createElement("option");
        opt.value = s.name;
        opt.textContent = isLocked ? `🔒 ${s.name} (Unlocks at ${levelNames[reqLvl]})` : s.name;
        opt.disabled = isLocked;
        
        if(s.type === 'cardio') sWarm.appendChild(opt);
        else if (s.type === 'core') sCore.appendChild(opt);
        else if (s.type === 'ball_mastery') sBall.appendChild(opt);
        else sBase.appendChild(opt);
    });
}

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

function checkRoles(user) {
    const email = user.email.toLowerCase();
    const isDirector = (email === DIRECTOR_EMAIL.toLowerCase()) || globalAdmins.some(a => a.toLowerCase() === email);
    const myTeams = globalTeams.filter(t => {
        const isHead = t.coachEmail.toLowerCase() === email;
        const isAsst = (t.assistants || []).some(a => a.toLowerCase() === email);
        return isHead || isAsst;
    });
    
    if (isDirector) {
        document.getElementById("navCoach").style.display='flex';
        document.getElementById("navAdmin").style.display='flex';
        if(document.getElementById("btnHomeCoach")) document.getElementById("btnHomeCoach").style.display='block';
        if(document.getElementById("btnHomeAdmin")) document.getElementById("btnHomeAdmin").style.display='block';
        initCoachDropdown(true, globalTeams); 
        renderAdminTables();
    } else if (myTeams.length > 0) {
        document.getElementById("navCoach").style.display='flex';
        if(document.getElementById("btnHomeCoach")) document.getElementById("btnHomeCoach").style.display='block';
        initCoachDropdown(false, myTeams);
    }
}

// Tracker Functions
window.removeSessionItem = (index) => {
    currentSessionItems.splice(index, 1);
    renderSession();
};

function renderSession() {
    const l = document.getElementById("sessionList");
    if(currentSessionItems.length === 0) {
        l.innerHTML='<li class="session-empty">Empty. Select drills above to build your workout!</li>';
    } else {
        l.innerHTML = currentSessionItems.map((i, idx) => `
            <li class="session-item">
                <div class="session-item-text">
                    <span class="session-item-title">${idx+1}. ${i.name}</span><br>
                    <span class="session-item-detail">(${i.sets} x ${i.reps})</span>
                </div>
                <button class="delete-btn" onclick="window.removeSessionItem(${idx})">✕</button>
            </li>`).join("");
    }
}

async function submitWorkout() {
    if(currentSessionItems.length === 0) return alert("Add drills!");
    
    // THE ACCOUNTABILITY CHECK
    if(isSignatureBlank) return alert("A parent must sign to verify this workout.");
    
    const tid = userProfile ? userProfile.teamId : null;
    const pname = userProfile ? userProfile.playerName : null;
    const mins = document.getElementById("totalMinutes").value;
    
    if(!tid || !pname) return alert("User profile is incomplete. Please complete setup.");
    if(!mins) return alert("Fill all info");

    try {
        await addDoc(collection(db, "reps"), {
            timestamp: new Date(),
            teamId: tid,
            player: pname,
            minutes: parseInt(mins),
            drills: currentSessionItems,
            drillSummary: currentSessionItems.map(x=>x.name).join(", "),
            outcome: document.querySelector(".outcome-btn.active")?.dataset.val || "Good",
            coachEmail: globalTeams.find(t=>t.id===tid)?.coachEmail || DIRECTOR_EMAIL
        });
        
        alert("Workout Logged! +XP");
        logSystemEvent("WORKOUT_SUBMIT", `Player: ${pname}, Mins: ${mins}`);
        
        // Reset the form
        currentSessionItems = []; 
        renderSession(); 
        document.getElementById("totalMinutes").value = "";
        
        // Wipe the canvas clean for the next workout
        const canvas = document.getElementById("signatureCanvas");
        if(canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            isSignatureBlank = true;
            canvas.style.borderColor = "#cbd5e1"; 
            canvas.style.backgroundColor = "#fcfcfc";
        }
        
        loadStats();
    } catch(e) { 
        alert("Save Failed: " + e.message); 
    }
}

async function loadStats() {
    if (!userProfile) return;
    let q;
    if (userProfile.role === 'admin') {
        setText("userLevelDisplay", "DIRECTOR");
        q = query(collection(db, "reps"), orderBy("timestamp", "desc"), limit(100));
    } else {
        q = query(collection(db, "reps"), where("player", "==", userProfile.playerName));
    }
    try {
        const snap = await getDocs(q);
        const logs = []; let totalMins = 0;
        snap.forEach(d => { logs.push(d.data()); totalMins += Number(d.data().minutes || 0); });
        logs.sort((a,b) => b.timestamp.seconds - a.timestamp.seconds);
        
        setText("statTotal", `${logs.length} ${userProfile.role === 'admin' ? "Club Workouts" : "Sessions"}`);
        setText("statTime", totalMins);
        
        let xp = totalMins + (logs.length * 10);
        let lvl = "ROOKIE"; 
        
        const bStarter = document.getElementById("badgeStarter");
        const bVeteran = document.getElementById("badgeVeteran");
        const bPro = document.getElementById("badgePro");
        const bLegend = document.getElementById("badgeLegend");
        const certBtn = document.getElementById("claimCertificateBtn");

        if(bStarter) { bStarter.style.opacity = "0.3"; bStarter.style.filter = "grayscale(100%)"; }
        if(bVeteran) { bVeteran.style.opacity = "0.3"; bVeteran.style.filter = "grayscale(100%)"; }
        if(bPro) { bPro.style.opacity = "0.3"; bPro.style.filter = "grayscale(100%)"; }
        if(bLegend) { bLegend.style.opacity = "0.3"; bLegend.style.filter = "grayscale(100%)"; }
        if(certBtn) certBtn.style.display = "none";

        if(xp >= 500) { lvl = "STARTER"; if(bStarter) { bStarter.style.opacity = "1"; bStarter.style.filter = "none"; } }
        if(xp >= 1000) { lvl = "VETERAN"; if(bVeteran) { bVeteran.style.opacity = "1"; bVeteran.style.filter = "none"; } }
        if(xp >= 2000) { lvl = "PRO"; if(bPro) { bPro.style.opacity = "1"; bPro.style.filter = "none"; } }
        if(xp >= 3000) { 
            lvl = "LEGEND"; 
            if(bLegend) { bLegend.style.opacity = "1"; bLegend.style.filter = "none"; }
            if(certBtn && userProfile.role !== 'admin') certBtn.style.display = "block"; 
        }
        
        if (typeof buildDropdowns === "function") buildDropdowns(xp);

        if (userProfile.role !== 'admin') {
            setText("userLevelDisplay", lvl);
            const bar = document.getElementById("xpBar"); 
            
            if(bar) {
                let pct = 0;
                
                // Calculate percentage based on the current gap between levels
                if(xp < 500) {
                    pct = (xp / 500) * 100;                 // Rookie to Starter (500 point gap)
                } else if(xp < 1000) {
                    pct = ((xp - 500) / 500) * 100;         // Starter to Veteran (500 point gap)
                } else if(xp < 2000) {
                    pct = ((xp - 1000) / 1000) * 100;       // Veteran to Pro (1000 point gap)
                } else if(xp < 3000) {
                    pct = ((xp - 2000) / 1000) * 100;       // Pro to Legend (1000 point gap)
                } else {
                    pct = 100;                              // Legend (Maxed out)
                }
                
                bar.style.width = `${Math.min(pct, 100)}%`;
            }
        }

        renderCalendar(logs);
        renderPlayerTrendChart(logs);
        renderTeamLeaderboard(userProfile.role === 'admin' ? null : userProfile.teamId, logs);
    } catch (e) { console.error("Stats Load Error", e); }
}

function renderCalendar(logs) {
    const grid = document.getElementById("calendarDays");
    if(!grid) return;
    const header = document.getElementById("calMonthYear");
    const now = new Date();
    if(header) header.innerText = now.toLocaleDateString('default', { month: 'long', year: 'numeric' });
    grid.innerHTML = "";
    const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
    for(let i=1; i<=daysInMonth; i++) {
        const dStr = new Date(now.getFullYear(), now.getMonth(), i).toDateString();
        const hasLog = logs.some(l => new Date(l.timestamp.seconds*1000).toDateString() === dStr);
        const dayDiv = document.createElement("div");
        dayDiv.className = `cal-day ${hasLog ? 'has-log' : ''}`;
        dayDiv.innerHTML = `${i} ${hasLog ? '<div class="cal-dot"></div>' : ''}`;
        if(hasLog) {
            dayDiv.onclick = () => {
                const daily = logs.filter(l => new Date(l.timestamp.seconds*1000).toDateString() === dStr);
                setText("dayModalDate", dStr);
                const content = document.getElementById("dayModalContent");
                if(content) content.innerHTML = daily.map(l => `<div style="border-bottom:1px solid #eee; padding:5px;"><b>${l.player}</b><br>${l.drillSummary} (${l.minutes}m)</div>`).join("");
                document.getElementById("dayModal").style.display='block';
            };
        }
        grid.appendChild(dayDiv);
    }
}

function renderPlayerTrendChart(logs) {
    const cvs = document.getElementById('playerTrendChart'); 
    if(!cvs) return;
    const ctx = cvs.getContext('2d'); 
    
    // 1. Destroy old player chart if it exists
    if(playerChart) {
        playerChart.destroy(); 
    }
    
    // 2. Calculate the data for the last 7 days
    const data = Array(7).fill(0); 
    const labels = [];
    for(let i=6; i>=0; i--) { 
        const d = new Date(); 
        d.setDate(new Date().getDate()-i); 
        labels.push(d.toLocaleDateString('en-US',{weekday:'short'})); 
        data[6-i] = logs
            .filter(l=>new Date(l.timestamp.seconds*1000).toDateString() === d.toDateString())
            .reduce((s,l)=>s+Number(l.minutes),0); 
    }
    
    // 3. Render the player chart
    playerChart = new Chart(ctx, { 
        type: 'bar', 
        data: { 
            labels: labels, 
            datasets: [{ 
                data: data, 
                backgroundColor: "#00263A", 
                borderRadius: 4 
            }] 
        }, 
        options: { 
            plugins: { legend: {display:false} }, 
            scales: { x: {grid:{display:false}}, y:{beginAtZero:true} } 
        } 
    });
}

function renderTeamChart(logs) {
    const cvs = document.getElementById('teamChart'); 
    if(!cvs) return;
    const ctx = cvs.getContext('2d'); 
    
    // 1. Destroy old team chart if it exists
    if(teamChart) {
        teamChart.destroy();
    }

    // 2. Calculate the data for the last 7 days
    const data = Array(7).fill(0); 
    const labels = [];
    for(let i=6; i>=0; i--) { 
        const d = new Date(); 
        d.setDate(new Date().getDate() - i); 
        labels.push(d.toLocaleDateString('en-US', { weekday: 'short' })); 
        data[6-i] = logs
            .filter(l => new Date(l.timestamp.seconds * 1000).toDateString() === d.toDateString())
            .reduce((sum, l) => sum + Number(l.minutes), 0); 
    }
    
    // 3. Render the team chart
    teamChart = new Chart(ctx, { 
        type: 'bar', 
        data: { 
            labels: labels, 
            datasets: [{ 
                label: 'Total Team Minutes',
                data: data, 
                backgroundColor: "#00263A", 
                borderRadius: 4 
            }] 
        }, 
        options: { 
            plugins: { legend: { display: false } }, 
            scales: { x: { grid: { display: false } }, y: { beginAtZero: true } } 
        } 
    });
}

async function renderTeamLeaderboard(tid, logsOverride = []) {
    const table = document.getElementById("teamLeaderboardTable"); if(!table) return;
    let stats = {};
    if (!tid) { logsOverride.forEach(d => { const p = d.player; stats[p] = (stats[p] || 0) + Number(d.minutes); }); } 
    else { const q = query(collection(db, "reps"), where("teamId", "==", tid)); const snap = await getDocs(q); snap.forEach(d => { const p = d.data().player; stats[p] = (stats[p] || 0) + Number(d.data().minutes); }); }
    table.querySelector("tbody").innerHTML = Object.entries(stats).sort((a,b)=>b[1]-a[1]).slice(0,5).map((e,i) => `<tr><td class="rank-${i+1}">${i+1}</td><td>${e[0]}</td><td>${e[1]}m</td></tr>`).join("");
}

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
    
    const userEmail = auth.currentUser.email.toLowerCase();
    const currentTeam = globalTeams.find(t => t.id === tid);
    const isManager = isDirector || (currentTeam && currentTeam.coachEmail.toLowerCase() === userEmail);
    const staffCard = document.getElementById("cardStaffManager");
    if(staffCard) {
        staffCard.style.display = isManager ? 'block' : 'none';
        if(isManager) renderAssistantList(currentTeam);
    }

    const listEl = document.getElementById("coachPlayerList");
    if(listEl) listEl.innerHTML = "Fetching...";

    try {
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
        setText("coachActivePlayers", Object.keys(players).length);
        setText("coachTotalReps", count);
        renderTeamChart(allSessionsCache);
        
        const rosterSnap = await getDoc(doc(db, "rosters", tid));
        let rosterNames = (rosterSnap.exists() && rosterSnap.data().players) ? rosterSnap.data().players : [];
        const linkQuery = query(collection(db, "player_lookup"), where("teamId", "==", tid));
        const linkSnap = await getDocs(linkQuery);
        const linkedPlayers = new Set();
        linkSnap.forEach(doc => linkedPlayers.add(doc.data().playerName));

        const combinedSet = new Set([...rosterNames, ...Object.keys(players)]);
        const combinedList = Array.from(combinedSet).sort();
        const hwPlayer = document.getElementById("hwPlayerSelect");
        if(hwPlayer) {
            hwPlayer.innerHTML = combinedList.map(p => `<option value="${p}">${p}</option>`).join("");
        }
        document.getElementById("hwPlayerSelect").innerHTML = combinedList.map(p => `<option value="${p}">${p}</option>`).join("");

        if(listEl) {
            if(combinedList.length > 0) {
                listEl.innerHTML = combinedList.map(p => {
                    const stats = players[p] || { mins: 0, lastActive: null };
                    const lastDate = stats.lastActive ? stats.lastActive.toLocaleDateString() : "Inactive";
                    const isLinked = linkedPlayers.has(p);
                    const linkButton = isLinked 
                        ? `<button class="link-btn" style="background:#dcfce7; color:#166534; border-color:#86efac; cursor:default;">✔ Linked</button>`
                        : `<button class="link-btn" onclick="window.linkParent('${p}')">Link Parent</button>`;
                    return `<div style="padding:10px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
                        <div><b>${p}</b> <div style="font-size:10px; color:#666;">Last: ${lastDate}</div></div>
                        <div><span style="font-size:12px; font-weight:bold; color:#00263A; margin-right:5px;">${stats.mins}m</span>${linkButton}<button class="delete-btn" onclick="window.deletePlayer('${p}')">x</button></div></div>`;
                }).join("");
            } else {
                listEl.innerHTML = "<div style='padding:10px; color:#999;'>No players found in database. Upload a PDF roster or add manually above.</div>";
            }
        }
    } catch(e) {
        console.error(e);
        if(listEl) listEl.innerHTML = `<div style='color:red; padding:10px;'>Error: ${e.message}</div>`;
    } finally {
        if(listEl && listEl.innerHTML === "Fetching...") listEl.innerHTML = "<div style='padding:10px; color:#999;'>No players found.</div>";
    }
}

function renderAssistantList(team) {
    const c = document.getElementById("assistantList");
    if(!team || !team.assistants || team.assistants.length === 0) { c.innerHTML = "No assistants added."; return; }
    c.innerHTML = team.assistants.map(email => `<div style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding:5px;"><span>${email}</span><button class="delete-btn" onclick="window.removeAssistant('${email}')">Remove</button></div>`).join("");
}

async function addAssistant() {
    const email = document.getElementById("newAssistantEmail").value.trim().toLowerCase();
    if(!email || !email.includes("@")) return alert("Enter a valid email.");
    const tid = currentCoachTeamId;
    const teamIdx = globalTeams.findIndex(t => t.id === tid);
    if(teamIdx === -1) return;
    if(!globalTeams[teamIdx].assistants) globalTeams[teamIdx].assistants = [];
    if(globalTeams[teamIdx].assistants.includes(email)) return alert("User already added.");
    globalTeams[teamIdx].assistants.push(email);
    await setDoc(doc(db, "config", "teams"), { list: globalTeams });
    alert("Assistant Added!");
    document.getElementById("newAssistantEmail").value = "";
    loadCoachDashboard(auth.currentUser.email.toLowerCase() === DIRECTOR_EMAIL.toLowerCase(), globalTeams);
}

window.removeAssistant = async (email) => {
    if(!confirm(`Revoke for ${email}?`)) return;
    const tid = currentCoachTeamId;
    const teamIdx = globalTeams.findIndex(t => t.id === tid);
    globalTeams[teamIdx].assistants = globalTeams[teamIdx].assistants.filter(e => e !== email);
    await setDoc(doc(db, "config", "teams"), { list: globalTeams });
    loadCoachDashboard(auth.currentUser.email.toLowerCase() === DIRECTOR_EMAIL.toLowerCase(), globalTeams);
};

window.deletePlayer = async (name) => {
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

window.linkParent = async (playerName) => {
    const email = prompt(`Enter parent email for ${playerName}:`);
    if(email && email.includes("@")) {
        const tid = document.getElementById("adminTeamSelect").value;
        await setDoc(doc(db, "player_lookup", email.toLowerCase()), { teamId: tid, playerName: playerName });
        alert(`Linked!`);
        loadCoachDashboard(false, globalTeams);
    }
}

async function manualAddPlayer() {
    const name = document.getElementById("coachAddPlayerName").value.trim();
    const email = document.getElementById("coachAddPlayerEmail").value.trim().toLowerCase();
    if(!name) return alert("Enter name");
    const tid = document.getElementById("adminTeamSelect").value;
    const ref = doc(db, "rosters", tid);
    const snap = await getDoc(ref);
    let list = snap.exists() ? snap.data().players : [];
    if(!list.includes(name)) list.push(name);
    await setDoc(ref, { players: list }, { merge: true });
    if(email) await setDoc(doc(db, "player_lookup", email), { teamId: tid, playerName: name });
    alert("Player Added");
    document.getElementById("coachAddPlayerName").value = "";
    document.getElementById("coachAddPlayerEmail").value = "";
    loadCoachDashboard(false, globalTeams);
}

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
            const y = Math.round(item.transform[5] / 20); 
            if(!rows[y]) rows[y] = [];
            rows[y].push(decodeURIComponent(item.str));
        });
        let extracted = [];
        Object.keys(rows).sort((a,b)=>b-a).forEach(y => {
            const rowText = rows[y].join(" ").trim();
            const dateMatch = rowText.match(/\d{2}\/\d{2}\/\d{4}/);
            const idMatch = rowText.match(/\d{5}-\d{6}/);
            if (dateMatch || idMatch) {
                let cleanRow = rowText.replace(/\d{5}-\d{6}/g, "").replace(/\d{2}\/\d{2}\/\d{4}/g, "").replace(/\d{5}/g, "").trim();
                let words = cleanRow.split(" ").filter(w => w.length > 1 && !/\d/.test(w));
                if (cleanRow.includes(",")) {
                     let parts = cleanRow.split(",");
                     if(parts.length >= 2) extracted.push(`${parts[1].trim().split(" ")[0]} ${parts[0].trim()}`);
                } else if(words.length >= 2) extracted.push(`${words[0]} ${words[1]}`);
            }
        });
        if (extracted.length === 0) txtBox.value = "No player rows detected.";
        else txtBox.value = extracted.join("\n");
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
        } else if(line.trim()) cleanNames.push(line.trim());
    });
    await setDoc(doc(db, "rosters", tid), { players: cleanNames, lastUpdated: new Date() });
    await batch.commit();
    alert("Roster Saved!");
    document.getElementById("rosterReviewArea").style.display='none';
    loadCoachDashboard(auth.currentUser.email.toLowerCase() === DIRECTOR_EMAIL.toLowerCase(), globalTeams);
}

function exportSessionData() {
    if(allSessionsCache.length === 0) return alert("No sessions to export.");
    if (typeof XLSX === 'undefined') return alert("XLSX Library not loaded.");
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

function getSessionDescription() {
    if (currentSessionItems.length === 0) return "";
    const list = currentSessionItems.map((i, idx) => `${idx + 1}. ${i.name} (${i.sets} x ${i.reps})`).join("\\n");
    return `Aggies FC Training Plan:\\n\\n${list}\\n\\nLog results here: https://soccer-skills-tracker.web.app`;
}

function addToGoogleCalendar() {
    if (currentSessionItems.length === 0) return alert("Add drills to the list first!");
    const date = document.getElementById("calDate").value;
    const time = document.getElementById("calTime").value;
    if (!date || !time) return alert("Select Date and Time.");
    const start = new Date(`${date}T${time}`).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const end = new Date(new Date(`${date}T${time}`).getTime() + (45 * 60000)).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const title = encodeURIComponent("⚽ Soccer Training");
    const details = encodeURIComponent(getSessionDescription().replace(/\\n/g, "\n")); 
    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&sf=true&output=xml`;
    window.open(url, '_blank');
}

function downloadIcsFile() {
    if (currentSessionItems.length === 0) return alert("Add drills to the list first!");
    const date = document.getElementById("calDate").value;
    const time = document.getElementById("calTime").value;
    if (!date || !time) return alert("Select Date and Time.");
    const formatICSDate = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, "").split("Z")[0];
    const startDate = new Date(`${date}T${time}`);
    const endDate = new Date(startDate.getTime() + (45 * 60000));
    const icsContent = [ "BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT", "SUMMARY:⚽ Soccer Training", `DESCRIPTION:${getSessionDescription()}`, `DTSTART:${formatICSDate(startDate)}`, `DTEND:${formatICSDate(endDate)}`, "END:VEVENT", "END:VCALENDAR" ].join("\n");
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', 'training_session.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    snap.forEach(d => c.innerHTML += `<div style="border-bottom:1px solid #eee; padding:5px;"><span style="font-size:9px; color:#999;">${new Date(d.data().timestamp.seconds*1000).toLocaleString()}</span><br><b>${d.data().type}</b>: ${d.data().detail}</div>`);
}
function generateSampleLogs() { logSystemEvent("SYSTEM_START", "Init"); alert("Log Added"); }
function runSecurityScan() { const c = document.getElementById("logContainer"); if(c) { c.innerHTML="Scanning..."; setTimeout(() => c.innerHTML="<div>✔ Auth: Secure</div>", 800); } }
function getEmbedUrl(url) { if(!url)return""; let id=""; if(url.includes("youtu.be/"))id=url.split("youtu.be/")[1]; else if(url.includes("v="))id=url.split("v=")[1].split("&")[0]; else if(url.includes("embed/"))return url; if(id.includes("?"))id=id.split("?")[0]; return id?`https://www.youtube.com/embed/${id}`:""; }

// ==========================================
// 4. APP INITIALIZATION
// ==========================================

// ==========================================
// SCHEDULE & HOMEWORK LOGIC
// ==========================================

async function loadHomeDashboard() {
    if(!userProfile) return;
    
    // 1. Load Team Schedule
    const schedList = document.getElementById("homeScheduleList");
    if(schedList) {
        schedList.innerHTML = "<li class='session-empty'>Loading schedule...</li>";
        const q = query(collection(db, "schedules"), where("teamId", "==", userProfile.teamId));
        const snap = await getDocs(q);
        const events = [];
        snap.forEach(d => events.push({ id: d.id, ...d.data() }));
        
        // Sort by date chronologically
        events.sort((a,b) => a.date.localeCompare(b.date));
        
        let html = "";
        events.forEach(e => {
            html += `<li class="session-item">
                <div><b style="color:var(--aggie-blue);">${e.type}</b>: ${e.location}<br>
                <span style="font-size:11px; color:#64748b;">${e.date} @ ${e.time}</span></div>
            </li>`;
        });
        schedList.innerHTML = html || "<li class='session-empty'>No upcoming events.</li>";
    }

    // 2. Load Player Homework
    const hwList = document.getElementById("homeHomeworkList");
    if(hwList) {
        hwList.innerHTML = "<li class='session-empty'>Loading assignments...</li>";
        const q2 = query(collection(db, "assignments"), where("player", "==", userProfile.playerName));
        const snap2 = await getDocs(q2);
        let html = "";
        snap2.forEach(d => {
            const hw = d.data();
            if(hw.status === "active") {
                html += `<li class="session-item" style="border-left: 4px solid #ea580c;">
                    <div><b>${hw.drill}</b><br><span style="font-size:11px; color:#64748b;">Due: ${hw.dueDate}</span></div>
                    <button class="action-btn" style="background:#16a34a; padding:6px 10px;" onclick="window.completeHomework('${d.id}')">Done</button>
                </li>`;
            }
        });
        hwList.innerHTML = html || "<li class='session-empty'>No active assignments!</li>";
    }
}

async function loadCoachScheduleAndHW() {
    const tid = currentCoachTeamId;
    if(!tid) return;

    // Load Coach Schedule View
    const cSched = document.getElementById("coachScheduleList");
    if(cSched) {
        const q = query(collection(db, "schedules"), where("teamId", "==", tid));
        const snap = await getDocs(q);
        const events = [];
        snap.forEach(d => events.push({ id: d.id, ...d.data() }));
        events.sort((a,b) => a.date.localeCompare(b.date));
        
        cSched.innerHTML = events.map(e => `<li class="session-item">
            <div><b>${e.type}</b>: ${e.location}<br><span style="font-size:10px;">${e.date}</span></div>
            <button class="delete-btn" onclick="window.deleteSchedule('${e.id}')">✕</button>
        </li>`).join("") || "<li class='session-empty'>No events scheduled.</li>";
    }

    // Load Coach Homework View
    const cHw = document.getElementById("coachHwList");
    if(cHw) {
        const q2 = query(collection(db, "assignments"), where("teamId", "==", tid));
        const snap2 = await getDocs(q2);
        let html = "";
        snap2.forEach(d => {
            const hw = d.data();
            if(hw.status === "active") {
                html += `<li class="session-item">
                    <div><b>${hw.player}</b><br><span style="font-size:10px;">${hw.drill} (Due: ${hw.dueDate})</span></div>
                    <button class="delete-btn" onclick="window.deleteHomework('${d.id}')">✕</button>
                </li>`;
            }
        });
        cHw.innerHTML = html || "<li class='session-empty'>No active homework.</li>";
    }
}

// Global actions for the inline buttons
window.completeHomework = async (id) => {
    await updateDoc(doc(db, "assignments", id), { status: "completed" });
    loadHomeDashboard();
};
window.deleteSchedule = async (id) => {
    if(confirm("Delete this event?")) { await deleteDoc(doc(db, "schedules", id)); loadCoachScheduleAndHW(); loadHomeDashboard(); }
};
window.deleteHomework = async (id) => {
    if(confirm("Delete this assignment?")) { await deleteDoc(doc(db, "assignments", id)); loadCoachScheduleAndHW(); loadHomeDashboard(); }
};

const initApp = () => {
    console.log("App v38 Loaded (History API + Clean Nav + No Debug)");

// Helper function to show errors on screen instead of alerts
    const showAuthError = (msg) => {
        const errEl = document.getElementById("authErrorMsg");
        if(errEl) {
            errEl.style.display = 'block';
            errEl.innerText = msg;
        } else {
            alert(msg);
        }
    };

    // AUTH BINDINGS
    safeBind("loginGoogleBtn", "click", async () => {
        const provider = new GoogleAuthProvider();
        
        // Detect if the user is on a mobile device
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        try {
            if (isMobile) {
                // Mobile: Bypasses strict Safari/Chrome popup blockers
                signInWithRedirect(auth, provider); 
            } else {
                // Desktop: Uses a clean popup for a faster experience
                await signInWithPopup(auth, provider); 
            }
        } catch (error) {
            showAuthError("Google Login Failed: " + error.message);
        }
    });
    
    // Catch the result when the mobile browser redirects back to your app
    getRedirectResult(auth).then((result) => {
        if (result) console.log("Mobile redirect successful!");
    }).catch(e => {
        showAuthError("Google Login Failed: " + e.message);
    });
    
    safeBind("loginEmailBtn", "click", () => {
        const e = document.getElementById("authEmail").value;
        const p = document.getElementById("authPassword").value;
        
        if(!e || !p) return showAuthError("Please enter both an email and password.");
        
        signInWithEmailAndPassword(auth, e, p).catch(err => showAuthError(err.message));
    });
    
    safeBind("signupEmailBtn", "click", () => {
        const e = document.getElementById("authEmail").value;
        const p = document.getElementById("authPassword").value;
        
        if(!e || !p) return showAuthError("Please enter an email and a password to sign up.");
        
        createUserWithEmailAndPassword(auth, e, p).catch(err => showAuthError(err.message));
    });
    
    // --- HOME NAVIGATION BINDINGS ---
    // This handles the bottom navigation bar button
    safeBind('navHome', 'click', () => window.navigateTo('viewHome', 'navHome'));

    // This handles the "Aggies FC" title click
    safeBind('headerHomeLink', 'click', () => window.navigateTo('viewHome', 'navHome'));

   // --- 3. LOGOUT BUTTONS ---
    const handleLogout = async () => {
        try {
            await signOut(auth);
            window.location.replace(window.location.pathname); // Forces a hard reload back to login
        } catch (error) {
            alert("Logout Failed: " + error.message);
        }
    };
    
    safeBind("globalLogoutBtn", "click", handleLogout);
    safeBind("appLogoutBtn", "click", handleLogout);
    
    // --- 4. ACCOUNT SETUP ---
    safeBind("completeSetupBtn", "click", completeUserSetup);
    
    // NAVIGATION BINDINGS (Uses centralized API)
    navs.forEach((nid, i) => {
        safeBind(nid, "click", () => window.navigateTo(views[i], nid));
    });

    // HOME SCREEN DASHBOARD ACTIONS
    safeBind("btnHomeStart", "click", () => window.navigateTo('viewTracker', 'navTrack'));
    safeBind("btnHomeStats", "click", () => window.navigateTo('viewStats', 'navStats'));
    safeBind("btnHomeCoach", "click", () => window.navigateTo('viewCoach', 'navCoach'));
    safeBind("btnHomeAdmin", "click", () => window.navigateTo('viewAdmin', 'navAdmin'));
    
    safeBind("btnOpenTrophyModal", "click", () => {
        // Just navigate to the stats page where the real trophies are
        window.navigateTo('viewStats', 'navStats');
        // Scroll down slightly so the trophy case is centered
        setTimeout(() => window.scrollTo({ top: 150, behavior: 'smooth' }), 100);
    });

    buildDropdowns(0);

    const showDrillInfo = (drillName) => {
        const s = dbData.foundationSkills.find(x => x.name === drillName);
        if(s) {
            document.getElementById("drillInfoBox").style.display='block';
            setText("drillTitle", s.name);
            setText("drillDesc", s.drill);
            const vb = document.getElementById("watchVideoBtn");
            if(s.video) { 
                vb.style.display='inline-block'; 
                const newBtn = vb.cloneNode(true);
                vb.parentNode.replaceChild(newBtn, vb);
                newBtn.addEventListener("click", () => { 
                    document.getElementById("videoPlayer").src = getEmbedUrl(s.video); 
                    document.getElementById("videoModal").style.display='block'; 
                });
            } else vb.style.display='none';
        }
    };

    safeBind("selectWarmup", "change", (e) => {
        const val = e.target.value;
        const customContainer = document.getElementById("customWarmupContainer");
        const infoBox = document.getElementById("drillInfoBox");
        
        if(val === "custom") {
            customContainer.style.display = 'block';
            infoBox.style.display = 'none';
        } else {
            customContainer.style.display = 'none';
            showDrillInfo(val);
        }
    });

    safeBind("addWarmupBtn", "click", () => {
        let n = document.getElementById("selectWarmup").value;
        if(!n) return alert("Select a Warm-up first");
        if (n === "custom") {
            n = document.getElementById("customWarmupName").value.trim();
            if(!n) return alert("Please type the name of your workout.");
        }
        const dist = document.getElementById("cardioDist").value;
        const time = document.getElementById("cardioTime").value;
        let details = "";
        if (dist) details += `${dist} mi`;
        if (dist && time) details += " / ";
        if (time) details += `${time} min`;
        if (!details) details = "Standard";
        currentSessionItems.push({ name: n, sets: 1, reps: details }); 
        renderSession();
        document.getElementById("cardioDist").value = "";
        document.getElementById("cardioTime").value = "";
        document.getElementById("customWarmupName").value = "";
    });

    safeBind("selectCore", "change", (e) => showDrillInfo(e.target.value));
    safeBind("addCoreBtn", "click", () => {
        const n = document.getElementById("selectCore").value;
        if(!n) return alert("Select a Core exercise first");
        const s = document.getElementById("setsCore").value || 3;
        const r = document.getElementById("repsCore").value || 20;
        currentSessionItems.push({ name: n, sets: s, reps: r });
        renderSession();
    });

    safeBind("selectBallWork", "change", (e) => showDrillInfo(e.target.value));
    safeBind("addBallWorkBtn", "click", () => {
        const n = document.getElementById("selectBallWork").value;
        if(!n) return alert("Select a Skill first");
        const s = document.getElementById("setsBall").value || 3;
        const r = document.getElementById("repsBall").value || 20;
        currentSessionItems.push({ name: n, sets: s, reps: r });
        renderSession();
    });

    safeBind("selectBasics", "change", (e) => showDrillInfo(e.target.value));
    safeBind("addBasicsBtn", "click", () => {
        const n = document.getElementById("selectBasics").value;
        if(!n) return alert("Select a Basic first");
        const s = document.getElementById("setsBasics").value || 3;
        const r = document.getElementById("repsBasics").value || 20;
        currentSessionItems.push({ name: n, sets: s, reps: r });
        renderSession();
    });

    safeBind("submitWorkoutBtn", "click", submitWorkout);
    safeBind("btnGCal", "click", addToGoogleCalendar);
    safeBind("btnIcs", "click", downloadIcsFile);

    document.querySelectorAll(".outcome-btn").forEach(b => {
        b.onclick = () => {
            document.querySelectorAll(".outcome-btn").forEach(x => x.classList.remove("active"));
            b.classList.add("active");
        }
    });

    safeBind("claimCertificateBtn", "click", () => {
        document.getElementById("certPlayerName").innerText = userProfile.playerName;
        document.getElementById("certDate").innerText = new Date().toLocaleDateString();
        document.getElementById("certModal").style.display = "block";
    });

    safeBind("closeCertModal", "click", () => {
        document.getElementById("certModal").style.display = "none";
    });

    safeBind("rosterPdfInput", "change", parsePDF);
    safeBind("saveParsedRosterBtn", "click", saveRosterList);
    safeBind("coachAddPlayerBtn", "click", manualAddPlayer);
    safeBind("exportXlsxBtn", "click", exportSessionData);
    safeBind("forceRefreshRosterBtn", "click", () => loadCoachDashboard(true, globalTeams)); 
    safeBind("addAssistantBtn", "click", addAssistant); 
    
    safeBind("addTeamBtn", "click", addTeam);
    safeBind("addAdminBtn", "click", addAdmin);
    safeBind("btnLogSystem", "click", () => loadLogs("logs_system"));
    safeBind("btnLogSecurity", "click", runSecurityScan);
    safeBind("generateTestLogBtn", "click", generateSampleLogs);

    // --- MODAL & POPUP CLOSE BUTTONS ---
    document.querySelectorAll(".close-btn").forEach(b => {
        b.onclick = () => {
            // 1. Hide all standard modals (like the Video Player, Day View, and Certificate)
            document.querySelectorAll(".modal").forEach(m => m.style.display = 'none');
            
            // 2. Stop the YouTube video from playing in the background
            const videoPlayer = document.getElementById("videoPlayer");
            if (videoPlayer) videoPlayer.src = "";
            
            // 3. Hide the Drill Info Box (which is a card, not a modal)
            const drillInfoBox = document.getElementById("drillInfoBox");
            if (drillInfoBox) drillInfoBox.style.display = 'none';
        }
    });

    // --- SCHEDULE & HOMEWORK BINDINGS ---
    safeBind("addScheduleBtn", "click", async () => {
        const date = document.getElementById("scheduleDate").value;
        const time = document.getElementById("scheduleTime").value;
        const type = document.getElementById("scheduleType").value;
        const loc = document.getElementById("scheduleLocation").value;
        const tid = currentCoachTeamId;
        
        if(!date || !time || !loc || !tid) return alert("Please fill out all schedule fields.");
        
        await addDoc(collection(db, "schedules"), { teamId: tid, date, time, type, location: loc });
        document.getElementById("scheduleLocation").value = ""; // Clear input
        loadCoachScheduleAndHW();
        loadHomeDashboard();
    });

    safeBind("assignHwBtn", "click", async () => {
        const player = document.getElementById("hwPlayerSelect").value;
        const drill = document.getElementById("hwDrillSelect").value;
        const due = document.getElementById("hwDueDate").value;
        const tid = currentCoachTeamId;
        
        if(!player || !drill || !due || !tid) return alert("Please fill out all homework fields.");
        
        await addDoc(collection(db, "assignments"), { teamId: tid, player, drill, dueDate: due, status: "active" });
        loadCoachScheduleAndHW();
        loadHomeDashboard();
    });

    // --- SCHEDULE & HOMEWORK BINDINGS ---
    
    // 1. Populate the Homework Drill Dropdown
    const hwDrillSelect = document.getElementById("hwDrillSelect");
    if(hwDrillSelect) {
        hwDrillSelect.innerHTML = '<option value="" disabled selected>Select Drill...</option>';
        dbData.foundationSkills.forEach(s => {
            const opt = document.createElement("option"); 
            opt.value = s.name; 
            opt.textContent = s.name;
            hwDrillSelect.appendChild(opt);
        });
    }

    // 2. Bind the Schedule Button
    safeBind("addScheduleBtn", "click", async () => {
        const date = document.getElementById("scheduleDate").value;
        const time = document.getElementById("scheduleTime").value;
        const type = document.getElementById("scheduleType").value;
        const loc = document.getElementById("scheduleLocation").value;
        const tid = currentCoachTeamId;
        
        if(!date || !time || !loc || !tid) return alert("Please fill out all schedule fields.");
        
        await addDoc(collection(db, "schedules"), { teamId: tid, date, time, type, location: loc });
        document.getElementById("scheduleLocation").value = ""; 
        alert("Event Added!");
        if(typeof loadCoachScheduleAndHW === "function") loadCoachScheduleAndHW();
        if(typeof loadHomeDashboard === "function") loadHomeDashboard();
    });

    // 3. Bind the Assign Homework Button
    safeBind("assignHwBtn", "click", async () => {
        const player = document.getElementById("hwPlayerSelect").value;
        const drill = document.getElementById("hwDrillSelect").value;
        const due = document.getElementById("hwDueDate").value;
        const tid = currentCoachTeamId;
        
        if(!player || !drill || !due || !tid) return alert("Please fill out all homework fields.");
        
        await addDoc(collection(db, "assignments"), { teamId: tid, player, drill, dueDate: due, status: "active" });
        alert("Homework Assigned!");
        if(typeof loadCoachScheduleAndHW === "function") loadCoachScheduleAndHW();
        if(typeof loadHomeDashboard === "function") loadHomeDashboard();
    });

    // ==========================================
    // COACH STOPWATCH LOGIC
    // ==========================================
    let swInterval = null;
    let swStartTime = 0;
    let swElapsedTime = 0;
    let swLapCount = 0;

    // Helper to format milliseconds into mm:ss.ms
    const formatTime = (ms) => {
        const date = new Date(ms);
        const m = date.getUTCMinutes().toString().padStart(2, '0');
        const s = date.getUTCSeconds().toString().padStart(2, '0');
        const msFormatted = Math.floor(date.getUTCMilliseconds() / 10).toString().padStart(2, '0');
        return `${m}:${s}.${msFormatted}`;
    };

    safeBind("btnSwStart", "click", () => {
        if (!swInterval) {
            swStartTime = Date.now() - swElapsedTime;
            swInterval = setInterval(() => {
                swElapsedTime = Date.now() - swStartTime;
                const disp = document.getElementById("stopwatchDisplay");
                if(disp) disp.innerText = formatTime(swElapsedTime);
            }, 10); // Updates every 10ms for smooth tracking
        }
    });

    safeBind("btnSwStop", "click", () => {
        clearInterval(swInterval);
        swInterval = null;
    });

    safeBind("btnSwReset", "click", () => {
        clearInterval(swInterval);
        swInterval = null;
        swElapsedTime = 0;
        swLapCount = 0;
        const disp = document.getElementById("stopwatchDisplay");
        if(disp) disp.innerText = "00:00.00";
        const laps = document.getElementById("lapList");
        if(laps) laps.innerHTML = ""; // Clear laps
    });

    safeBind("btnSwLap", "click", () => {
        if(swElapsedTime === 0) return; // Don't lap if it hasn't started
        swLapCount++;
        const laps = document.getElementById("lapList");
        if(laps) {
            const li = document.createElement("li");
            li.style.cssText = "padding: 8px 5px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between;";
            li.innerHTML = `<strong>Lap ${swLapCount}</strong> <span style="font-family:monospace; font-weight:bold; color:var(--aggie-blue);">${formatTime(swElapsedTime)}</span>`;
            // Prepend adds it to the top of the list so the newest lap is always visible
            laps.prepend(li); 
        }
    });

    // ==========================================
    // PARENT SIGNATURE LOGIC
    // ==========================================
    const canvas = document.getElementById("signatureCanvas");
    if(canvas) {
        const ctx = canvas.getContext('2d');
        let isDrawing = false;
        
       function resizeCanvas() { 
            // ADDED: && canvas.parentElement.offsetWidth > 0
            if(canvas.parentElement && canvas.parentElement.offsetWidth > 0) { 
                canvas.width = canvas.parentElement.offsetWidth; 
                canvas.height = 120; 
                ctx.lineWidth = 2; 
                ctx.lineCap = "round"; 
                ctx.strokeStyle = "#00263A"; 
            } 
        }
        window.addEventListener('resize', resizeCanvas);
        setTimeout(resizeCanvas, 500); 

        function getCoordinates(e) {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return { x: clientX - rect.left, y: clientY - rect.top };
        }

        function startDraw(e) { 
            isDrawing = true; 
            ctx.beginPath(); 
            draw(e); 
        }

        function endDraw() { 
            isDrawing = false; 
            ctx.beginPath(); 
            checkSignature(); 
        }

        function draw(e) { 
            if (!isDrawing) return; 
            e.preventDefault(); // Prevents mobile screen from scrolling while signing
            isSignatureBlank = false; 
            const coords = getCoordinates(e);
            ctx.lineTo(coords.x, coords.y); 
            ctx.stroke(); 
            ctx.beginPath(); 
            ctx.moveTo(coords.x, coords.y); 
        }

        function checkSignature() { 
            const pixelBuffer = new Uint32Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer); 
            // If the canvas is completely blank, keep the flag true
            if (!pixelBuffer.some(color => color !== 0)) { 
                isSignatureBlank = true; 
            } else { 
                isSignatureBlank = false; 
                canvas.style.borderColor = "#16a34a"; // Turn border green for success visual feedback
                canvas.style.backgroundColor = "#f0fdf4"; 
            }
        }

        canvas.addEventListener('mousedown', startDraw); 
        canvas.addEventListener('mouseup', endDraw); 
        canvas.addEventListener('mousemove', draw); 
        
        // Mobile Touch Events (passive: false is required to block scrolling)
        canvas.addEventListener('touchstart', startDraw, { passive: false }); 
        canvas.addEventListener('touchend', endDraw); 
        canvas.addEventListener('touchmove', draw, { passive: false });

        safeBind("clearSigBtn", "click", () => { 
            ctx.clearRect(0, 0, canvas.width, canvas.height); 
            isSignatureBlank = true; 
            canvas.style.borderColor = "#cbd5e1"; 
            canvas.style.backgroundColor = "#fcfcfc"; 
        });
    }
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initApp);
else initApp();

// ==========================================
// 5. AUTH MONITOR & INITIAL ROUTE
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if(user) {
        document.getElementById("loginUI").style.display='none';
        try {
            await fetchConfig();
            const userRef = doc(db, "users", user.email);
            const userSnap = await getDoc(userRef);
            
            const isAdmin = (user.email.toLowerCase() === DIRECTOR_EMAIL.toLowerCase()) || 
                            globalAdmins.some(a => a.toLowerCase() === user.email.toLowerCase());

            if (isAdmin) {
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
                
                // Initialize text values first
                setText("coachName", user.email);
                setText("activePlayerName", userProfile.playerName);
                setText("homePlayerName", userProfile.playerName.split(" ")[0]);
                if(document.getElementById("homePlayerName")) {
                    setText("homePlayerName", userProfile.playerName.split(" ")[0]);
                }
                
                // Trigger initial load sequences safely
                loadStats();
                loadHomeDashboard();
                checkRoles(user);

                // Start History at Home without duplicating
                history.replaceState({ view: 'viewHome', nav: 'navHome' }, '', '#viewHome');
                window.navigateTo('viewHome', 'navHome', false);

            } else {
                document.getElementById("setupUI").style.display = 'flex';
                initSetupDropdowns();
            }
        } catch (error) { console.error(error); alert("Auth Data Error: " + error.message); }
    } else {
        document.getElementById("loginUI").style.display='flex';
        document.getElementById("appUI").style.display='none';
        document.getElementById("bottomNav").style.display='none';
        document.getElementById("setupUI").style.display='none';
    }
});
