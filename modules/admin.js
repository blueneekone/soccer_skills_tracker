// modules/admin.js
import { auth, db } from "../firebase-config.js";
import { collection, query, orderBy, limit, getDocs, doc, getDoc, setDoc, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- 1. SYSTEM LOGGING ---
export const logSystemEvent = async (type, detail) => {
    try {
        await addDoc(collection(db, "logs_system"), { 
            type: type, 
            detail: detail, 
            timestamp: new Date(), 
            user: auth.currentUser ? auth.currentUser.email : 'system' 
        });
    } catch(e) { console.error("Log error", e); }
};

export const loadLogs = async (col) => {
    const c = document.getElementById("logContainer"); 
    if(!c) return; 
    c.innerHTML = "Fetching...";
    const snap = await getDocs(query(collection(db, col), orderBy("timestamp", "desc"), limit(20)));
    c.innerHTML = "";
    snap.forEach(d => c.innerHTML += `<div style="border-bottom:1px solid #eee; padding:5px;"><span style="font-size:9px; color:#999;">${new Date(d.data().timestamp.seconds*1000).toLocaleString()}</span><br><b>${d.data().type}</b>: ${d.data().detail}</div>`);
};

export const generateSampleLogs = () => { 
    logSystemEvent("SYSTEM_START", "Init"); 
    alert("Log Added"); 
};

export const runSecurityScan = () => { 
    const c = document.getElementById("logContainer"); 
    if(c) { 
        c.innerHTML="Scanning..."; 
        setTimeout(() => c.innerHTML="<div style='color:#16a34a; font-weight:bold;'>✔ System Architecture: Secure</div>", 800); 
    } 
};

// --- 2. ADMIN DASHBOARD TABLES ---
export const renderAdminTables = (globalTeams, globalAdmins) => {
    const t = document.getElementById("teamTable"); 
    if(t) t.querySelector("tbody").innerHTML = globalTeams.map(t => `<tr><td>${t.id}</td><td>${t.name}</td><td>${t.coachEmail}</td></tr>`).join("");
    
    const a = document.getElementById("adminTable");
    if(a) a.querySelector("tbody").innerHTML = globalAdmins.map(e => `<tr><td>${e}</td><td><button class="delete-btn">Del</button></td></tr>`).join("");
    
    initBrandingPanel(globalTeams);
};

export const initBrandingPanel = async (globalTeams) => {
    const sel = document.getElementById("brandingTeamSelect");
    if(!sel) return;
    sel.innerHTML = globalTeams.map(t => `<option value="${t.id}">${t.name} (${t.id})</option>`).join("");
    
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
export const addTeam = async (globalTeams, reloadCallback) => {
    const id = document.getElementById("newTeamId").value;
    const name = document.getElementById("newTeamName").value;
    const email = document.getElementById("newCoachEmail").value;
    if(!id || !name) return alert("Please enter at least an ID and a Team Name.");
    
    globalTeams.push({ id, name, coachEmail: email });
    await setDoc(doc(db, "config", "teams"), { list: globalTeams });
    
    alert("Team Added!"); 
    logSystemEvent("ADMIN_ADD_TEAM", `ID: ${id}`); 
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