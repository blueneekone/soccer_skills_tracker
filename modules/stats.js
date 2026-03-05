// modules/stats.js
import { db } from "../firebase-config.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let teamChart = null;
let playerChart = null;

// Local helper to set text
const setText = (id, text) => {
    const el = document.getElementById(id);
    if(el) el.innerText = text;
};

export const renderCalendar = (logs) => {
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
};

export const renderPlayerTrendChart = (logs) => {
    const cvs = document.getElementById('playerTrendChart'); 
    if(!cvs) return;
    const ctx = cvs.getContext('2d'); 
    if(playerChart) playerChart.destroy(); 
    
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
    
    playerChart = new window.Chart(ctx, { 
        type: 'bar', 
        data: { labels: labels, datasets: [{ data: data, backgroundColor: "#00263A", borderRadius: 4 }] }, 
        options: { plugins: { legend: {display:false} }, scales: { x: {grid:{display:false}}, y:{beginAtZero:true} } } 
    });
};

export const renderTeamChart = (logs) => {
    const cvs = document.getElementById('teamChart'); 
    if(!cvs) return;
    const ctx = cvs.getContext('2d'); 
    if(teamChart) teamChart.destroy();

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
    
    teamChart = new window.Chart(ctx, { 
        type: 'bar', 
        data: { labels: labels, datasets: [{ label: 'Total Team Minutes', data: data, backgroundColor: "#00263A", borderRadius: 4 }] }, 
        options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true } } } 
    });
};

export const renderTeamLeaderboard = async (tid, logsOverride = []) => {
    const table = document.getElementById("teamLeaderboardTable"); if(!table) return;
    let stats = {};
    if (!tid) { 
        logsOverride.forEach(d => { const p = d.player; stats[p] = (stats[p] || 0) + Number(d.minutes); }); 
    } else { 
        const q = query(collection(db, "reps"), where("teamId", "==", tid)); 
        const snap = await getDocs(q); 
        snap.forEach(d => { const p = d.data().player; stats[p] = (stats[p] || 0) + Number(d.data().minutes); }); 
    }
    table.querySelector("tbody").innerHTML = Object.entries(stats).sort((a,b)=>b[1]-a[1]).slice(0,5).map((e,i) => `<tr><td class="rank-${i+1}">${i+1}</td><td>${e[0]}</td><td>${e[1]}m</td></tr>`).join("");
};

export const loadPlayerFeedback = async (userProfile) => {
    if (!userProfile || userProfile.role === 'admin') return; 

    const list = document.getElementById("playerEvalList");
    if (!list) return;

    try {
        const q = query(collection(db, "evaluations"), where("player", "==", userProfile.playerName));
        const snap = await getDocs(q);
        const evals = [];
        snap.forEach(d => evals.push({ id: d.id, ...d.data() }));

        evals.sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);

        if (evals.length === 0) {
            list.innerHTML = '<li class="session-empty">No coach evaluations yet. Keep working hard!</li>';
            return;
        }

        list.innerHTML = evals.map(e => `
            <li class="session-item" style="border-left: 4px solid #16a34a; align-items: flex-start;">
                <div style="flex:1;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <b style="color:var(--text-dark);">${e.skill}</b> 
                        <span style="font-weight:bold; color:white; background:#16a34a; padding:2px 8px; border-radius:10px; font-size:11px;">Score: ${e.score}/5</span>
                    </div>
                    <div style="font-size:11px; color:#64748b; margin-bottom:2px;">${e.timestamp.toDate().toLocaleDateString()}</div>
                    ${e.notes ? `<div style="font-size:12px; color:#475569; background:#f0fdf4; padding:6px; border-radius:4px; margin-top:4px;"><b>Note:</b> ${e.notes}</div>` : ''}
                </div>
            </li>
        `).join("");
        
    } catch (err) {
        console.error("Feedback Load Error", err);
        list.innerHTML = '<li class="session-empty" style="color:red;">Error loading feedback.</li>';
    }
};

export const renderPlayerTrials = async (playerName) => {
    const table = document.querySelector("#statsTrialTable tbody");
    if(!table) return;
    try {
        const q = query(collection(db, "trials"), where("player", "==", playerName));
        const snap = await getDocs(q);
        const trials = [];
        snap.forEach(d => trials.push({ id: d.id, ...d.data() }));
        trials.sort((a,b) => b.timestamp.seconds - a.timestamp.seconds);
        
        if(trials.length === 0) {
            table.innerHTML = "<tr><td colspan='4' class='text-center'>No trials completed yet.</td></tr>";
            return;
        }
        
        table.innerHTML = trials.map(t => `
            <tr>
                <td style="font-size:11px;">${new Date(t.timestamp.seconds*1000).toLocaleDateString()}</td>
                <td style="font-weight:bold; color:var(--aggie-gold);">${t.type}</td>
                <td style="font-size:11px;">${t.skill}</td>
                <td style="font-weight:bold; color:var(--aggie-blue);">${t.result} ${t.isCoach ? '⭐' : ''}</td>
            </tr>
        `).join("");
    } catch(e) { console.error(e); }
};