// modules/admin.js
import { auth, db } from "../firebase-config.js";
import { collection, query, orderBy, limit, getDocs, doc, getDoc, setDoc, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- 2. ADMIN DASHBOARD TABLES ---
export const renderAdminTables = (globalClubs, globalTeams, globalAdmins, userEmail, superAdminEmail) => {
    const isSuper = (userEmail || "").toLowerCase() === superAdminEmail.toLowerCase();
    
    // Toggle Clubs visibility
    const clubsCard = document.getElementById("adminClubsCard");
    if(clubsCard) clubsCard.style.display = isSuper ? "block" : "none";

    window.editClubDirector = async (cid) => {
        const cObj = globalClubs.find(x => x.id === cid);
        if(!cObj) return;
        const e = prompt(`Assign new Director Email for ${cObj.name}:`, cObj.directorEmail || "");
        if(e !== null) {
            cObj.directorEmail = e.trim().toLowerCase();
            await setDoc(doc(db, "config", "clubs"), { list: globalClubs });
            renderAdminTables(globalClubs, globalTeams, globalAdmins, userEmail, superAdminEmail);
            alert("Director Role Updated.");
        }
    };
    
    window.editTeamCoach = async (tid) => {
        const tObj = globalTeams.find(x => x.id === tid);
        if(!tObj) return;
        const e = prompt(`Assign new Head Coach Email for ${tObj.name}:`, tObj.coachEmail || "");
        if(e !== null) {
            tObj.coachEmail = e.trim().toLowerCase();
            await setDoc(doc(db, "config", "teams"), { list: globalTeams });
            renderAdminTables(globalClubs, globalTeams, globalAdmins, userEmail, superAdminEmail);
            alert("Coach Role Updated.");
        }
    };

    const c = document.getElementById("clubTable");
    if (c) c.querySelector("tbody").innerHTML = (globalClubs || []).map(cl => `<tr><td>${cl.id}</td><td>${cl.name}</td><td>${cl.directorEmail || ''} <button class="action-btn text-blue" style="font-size:10px; padding:2px 4px; border-radius:4px; float:right;" onclick="window.editClubDirector('${cl.id}')">✎</button></td></tr>`).join("");

    const tc = document.getElementById("newTeamClubId");
    if (tc) {
        const cList = isSuper ? (globalClubs || []) : (globalClubs || []).filter(cl => cl.directorEmail && cl.directorEmail.toLowerCase() === (userEmail||"").toLowerCase());
        tc.innerHTML = cList.map(cl => `<option value="${cl.id}">${cl.name}</option>`).join("");
    }

    const t = document.getElementById("teamTable"); 
    if(t) {
        const tList = isSuper ? (globalTeams || []) : (globalTeams || []).filter(tm => {
            const club = (globalClubs || []).find(cb => cb.id === tm.clubId);
            return club && club.directorEmail && club.directorEmail.toLowerCase() === (userEmail||"").toLowerCase();
        });
        t.querySelector("tbody").innerHTML = tList.map(tm => `<tr><td>${tm.name} <span class="text-sm-sub">(${tm.id})</span></td><td>${tm.clubId || 'N/A'}</td><td>${tm.coachEmail} <button class="action-btn text-blue" style="font-size:10px; padding:2px 4px; border-radius:4px; float:right;" onclick="window.editTeamCoach('${tm.id}')">✎</button></td></tr>`).join("");
    }
    
    const a = document.getElementById("adminTable");
    if(a) a.querySelector("tbody").innerHTML = (globalAdmins || []).map(e => `<tr><td>${e}</td><td><button class="delete-btn" style="float:right;">X</button></td></tr>`).join("");
    
    initBrandingPanel(globalTeams);
};

export const initBrandingPanel = async (globalTeams) => {
    const sel = document.getElementById("brandingTeamSelect");
    if(!sel) return;
    sel.innerHTML = (globalTeams || []).map(t => `<option value="${t.id}">${t.name} (${t.id})</option>`).join("");
    
    const loadTeamBranding = async () => {
        const tid = sel.value;
        if(!tid) return;
        const snap = await getDoc(doc(db, "config", `branding_${tid}`));
        if(snap.exists()) {
            const data = snap.data();
            document.getElementById("brandAppName").value = data.appName || "";
            document.getElementById("brandLogoUrl").value = data.logoUrl || "";
            document.getElementById("brandPrimaryColor").value = data.primaryColor || "#00263A";
            document.getElementById("brandSecondaryColor").value = data.secondaryColor || "#BFAE5A";
            if(document.getElementById("brandCourtType")) document.getElementById("brandCourtType").value = data.courtType || "soccer";
        } else {
            document.getElementById("brandAppName").value = "";
            document.getElementById("brandLogoUrl").value = "";
            document.getElementById("brandPrimaryColor").value = "#00263A";
            document.getElementById("brandSecondaryColor").value = "#BFAE5A";
            if(document.getElementById("brandCourtType")) document.getElementById("brandCourtType").value = "soccer";
        }
    };
    
    sel.addEventListener("change", loadTeamBranding);
    if(globalTeams.length > 0) loadTeamBranding();
    
    const saveBtn = document.getElementById("saveBrandingBtn");
    if (saveBtn && saveBtn.dataset.bound !== "true") {
        saveBtn.addEventListener("click", async () => {
            const tid = sel.value;
            if(!tid) return;
            const data = {
                appName: document.getElementById("brandAppName").value.trim(),
                logoUrl: document.getElementById("brandLogoUrl").value.trim(),
                primaryColor: document.getElementById("brandPrimaryColor").value,
                secondaryColor: document.getElementById("brandSecondaryColor").value,
                courtType: document.getElementById("brandCourtType") ? document.getElementById("brandCourtType").value : "soccer",
                updatedAt: new Date()
            };
            saveBtn.innerText = "Saving...";
            await setDoc(doc(db, "config", `branding_${tid}`), data);
            saveBtn.innerText = "Saved!";
            setTimeout(() => saveBtn.innerText = "Save Branding", 2000);
        });
        saveBtn.dataset.bound = "true";
    }
    
    const resetBtn = document.getElementById("resetBrandingBtn");
    if (resetBtn && resetBtn.dataset.bound !== "true") {
        resetBtn.addEventListener("click", async () => {
            const tid = sel.value;
            if(!tid) return;
            if(confirm("Reset this team's branding to default?")) {
                await deleteDoc(doc(db, "config", `branding_${tid}`));
                loadTeamBranding();
                alert("Branding reset.");
            }
        });
        resetBtn.dataset.bound = "true";
    }
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

export const addTeam = async (globalTeams, reloadCallback) => {
    const id = document.getElementById("newTeamId").value;
    const name = document.getElementById("newTeamName").value;
    const email = document.getElementById("newCoachEmail").value;
    const clubId = document.getElementById("newTeamClubId").value;
    if(!id || !name) return alert("Please enter at least an ID and a Team Name.");
    if(!clubId) return alert("Please select a parent club for the team.");
    
    globalTeams.push({ id, name, coachEmail: email, clubId });
    await setDoc(doc(db, "config", "teams"), { list: globalTeams });
    
    alert("Team Added!"); 
    document.getElementById("newTeamId").value = "";
    document.getElementById("newTeamName").value = "";
    document.getElementById("newCoachEmail").value = "";
    
    if(reloadCallback) reloadCallback();
};

export const addAdmin = async (globalAdmins, reloadCallback) => {
    const email = document.getElementById("newAdminEmail").value;
    if(!email) return alert("Please enter an email.");
    
    globalAdmins.push(email);
    await setDoc(doc(db, "config", "admins"), { list: globalAdmins });
    
    alert("Director Added!"); 
    logSystemEvent("ADMIN_ADD_DIRECTOR", `Email: ${email}`); 
    document.getElementById("newAdminEmail").value = "";
    
    if(reloadCallback) reloadCallback();
};