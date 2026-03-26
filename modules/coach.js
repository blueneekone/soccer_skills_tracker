// modules/coach.js
import { auth, db } from "../firebase-config.js";
import { collection, query, where, getDocs, doc, setDoc, getDoc, updateDoc, deleteDoc, writeBatch, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { renderTeamChart } from "./stats.js"; 

export let currentCoachTeamId = null;
export let allSessionsCache = [];

const setText = (id, text) => {
    const el = document.getElementById(id);
    if(el) el.innerText = text;
};

// --- SCHEDULE & HOMEWORK VIEW ---
export const loadCoachScheduleAndHW = async () => {
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
                let drillSummary = Array.isArray(hw.drills) ? `${hw.drills.length} Drills Assigned` : hw.drill;
                html += `<li class="session-item">
                    <div><b>${hw.player}</b><br><span style="font-size:10px; color:#ea580c;">Due: ${hw.dueDate}</span><br><span style="font-size:11px;">${drillSummary}</span></div>
                    <button class="delete-btn" onclick="window.deleteHomework('${d.id}')">✕</button>
                </li>`;
            }
        });
        cHw.innerHTML = html || "<li class='session-empty'>No active homework.</li>";
    }
};

window.deleteSchedule = async (id) => { if(confirm("Delete event?")) { await deleteDoc(doc(db, "schedules", id)); loadCoachScheduleAndHW(); } };
window.deleteHomework = async (id) => { if(confirm("Delete assignment?")) { await deleteDoc(doc(db, "assignments", id)); loadCoachScheduleAndHW(); } };
window.completeHomework = async (id) => { await updateDoc(doc(db, "assignments", id), { status: "completed" }); };

// --- MAIN DASHBOARD LOADER ---
export const initCoachDropdown = (isDirector, teams, updateCallback) => {
    const sel = document.getElementById("adminTeamSelect");
    if(!sel) return;
    document.getElementById("adminControls").style.display = 'block';
    sel.innerHTML = "";
    teams.forEach(t => { const o = document.createElement("option"); o.value=t.id; o.textContent=t.name; sel.appendChild(o); });
    sel.onchange = () => loadCoachDashboard(isDirector, teams, updateCallback);
    if(teams.length > 0) { sel.value = teams[0].id; loadCoachDashboard(isDirector, teams, updateCallback); }
};

export const loadCoachDashboard = async (isDirector, teams, updateCallback) => {
    const tid = document.getElementById("adminTeamSelect").value;
    if(!tid) return;
    currentCoachTeamId = tid; 
    
    const userEmail = auth.currentUser.email.toLowerCase();
    const currentTeam = teams.find(t => t.id === tid);
    const isManager = isDirector || (currentTeam && currentTeam.coachEmail.toLowerCase() === userEmail);
    
    const staffCard = document.getElementById("cardStaffManager");
    if(staffCard) {
        staffCard.style.display = isManager ? 'block' : 'none';
        if(isManager) renderAssistantList(currentTeam);
    }

    const listEl = document.getElementById("coachPlayerList");
    if(listEl) listEl.innerHTML = "Fetching...";

    try {
        const q = query(collection(db, "reps"));
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
        let rosterJerseys = (rosterSnap.exists() && rosterSnap.data().jerseys) ? rosterSnap.data().jerseys : {};
        
        const linkQuery = query(collection(db, "player_lookup"), where("teamId", "==", tid));
        const linkSnap = await getDocs(linkQuery);
        const linkedPlayers = new Set();
        linkSnap.forEach(doc => linkedPlayers.add(doc.data().playerName));

        const combinedSet = new Set([...rosterNames, ...Object.keys(players)]);
        const combinedList = Array.from(combinedSet).sort();

        // --- NEW WEEKLY SUMMARY LOGIC ---
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        let weeklyStats = {};
        combinedList.forEach(p => weeklyStats[p] = 0);

        allSessionsCache.forEach(d => {
            const logDate = d.timestamp.toDate();
            if (logDate >= sevenDaysAgo && combinedList.includes(d.player)) {
                weeklyStats[d.player] += Number(d.minutes);
            }
        });

        const weeklyTableBody = document.querySelector("#weeklySummaryTable tbody");
        if(weeklyTableBody) {
            if(combinedList.length === 0) {
                weeklyTableBody.innerHTML = '<tr><td colspan="3" class="text-center" style="color:#999; padding:10px;">No players on roster</td></tr>';
            } else {
                weeklyTableBody.innerHTML = combinedList.map(p => {
                    const mins = weeklyStats[p] || 0;
                    let status = '<span style="color:#dc2626; font-weight:bold;">No Data</span>';
                    if (mins >= 45) status = '<span style="color:#16a34a; font-weight:bold;">✔ On Track</span>';
                    else if (mins > 0) status = '<span style="color:#ea580c; font-weight:bold;">Started</span>';
                    return `<tr>
                        <td style="font-weight:bold; color:var(--text-dark);">${p}</td>
                        <td style="font-weight:bold; color:var(--aggie-blue);">${mins}m</td>
                        <td>${status}</td>
                    </tr>`;
                }).join("");
            }
        }
        // --- END WEEKLY SUMMARY ---

        // Dropdowns
        const hwList = document.getElementById("hwPlayerChecklistItems");
        if(hwList) {
            if(combinedList.length > 0) {
                hwList.innerHTML = combinedList.map(p => `
    <label class="premium-checkbox-item">
        <input type="checkbox" class="hw-player-cb hidden-cb" value="${p}">
        <div class="cb-custom-pill">${p}</div>
    </label>
`).join("");
            } else {
                hwList.innerHTML = "<div style='color:#999; font-size:12px;'>No players on roster</div>";
            }
        }

        const checkAll = document.getElementById("hwSelectAllPlayers");
        if (checkAll && checkAll.dataset.bound !== "true") {
            checkAll.addEventListener("change", (e) => {
                document.querySelectorAll(".hw-player-cb").forEach(cb => cb.checked = e.target.checked);
            });
            checkAll.dataset.bound = "true";
        }
        // HW list initialized
        
        const evalPlayer = document.getElementById("evalPlayerSelect");
        if(evalPlayer) evalPlayer.innerHTML = combinedList.length > 0 ? '<option value="" disabled selected>Select Player...</option>' + combinedList.map(p => `<option value="${p}">${p}</option>`).join("") : `<option value="">No players on roster</option>`;

        loadCoachScheduleAndHW();
        loadRecentTrials(tid);
        const cPlayerSelect = document.getElementById("coachTrialPlayerSelect");
        if(cPlayerSelect) cPlayerSelect.innerHTML = combinedList.length > 0 ? combinedList.map(p => `<option value="${p}">${p}</option>`).join("") : `<option value="">No players on roster</option>`;
        if(updateCallback) updateCallback();

        if(listEl) {
            if(combinedList.length > 0) {
                listEl.innerHTML = combinedList.map(p => {
                    const stats = players[p] || { mins: 0, lastActive: null };
                    const lastDate = stats.lastActive ? stats.lastActive.toLocaleDateString() : "Inactive";
                    const isLinked = linkedPlayers.has(p);
                    const linkButton = isLinked ? `<button class="link-btn" style="background:#dcfce7; color:#166534; border-color:#86efac; cursor:default;">✔ Linked</button>` : `<button class="link-btn" onclick="window.linkParent('${p}')">Link Parent</button>`;
                    const jerseyStr = rosterJerseys[p] ? `<span style="background:var(--aggie-gold); color:var(--aggie-blue); border-radius:3px; padding:1px 5px; font-size:10px; margin-right:5px; font-weight:bold;">#${rosterJerseys[p]}</span>` : "";
                    
                    return `<div style="padding:10px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
                        <div><b>${jerseyStr}${p}</b> <div style="font-size:10px; color:#666;">Last: ${lastDate}</div></div>
                        <div>
                            <span style="font-size:12px; font-weight:bold; color:#00263A; margin-right:5px;">${stats.mins}m</span>
                            ${linkButton}
                            <button class="secondary-btn" style="padding: 2px 6px; font-size: 10px; margin-left:5px;" onclick="window.editPlayerJersey('${p}', '${rosterJerseys[p]||''}')">#</button>
                            <button class="delete-btn" style="margin-left:5px;" onclick="window.deletePlayer('${p}')">x</button>
                        </div>
                    </div>`;
                }).join("");
                
                // Initialize Gameday Roster Pitch Layout
                if (window.initGamedayRoster) window.initGamedayRoster(tid, combinedList, rosterJerseys);
            } else {
                listEl.innerHTML = "<div style='padding:10px; color:#999;'>No players found in database. Upload a PDF roster or add manually above.</div>";
            }
        }
        
        window.loadWorkouts();
    } catch(e) { console.error(e); }
};

// --- ROSTER & EXPORT LOGIC ---
const renderAssistantList = (team) => {
    const c = document.getElementById("assistantList");
    if(!team || !team.assistants || team.assistants.length === 0) return c.innerHTML = "No assistants added.";
    c.innerHTML = team.assistants.map(email => `<div style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding:5px;"><span>${email}</span><button class="delete-btn" onclick="window.removeAssistant('${email}')">Remove</button></div>`).join("");
};

export const addAssistant = async (teams, reloadDashboardCallback) => {
    const email = document.getElementById("newAssistantEmail").value.trim().toLowerCase();
    if(!email || !email.includes("@")) return alert("Enter a valid email.");
    const teamIdx = teams.findIndex(t => t.id === currentCoachTeamId);
    if(teamIdx === -1) return;
    if(!teams[teamIdx].assistants) teams[teamIdx].assistants = [];
    if(teams[teamIdx].assistants.includes(email)) return alert("User already added.");
    teams[teamIdx].assistants.push(email);
    await setDoc(doc(db, "config", "teams"), { list: teams });
    alert("Assistant Added!");
    document.getElementById("newAssistantEmail").value = "";
    reloadDashboardCallback();
};

window.removeAssistant = async (email, teams, reloadDashboardCallback) => {
    if(!confirm(`Revoke for ${email}?`)) return;
    const teamIdx = teams.findIndex(t => t.id === currentCoachTeamId);
    teams[teamIdx].assistants = teams[teamIdx].assistants.filter(e => e !== email);
    await setDoc(doc(db, "config", "teams"), { list: teams });
    if(reloadDashboardCallback) reloadDashboardCallback();
};

window.deletePlayer = async (name, reloadCallback) => {
    if(!confirm(`Remove ${name}?`)) return;
    const ref = doc(db, "rosters", document.getElementById("adminTeamSelect").value);
    const snap = await getDoc(ref);
    if(snap.exists()) {
        await updateDoc(ref, { players: snap.data().players.filter(p => p !== name) });
        if(reloadCallback) reloadCallback();
    }
};

window.editPlayerJersey = async (name, currentJersey) => {
    let num = prompt(`Enter new jersey number for ${name} (or leave blank to clear):`, currentJersey);
    if(num === null) return; // User cancelled
    num = num.trim();
    
    // We update the DB document for current roster
    const ref = doc(db, "rosters", currentCoachTeamId);
    const snap = await getDoc(ref);
    if(snap.exists()) {
        const data = snap.data();
        let jerseys = data.jerseys || {};
        if(num === "") {
            delete jerseys[name];
        } else {
            jerseys[name] = num;
        }
        await updateDoc(ref, { jerseys: jerseys });
        
        // Reload dashboard roster efficiently
        window.loadCoachDashboard(false, window.globalTeams); // use false so it uses current dropdown state
    }
};

window.loadWorkouts = () => {
    const list = document.getElementById("WorkoutList");
    if(!list) return;
    if(!window.Workouts || window.Workouts.length === 0) {
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
                ${w.video ? `<a href="${w.video}" target="_blank" style="font-size:11px; color:var(--orange-primary); font-weight:bold; display:inline-block; margin-top:6px;">▶ Watch Video</a>` : ''}
            </div>
            <button class="delete-btn" style="margin-left:10px;" onclick="window.deleteWorkout('${w.id}')">✕</button>
        </li>
    `).join("");
};

window.deleteWorkout = async (id) => {
    if(!confirm("Delete this workout?")) return;
    if(!id) return alert("Cannot delete a workout without an ID.");
    await deleteDoc(doc(db, "workouts", id));
    await window.fetchWorkouts(currentCoachTeamId);
    window.buildCoachDropdowns();
    window.loadWorkouts();
};

window.addWorkout = async () => {
    const name = document.getElementById("manageWorkoutName").value.trim();
    const type = document.getElementById("manageWorkoutType").value;
    const reqLevel = parseInt(document.getElementById("manageWorkoutLevel").value) || 1;
    const drill = document.getElementById("manageWorkoutDesc").value.trim();
    const video = document.getElementById("manageWorkoutVideo").value.trim();
    
    if(!name || !type) return alert("Workout Name and Category are required.");
    
    await addDoc(collection(db, "workouts"), {
        name, type, reqLevel, drill, video, teamId: currentCoachTeamId
    });
    
    alert("Workout Saved!");
    document.getElementById("manageWorkoutName").value = "";
    document.getElementById("manageWorkoutDesc").value = "";
    document.getElementById("manageWorkoutVideo").value = "";
    
    await window.fetchWorkouts(currentCoachTeamId);
    window.buildCoachDropdowns();
    window.loadWorkouts();
};

window.linkParent = async (playerName, reloadCallback) => {
    const email = prompt(`Enter parent email for ${playerName}:`);
    if(email && email.includes("@")) {
        await setDoc(doc(db, "player_lookup", email.toLowerCase()), { teamId: document.getElementById("adminTeamSelect").value, playerName: playerName });
        alert(`Linked!`);
        if(reloadCallback) reloadCallback();
    }
};

export const manualAddPlayer = async (reloadCallback) => {
    const name = document.getElementById("coachAddPlayerName").value.trim();
    const email = document.getElementById("coachAddPlayerEmail").value.trim().toLowerCase();
    const jerseyEl = document.getElementById("coachAddPlayerJersey");
    const jersey = jerseyEl ? jerseyEl.value.trim() : "";
    
    if(!name) return alert("Enter name");
    const tid = document.getElementById("adminTeamSelect").value;
    const ref = doc(db, "rosters", tid);
    const snap = await getDoc(ref);
    let list = snap.exists() ? snap.data().players || [] : [];
    let jerseys = snap.exists() ? snap.data().jerseys || {} : {};
    
    if(!list.includes(name)) list.push(name);
    if(jersey) jerseys[name] = jersey;
    
    await setDoc(ref, { players: list, jerseys: jerseys }, { merge: true });
    if(email) await setDoc(doc(db, "player_lookup", email), { teamId: tid, playerName: name });
    
    alert("Player Added");
    document.getElementById("coachAddPlayerName").value = "";
    document.getElementById("coachAddPlayerEmail").value = "";
    if (jerseyEl) jerseyEl.value = "";
    if(reloadCallback) reloadCallback();
};

export const parsePDF = async (e) => {
    const f = e.target.files[0]; if(!f) return;
    const txtBox = document.getElementById("rosterTextRaw");
    if(txtBox) txtBox.value = "Reading...";
    document.getElementById("rosterReviewArea").style.display='block';
    try {
        const buf = await f.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument(buf).promise;
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
    } catch(err) { alert("PDF Error: " + err.message); }
};

export const saveRosterList = async (reloadCallback) => {
    const tid = currentCoachTeamId;
    if(!tid) return alert("No team selected");
    const lines = document.getElementById("rosterTextRaw").value.split("\n");
    const cleanNames = [];
    const batch = writeBatch(db);
    lines.forEach(line => {
        if(line.includes("|")) {
            const [name, email] = line.split("|").map(s=>s.trim());
            cleanNames.push(name);
            if(email.includes("@")) batch.set(doc(db, "player_lookup", email.toLowerCase()), { teamId: tid, playerName: name });
        } else if(line.trim()) cleanNames.push(line.trim());
    });
    await setDoc(doc(db, "rosters", tid), { players: cleanNames, lastUpdated: new Date() });
    await batch.commit();
    alert("Roster Saved!");
    document.getElementById("rosterReviewArea").style.display='none';
    if(reloadCallback) reloadCallback();
};

export const exportSessionData = () => {
    if(allSessionsCache.length === 0) return alert("No sessions to export.");
    if (typeof window.XLSX === 'undefined') return alert("XLSX Library not loaded.");
    const formatted = allSessionsCache.map(r => ({
        Date: new Date(r.timestamp.seconds*1000).toLocaleDateString(),
        Player: r.player,
        Minutes: r.minutes,
        Drills: r.drillSummary,
        Feedback: r.outcome
    }));
    const ws = window.XLSX.utils.json_to_sheet(formatted);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "Workouts");
    window.XLSX.writeFile(wb, "Aggies_Workouts.xlsx");
};

export const loadRecentTrials = async (tid) => {
    const list = document.getElementById("coachRecentTrialList");
    if(!list) return;
    if(!tid) return list.innerHTML = "<li class='session-empty'>Select a team.</li>";
    
    try {
        const q = query(collection(db, "trials"), where("teamId", "==", tid));
        const snap = await getDocs(q);
        const trials = [];
        snap.forEach(d => trials.push({ id: d.id, ...d.data() }));
        trials.sort((a,b) => b.timestamp.seconds - a.timestamp.seconds);
        const recent = trials.slice(0, 10); 

        if(recent.length === 0) return list.innerHTML = "<li class='session-empty'>No recent trials submitted.</li>";

        list.innerHTML = recent.map(t => `
            <li class="session-item recent-trial-item">
                <div class="flex-1">
                    <span class="recent-trial-name">${t.player}</span> 
                    <span class="recent-trial-date">(${new Date(t.timestamp.seconds*1000).toLocaleDateString()})</span><br>
                    <span class="recent-trial-label">${t.type}:</span> 
                    <span class="recent-trial-val">${t.skill}</span>
                </div>
                <div class="recent-trial-right">
                    <span class="recent-trial-scores">[${t.a1}, ${t.a2}, ${t.a3}]</span>
                    <span class="recent-trial-final">${t.result} ${t.isCoach ? '⭐' : ''}</span>
                </div>
            </li>
        `).join("");
    } catch(e) { console.error(e); }
};

window.submitCoachTrial = async () => {
    const tid = currentCoachTeamId;
    const player = document.getElementById("coachTrialPlayerSelect").value;
    const type = document.getElementById("coachTrialType").value;
    const skill = document.getElementById("coachTrialSkill").value;
    const a1 = parseFloat(document.getElementById("coachTrial1").value) || 0;
    const a2 = parseFloat(document.getElementById("coachTrial2").value) || 0;
    const a3 = parseFloat(document.getElementById("coachTrial3").value) || 0;
    
    if(!player || !skill || a1 === 0) return alert("Please fill out the player, skill, and at least Score 1.");

    let result = "0";
    if(type === "Time") {
        const times = [a1, a2, a3].filter(t => t > 0);
        result = (times.length > 0 ? Math.min(...times) : 0) + "s";
    } else {
        result = (a1 + a2 + a3).toString();
    }

    try {
        await addDoc(collection(db, "trials"), {
            player: player, teamId: tid, type: type, skill: skill,
            a1: a1, a2: a2, a3: a3, result: result,
            timestamp: new Date(),
            isCoach: true 
        });
        alert("Official Coach Trial Logged!");
        document.getElementById("coachTrialSkill").value = "";
        document.getElementById("coachTrial1").value = "";
        document.getElementById("coachTrial2").value = "";
        document.getElementById("coachTrial3").value = "";
        loadRecentTrials(tid);
    } catch(e) { alert("Error saving: " + e.message); }
};

// --- COACH DASHBOARD TABS ---
window.switchCoachTab = (tabId) => {
    ['coachTabRoster', 'coachTabPlan', 'coachTabEvals', 'coachTabStrategy', 'coachTabTools'].forEach(id => {
        const pane = document.getElementById(id);
        const btn = document.getElementById(`btn-${id}`);
        if(pane) pane.classList.add('d-none');
        if(btn) btn.classList.remove('active');
    });
    document.getElementById(tabId).classList.remove('d-none');
    document.getElementById(`btn-${tabId}`).classList.add('active');
};

window.initGamedayRoster = async (tid, playerList, jerseys) => {
    const benchSel = document.getElementById("benchSelect");
    const pitch = document.getElementById("pitchPinsContainer");
    if(!benchSel || !pitch) return;
    
    pitch.innerHTML = "";
    
    let saved = {};
    try {
        const snap = await getDoc(doc(db, "gameday_rosters", tid));
        if(snap.exists()) saved = snap.data().positions || {};
    } catch(e) { console.warn("Could not load pitch layout", e); }
    
    const updateBenchDropdown = () => {
        const onPitch = Array.from(pitch.children).map(x => x.dataset.player);
        const available = playerList.filter(p => !onPitch.includes(p));
        if(available.length === 0) {
            benchSel.innerHTML = "<option value=''>All players on pitch</option>";
            benchSel.disabled = true;
        } else {
            benchSel.innerHTML = "<option value=''>-- Select Player --</option>" + 
                available.map(p => `<option value="${p}">${p} #${jerseys[p]||''}</option>`).join("");
            benchSel.disabled = false;
        }
    };
    
    let activePin = null;
    let dragDidMove = false;
    
    const onMove = (e) => {
        if(!activePin) return;
        dragDidMove = true;
        e.preventDefault();
        const pt = e.touches ? e.touches[0] : e;
        const pitchRect = pitch.getBoundingClientRect();
        let x = pt.clientX - pitchRect.left;
        let y = pt.clientY - pitchRect.top;
        activePin.style.left = `${(x / pitchRect.width) * 100}%`;
        activePin.style.top = `${(y / pitchRect.height) * 100}%`;
    };
    
    const onEnd = () => {
        if(!activePin) return;
        activePin.style.transform = `translate(-50%, -50%) scale(1)`;
        activePin.style.zIndex = "10";
        activePin = null;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onEnd);
        document.removeEventListener("touchmove", onMove);
        document.removeEventListener("touchend", onEnd);
        
        // Reset move flag after a short delay so click listeners can evaluate standard taps
        setTimeout(() => { dragDidMove = false; }, 50);
    };
    
    const startDrag = (e, pin) => {
        activePin = pin;
        dragDidMove = false;
        activePin.style.zIndex = 100;
        activePin.style.transform = `translate(-50%, -50%) scale(1.2)`;
        document.addEventListener("mousemove", onMove, {passive: false});
        document.addEventListener("mouseup", onEnd);
        document.addEventListener("touchmove", onMove, {passive: false});
        document.addEventListener("touchend", onEnd);
    };

    const spawnPin = (p, x, y) => {
        const pin = document.createElement("div");
        pin.className = "player-pin";
        pin.innerHTML = `${jerseys[p] || p.substring(0,2).toUpperCase()}<div style="position:absolute; top:110%; left:50%; transform:translateX(-50%); font-size:10px; background:rgba(0,0,0,0.7); color:#fff; padding:2px 5px; border-radius:4px; white-space:nowrap; pointer-events:none; font-weight:normal;">${p}</div>`;
        pin.title = p;
        pin.dataset.player = p;
        pin.style.position = "absolute";
        pin.style.left = x || "50%";
        pin.style.top = y || "50%";
        pin.style.transform = `translate(-50%, -50%)`;
        pin.style.zIndex = "10";
        
        pin.addEventListener("mousedown", (e) => startDrag(e, pin));
        pin.addEventListener("touchstart", (e) => startDrag(e, pin), {passive: false});
        
        pin.onclick = (e) => {
            if(!dragDidMove && confirm(`Send ${p} to bench?`)) {
                pin.remove();
                updateBenchDropdown();
            }
        };
        
        pitch.appendChild(pin);
        updateBenchDropdown();
    };

    playerList.forEach(p => {
        if (saved[p]) spawnPin(p, saved[p].x, saved[p].y);
    });
    updateBenchDropdown();

    const addBtn = document.getElementById("addToPitchBtn");
    if(addBtn) addBtn.onclick = () => {
        const p = benchSel.value;
        if(p) spawnPin(p, "50%", "50%");
    };
    
    const ejBtn = document.getElementById("editJerseysBtn");
    if(ejBtn) ejBtn.onclick = () => {
        const m = document.getElementById("jerseyEditorModal");
        const list = document.getElementById("jerseyEditorList");
        list.innerHTML = playerList.map(p => `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:14px;">${p}</span>
                <input type="text" id="jinp_${p.replace(/[^a-zA-Z0-9]/g,'')}" value="${jerseys[p]||''}" style="width:60px; padding:4px; text-align:center;">
            </div>
        `).join("");
        m.classList.remove("d-none");
    };
    
    const sjBtn = document.getElementById("saveJerseysBtn");
    if(sjBtn) sjBtn.onclick = async () => {
        sjBtn.innerText = "Saving...";
        const newJ = { ...jerseys };
        playerList.forEach(p => {
            const val = document.getElementById("jinp_" + p.replace(/[^a-zA-Z0-9]/g,''))?.value;
            if(val !== undefined) newJ[p] = val.trim();
        });
        await setDoc(doc(db, "team_jerseys", tid), { map: newJ });
        alert("Jerseys saved! Return to the Dashboard and reload to see updates.");
        document.getElementById("jerseyEditorModal").classList.add("d-none");
        sjBtn.innerText = "Save Numbers";
    };

    const saveBtn = document.getElementById("saveGamedayRosterBtn");
    if(saveBtn) saveBtn.onclick = async () => {
        const positions = {};
        document.querySelectorAll("#pitchPinsContainer .player-pin").forEach(pin => {
            positions[pin.dataset.player] = { x: pin.style.left, y: pin.style.top };
        });
        saveBtn.innerText = "Saving...";
        await setDoc(doc(db, "gameday_rosters", tid), { positions, updated: new Date() });
        saveBtn.innerText = "Saved!";
        setTimeout(() => saveBtn.innerText = "Save Pitch Layout", 2000);
    };
};

export const initStrategyBoard = () => {
    const canvas = document.getElementById("strategyCanvas");
    if (!canvas) return;
    
    const styleToggle = document.getElementById("strategyBoardStyleToggle");
    if(styleToggle && styleToggle.dataset.bound !== "true") {
        styleToggle.addEventListener("change", (e) => {
            const mode = e.target.checked ? 'whiteboard' : 'realistic';
            if(window.applySportCourt) window.applySportCourt(window.currentCourtType, mode, ["strategyPitchBg"], ["strategyPitchLines"]);
        });
        styleToggle.dataset.bound = "true";
    }

    const fsBtn = document.getElementById("strategyFullscreenBtn");
    if(fsBtn && fsBtn.dataset.bound !== "true") {
        fsBtn.addEventListener("click", () => {
            const el = document.getElementById("strategyBoardCard");
            if (!document.fullscreenElement) {
                if (el.requestFullscreen) el.requestFullscreen().catch(err => console.log(err));
                else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
            } else {
                if (document.exitFullscreen) document.exitFullscreen();
                else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            }
        });
        fsBtn.dataset.bound = "true";
        
        document.addEventListener('fullscreenchange', () => {
            const isFS = !!document.fullscreenElement;
            const bg = document.getElementById("strategyPitchBg");
            if(isFS) {
                bg.style.position = "fixed";
                bg.style.top = "0";
                bg.style.left = "0";
                bg.style.width = "100vw";
                bg.style.height = "100vh";
                bg.style.zIndex = "9999";
                bg.style.margin = "0";
                bg.style.borderRadius = "0";
                bg.style.aspectRatio = "unset";
            } else {
                bg.style.position = "relative";
                bg.style.width = "100%";
                bg.style.height = "auto";
                bg.style.aspectRatio = "4/3";
                bg.style.margin = "0";
                bg.style.borderRadius = "8px";
                bg.style.zIndex = "1";
            }
            setTimeout(resizeCanvas, 50);
            setTimeout(resizeCanvas, 200);
        });
    }
    
    let currentTool = "pen";
    ['Pen', 'Arrow', 'X', 'O'].forEach(t => {
        const btn = document.getElementById(`strategyTool${t}`);
        if(btn) {
            btn.onclick = () => {
                document.querySelectorAll("#coachTabStrategy .secondary-btn").forEach(b => {
                    if(b.id && b.id.startsWith("strategyTool")) { b.classList.remove("active"); b.style.background = ""; }
                });
                btn.classList.add("active");
                btn.style.background = "#e2e8f0";
                currentTool = t.toLowerCase();
            };
        }
    });
    
    const uBtn = document.getElementById("strategyUndoBtn");
    if(uBtn) uBtn.onclick = () => { strokes.pop(); redrawStrokes(); };
    
    const cBtn = document.getElementById("strategyClearBtn");
    if(cBtn) cBtn.onclick = () => { strokes = []; redrawStrokes(); };

    const resizeCanvas = () => {
        const rect = canvas.parentElement.getBoundingClientRect();
        if(rect.width > 0 && rect.height > 0) { 
            canvas.width = rect.width; 
            canvas.height = rect.height; 
            redrawStrokes(); 
        }
    };
    
    window.addEventListener("resize", resizeCanvas);
    if(window.ResizeObserver) new ResizeObserver(resizeCanvas).observe(canvas.parentElement);
    
    const ctx = canvas.getContext("2d");
    let isDrawing = false;
    let strokes = [];
    let currentStroke = null;
    
    const getNormalizedPos = (e) => {
        const r = canvas.getBoundingClientRect();
        const evt = e.touches ? e.touches[0] : e;
        return { 
            nx: (evt.clientX - r.left) / canvas.width, 
            ny: (evt.clientY - r.top) / canvas.height 
        };
    };
    
    const drawLine = (p1, p2, color) => {
        ctx.beginPath();
        ctx.moveTo(p1.nx * canvas.width, p1.ny * canvas.height);
        ctx.lineTo(p2.nx * canvas.width, p2.ny * canvas.height);
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
    };

    const drawDashedArrow = (p1, p2, color) => {
        const startX = p1.nx * canvas.width; const startY = p1.ny * canvas.height;
        const endX = p2.nx * canvas.width; const endY = p2.ny * canvas.height;
        ctx.beginPath();
        ctx.setLineDash([10, 10]);
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.setLineDash([]);
        
        const angle = Math.atan2(endY - startY, endX - startX);
        const headlen = 15;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - headlen * Math.cos(angle - Math.PI / 6), endY - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(endX - headlen * Math.cos(angle + Math.PI / 6), endY - headlen * Math.sin(angle + Math.PI / 6));
        ctx.lineTo(endX, endY);
        ctx.fillStyle = color;
        ctx.fill();
    };

    const drawStamp = (p, type, color) => {
        const x = p.nx * canvas.width;
        const y = p.ny * canvas.height;
        ctx.font = "bold 32px sans-serif";
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        if (type === 'x') {
            ctx.fillText("X", x, y);
        } else if (type === 'o') {
            ctx.fillText("O", x, y);
        }
    };
    
    const redrawStrokes = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        strokes.forEach(s => {
            if (s.tool === 'pen') {
                for(let i=1; i<s.points.length; i++) drawLine(s.points[i-1], s.points[i], s.color);
            } else if (s.tool === 'arrow') {
                if(s.points.length >= 2) {
                    drawDashedArrow(s.points[0], s.points[s.points.length-1], s.color);
                } else {
                    const fallback = { nx: s.points[0].nx, ny: s.points[0].ny - 0.08 };
                    drawDashedArrow(s.points[0], fallback, s.color);
                }
            } else if (s.tool === 'x' || s.tool === 'o') {
                drawStamp(s.points[0], s.tool, s.color);
            }
        });
        if (isDrawing && currentStroke) {
            if (currentStroke.tool === 'pen') {
                for(let i=1; i<currentStroke.points.length; i++) drawLine(currentStroke.points[i-1], currentStroke.points[i], currentStroke.color);
            } else if (currentStroke.tool === 'arrow') {
                if(currentStroke.points.length >= 2) drawDashedArrow(currentStroke.points[0], currentStroke.points[currentStroke.points.length-1], currentStroke.color);
            }
        }
    };
    const startDrawing = (e) => {
        if(e.button !== undefined && e.button !== 0) return;
        // Do not prevent default completely on touch devices immediately, 
        // to allow standard screen taps, but prevent scrolling.
        
        if(canvas.width === 0) resizeCanvas();
        
        const pt = e.touches ? e.touches[0] : e;
        const color = document.getElementById("strategyColor").value || "#ffeb3b";
        let r = canvas.getBoundingClientRect();
        
        let p = { 
            nx: (pt.clientX - r.left) / canvas.width, 
            ny: (pt.clientY - r.top) / canvas.height 
        };
        
        currentStroke = { tool: currentTool, color: color, points: [p] };
        isDrawing = true;

        if (currentTool === 'x' || currentTool === 'o') {
            strokes.push(currentStroke);
            currentStroke = null;
            isDrawing = false;
            redrawStrokes();
        }
    };

    const draw = (e) => {
        if (!isDrawing) return;
        if(e.type.startsWith('touch')) e.preventDefault(); // Only prevent default if actively dragging/drawing
        
        const pt = e.touches ? e.touches[0] : e;
        let r = canvas.getBoundingClientRect();
        let p = { 
            nx: (pt.clientX - r.left) / canvas.width, 
            ny: (pt.clientY - r.top) / canvas.height 
        };
        
        currentStroke.points.push(p);
        redrawStrokes();
    };
    
    const stopDrawing = () => {
        if (!isDrawing) return;
        isDrawing = false;
        if (currentStroke && currentStroke.points.length > 0) strokes.push(currentStroke);
        currentStroke = null;
        redrawStrokes();
    };
    
    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    window.addEventListener("mouseup", stopDrawing);
    canvas.addEventListener("touchstart", startDrawing, {passive: false});
    canvas.addEventListener("touchmove", draw, {passive: false});
    window.addEventListener("touchend", stopDrawing);
    
    document.getElementById("strategyUndoBtn")?.addEventListener("click", () => {
        strokes.pop();
        redrawStrokes();
    });
    
    document.getElementById("strategyClearBtn")?.addEventListener("click", () => {
        strokes = [];
        redrawStrokes();
    });
    
    setTimeout(resizeCanvas, 300);
};