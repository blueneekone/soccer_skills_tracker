import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, where, getDocs, doc, getDoc, setDoc, addDoc, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- BRING IN YOUR MODULES ---
import { dbData } from "./data.js";
import { checkMobileRedirect, handleGoogleLogin, handleEmailLogin, handleEmailSignup, handleLogout, completeUserSetup, initSetupDropdowns } from "./modules/auth.js";
import { addDrillToSession, handleWorkoutSubmit, addToGoogleCalendar, downloadIcsFile, initSignatureCanvas } from "./modules/tracker.js";
import { renderCalendar, renderPlayerTrendChart, renderTeamLeaderboard, renderPlayerTrials, loadPlayerFeedback } from "./modules/stats.js";
import { initCoachDropdown, loadCoachDashboard, loadCoachScheduleAndHW, addAssistant, manualAddPlayer, parsePDF, saveRosterList, exportSessionData, currentCoachTeamId, initStrategyBoard } from "./modules/coach.js";
import { logSystemEvent, renderAdminTables, addTeam, addAdmin, loadLogs, generateSampleLogs, runSecurityScan } from "./modules/admin.js";
import { finalizeChallengeUnlock, setupChallengeCalculators, submitTrialScore } from "./modules/challenges.js";
import { messaging } from "./firebase-config.js";
import { getToken } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";

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

let currentVideoUrl = "";
let globalTeams = [];
let globalAdmins = [DIRECTOR_EMAIL];
let timerInterval, seconds = 0;
let isSignatureBlank = true;
let userProfile = null; 

window.teamWorkouts = [];
window.fetchTeamWorkouts = async (tid) => {
    try {
        if (!tid || tid === "admin" || tid === "misc") { 
            window.teamWorkouts = dbData.foundationSkills; 
        } else {
            const q = query(collection(db, "team_workouts"), where("teamId", "==", tid));
            const snap = await getDocs(q);
            window.teamWorkouts = [];
            snap.forEach(d => window.teamWorkouts.push({ id: d.id, ...d.data() }));
            if(window.teamWorkouts.length === 0) window.teamWorkouts = dbData.foundationSkills;
        }
    } catch(e) { console.error(e); window.teamWorkouts = dbData.foundationSkills; }
};

window.buildCoachDropdowns = () => {
    const hwDrillSelect = document.getElementById("hwDrillSelect");
    if(hwDrillSelect) {
        hwDrillSelect.innerHTML = '<option value="" disabled selected>Select Drill...</option>';
        window.teamWorkouts.forEach(s => {
            const opt = document.createElement("option"); opt.value = s.name; opt.textContent = s.name;
            hwDrillSelect.appendChild(opt);
        });
    }

    const evalSkillSelect = document.getElementById("evalSkillSelect");
    if(evalSkillSelect) {
        evalSkillSelect.innerHTML = '<option value="" disabled selected>Select Skill...</option>';
        window.teamWorkouts.forEach(s => {
            if(s.type !== 'cardio' && s.type !== 'core' && s.type !== 'ball_mastery') {
                const opt = document.createElement("option"); opt.value = s.name; opt.textContent = s.name;
                evalSkillSelect.appendChild(opt);
            }
        });
    }
};
// ==========================================
// 2. CORE NAVIGATION & ROUTING API
// ==========================================

const navs = ['navHome', 'navTrack', 'navStats', 'navTrophy', 'navCoach', 'navAdmin'];
const views = ['viewHome', 'viewTracker', 'viewStats', 'viewTrophy', 'viewCoach', 'viewAdmin', 'viewChallenge'];

// --- 1. NEW NAVIGATION LOGIC ---
    window.navigateTo = (viewId, navId, addToHistory = true) => {
        const views = ['viewHome', 'viewTracker', 'viewStats', 'viewTrophy', 'viewCoach', 'viewAdmin', 'viewChallenge'];
        const navs = ['navHome', 'navTrack', 'navStats', 'navTrophy', 'navCoach', 'navAdmin'];
        
        // Hide all views and remove active classes
        views.forEach(v => document.getElementById(v)?.classList.add('d-none'));
        navs.forEach(n => document.getElementById(n)?.classList.remove('active'));
        
        // Show selected view and highlight nav tab
        document.getElementById(viewId)?.classList.remove('d-none');
        if (navId) document.getElementById(navId)?.classList.add('active');
        
        // Trigger specific data loads if needed
        if(viewId === 'viewStats') loadStats();
        if(viewId === 'viewCoach') loadCoachDashboard(false, globalTeams);
        if(viewId === 'viewAdmin') renderAdminTables(globalTeams, globalAdmins);
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

window.currentCourtType = "soccer";

window.switchTrackerTab = (tabId) => {
    ['trackerWarmup', 'trackerDrills', 'trackerReview'].forEach(id => {
        const pane = document.getElementById(id);
        const btn = document.getElementById(`btn-${id}`);
        if(pane) pane.classList.add('d-none');
        if(btn) btn.classList.remove('active');
    });
    const activePane = document.getElementById(tabId);
    const activeBtn = document.getElementById(`btn-${tabId}`);
    if (activePane) activePane.classList.remove('d-none');
    if (activeBtn) activeBtn.classList.add('active');
};

window.applySportCourt = (courtType, targetMode, targetBgIds, targetLineIds) => {
    let bgCol = "#ffffff", lineCol = targetMode === 'whiteboard' ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.4)";
    if (targetMode !== 'whiteboard') {
        if (courtType === "basketball") bgCol = "#d97706";
        else if (courtType === "football") bgCol = "#15803d";
        else if (courtType === "baseball") bgCol = "#166534";
        else if (courtType === "lacrosse") bgCol = "#2f855a";
        else if (courtType === "generic") bgCol = "#475569";
        else bgCol = "#2f855a"; // soccer
    }

    let linesHtml = "";
    if(courtType === "basketball") {
        linesHtml = `<div style="position: absolute; top:0; bottom:0; left:0; right:0; border: 2px solid ${lineCol}; pointer-events: none;"></div>
<div style="position: absolute; top: 0; bottom: 0; left: 50%; border-left: 2px solid ${lineCol};"></div>
<div style="position: absolute; top: 50%; left: 50%; height: 25%; aspect-ratio: 1; border: 2px solid ${lineCol}; border-radius: 50%; transform: translate(-50%, -50%); pointer-events: none;"></div>
<div style="position: absolute; top: 30%; bottom: 30%; left: 0; width: 25%; border: 2px solid ${lineCol}; border-left: none; pointer-events: none;"></div>
<div style="position: absolute; top: 30%; bottom: 30%; right: 0; width: 25%; border: 2px solid ${lineCol}; border-right: none; pointer-events: none;"></div>
<div style="position: absolute; top: 10%; bottom: 10%; left: 0; width: 35%; border: 2px solid ${lineCol}; border-radius: 0 50% 50% 0; border-left: none; pointer-events: none;"></div>
<div style="position: absolute; top: 10%; bottom: 10%; right: 0; width: 35%; border: 2px solid ${lineCol}; border-radius: 50% 0 0 50%; border-right: none; pointer-events: none;"></div>`;
    } else if(courtType === "football") {
        linesHtml = `<div style="position: absolute; top:0; bottom:0; left:0; right:0; border: 2px solid ${lineCol}; pointer-events: none;"></div>
<div style="position: absolute; top:0; bottom:0; left:12%; border-left: 2px solid ${lineCol}; pointer-events: none;"></div>
<div style="position: absolute; top:0; bottom:0; right:12%; border-right: 2px solid ${lineCol}; pointer-events: none;"></div>
<div style="position: absolute; top:0; bottom:0; left:50%; border-left: 2px solid ${lineCol}; pointer-events: none;"></div>
<div style="position: absolute; top:0; bottom:0; left:31%; border-left: 2px solid ${lineCol}; pointer-events: none;"></div>
<div style="position: absolute; top:0; bottom:0; right:31%; border-right: 2px solid ${lineCol}; pointer-events: none;"></div>`;
    } else if(courtType === "baseball") {
        linesHtml = `<div style="position: absolute; top:0; bottom:0; left:0; right:0; border: 2px solid ${lineCol}; pointer-events: none;"></div>
<div style="position: absolute; bottom: 10%; left: 50%; width: 45%; aspect-ratio: 1; border: 2px solid ${lineCol}; transform: translate(-50%, 50%) rotate(45deg); pointer-events: none;"></div>
<div style="position: absolute; bottom: 35%; left: 50%; width: 8%; aspect-ratio: 1; border: 2px solid ${lineCol}; border-radius: 50%; transform: translate(-50%, 50%); pointer-events: none;"></div>`;
    } else if(courtType === "lacrosse") {
        linesHtml = `<div style="position: absolute; top:0; bottom:0; left:0; right:0; border: 2px solid ${lineCol}; pointer-events: none;"></div>
<div style="position: absolute; top:0; bottom:0; left:50%; border-left: 2px solid ${lineCol}; pointer-events: none;"></div>
<div style="position: absolute; top:0; bottom:0; left:33%; border-left: 2px solid ${lineCol}; pointer-events: none;"></div>
<div style="position: absolute; top:0; bottom:0; right:33%; border-right: 2px solid ${lineCol}; pointer-events: none;"></div>
<div style="position: absolute; top:40%; bottom:40%; left:5%; aspect-ratio: 1; border: 2px solid ${lineCol}; border-radius: 50%; pointer-events: none;"></div>
<div style="position: absolute; top:40%; bottom:40%; right:5%; aspect-ratio: 1; border: 2px solid ${lineCol}; border-radius: 50%; pointer-events: none;"></div>`;
    } else if(courtType === "generic") {
        linesHtml = `<div style="position: absolute; top:0; bottom:0; left:0; right:0; border: 2px solid ${lineCol}; border-radius: 4px; pointer-events: none;"></div>
<div style="position: absolute; top: 0; bottom: 0; left: 50%; border-left: 2px solid ${lineCol};"></div>`;
    } else { // soccer
        linesHtml = `<div style="position: absolute; top:0; bottom:0; left:0; right:0; border: 2px solid ${lineCol}; border-radius: 4px; pointer-events: none;"></div>
<div style="position: absolute; top: 0; bottom: 0; left: 50%; border-left: 2px solid ${lineCol};"></div>
<div style="position: absolute; top: 50%; left: 50%; height: 30%; aspect-ratio: 1; border: 2px solid ${lineCol}; border-radius: 50%; transform: translate(-50%, -50%); pointer-events: none;"></div>
<div style="position: absolute; top: 20%; bottom: 20%; left: 0; width: 15%; border: 2px solid ${lineCol}; border-left: none; pointer-events: none;"></div>
<div style="position: absolute; top: 20%; bottom: 20%; right: 0; width: 15%; border: 2px solid ${lineCol}; border-right: none; pointer-events: none;"></div>`;
    }

    targetBgIds.forEach(id => { const el = document.getElementById(id); if(el) el.style.backgroundColor = bgCol; });
    targetLineIds.forEach(id => { const el = document.getElementById(id); if(el) el.innerHTML = linesHtml; });
};

async function applyTeamBranding(teamId) {
    if(!teamId) return;
    try {
        const snap = await getDoc(doc(db, "config", `branding_${teamId}`));
        let ct = "soccer";
        if(snap.exists()) {
            const data = snap.data();
            if(data.primaryColor) document.documentElement.style.setProperty('--aggie-blue', data.primaryColor);
            if(data.secondaryColor) document.documentElement.style.setProperty('--aggie-gold', data.secondaryColor);
            if(data.appName && data.appName.trim() !== "") {
                document.title = data.appName;
                document.querySelectorAll('.app-title, .auth-title').forEach(el => el.innerText = data.appName);
            }
            if(data.logoUrl && data.logoUrl.trim() !== "") {
                document.querySelectorAll('.logo-circle').forEach(el => {
                    el.innerHTML = `<img src="${data.logoUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
                    el.style.border = `4px solid ${data.secondaryColor || 'var(--aggie-gold)'}`;
                });
            }
            ct = data.courtType || "soccer";
        }
        window.currentCourtType = ct;
        const styleToggle = document.getElementById("strategyBoardStyleToggle");
        const strategyMode = (styleToggle && styleToggle.checked) ? 'whiteboard' : 'realistic';
        window.applySportCourt(ct, strategyMode, ["strategyPitchBg"], ["strategyPitchLines"]);
        window.applySportCourt(ct, 'realistic', ["gamedayPitchBg"], ["gamedayPitchLines"]);
    } catch(e) { console.error("Error applying branding", e); }
}

async function requestPushPermissions(userEmail) {
    if (!('Notification' in window)) return;
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            // Note: A VAPID key is required to actually get a token for FCM Web Push.
            // const token = await getToken(messaging, { vapidKey: 'YOUR_PUBLIC_VAPID_KEY_HERE' });
            // if(token) { await setDoc(doc(db, "users", userEmail), { fcmToken: token }, { merge: true }); }
            console.log("Notification permission granted. Ready for VAPID key insertion.");
        }
    } catch(e) { console.warn("FCM Error:", e); }
}

async function fetchConfig() {
    try {
        const d = await getDoc(doc(db, "config", "teams"));
        const tList = d.exists() ? d.data().list : null;
        globalTeams = (tList && tList.length > 0) ? tList : (typeof dbData !== 'undefined' ? dbData.teams : []);
        
        const a = await getDoc(doc(db, "config", "admins"));
        const aList = a.exists() ? a.data().list : null;
        globalAdmins = (aList && aList.length > 0) ? aList : [DIRECTOR_EMAIL];
    } catch(e) { 
        if(typeof dbData !== 'undefined') globalTeams = dbData.teams; 
    }
    
    const ts = document.getElementById("teamSelect");
    if(ts) {
        ts.innerHTML = '<option value="" disabled selected>Select Team...</option>';
        globalTeams.forEach(t => { const o=document.createElement("option"); o.value=t.id; o.textContent=t.name; ts.appendChild(o); });
    }
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

    window.teamWorkouts.forEach(s => {
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
        renderAdminTables(globalTeams, globalAdmins);
    } else if (myTeams.length > 0) {
        document.getElementById("navCoach").style.display='flex';
        if(document.getElementById("btnHomeCoach")) document.getElementById("btnHomeCoach").style.display='block';
        initCoachDropdown(false, myTeams, loadHomeDashboard);
    }
}

// Tracker Functions
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
        const monthlyXpMap = {};
        
        snap.forEach(d => { 
            const data = d.data();
            logs.push(data); 
            const mins = Number(data.minutes || 0);
            totalMins += mins; 
            
            if (!data.timestamp) return;
            const date = new Date(data.timestamp.seconds * 1000);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            
            if(!monthlyXpMap[monthKey]) monthlyXpMap[monthKey] = { mins: 0, workouts: 0 };
            monthlyXpMap[monthKey].mins += mins;
            monthlyXpMap[monthKey].workouts++;
        });
        logs.sort((a,b) => b.timestamp.seconds - a.timestamp.seconds);
        
        setText("statTotal", `${logs.length} ${userProfile.role === 'admin' ? "Club Workouts" : "All-Time Sessions"}`);
        setText("statTime", totalMins);
        
        let maxMonthlyXp = 0;
        for (const key in monthlyXpMap) {
            const mXp = monthlyXpMap[key].mins + (monthlyXpMap[key].workouts * 10);
            if (mXp > maxMonthlyXp) maxMonthlyXp = mXp;
        }

        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
        const currentM = monthlyXpMap[currentMonthKey] || { mins: 0, workouts: 0 };
        
        let xp = currentM.mins + (currentM.workouts * 10); // current month xp
        let lvl = "ROOKIE"; 

        // --- LEVEL CAP & PROGRESSION LOGIC ---
        const approved = userProfile.approvedLevels || {};
        let isCapped = false;

        if (xp >= 3000) {
            if (approved.legend) { lvl = "LEGEND"; } else { lvl = "PRO"; isCapped = true; }
        } else if (xp >= 2000) {
            if (approved.pro) { lvl = "PRO"; } else { lvl = "VETERAN"; isCapped = true; }
        } else if (xp >= 1000) {
            if (approved.veteran) { lvl = "VETERAN"; } else { lvl = "STARTER"; isCapped = true; }
        } else if (xp >= 500) {
            if (approved.starter) { lvl = "STARTER"; } else { lvl = "ROOKIE"; isCapped = true; }
        } else if (xp >= 250) {
            if (!approved.midRookie) { isCapped = true; }
        }
        
        const warningEl = document.getElementById("pendingEvalWarning");
        if(warningEl) {
            if(isCapped && userProfile.role !== 'admin') warningEl.classList.remove("d-none");
            else warningEl.classList.add("d-none");
        }

      // --- CHALLENGE DASHBOARD & BANNER UNLOCK LOGIC ---
        const challengeDashBtn = document.getElementById("btnHomeChallenge");
        const challengeBanner = document.getElementById("challenge250Banner");
        
        // 1. Unhide the permanent Dashboard Grid Button if they have >= 250 XP
        if (challengeDashBtn) {
            if (xp >= 250 && userProfile.role !== 'admin') {
                challengeDashBtn.classList.remove("d-none");
            } else {
                challengeDashBtn.classList.add("d-none");
            }
        }

        // 2. The "Boss Fight" Trigger: Show the aggressive banner ONLY if they haven't beaten it yet
        if (challengeBanner) {
            if (xp >= 250 && !userProfile.hasViewedBasicsChallenge && userProfile.role !== 'admin') {
                challengeBanner.classList.remove("d-none");
            } else {
                challengeBanner.classList.add("d-none");
            }
        }

        const bStarter = document.getElementById("badgeStarter");
        const bVeteran = document.getElementById("badgeVeteran");
        const bPro = document.getElementById("badgePro");
        const bLegend = document.getElementById("badgeLegend");
        const certBtn = document.getElementById("claimCertificateBtn");

        if(bStarter) { bStarter.classList.add("medal-locked"); }
        if(bVeteran) { bVeteran.classList.add("medal-locked"); }
        if(bPro) { bPro.classList.add("medal-locked"); }
        if(bLegend) { bLegend.classList.add("medal-locked"); }
        if(certBtn) certBtn.style.display = "none";

        if(lvl === "STARTER" || lvl === "VETERAN" || lvl === "PRO" || lvl === "LEGEND") { if(bStarter) { bStarter.classList.remove("medal-locked"); } }
        if(lvl === "VETERAN" || lvl === "PRO" || lvl === "LEGEND") { if(bVeteran) { bVeteran.classList.remove("medal-locked"); } }
        if(lvl === "PRO" || lvl === "LEGEND") { if(bPro) { bPro.classList.remove("medal-locked"); } }
        if(lvl === "LEGEND") { 
            if(bLegend) { bLegend.classList.remove("medal-locked"); }
            if(certBtn && userProfile.role !== 'admin') certBtn.style.display = "block"; 
        }

        // --- MILESTONE BADGES ---
        let has7DayStreak = false;
        if (logs.length > 0) {
            let streak = 1;
            let lastDate = new Date(logs[0].timestamp.seconds * 1000);
            lastDate.setHours(0,0,0,0);
            for(let i=1; i<logs.length; i++) {
                if(!logs[i].timestamp) continue;
                let d = new Date(logs[i].timestamp.seconds * 1000);
                d.setHours(0,0,0,0);
                let diff = Math.round((lastDate - d) / (1000 * 60 * 60 * 24));
                if (diff === 1) { streak++; lastDate = d; }
                else if (diff > 1) { break; }
            }
            if(streak >= 7) has7DayStreak = true;
        }

        const b7Day = document.getElementById("badge7Day");
        if(b7Day) { b7Day.classList.toggle("medal-locked", !has7DayStreak); }
        
        const b100S = document.getElementById("badge100Sessions");
        if(b100S) { b100S.classList.toggle("medal-locked", logs.length < 100); }
        
        const b1000M = document.getElementById("badge1000Mins");
        if(b1000M) { b1000M.classList.toggle("medal-locked", totalMins < 1000); }

        if (typeof buildDropdowns === "function") buildDropdowns(maxMonthlyXp);

        if (userProfile.role !== 'admin') {
            setText("userLevelDisplay", lvl);
            const bar = document.getElementById("xpBar"); 
            
            if(bar) {
                let pct = 0;
                if(xp < 500) { pct = (xp / 500) * 100; } 
                else if(xp < 1000) { pct = ((xp - 500) / 500) * 100; } 
                else if(xp < 2000) { pct = ((xp - 1000) / 1000) * 100; } 
                else if(xp < 3000) { pct = ((xp - 2000) / 1000) * 100; } 
                else { pct = 100; }
                bar.style.width = `${Math.min(pct, 100)}%`;
            }
        }

        renderCalendar(logs);
        renderPlayerTrendChart(logs);
        renderTeamLeaderboard(userProfile.role === 'admin' ? null : userProfile.teamId, logs);
        renderPlayerTrials(userProfile.playerName);
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

// ==========================================
// 4. MAIN INIT & UI LOGIC
// ==========================================

window.switchTrackerTab = (tabId) => {
    ['trackerWarmup', 'trackerDrills', 'trackerReview'].forEach(id => {
        const pane = document.getElementById(id);
        const btn = document.getElementById(`btn${id.charAt(0).toUpperCase() + id.slice(1)}`);
        if(pane) pane.classList.add('d-none');
        if(btn) btn.classList.remove('active');
    });
    document.getElementById(tabId).classList.remove('d-none');
    document.getElementById(`btn${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`).classList.add('active');
};

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
    initStrategyBoard();

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
            loadStats(); 
        }
    }));
    safeBind("btnGCal", "click", addToGoogleCalendar);
    safeBind("btnIcs", "click", downloadIcsFile);

    safeBind("btnOpenTrophyModal", "click", () => {
        window.navigateTo('viewStats', 'navStats');
        setTimeout(() => window.scrollTo({ top: 150, behavior: 'smooth' }), 100);
    });

    buildDropdowns(0);

const getEmbedUrl = (url) => {
        if (!url) return "";
        const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
        return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : url;
    };

    const showDrillInfo = (drillName) => {
        const s = window.teamWorkouts.find(x => x.name === drillName);
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

    safeBind("addTeamWorkoutBtn", "click", window.addTeamWorkout);
    safeBind("syncDefaultWorkoutsBtn", "click", window.syncDefaultWorkouts);
    safeBind("leaderboardFilter", "change", loadStats);

    safeBind("selectCore", "change", (e) => showDrillInfo(e.target.value));
    safeBind("selectBallWork", "change", (e) => showDrillInfo(e.target.value));
    safeBind("selectBasics", "change", (e) => showDrillInfo(e.target.value));

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

    safeBind("btnPrintStats", "click", () => {
        document.body.classList.add("printing-stats");
        window.print();
        setTimeout(() => document.body.classList.remove("printing-stats"), 1000);
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
    
    safeBind("addTeamBtn", "click", () => addTeam(globalTeams, () => renderAdminTables(globalTeams, globalAdmins)));
    safeBind("addAdminBtn", "click", () => addAdmin(globalAdmins, () => renderAdminTables(globalTeams, globalAdmins)));
    safeBind("btnLogSystem", "click", () => loadLogs("logs_system"));
    safeBind("btnLogSecurity", "click", runSecurityScan);
    safeBind("generateTestLogBtn", "click", generateSampleLogs);

// --- SCHEDULE & HOMEWORK BINDINGS ---

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

    window.currentHomeworkBuilder = []; 

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

    window.loadPlayerEvaluations = async (playerName) => {
        const list = document.getElementById("coachEvalList");
        if(!playerName) return list.innerHTML = '<li class="session-empty" style="font-size:11px;">Select a player above.</li>';
        
        list.innerHTML = '<li class="session-empty" style="font-size:11px;">Loading history...</li>';
        try {
            const q = query(collection(db, "evaluations"), where("teamId", "==", currentCoachTeamId), where("player", "==", playerName));
            const snap = await getDocs(q);
            const evals = [];
            snap.forEach(d => evals.push({ id: d.id, ...d.data() }));
            
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

    window.deleteEval = async (id, playerName) => {
        if(confirm("Delete this evaluation?")) {
            await deleteDoc(doc(db, "evaluations", id));
            window.loadPlayerEvaluations(playerName);
        }
    };

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

    safeBind("assignHwBtn", "click", async () => {
        try {
            const selectedPlayers = Array.from(document.querySelectorAll(".hw-player-cb:checked")).map(cb => cb.value);
            const due = document.getElementById("hwDueDate").value;
            const tid = currentCoachTeamId;
            const drills = window.currentHomeworkBuilder;
            
            if(selectedPlayers.length === 0 || !due || !tid) return alert("Please select player(s) and due date.");
            if(drills.length === 0) return alert("Please add at least one drill to the assignment.");
            
            await Promise.all(selectedPlayers.map(player => 
                addDoc(collection(db, "assignments"), { 
                    teamId: tid, player: player, dueDate: due, status: "active",
                    drills: drills 
                })
            ));
            
            alert("Homework Assigned!");
            
            window.currentHomeworkBuilder = [];
            document.getElementById("hwBuilderList").innerHTML = '<li class="session-empty" style="font-size:11px;">No drills added to this assignment yet.</li>';
            
            loadCoachScheduleAndHW();
            loadHomeDashboard();
        } catch (err) { alert("Database Error: " + err.message); console.error(err); }
    });

// --- MODAL & POPUP CLOSE BUTTONS ---
    document.querySelectorAll(".close-btn").forEach(b => {
        b.onclick = () => {
            document.querySelectorAll(".modal").forEach(m => m.style.display = 'none');
            const videoPlayer = document.getElementById("videoPlayer");
            if (videoPlayer) videoPlayer.src = "";
            const drillInfoBox = document.getElementById("drillInfoBox");
            if (drillInfoBox) drillInfoBox.style.display = 'none';
        }
    });

// --- CHALLENGES MODULE BINDINGS ---
    setupChallengeCalculators(); 

    safeBind("challenge250Banner", "click", () => {
        document.getElementById("vidIntro").src = "https://www.youtube.com/embed/Cmd3CzHv2Mc"; 
        document.getElementById("vidCh1").src = "https://www.youtube.com/embed/QytqZ-zieSc"; 
        document.getElementById("vidCh2").src = "https://www.youtube.com/embed/p-75lxTdksg"; 
        document.getElementById("vidCh3").src = "https://www.youtube.com/embed/u51A9mWPBXo"; 
        
        document.getElementById("stepIntro").classList.remove("d-none");
        document.getElementById("stepCh1").classList.add("d-none");
        document.getElementById("challengeModal").style.display = "block";
    });

    safeBind("imReadyBtn", "click", () => finalizeChallengeUnlock(userProfile, getEmbedUrl));
    
    safeBind("btnHomeChallenge", "click", () => {
        if (!userProfile.hasViewedBasicsChallenge) {
            document.getElementById("challenge250Banner").click(); 
        } else {
            window.navigateTo('viewChallenge', null); 
        }
    });

    safeBind("submitPassBtn", "click", () => submitTrialScore('Passing', userProfile));
    safeBind("submitShotBtn", "click", () => submitTrialScore('Shooting', userProfile));
    safeBind("submitTimeBtn", "click", () => submitTrialScore('Time', userProfile));
    safeBind("coachSubmitTrialBtn", "click", window.submitCoachTrial);
    
// ==========================================
// COACH STOPWATCH LOGIC
// ==========================================
    let swInterval = null;
    let swStartTime = 0;
    let swElapsedTime = 0;
    let swLapCount = 0;

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
            }, 10); 
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
        if(laps) laps.innerHTML = ""; 
    });

    safeBind("btnSwLap", "click", () => {
        if(swElapsedTime === 0) return; 
        swLapCount++;
        const laps = document.getElementById("lapList");
        if(laps) {
            const li = document.createElement("li");
            li.style.cssText = "padding: 8px 5px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between;";
            li.innerHTML = `<strong>Lap ${swLapCount}</strong> <span style="font-family:monospace; font-weight:bold; color:var(--aggie-blue);">${formatTime(swElapsedTime)}</span>`;
            laps.prepend(li); 
        }
    });
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
                
                // Apply team branding specifically for this user's team or admin view
                await applyTeamBranding(userProfile.teamId);
                
                // Initialize text values first
                setText("coachName", user.email);
                setText("activePlayerName", userProfile.playerName);
                setText("homePlayerName", userProfile.playerName.split(" ")[0]);
                if(document.getElementById("homePlayerName")) {
                    setText("homePlayerName", userProfile.playerName.split(" ")[0]);
                }
                
                // Fetch push notification permissions
                requestPushPermissions(user.email);
                
                // Fetch workouts first
                await window.fetchTeamWorkouts(userProfile.teamId);
                window.buildCoachDropdowns();

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
