// modules/admin.js
import { auth, db } from "../firebase-config.js";
import { collection, query, orderBy, limit, getDocs, doc, getDoc, setDoc, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { initBrandingPanel } from "./branding.js";

// --- 2. ADMIN DASHBOARD TABLES ---
export const initAdminTabs = () => {
    const tabs = document.querySelectorAll('.admin-tab');
    const panes = document.querySelectorAll('.admin-pane');

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            // 1. Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            // 2. Hide all panes
            panes.forEach(p => p.classList.add('d-none'));

            // 3. Activate clicked tab
            e.currentTarget.classList.add('active');
            
            // 4. Show target pane
            const targetId = e.currentTarget.getAttribute('data-target');
            document.getElementById(targetId).classList.remove('d-none');
        });
    });
};

export const renderAdminTables = (globalClubs, globalTeams, globalAdmins, userEmail, superAdminEmail) => {
    const isSuper = (userEmail || "").toLowerCase() === superAdminEmail.toLowerCase();
    
    // Toggle Clubs visibility
    const clubsCard = document.getElementById("adminClubsCard");
    if(clubsCard) clubsCard.style.display = isSuper ? "block" : "none";

    window.editClubDirector = async (cid) => {
        const cObj = globalClubs.find(x => x.id === cid);
        if(!cObj) return;
        const e = document.getElementById('clubDirInp_' + cid).value;
        cObj.directorEmail = e.trim().toLowerCase();
        await setDoc(doc(db, "config", "clubs"), { list: globalClubs });
        renderAdminTables(globalClubs, globalTeams, globalAdmins, userEmail, superAdminEmail);
        alert("Director Role Updated.");
    };
    
    window.editTeamCoach = async (tid) => {
        const tObj = globalTeams.find(x => x.id === tid);
        if(!tObj) return;
        const e = document.getElementById('teamCoachInp_' + tid).value;
        tObj.coachEmail = e.trim().toLowerCase();
        
        const csl = document.getElementById('teamClubSel_' + tid);
        if(csl) tObj.clubId = csl.value;
        
        await setDoc(doc(db, "config", "teams"), { list: globalTeams });
        renderAdminTables(globalClubs, globalTeams, globalAdmins, userEmail, superAdminEmail);
        alert("Team Assigned updated.");
    };
    
    window.removeAdmin = async (email) => {
        if(!confirm(`Are you sure you want to remove ${email} from Global Directors?`)) return;
        const idx = globalAdmins.indexOf(email);
        if (idx > -1) {
            globalAdmins.splice(idx, 1);
            await setDoc(doc(db, "config", "admins"), { list: globalAdmins });
            renderAdminTables(globalClubs, globalTeams, globalAdmins, userEmail, superAdminEmail);
            alert("Global Director Removed.");
        }
    };

    const c = document.getElementById("clubTable");
    if (c) {
        c.querySelector("tbody").innerHTML = (globalClubs || []).map(cl => `<tr><td>${cl.id}</td><td>${cl.name}</td><td><div style="display:flex; gap:4px;"><input type="email" id="clubDirInp_${cl.id}" value="${cl.directorEmail || ''}" style="margin:0; padding:4px; flex:1;"><button class="action-btn text-blue" style="padding:4px 8px; border-radius:4px;" onclick="window.editClubDirector('${cl.id}')">💾</button></div></td></tr>`).join("");
    }

    const tc = document.getElementById("newTeamClubId");
    if (tc) {
        const cList = isSuper ? (globalClubs || []) : (globalClubs || []).filter(cl => cl.directorEmail && cl.directorEmail.toLowerCase() === (userEmail||"").toLowerCase());
        tc.innerHTML = `<option value="">-- Select Parent Club --</option>` + cList.map(cl => `<option value="${cl.id}">${cl.name}</option>`).join("");
    }

    const t = document.getElementById("teamTable"); 
    if(t) {
        const tList = isSuper ? (globalTeams || []) : (globalTeams || []).filter(tm => {
            const club = (globalClubs || []).find(cb => cb.id === tm.clubId);
            return club && club.directorEmail && club.directorEmail.toLowerCase() === (userEmail||"").toLowerCase();
        });
        
        const clubOptionsHtml = isSuper ? (globalClubs || []).map(cl => `<option value="${cl.id}">${cl.name}</option>`).join("") : "";
        
        t.querySelector("tbody").innerHTML = tList.map(tm => {
            let clubSelectHtml = tm.clubId || 'N/A';
            if (isSuper) {
                clubSelectHtml = `<select id="teamClubSel_${tm.id}" style="margin:0; padding:4px; max-width:80px;"><option value="${tm.clubId}">${tm.clubId||'UNASSIGNED'}</option><option disabled>---</option>${clubOptionsHtml}</select>`;
            }
            return `<tr><td>${tm.name} <span class="text-sm-sub">(${tm.id})</span></td><td>${clubSelectHtml}</td><td><div style="display:flex; gap:4px;"><input type="email" id="teamCoachInp_${tm.id}" value="${tm.coachEmail || ''}" style="margin:0; padding:4px; flex:1;"><button class="action-btn text-blue" style="padding:4px 8px; border-radius:4px;" onclick="window.editTeamCoach('${tm.id}')">💾</button></div></td></tr>`;
        }).join("");
    }
    
    const a = document.getElementById("adminTable");
    if(a) a.querySelector("tbody").innerHTML = (globalAdmins || []).map(e => `<tr><td>${e}</td><td><button class="delete-btn" style="float:right;" onclick="window.removeAdmin('${e}')">X</button></td></tr>`).join("");
    
    const migSel = document.getElementById("migrateTargetTeam");
    if(migSel) migSel.innerHTML = "<option value=''>Select Target Team...</option>" + (globalTeams||[]).map(t => `<option value="${t.id}">${t.name} (${t.id})</option>`).join("") + "<option value='misc'>Unassigned Legacy (misc)</option>";
    
    const assignClubSel = document.getElementById("assignDirClubId");
    if(assignClubSel) assignClubSel.innerHTML = "<option value=''>Select Club...</option>" + (globalClubs||[]).map(c => `<option value="${c.id}">${c.name}</option>`).join("");
    
    const assignBtn = document.getElementById("assignDirBtn");
    if(assignBtn && assignBtn.dataset.bound !== "true") {
        assignBtn.dataset.bound = "true";
        assignBtn.addEventListener("click", async () => {
            const email = document.getElementById("assignDirEmail").value.trim().toLowerCase();
            const cid = assignClubSel.value;
            if(!email || !cid) return alert("Fill out both email and club.");
            
            const cObj = globalClubs.find(x => x.id === cid);
            if(!cObj) return;
            cObj.directorEmail = email;
            
            assignBtn.innerText = "Saving...";
            await setDoc(doc(db, "config", "clubs"), { list: globalClubs });
            renderAdminTables(globalClubs, globalTeams, globalAdmins, userEmail, superAdminEmail);
            alert(`Success! ${email} is now the Director of ${cObj.name}.`);
            document.getElementById("assignDirEmail").value = "";
            assignBtn.innerText = "Assign Director Role";
        });
    }

    const migBtn = document.getElementById("migrateLegacyBtn");
    if(migBtn && migBtn.dataset.bound !== "true") {
        migBtn.addEventListener("click", async () => {
            const tid = document.getElementById("migrateTargetTeam").value;
            if(!tid) return alert("Select a Team.");
            if(!confirm("Attempt to patch all unassigned legacy logs and duplicate defaults into " + tid + "?")) return;
            migBtn.innerText = "Working...";
            try {
                const snap = await getDocs(collection(db, "reps"));
                let repsCount = 0;
                const promises = [];
                snap.forEach(d => {
                    const data = d.data();
                    if(!data.teamId) {
                        promises.push(setDoc(doc(db, "reps", d.id), { ...data, teamId: tid }));
                        repsCount++;
                    }
                });
                await Promise.all(promises);
                
                if(window.syncDefaultWorkouts) await window.syncDefaultWorkouts(tid);
                
                migBtn.innerText = "Done!";
                alert(`Migration Complete! Patched ${repsCount} legacy logs and injected defaults.`);
                setTimeout(()=> migBtn.innerText = "Execute Legacy Fix", 2000);
            } catch(e) { console.error(e); alert("Failed."); migBtn.innerText = "Execute Legacy Fix"; }
        });
        migBtn.dataset.bound = "true";
    }

    initBrandingPanel(globalTeams);
};

// --- 3. GLOBAL MANAGEMENT ---
export const addClub = async (globalClubs, reloadCallback) => {
    const id = document.getElementById("newClubId").value.trim();
    const name = document.getElementById("newClubName").value.trim();
    const email = document.getElementById("newClubDirector").value.trim();
    if(!id || !name) return alert("Please enter at least an ID and a Club Name.");
    
    globalClubs.push({ id, name, directorEmail: email });
    await setDoc(doc(db, "config", "clubs"), { list: globalClubs });
    
    alert("Club Added!"); 
    document.getElementById("newClubId").value = "";
    document.getElementById("newClubName").value = "";
    document.getElementById("newClubDirector").value = "";
    
    if(reloadCallback) reloadCallback();
};

export const addAdmin = async (globalAdmins, reloadCallback) => {
    const email = document.getElementById("newAdminEmail").value;
    if(!email) return alert("Please enter an email.");
    
    globalAdmins.push(email);
    await setDoc(doc(db, "config", "admins"), { list: globalAdmins });
    
    alert("Director Added!"); 
    document.getElementById("newAdminEmail").value = "";
    
    if(reloadCallback) reloadCallback();
};