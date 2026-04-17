// modules/branding.js
import { db } from "../firebase-config.js";
import { doc, getDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export const initBrandingPanel = async (globalTeams) => {
    const sel = document.getElementById("brandingTeamSelect");
    if(!sel) return;
    sel.innerHTML = (globalTeams || []).map(t => `<option value="${t.id}">${t.name} (${t.id})</option>`).join("");
    
    const loadTeamBranding = async () => {
        const tid = sel.value;
        if(!tid) return;
        const snap = await getDoc(doc(db, "config", `branding_${tid}`));
        if(snap.exists) {
            const data = snap.data();
            document.getElementById("brandAppName").value = data.appName || "";
            document.getElementById("brandLogoUrl").value = data.logoUrl || "";
            document.getElementById("brandPrimaryColor").value = data.primaryColor || "#00263A";
            document.getElementById("brandSecondaryColor").value = data.secondaryColor || "#BFAE5A";
            if(document.getElementById("brandCourtType")) document.getElementById("brandCourtType").value = data.courtType || "soccer";
            if(document.getElementById("brandBgUrl")) document.getElementById("brandBgUrl").value = data.bgUrl || "";
            if(document.getElementById("brandButtonStyle")) document.getElementById("brandButtonStyle").value = data.buttonStyle || "16px";
        } else {
            // Reset to defaults
            document.getElementById("brandAppName").value = "";
            document.getElementById("brandLogoUrl").value = "";
            document.getElementById("brandPrimaryColor").value = "#00263A";
            document.getElementById("brandSecondaryColor").value = "#BFAE5A";
            if(document.getElementById("brandCourtType")) document.getElementById("brandCourtType").value = "soccer";
            if(document.getElementById("brandBgUrl")) document.getElementById("brandBgUrl").value = "";
            if(document.getElementById("brandButtonStyle")) document.getElementById("brandButtonStyle").value = "16px";
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
                bgUrl: document.getElementById("brandBgUrl") ? document.getElementById("brandBgUrl").value.trim() : "",
                buttonStyle: document.getElementById("brandButtonStyle") ? document.getElementById("brandButtonStyle").value : "16px",
                updatedAt: new Date()
            };
            saveBtn.innerText = "Saving...";
            await setDoc(doc(db, "config", `branding_${tid}`), data);
            saveBtn.innerText = "Saved!";
            setTimeout(() => saveBtn.innerText = "Save Branding", 2000);
            
            // Apply it live so the admin sees the changes instantly
            applyTeamBranding(tid);
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
                applyTeamBranding(tid); // Apply the reset live
                alert("Branding reset.");
            }
        });
        resetBtn.dataset.bound = "true";
    }
};

export const applyTeamBranding = async (teamId) => {
    if(!teamId) return;
    try {
        const snap = await getDoc(doc(db, "config", `branding_${teamId}`));
        let ct = "soccer";
        if(snap.exists) {
            const data = snap.data();
            if(data.primaryColor) document.documentElement.style.setProperty('--aggie-blue', data.primaryColor);
            if(data.secondaryColor) document.documentElement.style.setProperty('--aggie-gold', data.secondaryColor);
            
            if(data.appName && data.appName.trim() !== "") {
                document.title = data.appName;
                document.querySelectorAll('.app-title, .auth-title').forEach(el => el.innerText = data.appName);
            }
            
            if(data.logoUrl && data.logoUrl.trim() !== "") {
                document.querySelectorAll('.logo-circle').forEach(el => {
                    el.innerHTML = `<img src="${data.logoUrl}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
                    el.style.border = `4px solid ${data.secondaryColor || 'var(--aggie-gold)'}`;
                });
            }
            
            // Apply Background
            if(data.bgUrl && data.bgUrl.trim() !== "") {
                document.body.style.backgroundImage = `url('${data.bgUrl}')`;
                document.body.style.backgroundSize = "cover";
                document.body.style.backgroundPosition = "center";
                document.body.style.backgroundAttachment = "fixed";
            } else {
                document.body.style.backgroundImage = "radial-gradient(at 0% 0%, hsla(210, 100%, 95%, 1) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(40, 100%, 95%, 1) 0, transparent 50%)"; 
            }

            // Apply Button Radius
            if(data.buttonStyle) {
                document.documentElement.style.setProperty('--btn-radius', data.buttonStyle);
            }

            ct = data.courtType || "soccer";
        }
        
        window.currentCourtType = ct;
        const styleToggle = document.getElementById("strategyBoardStyleToggle");
        const strategyMode = (styleToggle && styleToggle.checked) ? 'whiteboard' : 'realistic';
        
        // Ensure applySportCourt exists on window before calling
        if(window.applySportCourt) {
            window.applySportCourt(ct, strategyMode, ["strategyPitchBg"], ["strategyPitchLines"]);
            window.applySportCourt(ct, 'realistic', ["gamedayPitchBg"], ["gamedayPitchLines"]);
        }
    } catch(e) { console.error("Error applying branding", e); }
};