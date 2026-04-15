// app.js
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc, updateDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- BRING IN YOUR MODULES ---
import { checkMobileRedirect, handleGoogleLogin, handleEmailLogin, handleEmailSignup, handleLogout, completeUserSetup, initSetupDropdowns } from "./modules/auth.js?v=4.0.1";
import { addDrillToSession, handleWorkoutSubmit, addToGoogleCalendar, downloadIcsFile, initSignatureCanvas } from "./modules/tracker.js?v=4.0.0";
import { initDirectorModule } from "./modules/director.js?v=4.0.0";
import { initCoachDropdown, loadCoachDashboard, currentCoachTeamId, initStrategyBoard, loadCoachScheduleAndHW } from "./modules/coach.js?v=4.0.3";
import { renderAdminTables, addAdmin, addClub, addTeam } from "./modules/admin.js?v=4.0.4";
import { applyTeamBranding } from "./modules/branding.js?v=4.0.0";
import { initPassportCanvas, loadPlayerPassport, savePlayerPassport } from "./modules/passport.js?v=4.0.0";

// --- SIDE-EFFECT & DYNAMIC IMPORTS ---
import "./modules/challenges.js?v=4.0.0"; 
import { loadStatsDashboard } from "./modules/stats.js?v=4.0.5"; // Only importing what the router needs!

let globalTeams = [];
let globalAdmins = [];
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

    // ROSTER & ADMIN
    safeBind("rosterPdfInput", "change", parsePDF);
    safeBind("saveParsedRosterBtn", "click", saveRosterList);
    safeBind("coachAddPlayerBtn", "click", manualAddPlayer);
    safeBind("exportXlsxBtn", "click", exportSessionData);
    safeBind("forceRefreshRosterBtn", "click", () => loadCoachDashboard(true, globalTeams)); 
    
    safeBind("addTeamBtn", "click", addTeam);
    safeBind("addAdminBtn", "click", addAdmin);
    safeBind("btnLogSystem", "click", () => loadLogs("logs_system"));
    safeBind("btnLogSecurity", "click", runSecurityScan);
    safeBind("btnLogDebug", "click", runDebugLog);
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

    // MODALS
    document.querySelectorAll(".close-btn").forEach(b => {
        b.onclick = () => {
            document.querySelectorAll(".modal").forEach(m => m.style.display='none');
            document.getElementById("videoPlayer").src = "";
        }
    });

    const targetEl = document.getElementById(viewId);
    if (targetEl) targetEl.classList.remove('d-none');

    if (viewId === 'viewStats') {
        const { tid, playerName } = window.getAppContext();
        loadStatsDashboard(tid, playerName, userProfile);
    }

            if (userProfile) {
                document.getElementById("appUI").style.display='block';
                document.getElementById("bottomNav").style.display='flex';
                setText("coachName", user.email);
                setText("activePlayerName", userProfile.playerName);
                
                loadStats();
                if (typeof loadHomeDashboard === "function") loadHomeDashboard();
                checkRoles(user);
            } else {
                document.getElementById("setupUI").style.display = 'flex';
                initSetupDropdowns();
            }
        } catch (error) { console.error(error); alert("Data Error: " + error.message); }
        
    } else {
        document.getElementById("loginUI").style.display='flex';
        document.getElementById("appUI").style.display='none';
        document.getElementById("bottomNav").style.display='none';
        document.getElementById("setupUI").style.display='none';
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

    // --- NEW: NATIVE HISTORY & SWIPE ROUTING ---
    window.addEventListener('popstate', (event) => {
        // If the user swipes back, route them without adding a duplicate history state
        if (event.state && event.state.view) {
            window.navigateTo(event.state.view, false); 
        } else {
            window.navigateTo('viewHome', false);
        }
    });

// --- COACH DASHBOARD ---

// ==========================================
// SCHEDULE & HOMEWORK LOGIC
// ==========================================

async function loadHomeDashboard() {
    if(!userProfile) return;
    const schedList = document.getElementById("homeScheduleList");
    if(schedList) {
        schedList.innerHTML = "<li class='session-empty'>Loading schedule...</li>";
        const q = query(collection(db, "schedules"), where("teamId", "==", userProfile.teamId));
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

window.completeHomework = async (id) => { await updateDoc(doc(db, "assignments", id), { status: "completed" }); loadHomeDashboard(); };
window.deleteSchedule = async (id) => { if(confirm("Delete event?")) { await deleteDoc(doc(db, "schedules", id)); loadCoachScheduleAndHW(); loadHomeDashboard(); } };
window.deleteHomework = async (id) => { if(confirm("Delete assignment?")) { await deleteDoc(doc(db, "assignments", id)); loadCoachScheduleAndHW(); loadHomeDashboard(); } };

function initCoachDropdown(isDirector, teams) {
    const sel = document.getElementById("adminTeamSelect");
    if(!sel) return;
    document.getElementById("adminControls").style.display = 'block';
    sel.innerHTML = "";
    teams.forEach(t => { const o = document.createElement("option"); o.value=t.id; o.textContent=t.name; sel.appendChild(o); });
    sel.onchange = () => loadCoachDashboard(isDirector, teams);
    if(teams.length > 0) { sel.value = teams[0].id; loadCoachDashboard(isDirector, teams); }
}

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
    safeBind("btnHomePassport", "click", () => {
        window.navigateTo('viewPassport');
        loadPlayerPassport();
    });
    safeBind("savePassportBtn", "click", savePlayerPassport);
// Admin Action Bindings
    safeBind("addClubBtn", "click", () => addClub(window.globalClubs, fetchConfig));
    safeBind("addAdminBtn", "click", () => addAdmin(globalAdmins, () => { fetchConfig(); renderAdminTables(window.globalClubs, globalTeams, globalAdmins, auth.currentUser.email, userProfile.role); }));
    safeBind("addTeamBtn", "click", () => addTeam(window.globalClubs, globalTeams, fetchConfig));

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

        // 4. Combine and Render
        const combinedSet = new Set([...rosterNames, ...Object.keys(players)]);
        const combinedList = Array.from(combinedSet).sort();
        // Populate Homework Player Dropdown
        const hwPlayer = document.getElementById("hwPlayerSelect");
        if(hwPlayer) hwPlayer.innerHTML = combinedList.map(p => `<option value="${p}">${p}</option>`).join("");
        
        // Refresh Schedule & Homework for the coach view
        if(typeof loadCoachScheduleAndHW === "function") loadCoachScheduleAndHW();

        if (listEl) {
            if (combinedList.length > 0) {
                // --- RENDER LIST ---
                listEl.innerHTML = combinedList.map(p => {
                    const stats = players[p] || { mins: 0, lastActive: null };
                    const lastDate = stats.lastActive ? stats.lastActive.toLocaleDateString() : "Inactive";
                    
                    // 1. Check if this specific player is in the 'linkedPlayers' set
                    const isLinked = linkedPlayers.has(p);
                    
                    // 2. Decide which button to show (Green vs Blue)
                    const linkButton = isLinked 
                        ? `<button class="link-btn" style="background:#dcfce7; color:#166534; border-color:#86efac; cursor:default;">✔ Linked</button>`
                        : `<button class="link-btn" onclick="window.linkParent('${p}')">Link Parent</button>`;

                    return `
                    <div style="padding:10px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
                        <div><b>${p}</b> <div style="font-size:10px; color:#666;">Last: ${lastDate}</div></div>
                        <div>
                            <span style="font-size:12px; font-weight:bold; color:#00263A; margin-right:5px;">${stats.mins}m</span>
                            ${linkButton}
                            <button class="delete-btn" onclick="window.deletePlayer('${p}')">x</button>
                        </div>
                    </div>`;
                }).join("");
            } else {
                // --- IF NO PLAYERS FOUND ---
                listEl.innerHTML = "<div style='padding:10px; color:#999;'>No players found in database. Upload a PDF roster or add manually above.</div>";
            }
        }
    } catch(e) {
        console.error(e);
        if(listEl) listEl.innerHTML = `<div style='color:red; padding:10px;'>Error: ${e.message}</div>`;
    } finally {
        if(listEl && listEl.innerHTML === "Fetching roster data...") {
             listEl.innerHTML = "<div style='padding:10px; color:#999;'>No players found.</div>";
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
            if (targetId === 'dir-section-compliance') {
                import("./modules/director.js?v=4.0.0").then(module => {
                    if(module.loadComplianceDashboard) module.loadComplianceDashboard(db, userProfile.clubId);
                });
            }
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
    });

    initSignatureCanvas();
    initPassportCanvas();
    initStrategyBoard();
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initApp);
else initApp();

// ==========================================
// 6. AUTH STATE MONITOR
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // 🟢 THE FIX: Safely hide all screens using classList instead of style.display
        document.getElementById("loginUI").classList.add("d-none");
        document.getElementById("setupUI").classList.add("d-none");
        document.getElementById("appUI").classList.add("d-none");

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
            
// 3. UI INITIALIZATION (FAULT-TOLERANT ENGINE)
            if (userProfile && userProfile.playerName) {
                document.getElementById("appUI").classList.remove("d-none");
                
                const supportBtn = document.getElementById("btnOpenSupport");
                if (supportBtn) {
                    if (userRole === 'super_admin') supportBtn.classList.add("d-none");
                    else supportBtn.classList.remove("d-none");
                } 
                
                setText("activePlayerName", userProfile.playerName);
                setText("homePlayerName", userProfile.playerName.split(" ")[0]);

                // 🛡️ The Graceful Degradation Wrapper
                const safeLoad = async (moduleName, fn) => {
                    try { 
                        await fn(); 
                    } catch (err) {
                        console.error(`[MODULE CRASH] ${moduleName} failed to load:`, err);
                        try {
                            // Silently alert the Admins in the database
                            const { addDoc, collection } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
                            await addDoc(collection(db, "admin_audit_log"), {
                                action: "Module Crash Bypass", 
                                module: moduleName, 
                                error: err.message, 
                                user: user.email, 
                                timestamp: new Date()
                            });
                        } catch(e) { /* Failsafe if DB write also fails */ }
                    }
                };

                // Boot modules independently. If one fails, the others survive.
                await safeLoad("Branding", async () => { if (userProfile.teamId !== "admin") await applyTeamBranding(userProfile.teamId); });
                await safeLoad("Workouts", async () => { if (window.fetchWorkouts) await window.fetchWorkouts(); });
                await safeLoad("Coach Tools", async () => { if (window.buildCoachDropdowns) window.buildCoachDropdowns(); });
                await safeLoad("Director", async () => { if (typeof initDirectorModule !== 'undefined') initDirectorModule(db, userProfile, globalTeams); });

                // These are safe, synchronous UI updates
                if (typeof loadHomeDashboard !== 'undefined') loadHomeDashboard();
                if (typeof checkRoles !== 'undefined') checkRoles(user);

                history.replaceState({ view: 'viewHome' }, '', '#viewHome');
                window.navigateTo('viewHome', false);
            } else {
                // Profile is missing: ONLY show the Setup UI
                document.getElementById("setupUI").classList.remove("d-none");
                initSetupDropdowns(window.globalClubs, globalTeams);
            }

        } catch (error) { 
            console.error("Auth Error:", error); 
            alert("Security Error: Unable to verify credentials."); 
        }
    } else {
        // 🟢 THE FIX: Toggle classes for the logged-out state
        document.getElementById("loginUI").classList.remove("d-none");
        document.getElementById("appUI").classList.add("d-none");
        document.getElementById("setupUI").classList.add("d-none");
    }
});