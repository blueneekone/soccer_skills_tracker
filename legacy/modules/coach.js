// modules/coach.js
import { auth, db, app } from "../firebase-config.js";
import { collection, query, where, getDocs, doc, setDoc, getDoc, deleteDoc, writeBatch, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";

const functions = getFunctions(app, "us-central1");
const secureAddPlayerFn = httpsCallable(functions, "secureAddPlayer");
const secureRemovePlayerFn = httpsCallable(functions, "secureRemovePlayer");
const secureUpdateJerseyFn = httpsCallable(functions, "secureUpdateJersey");
// 🟢 THE CRASH-INDUCING RENDERTEAMCHART IMPORT IS GONE!

export let currentCoachTeamId = null;
export let allSessionsCache = [];

const setText = (id, text) => { const el = document.getElementById(id); if (el) el.innerText = text; };

// --- 1. ENTERPRISE DELEGATION FOR COACH DASHBOARD ---
const bindCoachView = () => {
    const coachView = document.getElementById("viewCoach");
    if (coachView && coachView.dataset.bound!== "true") {
        coachView.addEventListener("click", async (e) => {
            const target = e.target;

            if (target.classList.contains("action-delete-player")) {
                const pName = target.getAttribute("data-player");
                if (!confirm(`Remove ${pName}?`)) return;
                if (!currentCoachTeamId) return alert("Select a team first.");
                try {
                    const res = await secureRemovePlayerFn({
                        teamId: currentCoachTeamId,
                        playerName: pName
                    });
                    const data = res && res.data ? res.data : {};
                    if (data.notFound) {
                        if (typeof Swal !== "undefined") {
                            Swal.fire({
                                title: "Not on roster",
                                text: "That player was not found on this team roster.",
                                icon: "info",
                                confirmButtonColor: "#0f172a"
                            });
                        } else {
                            alert("Player was not on the roster.");
                        }
                    }
                    loadCoachDashboard(false, window.globalTeams);
                } catch (err) {
                    const code = err && err.code ? String(err.code) : "";
                    console.error("[coach.js] secureRemovePlayer failed:", code, err && err.message);
                    const msg = err && err.message ? err.message : "Could not remove player.";
                    if (typeof Swal !== "undefined") {
                        Swal.fire({ title: "Could not remove player", text: msg, icon: "error", confirmButtonColor: "#0f172a" });
                    } else {
                        alert(msg);
                    }
                }
            }

            if (target.classList.contains("action-edit-jersey")) {
                const pName = target.getAttribute("data-player");
                const currentJersey = target.getAttribute("data-jersey");
                let num = prompt(`Enter new jersey number for ${pName} (or leave blank to clear):`, currentJersey);
                if (num === null) return;
                num = num.trim();
                if (!currentCoachTeamId) return alert("Select a team first.");
                try {
                    await secureUpdateJerseyFn({
                        teamId: currentCoachTeamId,
                        playerName: pName,
                        jersey: num
                    });
                    loadCoachDashboard(false, window.globalTeams);
                } catch (err) {
                    const code = err && err.code ? String(err.code) : "";
                    console.error("[coach.js] secureUpdateJersey failed:", code, err && err.message);
                    const msg = err && err.message ? err.message : "Could not update jersey.";
                    alert(msg);
                }
            }

            if (target.classList.contains("action-delete-schedule")) {
                if (confirm("Delete event?")) { await deleteDoc(doc(db, "schedules", target.getAttribute("data-id"))); loadCoachScheduleAndHW(); }
            }
            if (target.classList.contains("action-delete-homework")) {
                if (confirm("Delete assignment?")) { await deleteDoc(doc(db, "assignments", target.getAttribute("data-id"))); loadCoachScheduleAndHW(); }
            }

            if (target.classList.contains("action-delete-workout")) {
                if (!confirm("Delete this workout?")) return;
                await deleteDoc(doc(db, "team_workouts", target.getAttribute("data-id")));
                if (window.fetchWorkouts) await window.fetchWorkouts();
                if (window.buildCoachDropdowns) window.buildCoachDropdowns();
                loadWorkouts();
            }

            if (target.classList.contains("action-remove-assistant")) {
                const email = target.getAttribute("data-email");
                if (!confirm(`Revoke access for ${email}?`)) return;
                const teamIdx = window.globalTeams.findIndex(t => t.id === currentCoachTeamId);
                if (teamIdx > -1) {
                    window.globalTeams[teamIdx].assistants = window.globalTeams[teamIdx].assistants.filter(e => e!== email);
                    await setDoc(doc(db, "teams", currentCoachTeamId), { assistants: window.globalTeams[teamIdx].assistants }, { merge: true });
                    loadCoachDashboard(false, window.globalTeams);
                }
            }

            if (target.id === "addWorkoutBtn") {
                if(!currentCoachTeamId) return alert("Select a team in the Roster tab first.");
                
                const type = document.getElementById("manageWorkoutType").value;
                const name = document.getElementById("manageWorkoutName").value.trim();
                const level = document.getElementById("manageWorkoutLevel").value;
                const desc = document.getElementById("manageWorkoutDesc").value.trim();
                
                if(!name) return alert("Workout Name is required.");
                
                let layoutData = null;
                if (window.spatialCanvas && window.spatialCanvas.getObjects().length > 0) {
                    layoutData = JSON.stringify(window.spatialCanvas.toJSON());
                }
                
                target.innerText = "Saving...";
                try {
                    await addDoc(collection(db, "team_workouts"), {
                        teamId: currentCoachTeamId, type: type, name: name, reqLevel: parseInt(level), drill: desc, spatialLayout: layoutData, createdAt: new Date()
                    });
                    
                    if (typeof Swal!== 'undefined') {
                        Swal.fire({
                            title: 'Drill Saved!',
                            text: 'Your workout and spatial layout have been securely saved.',
                            icon: 'success',
                            confirmButtonColor: '#0f172a',
                            customClass: { popup: 'card' }
                        });
                    } else {
                        alert("Workout Added!");
                    }
                    
                    document.getElementById("manageWorkoutName").value = "";
                    document.getElementById("manageWorkoutDesc").value = "";
                    if (window.spatialCanvas) window.spatialCanvas.clear();
                    
                    if(window.fetchWorkouts) await window.fetchWorkouts();
                    if(window.buildCoachDropdowns) window.buildCoachDropdowns();
                    loadCoachDashboard(false, window.globalTeams); 
                } catch(err) { alert("Error: " + err.message); }
                target.innerText = "Save Workout";
            }
        });
        coachView.dataset.bound = "true";
    }
};

// 🟢 FIX: Safely execute the binder regardless of ES6 module load time
export const initCoachBindings = () => {
    bindCoachView();
};

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
    window.globalTeams = teams;
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

const showSeatHardLockModal = () => {
    if (typeof Swal === "undefined") {
        alert("Licensed roster seats are fully allocated. Contact your Director to upgrade.");
        return;
    }
    Swal.fire({
        title: "Roster seats at capacity",
        html: "<p style=\"margin:0;font-size:clamp(0.9rem, 2.5vw, 1.05rem);line-height:1.5;\">Your organization has used all licensed roster seats. Contact your <strong>Director</strong> to upgrade the club license.</p>",
        icon: "warning",
        iconColor: "#b45309",
        confirmButtonText: "Understood",
        allowOutsideClick: false,
        allowEscapeKey: true,
        focusConfirm: true,
        customClass: {
            popup: "swal-liquid-hardlock",
            confirmButton: "swal-liquid-hardlock__btn",
        },
        buttonsStyling: false,
        backdrop: "rgba(15, 23, 42, 0.72)",
    });
};

export const manualAddPlayer = async (reloadCallback) => {
    const name = document.getElementById("coachAddPlayerName").value.trim();
    const email = document.getElementById("coachAddPlayerEmail").value.trim().toLowerCase();
    const jerseyEl = document.getElementById("coachAddPlayerJersey");
    const jersey = jerseyEl ? jerseyEl.value.trim() : "";

    if (!name) return alert("Enter name");
    const tid = document.getElementById("adminTeamSelect").value;
    if (!tid) return alert("Select a team first.");

    try {
        const res = await secureAddPlayerFn({
            teamId: tid,
            playerName: name,
            playerEmail: email || undefined,
            jersey: jersey || undefined,
        });
        const data = res && res.data ? res.data : {};
        if (data.duplicate) {
            if (typeof Swal !== "undefined") {
                Swal.fire({
                    title: "Already on roster",
                    text: "That player name is already listed for this team.",
                    icon: "info",
                    confirmButtonColor: "#0f172a",
                });
            } else {
                alert("That player is already on the roster.");
            }
        } else {
            alert("Player Added");
        }
        document.getElementById("coachAddPlayerName").value = "";
        document.getElementById("coachAddPlayerEmail").value = "";
        if (jerseyEl) jerseyEl.value = "";
        if (reloadCallback) reloadCallback();
    } catch (err) {
        const code = err && err.code ? String(err.code) : "";
        if (code === "functions/resource-exhausted" || code === "resource-exhausted") {
            showSeatHardLockModal();
            return;
        }
        console.error("[coach.js] secureAddPlayer failed:", code, err && err.message);
        const msg =
            err && err.message ?
                err.message :
                "Could not add player. Try again or contact support.";
        if (typeof Swal !== "undefined") {
            Swal.fire({
                title: "Could not add player",
                text: msg,
                icon: "error",
                confirmButtonColor: "#0f172a",
            });
        } else {
            alert(msg);
        }
    }
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
    ['coachTabRoster', 'coachTabPlan', 'coachTabEvals', 'coachTabStrategy', 'coachTabTools', 'coachTabDesign'].forEach(id => {
        const pane = document.getElementById(id);
        const btn = document.getElementById(`btn-${id}`);
        if (pane) pane.classList.add('d-none');
        if (btn) btn.classList.remove('active');
    });
    document.getElementById(tabId).classList.remove('d-none');
    document.getElementById(`btn-${tabId}`).classList.add('active');

    // 🟢 WAKE UP THE CANVAS WHEN TAB IS CLICKED
    if (tabId === 'coachTabDesign' && spatialCanvas) {
        setTimeout(() => {
            const dropzone = document.getElementById('spatialPitchDropzone');
            if(dropzone) {
                spatialCanvas.setWidth(dropzone.offsetWidth);
                spatialCanvas.setHeight(dropzone.offsetHeight);
                spatialCanvas.renderAll();
            }
        }, 50); 
    }
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
export const initExportBinding = () => {
    const exportBtn = document.getElementById("exportXlsxBtn");
    if(exportBtn) {
        exportBtn.addEventListener("click", exportSessionData);
    }
};

export const initStrategyBoard = () => {
    const canvas = document.getElementById("strategyCanvas");
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let currentTool = 'pen'; 
    
    // Size the canvas correctly
    const resize = () => {
        const container = canvas.parentElement;
        if(container && container.offsetWidth > 0) {
            canvas.width = container.offsetWidth;
            canvas.height = container.offsetHeight || (container.offsetWidth * 0.75);
        }
    };
    window.addEventListener('resize', resize);
    setTimeout(resize, 500);

    // Toolbar Logic
    document.querySelectorAll('.strategy-tool-btn').forEach(btn => {
        if(btn.id === 'strategyClearBtn' || btn.id === 'strategyUndoBtn') return;
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.strategy-tool-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            if(btn.id.includes('Pen')) currentTool = 'pen';
            if(btn.id.includes('Arrow')) currentTool = 'arrow';
            if(btn.id.includes('X')) currentTool = 'X';
            if(btn.id.includes('O')) currentTool = 'O';
        });
    });

    document.getElementById("strategyClearBtn")?.addEventListener("click", () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    // Drawing Logic
    const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const startDraw = (e) => {
        isDrawing = true;
        const pos = getPos(e);
        const color = document.getElementById("strategyColor").value;
        
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        
        if(currentTool === 'pen' || currentTool === 'arrow') {
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
        } else if (currentTool === 'X') {
            ctx.font = "bold 24px Inter";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("X", pos.x, pos.y);
            isDrawing = false; 
        } else if (currentTool === 'O') {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 12, 0, 2 * Math.PI);
            ctx.stroke();
            isDrawing = false; 
        }
    };

    const draw = (e) => {
        if (!isDrawing) return;
        e.preventDefault(); 
        if(currentTool === 'pen' || currentTool === 'arrow') {
            const pos = getPos(e);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
        }
    };

    const endDraw = () => { isDrawing = false; };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', endDraw);
    canvas.addEventListener('mouseout', endDraw);
    
    canvas.addEventListener('touchstart', startDraw, {passive: false});
    canvas.addEventListener('touchmove', draw, {passive: false});
    canvas.addEventListener('touchend', endDraw);
    
    // Background Toggler
    const styleToggle = document.getElementById("strategyBoardStyleToggle");
    const pitchBg = document.getElementById("strategyPitchBg");
    if(styleToggle && pitchBg) {
        styleToggle.addEventListener("change", (e) => {
            if(e.target.checked) {
                pitchBg.style.background = "#ffffff"; 
            } else {
                pitchBg.style.background = ""; 
            }
        });
    }
};

// ==========================================
// EPIC 2: SPATIAL SCHEDULER (FABRIC.JS ENGINE)
// ==========================================
export let spatialCanvas = null;

export const initSpatialScheduler = () => {
    const canvasEl = document.getElementById('spatialCanvas');
    const dropzone = document.getElementById('spatialPitchDropzone');
    if (!canvasEl || !dropzone || spatialCanvas || typeof fabric === 'undefined') return;

    spatialCanvas = new fabric.Canvas('spatialCanvas', {
        selection: false,
        preserveObjectStacking: true
    });

    const spawnObject = (type, x, y) => {
        let text = "🟠"; let color = "#000"; let size = 24;

        if (type === 'cone') { text = "🟠"; size = 20; }
        else if (type === 'ball') { text = "⚽"; size = 18; }
        else if (type === 'goal') { text = "🥅"; size = 32; }
        else if (type === 'player_x') { text = "X"; color = "#b91c1c"; }
        else if (type === 'player_o') { text = "O"; color = "#0284c7"; }

        const obj = new fabric.Text(text, {
            left: x, top: y,
            fontSize: size, fill: color,
            fontFamily: 'Inter', fontWeight: '900',
            originX: 'center', originY: 'center',
            hasControls: false, hasBorders: true, borderColor: '#fbbf24',
            transparentCorners: false, hoverCursor: 'grab', moveCursor: 'grabbing'
        });

        spatialCanvas.add(obj);
        spatialCanvas.setActiveObject(obj);
    };

    dropzone.addEventListener('dragover', (e) => e.preventDefault());
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('text/plain');
        if (type) spawnObject(type, e.offsetX, e.offsetY);
    });

    document.querySelectorAll('.spatial-drag-item').forEach(item => {
        item.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', e.target.getAttribute('data-type')));
        item.addEventListener('click', (e) => spawnObject(e.target.getAttribute('data-type'), spatialCanvas.width / 2, spatialCanvas.height / 2));
    });

    const clearBtn = document.getElementById('spatialClearBtn');
    if (clearBtn) clearBtn.addEventListener('click', () => spatialCanvas.clear());
};