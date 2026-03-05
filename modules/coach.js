// modules/coach.js
import { auth, db } from "../firebase-config.js";
import { collection, query, where, getDocs, doc, setDoc, getDoc, updateDoc, deleteDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { renderTeamChart } from "./stats.js"; // Pulls chart visual from the stats module!

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
        const hwPlayer = document.getElementById("hwPlayerSelect");
        if(hwPlayer) hwPlayer.innerHTML = combinedList.length > 0 ? combinedList.map(p => `<option value="${p}">${p}</option>`).join("") : `<option value="">No players on roster</option>`;
        
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
                    return `<div style="padding:10px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
                        <div><b>${p}</b> <div style="font-size:10px; color:#666;">Last: ${lastDate}</div></div>
                        <div><span style="font-size:12px; font-weight:bold; color:#00263A; margin-right:5px;">${stats.mins}m</span>${linkButton}<button class="delete-btn" onclick="window.deletePlayer('${p}')">x</button></div></div>`;
                }).join("");
            } else {
                listEl.innerHTML = "<div style='padding:10px; color:#999;'>No players found in database. Upload a PDF roster or add manually above.</div>";
            }
        }
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
            <li class="session-item" style="border-left: 4px solid #dc2626; align-items:center;">
                <div style="flex:1;">
                    <b style="color:var(--aggie-blue);">${t.player}</b> <span style="font-size:10px; color:#64748b;">(${new Date(t.timestamp.seconds*1000).toLocaleDateString()})</span><br>
                    <span style="font-size:12px; font-weight:bold;">${t.type}:</span> <span style="font-size:12px;">${t.skill}</span>
                </div>
                <div style="text-align:right;">
                    <span style="font-size:10px; color:#94a3b8;">[${t.a1}, ${t.a2}, ${t.a3}]</span><br>
                    <b style="color:#dc2626; font-size:14px;">${t.result} ${t.isCoach ? '⭐' : ''}</b>
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