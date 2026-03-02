import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, where, getDocs, doc, getDoc, setDoc, addDoc, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- BRING IN YOUR MODULES ---
import { dbData } from "./data.js";
import { checkMobileRedirect, handleGoogleLogin, handleEmailLogin, handleEmailSignup, handleLogout, completeUserSetup, initSetupDropdowns } from "./modules/auth.js";
import { addDrillToSession, handleWorkoutSubmit, addToGoogleCalendar, downloadIcsFile, initSignatureCanvas } from "./modules/tracker.js";
import { renderCalendar, renderPlayerTrendChart, renderTeamLeaderboard, loadPlayerFeedback } from "./modules/stats.js";
import { initCoachDropdown, loadCoachDashboard, loadCoachScheduleAndHW, addAssistant, manualAddPlayer, parsePDF, saveRosterList, exportSessionData, currentCoachTeamId } from "./modules/coach.js";

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
let userProfile = null; 

// ==========================================
// 2. CORE NAVIGATION & ROUTING API
// ==========================================

const navs = ['navHome', 'navTrack', 'navStats', 'navCoach', 'navAdmin'];
const views = ['viewHome', 'viewTracker', 'viewStats', 'viewCoach', 'viewAdmin'];

// --- 1. NEW NAVIGATION LOGIC ---
    window.navigateTo = (viewId, navId, addToHistory = true) => {
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

        // Push to phone history so the native back swipe works!
        if (addToHistory) {
            history.pushState({ view: viewId, nav: navId }, '', `#${viewId}`);
        }
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
        initCoachDropdown(true, globalTeams, loadHomeDashboard);
        renderAdminTables();
    } else if (myTeams.length > 0) {
        document.getElementById("navCoach").style.display='flex';
        if(document.getElementById("btnHomeCoach")) document.getElementById("btnHomeCoach").style.display='block';
        initCoachDropdown(false, myTeams, loadHomeDashboard);
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
        loadPlayerFeedback(userProfile);
    } catch (e) { console.error("Stats Load Error", e); }
}

// ==========================================
// SCHEDULE & HOMEWORK LOGIC
// ==========================================

async function loadHomeDashboard() {
    if(!userProfile) return;
    
    // Admin uses the team selected in Coach Tools. Players use their assigned team.
    const targetTeamId = userProfile.role === 'admin' && currentCoachTeamId ? currentCoachTeamId : userProfile.teamId;
    const targetPlayer = userProfile.role === 'admin' ? null : userProfile.playerName;

    const schedList = document.getElementById("homeScheduleList");
    if(schedList) {
        if(!targetTeamId) {
            schedList.innerHTML = "<li class='session-empty'>Select a team in Coach Tools to view schedule.</li>";
        } else {
            schedList.innerHTML = "<li class='session-empty'>Loading schedule...</li>";
            const q = query(collection(db, "schedules"), where("teamId", "==", targetTeamId));
            const snap = await getDocs(q);
            const events = [];
            snap.forEach(d => events.push({ id: d.id, ...d.data() }));
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
    }

    const hwList = document.getElementById("homeHomeworkList");
    if(hwList) {
        if(userProfile.role === 'admin') {
            hwList.innerHTML = "<li class='session-empty' style='color:#ea580c;'>Admins don't receive personal homework. Assign it in Coach Tools!</li>";
        } else {
            hwList.innerHTML = "<li class='session-empty'>Loading assignments...</li>";
            const q2 = query(collection(db, "assignments"), where("player", "==", targetPlayer));
            const snap2 = await getDocs(q2);
            let html = "";
            snap2.forEach(d => {
                const hw = d.data();
                if(hw.status === "active") {
                    // Support both the new Array format and the old String format
                    let drillSummary = "";
                    if (Array.isArray(hw.drills)) {
                        drillSummary = hw.drills.map(d => `• ${d.name} <span style="color:#64748b;">(${d.sets}x${d.reps})</span>`).join("<br>");
                    } else {
                        drillSummary = hw.drill; // Fallback for old assignments
                    }

                    html += `<li class="session-item" style="border-left: 4px solid #ea580c; align-items: flex-start;">
                        <div style="flex:1;">
                            <span style="font-size:11px; color:#ea580c; font-weight:bold; text-transform:uppercase;">Due: ${hw.dueDate}</span><br>
                            <div style="font-size:13px; margin-top:4px; line-height:1.4;">${drillSummary}</div>
                        </div>
                        <button class="action-btn" style="background:#16a34a; padding:8px 12px; height:fit-content; margin-top:10px;" onclick="window.completeHomework('${d.id}')">Done</button>
                    </li>`;
                }
            });
            hwList.innerHTML = html || "<li class='session-empty'>No active assignments!</li>";
        }
    }
}

function getSessionDescription() {
    if (currentSessionItems.length === 0) return "";
    const list = currentSessionItems.map((i, idx) => `${idx + 1}. ${i.name} (${i.sets} x ${i.reps})`).join("\\n");
    return `Aggies FC Training Plan:\\n\\n${list}\\n\\nLog results here: https://soccer-skills-tracker.web.app`;
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

const initApp = () => {
    console.log("App v38 Loaded (History API + Clean Nav + No Debug)");

    // --- 1. AUTH BINDINGS (via modules/auth.js) ---
    checkMobileRedirect();
    safeBind("loginGoogleBtn", "click", handleGoogleLogin);
    safeBind("loginEmailBtn", "click", handleEmailLogin);
    safeBind("signupEmailBtn", "click", handleEmailSignup);
    safeBind("globalLogoutBtn", "click", handleLogout);
    safeBind("appLogoutBtn", "click", handleLogout);
    safeBind("completeSetupBtn", "click", completeUserSetup);

    // NAVIGATION BINDINGS (Uses centralized API)
    // Make the top "Aggies FC" title return to the home dashboard
    safeBind('headerHomeLink', 'click', () => window.navigateTo('viewHome', 'navHome'));
    navs.forEach((nid, i) => {
        safeBind(nid, "click", () => window.navigateTo(views[i], nid));
    });

    // HOME SCREEN DASHBOARD ACTIONS
    safeBind("btnHomeStart", "click", () => window.navigateTo('viewTracker', 'navTrack'));
    safeBind("btnHomeStats", "click", () => window.navigateTo('viewStats', 'navStats'));
    safeBind("btnHomeCoach", "click", () => window.navigateTo('viewCoach', 'navCoach'));
    safeBind("btnHomeAdmin", "click", () => window.navigateTo('viewAdmin', 'navAdmin'));
    
// --- TRACKER MODULE BINDINGS ---
    initSignatureCanvas();

    safeBind("addWarmupBtn", "click", () => {
        let n = document.getElementById("selectWarmup")?.value;
        if(!n) return alert("Select a Warm-up first");
        if (n === "custom") {
            n = document.getElementById("customWarmupName")?.value.trim();
            if(!n) return alert("Please type the name of your workout.");
        }
        const dist = document.getElementById("cardioDist")?.value;
        const time = document.getElementById("cardioTime")?.value;
        let details = (dist ? `${dist} mi` : "") + (dist && time ? " / " : "") + (time ? `${time} min` : "");
        addDrillToSession({ name: n, sets: 1, reps: details || "Standard" });
        if(document.getElementById("cardioDist")) document.getElementById("cardioDist").value = "";
        if(document.getElementById("cardioTime")) document.getElementById("cardioTime").value = "";
        if(document.getElementById("customWarmupName")) document.getElementById("customWarmupName").value = "";
    });

    safeBind("addCoreBtn", "click", () => {
        const n = document.getElementById("selectCore")?.value;
        if(!n) return alert("Select a Core exercise first");
        addDrillToSession({ name: n, sets: document.getElementById("setsCore")?.value || 3, reps: document.getElementById("repsCore")?.value || 20 });
    });

    safeBind("addBallWorkBtn", "click", () => {
        const n = document.getElementById("selectBallWork")?.value;
        if(!n) return alert("Select a Skill first");
        addDrillToSession({ name: n, sets: document.getElementById("setsBall")?.value || 3, reps: document.getElementById("repsBall")?.value || 20 });
    });

    safeBind("addBasicsBtn", "click", () => {
        const n = document.getElementById("selectBasics")?.value;
        if(!n) return alert("Select a Basic first");
        addDrillToSession({ name: n, sets: document.getElementById("setsBasics")?.value || 3, reps: document.getElementById("repsBasics")?.value || 20 });
    });

    safeBind("submitWorkoutBtn", "click", () => handleWorkoutSubmit(userProfile, globalTeams, () => {
        if(document.getElementById("viewStats") && !document.getElementById("viewStats").classList.contains("d-none")) {
            loadStats(); // Trigger your stats reload if they are looking at it
        }
    }));
    safeBind("btnGCal", "click", addToGoogleCalendar);
    safeBind("btnIcs", "click", downloadIcsFile);

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
    safeBind("saveParsedRosterBtn", "click", () => saveRosterList(() => loadCoachDashboard(auth.currentUser.email.toLowerCase() === DIRECTOR_EMAIL.toLowerCase(), globalTeams, loadHomeDashboard)));
    safeBind("coachAddPlayerBtn", "click", () => manualAddPlayer(() => loadCoachDashboard(false, globalTeams, loadHomeDashboard)));
    safeBind("exportXlsxBtn", "click", exportSessionData);
    safeBind("forceRefreshRosterBtn", "click", () => loadCoachDashboard(true, globalTeams, loadHomeDashboard)); 
    safeBind("addAssistantBtn", "click", () => addAssistant(globalTeams, () => loadCoachDashboard(auth.currentUser.email.toLowerCase() === DIRECTOR_EMAIL.toLowerCase(), globalTeams, loadHomeDashboard)));
    
    safeBind("addTeamBtn", "click", addTeam);
    safeBind("addAdminBtn", "click", addAdmin);
    safeBind("btnLogSystem", "click", () => loadLogs("logs_system"));
    safeBind("btnLogSecurity", "click", runSecurityScan);
    safeBind("generateTestLogBtn", "click", generateSampleLogs);

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
        try {
            const date = document.getElementById("scheduleDate").value;
            const time = document.getElementById("scheduleTime").value;
            const type = document.getElementById("scheduleType").value;
            const loc = document.getElementById("scheduleLocation").value;
            const tid = currentCoachTeamId;
            
            if(!date || !time || !loc || !tid) return alert("Please fill out all schedule fields.");
            
            await addDoc(collection(db, "schedules"), { teamId: tid, date, time, type, location: loc });
            document.getElementById("scheduleLocation").value = ""; 
            alert("Event Added!");
            loadCoachScheduleAndHW();
            loadHomeDashboard();
        } catch (err) {
            alert("Database Error: " + err.message);
            console.error(err);
        }
    });

    // 3. Bind the Homework Builder
    window.currentHomeworkBuilder = []; // Global staging array

    safeBind("addHwDrillBtn", "click", () => {
        const d = document.getElementById("hwDrillSelect").value;
        const s = document.getElementById("hwSets").value || 3;
        const r = document.getElementById("hwReps").value || 20;
        if(!d) return alert("Select a drill!");
        
        window.currentHomeworkBuilder.push({ name: d, sets: s, reps: r });
        
        const list = document.getElementById("hwBuilderList");
        list.innerHTML = window.currentHomeworkBuilder.map((item, idx) => 
            `<li style="padding:5px; border-bottom:1px solid #eee; font-size:12px; display:flex; justify-content:space-between; align-items:center;">
                <span><b>${idx+1}.</b> ${item.name} <span style="color:#64748b;">(${item.sets}x${item.reps})</span></span>
                <button class="delete-btn" onclick="window.removeHwDrill(${idx})">✕</button>
            </li>`
        ).join("");
    });

// --- SKILL EVALUATION BINDINGS ---
    
    // 1. Populate the Brilliant Basics Dropdown
    const evalSkillSelect = document.getElementById("evalSkillSelect");
    if(evalSkillSelect) {
        evalSkillSelect.innerHTML = '<option value="" disabled selected>Select Skill...</option>';
        dbData.foundationSkills.forEach(s => {
            // Filter to ONLY include Brilliant Basics (matches your existing logic)
            if(s.type !== 'cardio' && s.type !== 'core' && s.type !== 'ball_mastery') {
                const opt = document.createElement("option"); 
                opt.value = s.name; 
                opt.textContent = s.name;
                evalSkillSelect.appendChild(opt);
            }
        });
    }

    // 2. Fetch History when a new player is selected
    window.loadPlayerEvaluations = async (playerName) => {
        const list = document.getElementById("coachEvalList");
        if(!playerName) return list.innerHTML = '<li class="session-empty" style="font-size:11px;">Select a player above.</li>';
        
        list.innerHTML = '<li class="session-empty" style="font-size:11px;">Loading history...</li>';
        try {
            const q = query(collection(db, "evaluations"), where("teamId", "==", currentCoachTeamId), where("player", "==", playerName));
            const snap = await getDocs(q);
            const evals = [];
            snap.forEach(d => evals.push({ id: d.id, ...d.data() }));
            
            // Sort by newest first
            evals.sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);
            
            if(evals.length === 0) {
                list.innerHTML = '<li class="session-empty" style="font-size:11px;">No evaluations logged yet.</li>';
                return;
            }
            
            list.innerHTML = evals.map(e => `
                <li class="session-item" style="border-left: 4px solid #16a34a;">
                    <div style="flex:1;">
                        <b>${e.skill}</b> <span style="font-weight:bold; color:#16a34a; float:right;">Score: ${e.score}/5</span><br>
                        <span style="font-size:10px; color:#64748b;">${e.timestamp.toDate().toLocaleDateString()} ${e.notes ? ' - ' + e.notes : ''}</span>
                    </div>
                    <button class="delete-btn" style="margin-left:10px;" onclick="window.deleteEval('${e.id}', '${playerName}')">✕</button>
                </li>
            `).join("");
        } catch(err) {
            console.error(err);
            list.innerHTML = '<li class="session-empty" style="color:red; font-size:11px;">Error loading history. Check database rules.</li>';
        }
    };

    safeBind("evalPlayerSelect", "change", (e) => window.loadPlayerEvaluations(e.target.value));

    // 3. Bind the Save Button
    safeBind("saveEvalBtn", "click", async () => {
        try {
            const player = document.getElementById("evalPlayerSelect").value;
            const skill = document.getElementById("evalSkillSelect").value;
            const score = document.getElementById("evalScore").value;
            const notes = document.getElementById("evalNotes").value;
            const tid = currentCoachTeamId;
            
            if(!player || !skill || !score || !tid) return alert("Please select a player, skill, and score.");
            
            await addDoc(collection(db, "evaluations"), { 
                teamId: tid, player: player, skill: skill, score: parseInt(score), notes: notes,
                timestamp: new Date(), coach: auth.currentUser.email
            });
            
            alert("Evaluation Saved!");
            document.getElementById("evalNotes").value = "";
            document.getElementById("evalScore").value = "";
            
            window.loadPlayerEvaluations(player);
        } catch (err) { alert("Database Error: " + err.message); console.error(err); }
    });

    // 4. Global Delete Function
    window.deleteEval = async (id, playerName) => {
        if(confirm("Delete this evaluation?")) {
            await deleteDoc(doc(db, "evaluations", id));
            window.loadPlayerEvaluations(playerName);
        }
    };

    // Helper to remove a staged drill before sending
    window.removeHwDrill = (idx) => {
        window.currentHomeworkBuilder.splice(idx, 1);
        const list = document.getElementById("hwBuilderList");
        if(window.currentHomeworkBuilder.length === 0) {
            list.innerHTML = '<li class="session-empty" style="font-size:11px;">No drills added to this assignment yet.</li>';
        } else {
            list.innerHTML = window.currentHomeworkBuilder.map((item, i) => 
                `<li style="padding:5px; border-bottom:1px solid #eee; font-size:12px; display:flex; justify-content:space-between; align-items:center;">
                    <span><b>${i+1}.</b> ${item.name} <span style="color:#64748b;">(${item.sets}x${item.reps})</span></span>
                    <button class="delete-btn" onclick="window.removeHwDrill(${i})">✕</button>
                </li>`
            ).join("");
        }
    };

    // 4. Bind the Send Assignment Button
    safeBind("assignHwBtn", "click", async () => {
        try {
            const player = document.getElementById("hwPlayerSelect").value;
            const due = document.getElementById("hwDueDate").value;
            const tid = currentCoachTeamId;
            const drills = window.currentHomeworkBuilder;
            
            if(!player || !due || !tid) return alert("Please select a player and due date.");
            if(drills.length === 0) return alert("Please add at least one drill to the assignment.");
            
            // Save the entire array of drills to the database
            await addDoc(collection(db, "assignments"), { 
                teamId: tid, player: player, dueDate: due, status: "active",
                drills: drills 
            });
            
            alert("Homework Assigned!");
            
            // Reset the builder UI
            window.currentHomeworkBuilder = [];
            document.getElementById("hwBuilderList").innerHTML = '<li class="session-empty" style="font-size:11px;">No drills added to this assignment yet.</li>';
            
            loadCoachScheduleAndHW();
            loadHomeDashboard();
        } catch (err) { alert("Database Error: " + err.message); console.error(err); }
    });

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
                initSetupDropdowns(globalTeams);
            }
        } catch (error) { console.error(error); alert("Auth Data Error: " + error.message); }
    } else {
        document.getElementById("loginUI").style.display='flex';
        document.getElementById("appUI").style.display='none';
        document.getElementById("bottomNav").style.display='none';
        document.getElementById("setupUI").style.display='none';
    }
});
