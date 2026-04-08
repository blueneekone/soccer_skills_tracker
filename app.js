// app.js
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc, updateDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
// --- BRING IN YOUR MODULES ---
import { checkMobileRedirect, handleGoogleLogin, handleEmailLogin, handleEmailSignup, handleLogout, completeUserSetup, initSetupDropdowns } from "./modules/auth.js?v=4.0.1";
import { addDrillToSession, handleWorkoutSubmit, addToGoogleCalendar, downloadIcsFile, initSignatureCanvas } from "./modules/tracker.js?v=4.0.0";
import { renderCalendar, renderPlayerTrendChart, renderTeamLeaderboard, renderPlayerTrials, loadPlayerFeedback, exportStatsCSV } from "./modules/stats.js?v=4.0.0";
import { initDirectorModule } from "./modules/director.js?v=4.0.0";
import { initCoachDropdown, loadCoachDashboard, manualAddPlayer, parsePDF, saveRosterList, exportSessionData, currentCoachTeamId, initStrategyBoard, loadCoachScheduleAndHW } from "./modules/coach.js?v=4.0.1";
import { renderAdminTables, addAdmin, addClub } from "./modules/admin.js?v=4.0.0";
import { applyTeamBranding } from "./modules/branding.js?v=4.0.0";
import { finalizeChallengeUnlock, setupChallengeCalculators, submitTrialScore } from "./modules/challenges.js?v=4.0.0.11";
import { messaging } from "./firebase-config.js";
import { getToken } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";

let globalTeams = [];
let globalAdmins = [];
let isSignatureBlank = true;
let userProfile = null;

window.globalClubs = [];
window.globalStatsLogs = [];
window.Workouts = [];

// ==========================================
// 0. UI HELPER FUNCTIONS (Restored)
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

    // --- ROUTE DATA TO TRACKER DROPDOWNS ---
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
    // 1. ROUTE GUARD: Check Authorization Before Navigation
    const role = userProfile ? userProfile.role : 'guest';

    if (viewId === 'viewAdmin' && role !== 'super_admin') {
        alert("Unauthorized Access: Super Admin required.");
        return window.navigateTo('viewHome', false);
    }
    if (viewId === 'viewDirector' && role !== 'super_admin' && role !== 'director') {
        alert("Unauthorized Access: Director required.");
        return window.navigateTo('viewHome', false);
    }
    if (viewId === 'viewCoach' && role === 'player') {
        alert("Unauthorized Access: Coach credentials required.");
        return window.navigateTo('viewHome', false);
    }

    // 2. Perform Navigation
    const views = ['viewHome', 'viewTracker', 'viewStats', 'viewTrophy', 'viewCoach', 'viewAdmin', 'viewChallenge', 'viewDirector'];
    views.forEach(v => {
        const el = document.getElementById(v);
        if (el) el.classList.add('d-none');
    });

    const targetEl = document.getElementById(viewId);
    if (targetEl) targetEl.classList.remove('d-none');

    if (viewId === 'viewTracker' || viewId === 'viewCoach' || viewId === 'viewChallenge') {
        setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
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
async function fetchConfig() {
    try {
        const clubsSnap = await getDocs(collection(db, "clubs"));
        window.globalClubs = [];
        clubsSnap.forEach(d => window.globalClubs.push(d.data()));

        const teamsColSnap = await getDocs(collection(db, "teams"));
        globalTeams = [];
        teamsColSnap.forEach(d => globalTeams.push({ id: d.id, ...d.data() }));

        const adminsSnap = await getDocs(query(collection(db, "users"), where("role", "==", "super_admin")));
        globalAdmins = [];
        adminsSnap.forEach(doc => globalAdmins.push(doc.id));
    } catch (e) { console.error("Config fetch error:", e); globalTeams = []; }

    const ts = document.getElementById("teamSelect");
    if (ts) {
        ts.innerHTML = '<option value="" disabled selected>Select Team...</option>';
        globalTeams.forEach(t => { const o = document.createElement("option"); o.value = t.id; o.textContent = t.name; ts.appendChild(o); });
    }
}

// ==========================================
// 4. ROLE & DASHBOARD MANAGEMENT
// ==========================================
function checkRoles(user) {
    const email = user.email.toLowerCase();
    if (userProfile && userProfile.role === 'super_admin') {
        const adminBtn = document.getElementById("btnHomeAdmin");
        const dirBtn = document.getElementById("btnHomeDirector");
        if (adminBtn) adminBtn.classList.remove("d-none");
        if (dirBtn) dirBtn.classList.remove("d-none");
        renderAdminTables(window.globalClubs, globalTeams, globalAdmins, email, userProfile.role);
    } else if (userProfile && userProfile.role === 'director') {
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

    // Auth Bindings
    safeBind("loginGoogleBtn", "click", handleGoogleLogin);
    safeBind("loginEmailBtn", "click", handleEmailLogin);
    safeBind("signupEmailBtn", "click", handleEmailSignup);
    safeBind("globalLogoutBtn", "click", handleLogout);
    safeBind("appLogoutBtn", "click", handleLogout);
    safeBind("setupLogoutBtn", "click", handleLogout);
    safeBind("completeSetupBtn", "click", completeUserSetup);

    // Nav Bindings
    safeBind('headerHomeLink', 'click', () => window.navigateTo('viewHome'));
    ['navHome', 'navTrack', 'navStats', 'navTrophy', 'navCoach', 'navAdmin'].forEach((nid, i) => {
        safeBind(nid, "click", () => window.navigateTo(['viewHome', 'viewTracker', 'viewStats', 'viewTrophy', 'viewCoach', 'viewAdmin', 'viewChallenge'][i]));
    });

    safeBind("btnHomeStart", "click", () => window.navigateTo('viewTracker'));
    safeBind("btnHomeStats", "click", () => window.navigateTo('viewStats'));
    safeBind("btnHomeCoach", "click", () => window.navigateTo('viewCoach'));
    safeBind("btnHomeAdmin", "click", () => window.navigateTo('viewAdmin'));
    safeBind("btnHomeDirector", "click", () => window.navigateTo('viewDirector'));
    safeBind("btnOpenTrophyModal", "click", () => window.navigateTo('viewTrophy'));

// Admin Action Bindings
    safeBind("addClubBtn", "click", () => addClub(window.globalClubs, fetchConfig));
    safeBind("addAdminBtn", "click", () => addAdmin(globalAdmins, () => { fetchConfig(); renderAdminTables(window.globalClubs, globalTeams, globalAdmins, auth.currentUser.email, userProfile.role); }));
    
// --- SETTINGS & PRIVACY SHIELD LOGIC ---
    safeBind("btnOpenSupport", "click", () => {
        document.getElementById("supportModal").classList.remove("d-none");
    });
    
    safeBind("closeSupportBtn", "click", () => {
        document.getElementById("supportModal").classList.add("d-none");
    });

    safeBind("btnGrantSupportAccess", "click", async () => {
        const btn = document.getElementById("btnGrantSupportAccess");
        const status = document.getElementById("supportStatusMsg");
        
        try {
            btn.innerText = "Processing...";
            btn.disabled = true;
            
            const userEmail = auth.currentUser.email.toLowerCase();
            
            // Calculate exactly 60 minutes from right now
            const oneHourFromNow = new Date(Date.now() + (60 * 60 * 1000));
            
            // Write the expiration timestamp to the user's profile
            await updateDoc(doc(db, "users", userEmail), {
                supportAccessUntil: Timestamp.fromDate(oneHourFromNow)
            });

            btn.style.display = "none";
            status.innerText = "✅ Secure Access Granted. Auto-locks in 60 minutes.";
            
        } catch (error) {
            console.error("Support Access Error:", error);
            btn.innerText = "🛡️ Grant Support Access (1 Hour)";
            btn.disabled = false;
            alert("Error granting access: " + error.message);
        }
    });

// --- THE FIX: ACTIVATE TRACKER BUTTONS ---
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
    
    safeBind("submitWorkoutBtn", "click", () => handleWorkoutSubmit(userProfile, globalTeams, () => window.navigateTo('viewHome')));
    // -----------------------------------------

    // ENTERPRISE DELEGATION FOR DYNAMIC APP.JS ELEMENTS
    document.body.addEventListener("click", async (e) => {
        const target = e.target;

        const tab = target.closest('.admin-tab, .director-tab, .coach-tab-btn');
        if (tab && !tab.id.startsWith('btn-coachTab')) { 
            // Handle Admin & Director Tabs
            const isAdmin = tab.classList.contains('admin-tab');
            const tabClass = isAdmin ? '.admin-tab' : '.director-tab';
            const paneClass = isAdmin ? '.admin-pane' : '.director-pane';
            
            document.querySelectorAll(tabClass).forEach(b => b.classList.remove('active'));
            document.querySelectorAll(paneClass).forEach(p => p.classList.add('d-none'));
            
            tab.classList.add('active');
            const targetId = tab.getAttribute('data-target');
            if (document.getElementById(targetId)) document.getElementById(targetId).classList.remove('d-none');
        }

        if (target.classList.contains("action-complete-hw")) {
            const id = target.getAttribute("data-id");
            target.innerText = "Saving..."; target.disabled = true;
            await updateDoc(doc(db, "assignments", id), { status: "completed" });
            target.closest("li").style.opacity = "0.5"; target.innerText = "✔ Done";
        }

        if (target.classList.contains("action-delete-eval")) {
            if (!confirm("Delete this evaluation?")) return;
            await deleteDoc(doc(db, "evaluations", target.getAttribute("data-id")));
            if (window.loadPlayerEvaluations) window.loadPlayerEvaluations(target.getAttribute("data-player"));
        }

        if (target.classList.contains("action-remove-hw-drill")) {
            const idx = parseInt(target.getAttribute("data-index"));
            window.currentHomeworkBuilder.splice(idx, 1);
            const list = document.getElementById("hwBuilderList");
            if (window.currentHomeworkBuilder.length === 0) list.innerHTML = '<li class="session-empty">No drills added.</li>';
            else list.innerHTML = window.currentHomeworkBuilder.map((item, i) => `<li style="padding:5px; border-bottom:1px solid #eee; font-size:12px; display:flex; justify-content:space-between; align-items:center;"><span><b>${i + 1}.</b> ${item.name}</span><button class="delete-btn action-remove-hw-drill" data-index="${i}">✕</button></li>`).join("");
        }

        // --- THE FIX: ACTIVATE 'SAVE WORKOUT' BUTTON (Inside the Listener!) ---
        if (target.id === "addWorkoutBtn") {
            const { tid } = window.getAppContext();
            if(!tid) return alert("Select a team in the Roster tab first.");
            
            const type = document.getElementById("manageWorkoutType").value;
            const name = document.getElementById("manageWorkoutName").value.trim();
            const level = document.getElementById("manageWorkoutLevel").value;
            const desc = document.getElementById("manageWorkoutDesc").value.trim();
            
            if(!name) return alert("Workout Name is required.");
            
            target.innerText = "Saving...";
            try {
                const { addDoc, collection } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
                await addDoc(collection(db, "team_workouts"), {
                    teamId: tid, type: type, name: name, reqLevel: parseInt(level), drill: desc, createdAt: new Date()
                });
                
                alert("Workout Added!");
                document.getElementById("manageWorkoutName").value = "";
                document.getElementById("manageWorkoutDesc").value = "";
                
                await window.fetchWorkouts();
                window.buildCoachDropdowns();
                
                const { loadCoachDashboard } = await import("./modules/coach.js?v=4.0.1");
                loadCoachDashboard(false, globalTeams);
            } catch(e) { alert("Error: " + e.message); }
            target.innerText = "Save Workout";
        }
        // -----------------------------------------------
    }); // <--- The event listener closes HERE now!

    initSignatureCanvas();
    initStrategyBoard();
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initApp);
else initApp();

// ==========================================
// 6. AUTH STATE MONITOR
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById("loginUI").style.display = 'none';
        try {
            // 1. THE TRUTH: Get the cryptographically signed token
            const tokenResult = await user.getIdTokenResult(true);
            const userRole = tokenResult.claims.role || 'player'; 

            await fetchConfig();
            
            // 2. FETCH PROFILE: We still need the playerName for the UI
            const userRef = doc(db, "users", user.email);
            const userSnap = await getDoc(userRef);
            let baseProfile = userSnap.exists() ? userSnap.data() : { clubId: window.globalClubs[0]?.id || "aggiesfc" };
            
            // Admin Bypass
            if (userRole === 'super_admin' || userRole === 'director') {
                userProfile = { 
                    ...baseProfile, 
                    teamId: "admin", 
                    playerName: baseProfile.playerName || "Director", 
                    role: userRole 
                };
            } else if (userSnap.exists()) {
                userProfile = userSnap.data();
                userProfile.role = userRole; 
            } else {
                const inviteRef = doc(db, "player_lookup", user.email.toLowerCase());
                const inviteSnap = await getDoc(inviteRef);
                if (inviteSnap.exists()) {
                    const data = inviteSnap.data();
                    const newProfile = { teamId: data.teamId, playerName: data.playerName, joinedAt: new Date(), role: userRole };
                    await setDoc(userRef, newProfile);
                    userProfile = newProfile;
                }
            }

            // 3. UI INITIALIZATION
            if (userProfile && userProfile.playerName) {
                document.getElementById("appUI").style.display = 'block';
                
                const supportBtn = document.getElementById("btnOpenSupport");
                if (supportBtn) {
                    if (userRole === 'super_admin') supportBtn.classList.add("d-none");
                    else supportBtn.classList.remove("d-none");
                } // <--- THE MISSING BRACE IS RESTORED HERE
                
                if (userProfile.teamId !== "admin") await applyTeamBranding(userProfile.teamId);

                setText("activePlayerName", userProfile.playerName);
                setText("homePlayerName", userProfile.playerName.split(" ")[0]);

                await window.fetchWorkouts();
                window.buildCoachDropdowns();
                loadHomeDashboard();
                checkRoles(user);
                initDirectorModule(db, userProfile, globalTeams);

                history.replaceState({ view: 'viewHome' }, '', '#viewHome');
                window.navigateTo('viewHome', false);
            } else {
                // No playerName found = incomplete profile
                document.getElementById("setupUI").classList.remove("d-none");
                initSetupDropdowns(window.globalClubs, globalTeams);
            }
        } catch (error) { 
            console.error("Auth Error:", error); 
            alert("Security Error: Unable to verify credentials."); 
        }
    } else {
        document.getElementById("loginUI").style.display = 'flex';
        document.getElementById("appUI").style.display = 'none';
        document.getElementById("setupUI").style.display = 'none';
    }
});