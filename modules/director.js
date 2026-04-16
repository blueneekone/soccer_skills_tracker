import { doc, getDoc, setDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
// ==========================================
// 1. TEAM & COACH MANAGEMENT
// ==========================================
export async function createClubTeam(db, clubId, teamName, coachEmail) {
    if(!teamName) return alert("Please enter a team name.");
    
    try {
        // Generate a clean ID (e.g., "aggiesfc_u12gold")
        const teamId = `${clubId}_${teamName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        
        const teamRef = doc(db, "teams", teamId);
        await setDoc(teamRef, {
            clubId: clubId,
            name: teamName,
            coachEmail: coachEmail.toLowerCase(),
            createdAt: new Date()
        });

        // Auto-link the coach email so the Bouncer routes them correctly on login
        if (coachEmail) {
            await setDoc(doc(db, "coach_lookup", coachEmail.toLowerCase()), { 
                teamId: teamId, 
                clubId: clubId,
                role: "coach"
            });
        }

        alert(`✅ Sub-Team '${teamName}' created successfully!`);
        document.getElementById("newClubTeamName").value = "";
        document.getElementById("newClubCoachEmail").value = "";
        
    } catch (error) {
        console.error("Error creating team:", error);
        alert("System Error: Could not create team.");
    }
}

// ==========================================
// 1.5 INVITE / ASSIGN COACH (Replaces addAssistant)
// ==========================================
export async function inviteCoach(db, targetTeamId, coachEmail) {
    if (!targetTeamId ||!coachEmail) return alert("Please select a team and enter a coach email.");
    
    try {
        const emailLower = coachEmail.toLowerCase().trim();
        const { writeBatch } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        
        const teamRef = doc(db, "teams", targetTeamId);
        const teamSnap = await getDoc(teamRef);
        
        if (!teamSnap.exists()) return alert("Error: Team not found.");
        const clubId = teamSnap.data().clubId;

        // 🟢 FIX: Use a batch to write to BOTH collections instantly
        const batch = writeBatch(db);
        
        batch.set(doc(db, "coach_lookup", emailLower), { 
            teamId: targetTeamId, 
            clubId: clubId,
            role: "coach",
            invitedAt: new Date()
        }, { merge: true });

        batch.set(doc(db, "users", emailLower), { 
            teamId: targetTeamId, 
            clubId: clubId,
            role: "coach"
        }, { merge: true });

        await batch.commit();

        alert(`✅ Coach invite sent! When ${emailLower} logs in, they will be automatically assigned to the team.`);
        document.getElementById("inviteCoachEmail").value = "";
        
    } catch (error) {
        console.error("Error inviting coach:", error);
        alert("System Error: Could not invite coach.");
    }
}

// ==========================================
// 3. INITIALIZATION & EVENT BINDING
// ==========================================
export const initDirectorModule = (db, userProfile) => {
    // 1. Security Gate: Only run this if the user is a Director or Super Admin
    if (!userProfile || (userProfile.role !== 'director' && userProfile.role !== 'super_admin')) {
        return; 
    }

    const clubId = userProfile.clubId || userProfile.teamId; 

    // Helper to safely bind buttons without duplicates
    const safeBind = (id, event, func) => {
        const el = document.getElementById(id);
        if(el && el.dataset.bound !== "true") { 
            el.addEventListener(event, func); 
            el.dataset.bound = "true"; 
        }
    };

    // 2. Bind the Action Buttons
    safeBind("btnCreateClubTeam", "click", () => {
        const teamName = document.getElementById("newClubTeamName").value.trim();
        const coachEmail = document.getElementById("newClubCoachEmail").value.trim();
        createClubTeam(db, clubId, teamName, coachEmail);
    });

// Bind the Coach Invite button
    safeBind("btnInviteCoach", "click", () => {
        const teamId = document.getElementById("directorTeamSelect").value;
        const coachEmail = document.getElementById("inviteCoachEmail").value;
        inviteCoach(db, teamId, coachEmail);
    });

    // Branding is handled by branding.js via the saveBrandingBtn element

    // 3. Tabbed UI Logic for the Club Management Dashboard
    const directorTabs = document.querySelectorAll('.director-tab');
    const directorPanes = document.querySelectorAll('.director-pane');
    
    directorTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            directorTabs.forEach(t => t.classList.remove('active'));
            directorPanes.forEach(p => p.classList.add('d-none'));
            
            e.currentTarget.classList.add('active');
            const targetId = e.currentTarget.getAttribute('data-target');
            const targetPane = document.getElementById(targetId);
            if(targetPane) targetPane.classList.remove('d-none');
        });
    });
};

// Add to the bottom of modules/director.js
import { collection, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export const loadComplianceDashboard = async (db, clubId) => {
    const tbody = document.querySelector("#complianceTable tbody");
    if (!tbody || !clubId) return;

    try {
        // 1. Get all passports
        const passSnap = await getDocs(collection(db, "passports"));
        
        // 2. Get all users to match names and filter by Club
        const userSnap = await getDocs(collection(db, "users"));
        const users = {};
        userSnap.forEach(d => {
            if(d.data().clubId === clubId) users[d.id] = d.data().playerName || d.id;
        });

        let html = "";
        passSnap.forEach(doc => {
            const email = doc.id;
            // Only show players in this Director's club
            if (!users[email]) return; 
            
            const data = doc.data();
            const signed = data.hasSignedWaiver ? "✅ Yes" : "❌ No";
            const currentStatus = data.clearanceStatus || "CLEARED";
            
            html += `
            <tr>
                <td style="font-weight:bold;">${users[email]}<br><span style="font-size:10px; font-weight:normal; color:#64748b;">${email}</span></td>
                <td style="font-size:11px;"><b>Contact:</b> ${data.emergencyName} (${data.emergencyPhone})<br><b>Notes:</b> ${data.medicalNotes || "None"}</td>
                <td>${signed}</td>
                <td>
                    <select class="status-changer" data-email="${email}" style="padding:4px; margin:0; border-radius:4px; font-weight:bold; color:${currentStatus === 'RED_CARD' ? '#b91c1c' : '#047857'};">
                        <option value="CLEARED" ${currentStatus === 'CLEARED' ? 'selected' : ''}>✅ CLEARED</option>
                        <option value="PENDING_SAFESPORT" ${currentStatus === 'PENDING_SAFESPORT' ? 'selected' : ''}>🟨 SAFESPORT PENDING</option>
                        <option value="RED_CARD" ${currentStatus === 'RED_CARD' ? 'selected' : ''}>🟥 SUSPENDED (Red Card)</option>
                    </select>
                </td>
            </tr>`;
        });

        tbody.innerHTML = html || "<tr><td colspan='4' class='text-center'>No passports found for your club.</td></tr>";
    } catch (e) {
        console.error("Compliance Error:", e);
        tbody.innerHTML = "<tr><td colspan='4' class='text-center text-red'>Error loading compliance data.</td></tr>";
    }
};

// Bind the dropdowns to instantly update the database
document.addEventListener("change", async (e) => {
    if (e.target.classList.contains("status-changer")) {
        const email = e.target.getAttribute("data-email");
        const newStatus = e.target.value;
        try {
            await updateDoc(doc(db, "passports", email), { clearanceStatus: newStatus });
            e.target.style.color = newStatus === 'RED_CARD' ? '#b91c1c' : '#047857';
            alert(`Player status updated to ${newStatus}`);
        } catch(err) {
            alert("Error updating status: " + err.message);
        }
    }
});