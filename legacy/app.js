// app.js
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- BRING IN YOUR MODULES ---
import { checkMobileRedirect, handleGoogleLogin, handleEmailLogin, handleEmailSignup, handleLogout, completeUserSetup, initSetupDropdowns } from "./modules/auth.js";
import { addDrillToSession, handleWorkoutSubmit, addToGoogleCalendar, downloadIcsFile, initSignatureCanvas } from "./modules/tracker.js";
import { initDirectorModule } from "./modules/director.js";
import { initCoachDropdown, loadCoachDashboard, currentCoachTeamId, initStrategyBoard, loadCoachScheduleAndHW, initSpatialScheduler, manualAddPlayer } from "./modules/coach.js";
import { renderAdminTables, addAdmin, addClub, addTeam } from "./modules/admin.js";
import { applyTeamBranding } from "./modules/branding.js";
import { initPassportCanvas, loadPlayerPassport, savePlayerPassport } from "./modules/passport.js";

// --- SIDE-EFFECT & DYNAMIC IMPORTS ---
import { setupChallengeCalculators, submitTrialScore } from "./modules/challenges.js";
import { loadStatsDashboard } from "./modules/stats.js"; 

let globalTeams = [];
let globalAdmins = [];
let userProfile = null;

window.globalClubs = [];
window.globalStatsLogs = [];
window.Workouts = [];

// ==========================================
// 0. UI HELPER FUNCTIONS
// ==========================================
const safeBind = (id, event, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, fn);
};

const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
};

// ==========================================
// 1. ENTERPRISE "SMART CONTEXT"
// ==========================================
window.getAppContext = () => {
    if (!userProfile) return { tid: null, cid: null, role: 'guest' };
    const effectiveTid = (userProfile.role === 'super_admin' || userProfile.role === 'director')
        ? (currentCoachTeamId || "aggiesfc")
        : userProfile.teamId;
    return {
        tid: effectiveTid,
        cid: userProfile.clubId || "aggiesfc",
        role: userProfile.role,
        playerName: userProfile.playerName
    };
};

window.fetchWorkouts = async () => {
    try {
        const { tid } = window.getAppContext();
        if (!tid) {
            window.Workouts = [];
        } else {
            const q = query(collection(db, "team_workouts"), where("teamId", "==", tid));
            const snap = await getDocs(q);
            window.Workouts = [];
            snap.forEach(d => window.Workouts.push({ id: d.id, ...d.data() }));
        }
    } catch (e) { console.error("Fetch Workouts Error:", e); window.Workouts = []; }
};

window.buildCoachDropdowns = () => {
    const hwDrillSelect = document.getElementById("hwDrillSelect");
    if (hwDrillSelect) {
        hwDrillSelect.innerHTML = '<option value="" disabled selected>Select Drill...</option>';
        window.Workouts.forEach(s => {
            const opt = document.createElement("option"); opt.value = s.name; opt.textContent = s.name;
            hwDrillSelect.appendChild(opt);
        });
    }
    const evalSkillSelect = document.getElementById("evalSkillSelect");
    if (evalSkillSelect) {
        evalSkillSelect.innerHTML = '<option value="" disabled selected>Select Skill...</option>';
        window.Workouts.forEach(s => {
            if (s.type !== 'cardio' && s.type !== 'core' && s.type !== 'ball_mastery') {
                const opt = document.createElement("option"); opt.value = s.name; opt.textContent = s.name;
                evalSkillSelect.appendChild(opt);
            }
        });
    }

    const populate = (id, type) => {
        const el = document.getElementById(id);
        if (!el) return;
        const filtered = window.Workouts.filter(w => w.type === type);
        el.innerHTML = '<option value="" disabled selected>Select Workout...</option>' + 
                       filtered.map(w => `<option value="${w.name}">${w.name}</option>`).join("");
    };
    
    populate("selectWarmup", "cardio");
    populate("selectCore", "core");
    populate("selectBallWork", "ball_mastery");
    populate("selectBasics", "foundation");
};

// ==========================================
// 2. SECURE CORE ROUTING API
// ==========================================
window.navigateTo = (viewId, addToHistory = true) => {
    const role = userProfile? userProfile.role : 'guest';

    if (viewId === 'viewAdmin' && role!== 'super_admin') {
        alert("Unauthorized Access: Super Admin required.");
        return window.navigateTo('viewHome', false);
    }
    if (viewId === 'viewDirector' && role!== 'super_admin' && role!== 'director') {
        alert("Unauthorized Access: Director required.");
        return window.navigateTo('viewHome', false);
    }
    if (viewId === 'viewCoach' && (role === 'player' || role === 'parent')) {
        alert("Unauthorized Access: Coach credentials required.");
        return window.navigateTo('viewHome', false);
    }

    document.querySelectorAll(".close-btn").forEach(b => {
        b.onclick = () => {
            document.querySelectorAll(".modal").forEach(m => m.classList.add("d-none"));
            const vp = document.getElementById("videoPlayer");
            if(vp) vp.src = "";
        }
    });

    document.querySelectorAll('.view-section').forEach(v => v.classList.add('d-none'));
    const targetEl = document.getElementById(viewId);
    if (targetEl) targetEl.classList.remove('d-none');

// 🟢 FIX: Added viewPassport to the resize trigger
if (viewId === 'viewTracker' ||
    viewId === 'viewCoach' ||
    viewId === 'viewChallenge' ||
    viewId === 'viewPassport') {
        setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
    }

    if (viewId === 'viewStats') {
        const { tid, playerName } = window.getAppContext();
        loadStatsDashboard(tid, playerName, userProfile);
    }

    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    const navId = viewId.replace('view', 'nav').replace('Tracker', 'Track');
    const activeNav = document.getElementById(navId);
    if (activeNav) activeNav.classList.add('active');

    if (addToHistory === true) {
        history.pushState({ view: viewId }, '', `#${viewId}`);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ==========================================
// 3. SECURE CONFIGURATION FETCH
// ==========================================
/** @param {string | undefined} [claimRoleFromToken] Custom-claim role from getIdTokenResult; if omitted, resolved from auth (no force refresh). */
async function fetchConfig(claimRoleFromToken) {
    try {
        let claimRole = claimRoleFromToken;
        if (claimRole === undefined || claimRole === null) {
            if (auth.currentUser) {
                const tr = await auth.currentUser.getIdTokenResult(false);
                claimRole = tr.claims.role || "player";
            } else {
                claimRole = "player";
            }
        }

        const clubsSnap = await getDocs(collection(db, "clubs"));
        window.globalClubs = [];
        clubsSnap.forEach(d => window.globalClubs.push(d.data()));

        const teamsColSnap = await getDocs(collection(db, "teams"));
        globalTeams = [];
        teamsColSnap.forEach(d => globalTeams.push({ id: d.id, ...d.data() }));

        globalAdmins = [];
        if (claimRole === "super_admin") {
            const adminsSnap = await getDocs(query(collection(db, "users"), where("role", "==", "super_admin")));
            adminsSnap.forEach((d) => globalAdmins.push(d.id));
        }
    } catch (e) {
        console.error("Config fetch error:", e);
        globalTeams = [];
        globalAdmins = [];
    }
}

// ==========================================
// 4. ROLE & DASHBOARD MANAGEMENT
// ==========================================
function checkRoles(user) {
    if (!userProfile) return;
    const email = user.email.toLowerCase();
    if (userProfile.role === 'super_admin') {
        const adminBtn = document.getElementById("btnHomeAdmin");
        const dirBtn = document.getElementById("btnHomeDirector");
        if (adminBtn) adminBtn.classList.remove("d-none");
        if (dirBtn) dirBtn.classList.remove("d-none");
        renderAdminTables(window.globalClubs, globalTeams, globalAdmins, email, userProfile.role);
    } else if (userProfile.role === 'director') {
        const dirBtn = document.getElementById("btnHomeDirector");
        if (dirBtn) dirBtn.classList.remove("d-none");
    }

    const myTeams = globalTeams.filter(t => {
        const isHead = (t.coachEmail || "").toLowerCase() === email;
        const isAsst = (t.assistants || []).some(a => (a || "").toLowerCase() === email);
        return isHead || isAsst;
    });

    const hasCoachAccess = myTeams.length > 0 || userProfile.role === 'super_admin' || userProfile.role === 'director';
    if (hasCoachAccess) {
        const coachBtn = document.getElementById("btnHomeCoach");
        if (coachBtn) coachBtn.classList.remove("d-none");
        const teamsToPass = (userProfile.role === 'super_admin' || userProfile.role === 'director') ? globalTeams : myTeams;
        initCoachDropdown(true, teamsToPass, loadHomeDashboard);
    }
}

async function loadHomeDashboard() {
    if (!userProfile) return;
    const { tid, playerName, role } = window.getAppContext();

    const schedList = document.getElementById("homeScheduleList");
    if (schedList) {
        if (!tid) schedList.innerHTML = "<li class='session-empty'>Select a team to view schedule.</li>";
        else {
            schedList.innerHTML = "<li class='session-empty'>Loading schedule...</li>";
            const q = query(collection(db, "schedules"), where("teamId", "==", tid));
            const snap = await getDocs(q);
            const events = [];
            snap.forEach(d => events.push({ id: d.id, ...d.data() }));
            events.sort((a, b) => a.date.localeCompare(b.date));
            schedList.innerHTML = events.map(e => `<li class="session-item">
                <div><b style="color:var(--aggie-blue);">${e.type}</b>: ${e.location}<br>
                <span style="font-size:11px; color:#64748b;">${e.date} @ ${e.time}</span></div></li>`).join("") || "<li class='session-empty'>No upcoming events.</li>";
        }
    }

    const hwList = document.getElementById("homeHomeworkList");
    if (hwList) {
        if (role === 'super_admin' || role === 'director') {
            hwList.innerHTML = "<li class='session-empty' style='color:#ea580c;'>Admins don't receive personal homework.</li>";
        } else {
            hwList.innerHTML = "<li class='session-empty'>Loading assignments...</li>";
            const q2 = query(collection(db, "assignments"), where("player", "==", playerName));
            const snap2 = await getDocs(q2);
            let html = "";
            snap2.forEach(d => {
                const hw = d.data();
                if (hw.status === "active") {
                    let drillSummary = Array.isArray(hw.drills) ? hw.drills.map(dr => `• ${dr.name} <span style="color:#64748b;">(${dr.sets}x${dr.reps})</span>`).join("<br>") : hw.drill;
                    html += `<li class="session-item" style="border-left: 4px solid #ea580c; align-items: flex-start;">
                        <div style="flex:1;">
                            <span style="font-size:11px; color:#ea580c; font-weight:bold; text-transform:uppercase;">Due: ${hw.dueDate}</span><br>
                            <div style="font-size:13px; margin-top:4px; line-height:1.4;">${drillSummary}</div>
                        </div>
                        <button class="action-btn action-complete-hw" data-id="${d.id}" style="background:#16a34a; padding:8px 12px; margin-top:10px;">Done</button>
                    </li>`;
                }
            });
            hwList.innerHTML = html || "<li class='session-empty'>No active assignments!</li>";
        }
    }
}

// ==========================================
// 5. GLOBAL EVENT DELEGATION & INIT
// ==========================================
const initApp = () => {
    checkMobileRedirect();

    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.view) window.navigateTo(event.state.view, false); 
        else window.navigateTo('viewHome', false);
    });

    window.addEventListener('profileSetupComplete', async (e) => {
        const newProfileData = e.detail;
        const tokenResult = await auth.currentUser.getIdTokenResult(true);
        const claimRole = tokenResult.claims.role || 'player';
        userProfile = {
            ...(userProfile || {}),
            ...newProfileData,
            role: newProfileData.role || claimRole
        };

        document.getElementById("setupUI").classList.add("d-none");
        document.getElementById("appUI").classList.remove("d-none");

        const displayName = userProfile.playerName ||
            (userProfile.role
                ? userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)
                : 'Player');
        setText("activePlayerName", displayName);
        setText("homePlayerName", (displayName || "").split(" ")[0] || displayName);
        
        if (userProfile.teamId!== "admin" && typeof applyTeamBranding!== 'undefined') {
            await applyTeamBranding(userProfile.teamId);
        }
        if (window.fetchWorkouts) await window.fetchWorkouts();
        if (window.buildCoachDropdowns) window.buildCoachDropdowns();
        if (typeof loadHomeDashboard!== 'undefined') loadHomeDashboard();
        if (typeof checkRoles!== 'undefined') checkRoles(auth.currentUser);
        
        history.replaceState({ view: 'viewHome' }, '', '#viewHome');
        window.navigateTo('viewHome', false);
    });

    safeBind('headerHomeLink', 'click', () => window.navigateTo('viewHome'));
    ['navHome', 'navTrack', 'navStats', 'navTrophy', 'navCoach', 'navAdmin'].forEach((nid, i) => {
        safeBind(nid, "click", () => window.navigateTo(['viewHome', 'viewTracker', 'viewStats', 'viewTrophy', 'viewCoach', 'viewAdmin', 'viewChallenge'][i]));
    });

    safeBind("loginGoogleBtn", "click", handleGoogleLogin);
    safeBind("loginEmailBtn", "click", handleEmailLogin);
    safeBind("signupEmailBtn", "click", handleEmailSignup);
    safeBind("appLogoutBtn", "click", handleLogout);
    safeBind("setupLogoutBtn", "click", handleLogout);
    safeBind("completeSetupBtn", "click", completeUserSetup);

    safeBind("btnHomeStart", "click", () => window.navigateTo('viewTracker'));
    safeBind("btnHomeStats", "click", () => window.navigateTo('viewStats'));
    safeBind("btnHomeCoach", "click", () => window.navigateTo('viewCoach'));
    safeBind("btnHomeAdmin", "click", () => window.navigateTo('viewAdmin'));
    safeBind("btnHomeDirector", "click", () => window.navigateTo('viewDirector'));
    safeBind("btnOpenTrophyModal", "click", () => window.navigateTo('viewTrophy'));
    safeBind("btnHomePassport", "click", () => { window.navigateTo('viewPassport'); loadPlayerPassport(); });
    safeBind("savePassportBtn", "click", savePlayerPassport);
    
    safeBind("addClubBtn", "click", () => addClub(window.globalClubs, fetchConfig));
    safeBind("addAdminBtn", "click", () => addAdmin(globalAdmins, () => { fetchConfig(); renderAdminTables(window.globalClubs, globalTeams, globalAdmins, auth.currentUser.email, userProfile.role); }));
    safeBind("addTeamBtn", "click", () => addTeam(window.globalClubs, globalTeams, fetchConfig));

    safeBind("btnOpenSupport", "click", () => document.getElementById("supportModal").classList.remove("d-none"));
    safeBind("closeSupportBtn", "click", () => document.getElementById("supportModal").classList.add("d-none"));

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

    safeBind("coachAddPlayerBtn", "click", async () => {
        await manualAddPlayer(() =>
            loadCoachDashboard(true, globalTeams, loadHomeDashboard),
        );
    });

    const bindTrackerBtn = (btnId, selectId, setsId, repsId) => {
        safeBind(btnId, "click", () => {
            const selectEl = document.getElementById(selectId);
            const name = selectEl ? selectEl.value : "";
            if (!name || name === "Select Workout...") return alert("Please select a drill first.");
            const sets = document.getElementById(setsId) ? document.getElementById(setsId).value : "";
            const reps = document.getElementById(repsId) ? document.getElementById(repsId).value : "";
            addDrillToSession({ name, sets: sets || 1, reps: reps || 1 });
        });
    };

    bindTrackerBtn("addWarmupBtn", "selectWarmup", "cardioDist", "cardioTime");
    bindTrackerBtn("addCoreBtn", "selectCore", "setsCore", "repsCore");
    bindTrackerBtn("addBallWorkBtn", "selectBallWork", "setsBall", "repsBall");
    bindTrackerBtn("addBasicsBtn", "selectBasics", "setsBasics", "repsBasics");
       safeBind("btnGCal", "click", addToGoogleCalendar);
    safeBind("btnIcs", "click", downloadIcsFile);
    
    setupChallengeCalculators(); // Initializes the dynamic math for Challenge Mode
    safeBind("submitPassBtn", "click", () => submitTrialScore('Passing', userProfile));
    safeBind("submitShotBtn", "click", () => submitTrialScore('Shooting', userProfile));
    safeBind("submitTimeBtn", "click", () => submitTrialScore('Time', userProfile));


    safeBind("submitWorkoutBtn", "click", () => handleWorkoutSubmit(userProfile, globalTeams, () => window.navigateTo('viewHome')));

    document.body.addEventListener("click", async (e) => {
        const target = e.target;
        const tab = target.closest('.admin-tab, .director-tab, .coach-tab-btn');
        if (tab && !tab.id.startsWith('btn-coachTab')) { 
            const isAdmin = tab.classList.contains('admin-tab');
            const tabClass = isAdmin ? '.admin-tab' : '.director-tab';
            const paneClass = isAdmin ? '.admin-pane' : '.director-pane';
            
            document.querySelectorAll(tabClass).forEach(b => b.classList.remove('active'));
            document.querySelectorAll(paneClass).forEach(p => p.classList.add('d-none'));
            
            tab.classList.add('active');
            const targetId = tab.getAttribute('data-target');
            if (document.getElementById(targetId)) document.getElementById(targetId).classList.remove('d-none');
            if (targetId === 'dir-section-compliance') {
                import("./modules/director.js").then((module) => {
                    if (module.loadComplianceDashboard) module.loadComplianceDashboard(db, userProfile.clubId);
                });
            }
        }

        if (target.classList.contains("action-complete-hw")) {
            const id = target.getAttribute("data-id");
            target.innerText = "Saving..."; target.disabled = true;
            await updateDoc(doc(db, "assignments", id), { status: "completed" });
            target.closest("li").style.opacity = "0.5"; target.innerText = "✔ Done";
        }
        if (target.classList.contains("action-remove-hw-drill")) {
            const idx = parseInt(target.getAttribute("data-index"));
            window.currentHomeworkBuilder.splice(idx, 1);
            const list = document.getElementById("hwBuilderList");
            if (window.currentHomeworkBuilder.length === 0) list.innerHTML = '<li class="session-empty">No drills added.</li>';
            else list.innerHTML = window.currentHomeworkBuilder.map((item, i) => `<li style="padding:5px; border-bottom:1px solid #eee; font-size:12px; display:flex; justify-content:space-between; align-items:center;"><span><b>${i + 1}.</b> ${item.name}</span><button class="delete-btn action-remove-hw-drill" data-index="${i}">✕</button></li>`).join("");
        }
    });

    initSignatureCanvas();
    initPassportCanvas();
    initStrategyBoard();
    if(typeof initSpatialScheduler === 'function') initSpatialScheduler();
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initApp);
else initApp();

// ==========================================
// 6. AUTH STATE MONITOR
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById("loginUI").classList.add("d-none");
        document.getElementById("setupUI").classList.add("d-none");
        document.getElementById("appUI").classList.add("d-none");

        try {
            const tokenResult = await user.getIdTokenResult(true);
            const userRole = tokenResult.claims.role || 'player'; 

            await fetchConfig(userRole);
            
            const userRef = doc(db, "users", user.email.toLowerCase());
            const userSnap = await getDoc(userRef);
            let baseProfile = userSnap.exists() ? userSnap.data() : null;
            
// 🟢 FIX: Safely parse legacy names using correct OR (||) syntax
let fallbackName = (baseProfile && baseProfile.playerName) ||
                   (baseProfile && baseProfile.name) ||
                   (baseProfile && baseProfile.player) ||
                   user.email.split('@')[0];

if (userRole === 'super_admin' || userRole === 'director') {
                userProfile = { 
                   ...baseProfile, 
clubId: (baseProfile && baseProfile.clubId) || (window.globalClubs && window.globalClubs[0]?.id ? window.globalClubs[0].id : "aggiesfc"),
                    teamId: "admin", 
                    playerName: fallbackName, 
                    role: userRole 
                };
            } else if (userSnap.exists()) {
                userProfile = userSnap.data();
                userProfile.role = userRole; 
                userProfile.playerName = fallbackName;
            } else {
                const inviteRef = doc(db, "player_lookup", user.email.toLowerCase());
                const inviteSnap = await getDoc(inviteRef);
                if (inviteSnap.exists()) {
                    const data = inviteSnap.data();
                    // player_lookup only stores {teamId, playerName}; clubId is absent.
                    // Omit it rather than writing undefined (Firestore rejects undefined values).
                    const newProfile = {
                        teamId: data.teamId,
                        playerName: data.playerName,
                        joinedAt: new Date(),
                        ...(data.clubId != null ? { clubId: data.clubId } : {})
                    };
                    await setDoc(userRef, newProfile);
                    userProfile = { ...newProfile, role: userRole };
                }
            }

            // True Role-Based Validation Logic
            let isProfileComplete = false;
            if (userProfile) {
if (userProfile.role === 'super_admin' || userProfile.role === 'director') {
                    isProfileComplete = true;
                } else if (userProfile.role === 'coach' && userProfile.teamId) {
                    isProfileComplete = true; 
                } else if (userProfile.role === 'parent' && userProfile.teamId) {
                    isProfileComplete = true;
                } else if (userProfile.playerName && userProfile.teamId) {
                    isProfileComplete = true; 
                }
            }

            if (isProfileComplete) {
                document.getElementById("appUI").classList.remove("d-none");
                
                const supportBtn = document.getElementById("btnOpenSupport");
                if (supportBtn) {
                    if (userRole === 'super_admin') supportBtn.classList.add("d-none");
                    else supportBtn.classList.remove("d-none");
                } 
                
                if (userProfile.teamId!== "admin" && typeof applyTeamBranding!== 'undefined') {
                    await applyTeamBranding(userProfile.teamId);
                }

const displayName = userProfile.playerName || (userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1));
                setText("activePlayerName", displayName);
                setText("homePlayerName", (displayName || "").split(" ")[0] || displayName);

                const safeLoad = async (moduleName, fn) => {
                    try { await fn(); } catch (err) {
                        console.error(` ${moduleName} failed to load:`, err);
                    }
                };

                await safeLoad("Workouts", async () => { if (window.fetchWorkouts) await window.fetchWorkouts(); });
                await safeLoad("Coach Tools", async () => { if (window.buildCoachDropdowns) window.buildCoachDropdowns(); });
                await safeLoad("Director", async () => { if (typeof initDirectorModule!== 'undefined') initDirectorModule(db, userProfile, globalTeams); });

                if (typeof loadHomeDashboard!== 'undefined') loadHomeDashboard();
                if (typeof checkRoles!== 'undefined') checkRoles(user);

                history.replaceState({ view: 'viewHome' }, '', '#viewHome');
                window.navigateTo('viewHome', false);
            } else {
                document.getElementById("setupUI").classList.remove("d-none");
                if (typeof initSetupDropdowns!== 'undefined') initSetupDropdowns(window.globalClubs, globalTeams);
            }
        } catch (error) { 
            console.error("Auth Error:", error); 
            alert("Security Error: Unable to verify credentials."); 
        }
    } else {
        document.getElementById("loginUI").classList.remove("d-none");
        document.getElementById("appUI").classList.add("d-none");
        document.getElementById("setupUI").classList.add("d-none");
    }
});