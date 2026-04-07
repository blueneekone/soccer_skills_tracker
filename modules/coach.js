// modules/coach.js
import { auth, db } from "../firebase-config.js";
import { collection, query, where, getDocs, doc, setDoc, getDoc, updateDoc, deleteDoc, writeBatch, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { renderTeamChart } from "./stats.js";

export let currentCoachTeamId = null;
export let allSessionsCache = [];

const setText = (id, text) => { const el = document.getElementById(id); if (el) el.innerText = text; };

// --- 1. ENTERPRISE DELEGATION FOR COACH DASHBOARD ---
// We attach one secure listener to the entire ViewCoach panel
document.addEventListener("DOMContentLoaded", () => {
    const coachView = document.getElementById("viewCoach");
    if (coachView && coachView.dataset.bound !== "true") {
        coachView.addEventListener("click", async (e) => {
            const target = e.target;

            // Handle Roster Deletions
            if (target.classList.contains("action-delete-player")) {
                const pName = target.getAttribute("data-player");
                if (!confirm(`Remove ${pName}?`)) return;
                const ref = doc(db, "rosters", currentCoachTeamId);
                const snap = await getDoc(ref);
                if (snap.exists()) {
                    await updateDoc(ref, { players: snap.data().players.filter(p => p !== pName) });
                    loadCoachDashboard(false, window.globalTeams);
                }
            }

            // Handle Jersey Edits
            if (target.classList.contains("action-edit-jersey")) {
                const pName = target.getAttribute("data-player");
                const currentJersey = target.getAttribute("data-jersey");
                let num = prompt(`Enter new jersey number for ${pName} (or leave blank to clear):`, currentJersey);
                if (num === null) return;
                num = num.trim();
                const ref = doc(db, "rosters", currentCoachTeamId);
                const snap = await getDoc(ref);
                if (snap.exists()) {
                    let jerseys = snap.data().jerseys || {};
                    if (num === "") delete jerseys[pName]; else jerseys[pName] = num;
                    await updateDoc(ref, { jerseys: jerseys });
                    loadCoachDashboard(false, window.globalTeams);
                }
            }

            // Handle Schedule & HW Deletions
            if (target.classList.contains("action-delete-schedule")) {
                if (confirm("Delete event?")) { await deleteDoc(doc(db, "schedules", target.getAttribute("data-id"))); loadCoachScheduleAndHW(); }
            }
            if (target.classList.contains("action-delete-homework")) {
                if (confirm("Delete assignment?")) { await deleteDoc(doc(db, "assignments", target.getAttribute("data-id"))); loadCoachScheduleAndHW(); }
            }

            // Handle Workout Deletions
            if (target.classList.contains("action-delete-workout")) {
                if (!confirm("Delete this workout?")) return;
                await deleteDoc(doc(db, "workouts", target.getAttribute("data-id")));
                await window.fetchWorkouts();
                window.buildCoachDropdowns();
                loadWorkouts();
            }

            // Handle Assistant Deletion
            if (target.classList.contains("action-remove-assistant")) {
                const email = target.getAttribute("data-email");
                if (!confirm(`Revoke access for ${email}?`)) return;
                const teamIdx = window.globalTeams.findIndex(t => t.id === currentCoachTeamId);
                if (teamIdx > -1) {
                    window.globalTeams[teamIdx].assistants = window.globalTeams[teamIdx].assistants.filter(e => e !== email);
                    await setDoc(doc(db, "teams", currentCoachTeamId), { assistants: window.globalTeams[teamIdx].assistants }, { merge: true });
                    loadCoachDashboard(false, window.globalTeams);
                }
            }
        });
        coachView.dataset.bound = "true";
    }
});

// --- SCHEDULE & HOMEWORK VIEW ---
export const loadCoachScheduleAndHW = async () => {
    const tid = currentCoachTeamId;
    if (!tid) return;

    const cSched = document.getElementById("coachScheduleList");
    if (cSched) {
        const q = query(collection(db, "schedules"), where("teamId", "==", tid));
        const snap = await getDocs(q);
        const events = [];
        snap.forEach(d => events.push({ id: d.id, ...d.data() }));
        events.sort((a, b) => a.date.localeCompare(b.date));
        cSched.innerHTML = events.map(e => `<li class="session-item">
            <div><b>${e.type}</b>: ${e.location}<br><span style="font-size:10px;">${e.date}</span></div>
            <button class="delete-btn action-delete-schedule" data-id="${e.id}">✕</button>
        </li>`).join("") || "<li class='session-empty'>No events scheduled.</li>";
    }

    const cHw = document.getElementById("coachHwList");
    if (cHw) {
        const q2 = query(collection(db, "assignments"), where("teamId", "==", tid));
        const snap2 = await getDocs(q2);
        let html = "";
        snap2.forEach(d => {
            const hw = d.data();
            if (hw.status === "active") {
                let drillSummary = Array.isArray(hw.drills) ? `${hw.drills.length} Drills Assigned` : hw.drill;
                html += `<li class="session-item">
                    <div><b>${hw.player}</b><br><span style="font-size:10px; color:#ea580c;">Due: ${hw.dueDate}</span><br><span style="font-size:11px;">${drillSummary}</span></div>
                    <button class="delete-btn action-delete-homework" data-id="${d.id}">✕</button>
                </li>`;
            }
        });
        cHw.innerHTML = html || "<li class='session-empty'>No active homework.</li>";
    }
};

// --- MAIN DASHBOARD LOADER ---
export const initCoachDropdown = (isDirector, teams, updateCallback) => {
    const sel = document.getElementById("adminTeamSelect");
    if (!sel) return;
    document.getElementById("adminControls").style.display = 'block';
    sel.innerHTML = "";
    teams.forEach(t => { const o = document.createElement("option"); o.value = t.id; o.textContent = t.name; sel.appendChild(o); });
    sel.onchange = () => loadCoachDashboard(isDirector, teams, updateCallback);
    if (teams.length > 0) { sel.value = teams[0].id; loadCoachDashboard(isDirector, teams, updateCallback); }
};

export const loadCoachDashboard = async (isDirector, teams, updateCallback) => {
    const tid = document.getElementById("adminTeamSelect").value;
    if (!tid) return;
    currentCoachTeamId = tid;

    const userEmail = auth.currentUser.email.toLowerCase();
    const currentTeam = teams.find(t => t.id === tid);
    const isManager = isDirector || (currentTeam && (currentTeam.coachEmail || "").toLowerCase() === userEmail);

    const staffCard = document.getElementById("cardStaffManager");
    if (staffCard) {
        staffCard.style.display = isManager ? 'block' : 'none';
        if (isManager) renderAssistantList(currentTeam);
    }

    const listEl = document.getElementById("coachPlayerList");
    if (listEl) listEl.innerHTML = "Fetching...";

    try {
        // ENTERPRISE UPGRADE: Read the summaries, not the raw history
        const q = query(collection(db, "player_stats"), where("teamId", "==", tid));
        const snap = await getDocs(q);
        const players = {};

        snap.forEach(doc => {
            const d = doc.data();
            players[doc.id] = { mins: d.totalMins || 0, lastActive: d.lastActive ? d.lastActive.toDate() : null };
        });

        setText("coachActivePlayers", Object.keys(players).length);
        setText("coachTotalReps", "Aggregated");

        const rosterSnap = await getDoc(doc(db, "rosters", tid));
        let rosterNames = (rosterSnap.exists() && rosterSnap.data().players) ? rosterSnap.data().players : [];
        let rosterJerseys = (rosterSnap.exists() && rosterSnap.data().jerseys) ? rosterSnap.data().jerseys : {};

        const linkQuery = query(collection(db, "player_lookup"), where("teamId", "==", tid));
        const linkSnap = await getDocs(linkQuery);
        const linkedPlayers = new Set();
        linkSnap.forEach(doc => linkedPlayers.add(doc.data().playerName));

        const combinedSet = new Set([...rosterNames, ...Object.keys(players)]);
        const combinedList = Array.from(combinedSet).sort();

        // Dropdowns for Homework
        const hwList = document.getElementById("hwPlayerChecklistItems");
        if (hwList) {
            if (combinedList.length > 0) {
                hwList.innerHTML = combinedList.map(p => `
                    <div style="display:flex; align-items:center; justify-content:flex-start; gap:8px; margin-bottom:8px; font-size:14px; color:#334155; cursor:pointer;" onclick="const cb = this.querySelector('input'); if(event.target !== cb) cb.checked = !cb.checked;">
                        <input type="checkbox" class="hw-player-cb" value="${p}" style="margin:0;"> <span style="margin:0; text-align:left; flex:1;">${p}</span>
                    </div>
                `).join("");
            } else { hwList.innerHTML = "<div style='color:#999; font-size:12px;'>No players on roster</div>"; }
        }

        const checkAll = document.getElementById("hwSelectAllPlayers");
        if (checkAll && checkAll.dataset.bound !== "true") {
            checkAll.addEventListener("change", (e) => { document.querySelectorAll(".hw-player-cb").forEach(cb => cb.checked = e.target.checked); });
            checkAll.dataset.bound = "true";
        }

        const evalPlayer = document.getElementById("evalPlayerSelect");
        if (evalPlayer) evalPlayer.innerHTML = combinedList.length > 0 ? '<option value="" disabled selected>Select Player...</option>' + combinedList.map(p => `<option value="${p}">${p}</option>`).join("") : `<option value="">No players on roster</option>`;

        loadCoachScheduleAndHW();
        loadRecentTrials(tid);
        const cPlayerSelect = document.getElementById("coachTrialPlayerSelect");
        if (cPlayerSelect) cPlayerSelect.innerHTML = combinedList.length > 0 ? combinedList.map(p => `<option value="${p}">${p}</option>`).join("") : `<option value="">No players on roster</option>`;
        if (updateCallback) updateCallback();

        if (listEl) {
            if (combinedList.length > 0) {
                listEl.innerHTML = combinedList.map(p => {
                    const stats = players[p] || { mins: 0, lastActive: null };
                    const lastDate = stats.lastActive ? stats.lastActive.toLocaleDateString() : "Inactive";
                    const isLinked = linkedPlayers.has(p);
                    const linkButton = isLinked ? `<button class="link-btn" style="background:#dcfce7; color:#166534; border-color:#86efac; cursor:default;">✔ Linked</button>` : ``;
                    const jerseyStr = rosterJerseys[p] ? `<span style="background:var(--aggie-gold); color:var(--aggie-blue); border-radius:3px; padding:1px 5px; font-size:10px; margin-right:5px; font-weight:bold;">#${rosterJerseys[p]}</span>` : "";

                    return `<div style="padding:10px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
                        <div><b>${jerseyStr}${p}</b> <div style="font-size:10px; color:#666;">Last: ${lastDate}</div></div>
                        <div>
                            <span style="font-size:12px; font-weight:bold; color:#00263A; margin-right:5px;">${stats.mins}m</span>
                            ${linkButton}
                            <button class="secondary-btn action-edit-jersey" data-player="${p}" data-jersey="${rosterJerseys[p] || ''}" style="padding: 2px 6px; font-size: 10px; margin-left:5px;">#</button>
                            <button class="delete-btn action-delete-player" data-player="${p}" style="margin-left:5px;">x</button>
                        </div>
                    </div>`;
                }).join("");

                if (window.initGamedayRoster) window.initGamedayRoster(tid, combinedList, rosterJerseys);
            } else {
                listEl.innerHTML = "<div style='padding:10px; color:#999;'>No players found.</div>";
            }
        }
        loadWorkouts();
    } catch (e) { console.error(e); }
};

// --- ROSTER & EXPORT LOGIC ---
const renderAssistantList = (team) => {
    const c = document.getElementById("assistantList");
    if (!team || !team.assistants || team.assistants.length === 0) return c.innerHTML = "No assistants added.";
    c.innerHTML = team.assistants.map(email => `<div style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding:5px;"><span>${email}</span><button class="delete-btn action-remove-assistant" data-email="${email}">Remove</button></div>`).join("");
};

const loadWorkouts = () => {
    const list = document.getElementById("WorkoutList");
    if (!list) return;
    if (!window.Workouts || window.Workouts.length === 0) {
        list.innerHTML = "<li class='session-empty'>No custom workouts found for this team.</li>";
        return;
    }
    list.innerHTML = window.Workouts.map(w => `
        <li class="session-item" style="border-left: 4px solid var(--aggie-blue); align-items: flex-start;">
            <div style="flex:1;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <b style="color:var(--text-dark);">${w.name}</b> 
                    <span style="font-weight:bold; color:white; background:var(--aggie-blue); padding:2px 8px; border-radius:10px; font-size:11px;">Lvl ${w.reqLevel || 1}</span>
                </div>
                <div style="font-size:11px; color:#64748b; margin-bottom:2px;"><b>Type:</b> ${w.type}</div>
                ${w.drill ? `<div style="font-size:12px; color:#475569; margin-top:4px;">${w.drill}</div>` : ''}
            </div>
            <button class="delete-btn action-delete-workout" data-id="${w.id}" style="margin-left:10px;">✕</button>
        </li>
    `).join("");
};

export const manualAddPlayer = async (reloadCallback) => {
    const name = document.getElementById("coachAddPlayerName").value.trim();
    const email = document.getElementById("coachAddPlayerEmail").value.trim().toLowerCase();
    const jerseyEl = document.getElementById("coachAddPlayerJersey");
    const jersey = jerseyEl ? jerseyEl.value.trim() : "";

    if (!name) return alert("Enter name");
    const tid = document.getElementById("adminTeamSelect").value;
    const ref = doc(db, "rosters", tid);
    const snap = await getDoc(ref);
    let list = snap.exists() ? snap.data().players || [] : [];
    let jerseys = snap.exists() ? snap.data().jerseys || {} : {};

    if (!list.includes(name)) list.push(name);
    if (jersey) jerseys[name] = jersey;

    await setDoc(ref, { players: list, jerseys: jerseys }, { merge: true });
    if (email) await setDoc(doc(db, "player_lookup", email), { teamId: tid, playerName: name });

    alert("Player Added");
    document.getElementById("coachAddPlayerName").value = "";
    document.getElementById("coachAddPlayerEmail").value = "";
    if (jerseyEl) jerseyEl.value = "";
    if (reloadCallback) reloadCallback();
};

export const loadRecentTrials = async (tid) => {
    const list = document.getElementById("coachRecentTrialList");
    if (!list) return;
    if (!tid) return list.innerHTML = "<li class='session-empty'>Select a team.</li>";

    try {
        const q = query(collection(db, "trials"), where("teamId", "==", tid));
        const snap = await getDocs(q);
        const trials = [];
        snap.forEach(d => trials.push({ id: d.id, ...d.data() }));
        trials.sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);
        const recent = trials.slice(0, 10);

        if (recent.length === 0) return list.innerHTML = "<li class='session-empty'>No recent trials submitted.</li>";

        list.innerHTML = recent.map(t => `
            <li class="session-item recent-trial-item">
                <div class="flex-1">
                    <span class="recent-trial-name">${t.player}</span> 
                    <span class="recent-trial-date">(${new Date(t.timestamp.seconds * 1000).toLocaleDateString()})</span><br>
                    <span class="recent-trial-label">${t.type}:</span> 
                    <span class="recent-trial-val">${t.skill}</span>
                </div>
                <div class="recent-trial-right">
                    <span class="recent-trial-scores">[${t.a1}, ${t.a2}, ${t.a3}]</span>
                    <span class="recent-trial-final">${t.result} ${t.isCoach ? '⭐' : ''}</span>
                </div>
            </li>
        `).join("");
    } catch (e) { console.error(e); }
};

window.switchCoachTab = (tabId) => {
    ['coachTabRoster', 'coachTabPlan', 'coachTabEvals', 'coachTabStrategy', 'coachTabTools'].forEach(id => {
        const pane = document.getElementById(id);
        const btn = document.getElementById(`btn-${id}`);
        if (pane) pane.classList.add('d-none');
        if (btn) btn.classList.remove('active');
    });
    document.getElementById(tabId).classList.remove('d-none');
    document.getElementById(`btn-${tabId}`).classList.add('active');
};

// Add to the bottom of modules/coach.js
export const exportSessionData = () => {
    try {
        if (!window.Workouts || window.Workouts.length === 0) {
            return alert("No workout data found to export.");
        }
        
        // Map the database fields into clean Excel columns
        const exportData = window.Workouts.map(w => ({
            Date: w.date || "N/A",
            Player: w.playerName || "Unknown",
            Category: w.type || "Workout",
            Minutes: w.minutes || 0,
            Notes: w.notes || ""
        }));

        // Generate and download the Excel file
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Team_Data");
        XLSX.writeFile(workbook, "Team_Export.xlsx");
        
    } catch (error) {
        console.error("Export Error:", error);
        alert("Error exporting data. Please check the console.");
    }
};

// Bind the export button securely
document.addEventListener("DOMContentLoaded", () => {
    const exportBtn = document.getElementById("exportXlsxBtn");
    if(exportBtn) {
        exportBtn.addEventListener("click", exportSessionData);
    }
});