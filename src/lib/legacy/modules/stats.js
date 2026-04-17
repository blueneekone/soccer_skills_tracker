// modules/stats.js
import { db } from '$lib/firebase.js';
import { collection, query, where, getDocs } from 'firebase/firestore';

let currentCalOffset = 0; 

const setText = (id, text) => {
    const el = document.getElementById(id);
    if(el) el.innerText = text;
};

// 🟢 UNIVERSAL DATE HELPER
const safeGetDate = (l) => {
    if (!l) return new Date();
    if (l.timestamp && l.timestamp.seconds) return new Date(l.timestamp.seconds * 1000);
    if (l.timestamp && l.timestamp.toDate) return l.timestamp.toDate();
    if (l.date) { const parsed = new Date(l.date); if (!isNaN(parsed.getTime())) return parsed; }
    if (l.createdAt && l.createdAt.seconds) return new Date(l.createdAt.seconds * 1000);
    return new Date();
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
        const currentIterDate = new Date(now.getFullYear(), now.getMonth(), i);
        const dStr = currentIterDate.toDateString();
        
        // Use safeGetDate to prevent crashes on legacy data
        const hasLog = logs.some(l => safeGetDate(l).toDateString() === dStr);
        
        const dayDiv = document.createElement("div");
        dayDiv.className = `cal-day ${hasLog ? 'has-log' : ''}`;
        dayDiv.innerHTML = `${i} ${hasLog ? '<div class="cal-dot"></div>' : ''}`;
        
        if(hasLog) {
            dayDiv.onclick = () => {
                const daily = logs.filter(l => safeGetDate(l).toDateString() === dStr);
                setText("dayModalDate", dStr);
                const content = document.getElementById("dayModalContent");
                if(content) {
                    content.innerHTML = daily.map(l => {
                        const wName = l.name || l.drillSummary || l.drill || l.type || 'Workout';
                        const pName = l.player || l.playerName || 'Unknown Player';
                        const mins = l.minutes || l.time || 0;
                        return `<div style="border-bottom:1px solid #eee; padding:10px 5px;">
                            <b style="color:var(--aggie-blue);">${pName}</b><br>
                            <span style="font-size:12px; color:#64748b;">${wName} (${mins}m)</span>
                        </div>`;
                    }).join("");
                }
                
                const modal = document.getElementById("dayModal");
                modal.style.display = 'block';
                // Bind close button dynamically
                modal.querySelector('.close-btn').onclick = () => { modal.style.display = 'none'; };
            };
        }
        grid.appendChild(dayDiv);
    }
};

export const renderPlayerTrendChart = (logs, range = '7') => {
    const cvs = document.getElementById('playerTrendChart'); 
    if(!cvs) return;
    const ctx = cvs.getContext('2d'); 
    
    if(window.globalPlayerChart) window.globalPlayerChart.destroy(); 
    
    let labels = [];
    let data = [];
    const now = new Date();

    if (range === '7' || range === '30') {
        const days = parseInt(range);
        data = Array(days).fill(0);
        for(let i = days - 1; i >= 0; i--) { 
            const d = new Date(); 
            d.setDate(now.getDate() - i); 
            labels.push(range === '7' ? d.toLocaleDateString('en-US',{weekday:'short'}) : `${d.getMonth()+1}/${d.getDate()}`); 
            data[(days-1)-i] = logs
                .filter(l => safeGetDate(l).toDateString() === d.toDateString())
                .reduce((s,l) => s + Number(l.minutes || l.time || 0), 0); 
        }
    } else if (range === '90') {
        data = Array(12).fill(0);
        for(let i = 11; i >= 0; i--) {
            const weekEnd = new Date();
            weekEnd.setDate(now.getDate() - (i * 7));
            const weekStart = new Date(weekEnd);
            weekStart.setDate(weekEnd.getDate() - 6);
            labels.push(`${weekStart.getMonth()+1}/${weekStart.getDate()}`);
            data[11-i] = logs.filter(l => {
                const d = safeGetDate(l);
                return d >= weekStart && d <= weekEnd;
            }).reduce((s,l) => s + Number(l.minutes || l.time || 0), 0);
        }
    } else if (range === 'all') {
        data = Array(12).fill(0);
        for(let i = 11; i >= 0; i--) {
            const targetMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
            labels.push(targetMonth.toLocaleDateString('en-US',{month:'short'}));
            data[11-i] = logs.filter(l => {
                const d = safeGetDate(l);
                return d.getMonth() === targetMonth.getMonth() && d.getFullYear() === targetMonth.getFullYear();
            }).reduce((s,l) => s + Number(l.minutes || l.time || 0), 0);
        }
    }
    
    window.globalPlayerChart = new window.Chart(ctx, { 
        type: 'bar', 
        data: { labels: labels, datasets: [{ data: data, backgroundColor: "#00263A", borderRadius: 4 }] }, 
        options: { 
            plugins: { legend: {display:false} }, 
            scales: { x: {grid:{display:false}}, y:{beginAtZero:true} },
            responsive: true,
            maintainAspectRatio: false
        } 
    });
};

export const renderTeamLeaderboard = async (tid, logsOverride = []) => {
    const table = document.getElementById("teamLeaderboardTable"); if(!table) return;
    const filter = document.getElementById("leaderboardFilter")?.value || "weekly";
    
    let stats = {};
    let filteredLogs = [];
    
    const now = new Date();
    const filterDate = new Date();
    if(filter === 'daily') filterDate.setDate(now.getDate() - 1);
    else if(filter === 'weekly') filterDate.setDate(now.getDate() - 7);
    else if(filter === 'monthly') filterDate.setMonth(now.getMonth() - 1);
    else filterDate.setFullYear(2000); 

    if (!tid) { 
        filteredLogs = logsOverride.filter(d => safeGetDate(d) >= filterDate);
        filteredLogs.forEach(d => { const p = d.player; stats[p] = (stats[p] || 0) + Number(d.minutes || d.time || 0); }); 
    } else { 
        const q = query(collection(db, "reps"), where("teamId", "==", tid)); 
        const snap = await getDocs(q); 
        snap.forEach(d => {
            const data = d.data();
            if(safeGetDate(data) >= filterDate) {
                const p = data.player || "Unknown"; 
                stats[p] = (stats[p] || 0) + Number(data.minutes || data.time || 0);
            }
        }); 
    }
 
    const html = Object.entries(stats).sort((a,b)=>b[1]-a[1]).slice(0,5).map((e,i) => `<tr><td class="rank-${i+1}">${i+1}</td><td>${e[0]}</td><td>${e[1]}m</td></tr>`).join("");
    table.querySelector("tbody").innerHTML = html || '<tr><td colspan="3" class="text-center">No data for this time period</td></tr>';
};

// ... Keep your loadPlayerFeedback, renderPlayerTrials, and exportStatsCSV below this line exactly as they are ...

export const loadPlayerFeedback = async (userProfile) => {
    if (!userProfile || userProfile.role === 'super_admin') return; 

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
                <td class="trial-row-date">${new Date(t.timestamp.seconds*1000).toLocaleDateString()}</td>
                <td class="trial-row-type">${t.type}</td>
                <td class="trial-row-skill">${t.skill}</td>
                <td class="trial-row-result">${t.result} ${t.isCoach ? '⭐' : ''}</td>
            </tr>
        `).join("");
    } catch(e) { console.error(e); }
};

export const exportStatsCSV = (logs, playerName) => {
    if (!logs || logs.length === 0) return alert("No logs found to export.");
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Time,Player,Minutes,Drills / Workout Type\n";
    logs.forEach(log => {
        const d = log.timestamp ? log.timestamp.toDate() : new Date();
        const dateStr = d.toLocaleDateString();
        const timeStr = d.toLocaleTimeString();
        let drills = "";
        if (log.drills && Array.isArray(log.drills)) {
            drills = log.drills.map(x => x.name).join("; ");
        } else if (typeof log.drill === "string") {
            drills = log.drill;
        } else {
            drills = log.workoutType || "Custom Session";
        }
        
        drills = drills.replace(/"/g, '""');
        csvContent += `"${dateStr}","${timeStr}","${log.player}","${log.minutes}","${drills}"\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${(playerName||"Export").replace(/\s+/g, '_')}_Stats_Export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const loadStatsDashboard = async (tid, playerName, userProfile) => {
    if (!tid || !playerName) return;

    try {
        const q = query(collection(db, "reps"), where("player", "==", playerName), where("teamId", "==", tid));
        const snap = await getDocs(q);
        const logs = [];
        snap.forEach(d => logs.push(d.data()));
        
        window.globalStatsLogs = logs;

        // Render Initial UI Components
        currentCalOffset = 0; // Reset calendar to current month on load
        renderCalendar(logs, 0);
        renderPlayerTrendChart(logs, document.getElementById('playerTrendFilter')?.value || '7');
        renderTeamLeaderboard(tid);
        renderPlayerTrials(playerName);
        loadPlayerFeedback(userProfile);

        // Update Top Displays
        const myTotalMins = logs.reduce((sum, l) => sum + (Number(l.minutes) || 0), 0);
        const statTotalEl = document.getElementById("statTotal");
        const statTimeEl = document.getElementById("statTime");
        if(statTotalEl) statTotalEl.innerText = logs.length;
        if(statTimeEl) statTimeEl.innerText = myTotalMins;

        // --- BIND EVENT LISTENERS ---
        
        // Calendar Arrows
        const prevBtn = document.getElementById("calPrevMonth");
        const nextBtn = document.getElementById("calNextMonth");
        if(prevBtn && prevBtn.dataset.bound !== "true") {
            prevBtn.addEventListener("click", () => renderCalendar(window.globalStatsLogs, -1));
            prevBtn.dataset.bound = "true";
        }
        if(nextBtn && nextBtn.dataset.bound !== "true") {
            nextBtn.addEventListener("click", () => renderCalendar(window.globalStatsLogs, 1));
            nextBtn.dataset.bound = "true";
        }

        // Trend Filter Dropdown
        const trendFilter = document.getElementById("playerTrendFilter");
        if(trendFilter && trendFilter.dataset.bound !== "true") {
            trendFilter.addEventListener("change", (e) => renderPlayerTrendChart(window.globalStatsLogs, e.target.value));
            trendFilter.dataset.bound = "true";
        }

        // Print Report Button
        const printBtn = document.getElementById("btnPrintStats");
        if(printBtn && printBtn.dataset.bound !== "true") {
            printBtn.addEventListener("click", () => {
                document.body.classList.add("printing-stats");
                window.print(); // Triggers the browser print dialog
                document.body.classList.remove("printing-stats");
            });
            printBtn.dataset.bound = "true";
        }

        const btnExport = document.getElementById("btnExportStatsCSV");
        if(btnExport && btnExport.dataset.bound !== "true") {
            btnExport.addEventListener("click", () => exportStatsCSV(window.globalStatsLogs, playerName));
            btnExport.dataset.bound = "true";
        }

        // Team Leaderboard Dropdown
        const filter = document.getElementById("leaderboardFilter");
        if(filter && filter.dataset.bound !== "true") {
            filter.addEventListener("change", () => renderTeamLeaderboard(tid));
            filter.dataset.bound = "true";
        }

    } catch (e) {
        console.error("Error loading stats:", e);
    }
};