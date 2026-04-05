import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"; 

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
    if (!targetTeamId || !coachEmail) return alert("Please select a team and enter a coach email.");
    
    try {
        const emailLower = coachEmail.toLowerCase().trim();
        
        // 1. Get the target team to find its clubId
        const teamRef = doc(db, "teams", targetTeamId);
        const teamSnap = await getDoc(teamRef);
        
        if (!teamSnap.exists()) return alert("Error: Team not found.");
        const clubId = teamSnap.data().clubId;

        // 2. Add the coach to the lookup table
        await setDoc(doc(db, "coach_lookup", emailLower), { 
            teamId: targetTeamId, 
            clubId: clubId,
            role: "coach",
            invitedAt: new Date()
        }, { merge: true });

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
    if (!userProfile || (userProfile.role !== 'director' && userProfile.role !== 'admin')) {
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

    safeBind("btnSaveBranding", "click", () => {
        const primary = document.getElementById("brandPrimaryColor").value;
        const secondary = document.getElementById("brandSecondaryColor").value;
        const logo = document.getElementById("brandLogoUrl").value;
        saveClubBranding(db, clubId, primary, secondary, logo);
    });

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