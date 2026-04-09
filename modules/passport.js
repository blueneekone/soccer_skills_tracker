// modules/passport.js
import { auth, db } from "../firebase-config.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let isPassportSigBlank = true;

export const initPassportCanvas = () => {
    const canvas = document.getElementById("passportSignatureCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let isDrawing = false;

    function resizeCanvas() {
        if (canvas.parentElement && canvas.parentElement.offsetWidth > 0) {
            canvas.width = canvas.parentElement.offsetWidth;
            canvas.height = 140;
            ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#00263A";
        }
    }
    window.addEventListener('resize', resizeCanvas);
    setTimeout(resizeCanvas, 500);

    function getCoordinates(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    }

    function startDraw(e) { isDrawing = true; ctx.beginPath(); draw(e); }
    function endDraw() { isDrawing = false; isPassportSigBlank = false; }
    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();
        const coords = getCoordinates(e);
        ctx.lineTo(coords.x, coords.y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(coords.x, coords.y);
    }

    canvas.addEventListener('mousedown', startDraw); canvas.addEventListener('mouseup', endDraw); canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('touchstart', startDraw, { passive: false }); canvas.addEventListener('touchend', endDraw); canvas.addEventListener('touchmove', draw, { passive: false });

    const clearBtn = document.getElementById("clearPassportSigBtn");
    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            isPassportSigBlank = true; 
        });
    }
};

export const loadPlayerPassport = async () => {
    const userEmail = auth.currentUser.email.toLowerCase();
    const badge = document.getElementById("passportStatusBadge");
    
    try {
        const snap = await getDoc(doc(db, "passports", userEmail));
        if (snap.exists()) {
            const data = snap.data();
            document.getElementById("passEmergencyName").value = data.emergencyName || "";
            document.getElementById("passEmergencyPhone").value = data.emergencyPhone || "";
            document.getElementById("passMedicalNotes").value = data.medicalNotes || "";
            
            // Render the Director's Clearance Badge
            if (data.clearanceStatus === "RED_CARD") {
                badge.innerHTML = "🟥 SUSPENDED (Red Card)";
                badge.style.cssText = "font-size: 24px; font-weight: 900; padding: 15px; border-radius: 12px; background: #fef2f2; border: 2px solid #ef4444; color: #b91c1c;";
            } else if (data.clearanceStatus === "PENDING_SAFESPORT") {
                badge.innerHTML = "🟨 PENDING SAFESPORT";
                badge.style.cssText = "font-size: 24px; font-weight: 900; padding: 15px; border-radius: 12px; background: #fffbeb; border: 2px solid #fbbf24; color: #b45309;";
            } else if (data.hasSignedWaiver) {
                badge.innerHTML = "✅ CLEARED TO PLAY";
                badge.style.cssText = "font-size: 24px; font-weight: 900; padding: 15px; border-radius: 12px; background: #f0fdf4; border: 2px solid #10b981; color: #047857;";
            }
        }
    } catch(e) { console.error("Error loading passport", e); }
};

export const savePlayerPassport = async () => {
    const name = document.getElementById("passEmergencyName").value.trim();
    const phone = document.getElementById("passEmergencyPhone").value.trim();
    const notes = document.getElementById("passMedicalNotes").value.trim();
    const btn = document.getElementById("savePassportBtn");

    if (!name || !phone) return alert("Emergency contact name and phone are required.");
    if (isPassportSigBlank) return alert("You must sign the liability waiver.");

    btn.innerText = "Saving Securely...";
    try {
        const userEmail = auth.currentUser.email.toLowerCase();
        // We use merge: true so we don't accidentally overwrite a Director's Red Card status
        await setDoc(doc(db, "passports", userEmail), {
            emergencyName: name,
            emergencyPhone: phone,
            medicalNotes: notes,
            hasSignedWaiver: true,
            waiverSignedAt: new Date()
        }, { merge: true });

        alert("Passport & Waiver securely saved!");
        loadPlayerPassport();
    } catch(e) { 
        alert("Error saving passport: " + e.message); 
    }
    btn.innerText = "💾 Securely Sign & Save Passport";
};