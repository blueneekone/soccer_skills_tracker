// modules/admin.js
import { auth, db } from "../firebase-config.js";
import { collection, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { initBrandingPanel } from "./branding.js";

// ENTERPRISE UPGRADE: Rely on userRole, not a hardcoded email
export const renderAdminTables = (globalClubs, globalTeams, globalAdmins, userEmail, userRole) => {
    const isSuper = userRole === 'super_admin';
    
    const clubsCard = document.getElementById("adminClubsCard");
    if(clubsCard) clubsCard.style.display = isSuper ? "block" : "none";
    
    // Build Clubs Table
    const c = document.getElementById("clubTable");
    if (c) {
        c.querySelector("tbody").innerHTML = (globalClubs || []).map(cl => `<tr><td>${cl.id}</td><td>${cl.name}</td><td><div style="display:flex; gap:4px;"><input type="email" id="clubDirInp_${cl.id}" value="${cl.directorEmail || ''}" style="margin:0; padding:4px; flex:1;"><button class="action-btn text-blue action-edit-club-dir" data-id="${cl.id}" style="padding:4px 8px; border-radius:4px;">💾</button></div></td></tr>`).join("");
    }

    // Build Teams Table
    const tc = document.getElementById("nadminTeamClubSelect");
    if (tc) {
        const cList = isSuper ? (globalClubs || []) : (globalClubs || []).filter(cl => cl.directorEmail && cl.directorEmail.toLowerCase() === (userEmail || "").toLowerCase());
        tc.innerHTML = `<option value="">-- Select Parent Club --</option>` + cList.map(cl => `<option value="${cl.id}">${cl.name}</option>`).join("");
    }

    const t = document.getElementById("teamTable");
    if (t) {
        const tList = isSuper ? (globalTeams || []) : (globalTeams || []).filter(tm => {
            const club = (globalClubs || []).find(cb => cb.id === tm.clubId);
            return club && club.directorEmail && club.directorEmail.toLowerCase() === (userEmail || "").toLowerCase();
        });

        const clubOptionsHtml = isSuper ? (globalClubs || []).map(cl => `<option value="${cl.id}">${cl.name}</option>`).join("") : "";

        t.querySelector("tbody").innerHTML = tList.map(tm => {
            let clubSelectHtml = tm.clubId || 'N/A';
            if (isSuper) {
                clubSelectHtml = `<select id="teamClubSel_${tm.id}" style="margin:0; padding:4px; max-width:80px;"><option value="${tm.clubId}">${tm.clubId || 'UNASSIGNED'}</option><option disabled>---</option>${clubOptionsHtml}</select>`;
            }
            return `<tr><td>${tm.name} <span class="text-sm-sub">(${tm.id})</span></td><td>${clubSelectHtml}</td><td><div style="display:flex; gap:4px;"><input type="email" id="teamCoachInp_${tm.id}" value="${tm.coachEmail || ''}" style="margin:0; padding:4px; flex:1;"><button class="action-btn text-blue action-edit-team-coach" data-id="${tm.id}" style="padding:4px 8px; border-radius:4px;">💾</button></div></td></tr>`;
        }).join("");
    }

    // Build Admins Table
    const a = document.getElementById("adminTable");
    if (a) a.querySelector("tbody").innerHTML = (globalAdmins || []).map(e => `<tr><td>${e}</td><td><button class="delete-btn action-remove-admin" data-email="${e}" style="float:right;">X</button></td></tr>`).join("");

    const assignClubSel = document.getElementById("assignDirClubId");
    if (assignClubSel) assignClubSel.innerHTML = "<option value=''>Select Club...</option>" + (globalClubs || []).map(c => `<option value="${c.id}">${c.name}</option>`).join("");

    // ENTERPRISE DELEGATION: Secure Data Modification
    const adminView = document.getElementById("viewAdmin");
    if (adminView && adminView.dataset.tablesBound !== "true") {
        adminView.addEventListener("click", async (e) => {
            const target = e.target;

            if (target.classList.contains("action-edit-club-dir")) {
                const cid = target.getAttribute("data-id");
                const cObj = globalClubs.find(x => x.id === cid);
                if (!cObj) return;
                cObj.directorEmail = document.getElementById('clubDirInp_' + cid).value.trim().toLowerCase();
                await setDoc(doc(db, "clubs", cid), { directorEmail: cObj.directorEmail }, { merge: true });
                alert("Director Role Updated.");
            }

            if (target.classList.contains("action-edit-team-coach")) {
                const tid = target.getAttribute("data-id");
                const tObj = globalTeams.find(x => x.id === tid);
                if (!tObj) return;
                tObj.coachEmail = document.getElementById('teamCoachInp_' + tid).value.trim().toLowerCase();
                const csl = document.getElementById('teamClubSel_' + tid);
                if (csl) tObj.clubId = csl.value;
                await setDoc(doc(db, "teams", tid), { coachEmail: tObj.coachEmail, clubId: tObj.clubId }, { merge: true });
                alert("Team Assignment updated.");
            }

            if (target.classList.contains("action-remove-admin")) {
                const email = target.getAttribute("data-email");
                if (!confirm(`Are you sure you want to remove ${email} from Global Directors?`)) return;
                const idx = globalAdmins.indexOf(email);
                if (idx > -1) {
                    globalAdmins.splice(idx, 1);
                    await setDoc(doc(db, "config", "admins"), { list: globalAdmins });
                    target.closest("tr").remove();
                    alert("Global Director Removed.");
                }
            }
        });
        adminView.dataset.tablesBound = "true";
    }

    // Role Assignment
    const assignBtn = document.getElementById("assignDirBtn");
    if (assignBtn && assignBtn.dataset.bound !== "true") {
        assignBtn.dataset.bound = "true";
        assignBtn.addEventListener("click", async () => {
            const email = document.getElementById("assignDirEmail").value.trim().toLowerCase();
            const cid = assignClubSel.value;
            if (!email || !cid) return alert("Fill out both email and club.");

            const cObj = globalClubs.find(x => x.id === cid);
            if (!cObj) return;

            assignBtn.innerText = "Saving...";
            await setDoc(doc(db, "clubs", cid), { directorEmail: email }, { merge: true });
            await setDoc(doc(db, "users", email), { role: "director", clubId: cid }, { merge: true });
            alert(`Success! ${email} is now the Director of ${cObj.name}.`);
            document.getElementById("assignDirEmail").value = "";
            assignBtn.innerText = "Assign Director Role";
        });
    }

    initBrandingPanel(globalTeams);
};

export const addClub = async (globalClubs, reloadCallback) => {
    const id = document.getElementById("newClubId").value.trim().toLowerCase();
    const name = document.getElementById("newClubName").value.trim();
    const email = document.getElementById("newClubDirector").value.trim().toLowerCase();
    if (!id || !name) return alert("Please enter at least an ID and a Club Name.");

    // Write directly to the new scalable collection
    await setDoc(doc(db, "clubs", id), { id: id, name: name, directorEmail: email, createdAt: new Date() });
    if (email) {
        await setDoc(doc(db, "users", email), { role: "director", clubId: id }, { merge: true });
    }

    alert("Club Added Securely!");
    document.getElementById("newClubId").value = "";
    document.getElementById("newClubName").value = "";
    document.getElementById("newClubDirector").value = "";

    if (reloadCallback) reloadCallback();
};

export const addAdmin = async (globalAdmins, reloadCallback) => {
    const emailInput = document.getElementById("newAdminEmail");
    if (!emailInput) return;
    const email = emailInput.value.trim().toLowerCase();
    
    if (!email) return alert("Please enter an email address.");
    if (globalAdmins.includes(email)) return alert("User is already a Global Admin.");
    
    // 1. Save to the config array
    globalAdmins.push(email);
    await setDoc(doc(db, "config", "admins"), { list: globalAdmins });
    
    // 2. Assign the secure role to the user's profile
    await setDoc(doc(db, "users", email), { role: "super_admin" }, { merge: true });
    
    alert("Global Admin Added Securely!"); 
    emailInput.value = "";
    
    if (reloadCallback) reloadCallback();
};

export const addTeam = async (globalClubs, globalTeams, reloadCallback) => {
    const clubId = document.getElementById("adminTeamClubSelect").value;
    const teamName = document.getElementById("adminTeamName").value.trim();
    const coachEmail = document.getElementById("adminTeamCoach").value.trim().toLowerCase();

    if (!clubId || !teamName) return alert("Please select a parent club and enter a team name.");

    // Generate a clean system ID (e.g., "aggiesfc_u12boys")
    const tid = `${clubId}_${teamName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    try {
        document.getElementById("addTeamBtn").innerText = "Saving...";
        
        await setDoc(doc(db, "teams", tid), {
            clubId: clubId,
            name: teamName,
            coachEmail: coachEmail,
            createdAt: new Date()
        });

        // Auto-assign the coach role if an email was provided
        if (coachEmail) {
            await setDoc(doc(db, "users", coachEmail), { role: "coach", clubId: clubId, teamId: tid }, { merge: true });
            await setDoc(doc(db, "coach_lookup", coachEmail), { role: "coach", clubId: clubId, teamId: tid }, { merge: true });
        }

        alert(`Team '${teamName}' added successfully!`);
        document.getElementById("adminTeamName").value = "";
        document.getElementById("adminTeamCoach").value = "";
        document.getElementById("addTeamBtn").innerText = "+ Add Team";
        
        if (reloadCallback) reloadCallback();
    } catch (e) {
        console.error(e);
        alert("Error adding team: " + e.message);
        document.getElementById("addTeamBtn").innerText = "+ Add Team";
    }
};