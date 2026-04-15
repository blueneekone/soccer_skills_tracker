// modules/tracker.js
import { db } from "../firebase-config.js";
import { collection, doc, writeBatch, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentSessionItems = [];
export let isSignatureBlank = true;

const renderSession = () => {
    const l = document.getElementById("sessionList");
    if (!l) return;
    if (currentSessionItems.length === 0) {
        l.innerHTML = '<li class="session-empty">Empty. Select drills above to build your workout!</li>';
    } else {
        l.innerHTML = currentSessionItems.map((i, idx) => `
            <li class="session-item">
                <div class="session-item-text">
                    <span class="session-item-title">${idx + 1}. ${i.name}</span><br>
                    <span class="session-item-detail">(${i.sets} x ${i.reps})</span>
                </div>
                <button class="delete-btn action-remove-drill" data-index="${idx}">✕</button>
            </li>`).join("");
    }
};

// ENTERPRISE DELEGATION FOR SESSION LIST
document.addEventListener("DOMContentLoaded", () => {
    const list = document.getElementById("sessionList");
    if (list) {
        list.addEventListener("click", (e) => {
            if (e.target.classList.contains("action-remove-drill")) {
                const idx = parseInt(e.target.getAttribute("data-index"));
                currentSessionItems.splice(idx, 1);
                renderSession();
            }
        });
    }
});

export const addDrillToSession = (drill) => {
    currentSessionItems.push(drill);
    renderSession();
};

const clearTrackerForm = () => {
    currentSessionItems = [];
    renderSession();
    const minsInput = document.getElementById("totalMinutes");
    if (minsInput) minsInput.value = "";

    document.querySelectorAll(".outcome-btn").forEach(x => x.classList.remove("active"));
    const goodBtn = document.querySelector('.outcome-btn[data-val="Good"]');
    if (goodBtn) goodBtn.classList.add("active");

    const canvas = document.getElementById("signatureCanvas");
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        isSignatureBlank = true;
        canvas.style.borderColor = "#cbd5e1";
        canvas.style.backgroundColor = "#fcfcfc";
    }
};

const getSessionDescription = () => {
    if (currentSessionItems.length === 0) return "";
    const list = currentSessionItems.map((i, idx) => `${idx + 1}. ${i.name} (${i.sets} x ${i.reps})`).join("\\n");
    return `Training Plan:\\n\\n${list}\\n\\nLog results here: https://soccer-skills-tracker.web.app`;
};

export const addToGoogleCalendar = () => {
    // Keep your exact implementation
    if (currentSessionItems.length === 0) return alert("Add drills to the list first!");
    const date = document.getElementById("calDate")?.value;
    const time = document.getElementById("calTime")?.value;
    if (!date || !time) return alert("Select Date and Time.");
    const start = new Date(`${date}T${time}`).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const end = new Date(new Date(`${date}T${time}`).getTime() + (45 * 60000)).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent("⚽ Soccer Training")}&dates=${start}/${end}&details=${encodeURIComponent(getSessionDescription().replace(/\\n/g, "\n"))}&sf=true&output=xml`;
    window.open(url, '_blank');
};

export const downloadIcsFile = () => {
    // Keep your exact implementation
    if (currentSessionItems.length === 0) return alert("Add drills to the list first!");
    const date = document.getElementById("calDate")?.value;
    const time = document.getElementById("calTime")?.value;
    if (!date || !time) return alert("Select Date and Time.");
    const formatICSDate = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, "").split("Z")[0];
    const startDate = new Date(`${date}T${time}`);
    const endDate = new Date(startDate.getTime() + (45 * 60000));
    const icsContent = ["BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT", "SUMMARY:⚽ Soccer Training", `DESCRIPTION:${getSessionDescription()}`, `DTSTART:${formatICSDate(startDate)}`, `DTEND:${formatICSDate(endDate)}`, "END:VEVENT", "END:VCALENDAR"].join("\n");
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a'); link.href = window.URL.createObjectURL(blob); link.setAttribute('download', 'training_session.ics');
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
};

export const initSignatureCanvas = () => {
    const canvas = document.getElementById("signatureCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let isDrawing = false;

    function resizeCanvas() {
        if (canvas.parentElement && canvas.parentElement.offsetWidth > 0) {
            canvas.width = canvas.parentElement.offsetWidth;
            canvas.height = 120;
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
    function endDraw() { isDrawing = false; ctx.beginPath(); checkSignature(); }
    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault(); isSignatureBlank = false;
        const coords = getCoordinates(e);
        ctx.lineTo(coords.x, coords.y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(coords.x, coords.y);
    }

    function checkSignature() {
        const pixelBuffer = new Uint32Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
        if (!pixelBuffer.some(color => color !== 0)) isSignatureBlank = true;
        else { isSignatureBlank = false; canvas.style.borderColor = "#16a34a"; canvas.style.backgroundColor = "#f0fdf4"; }
    }

    canvas.addEventListener('mousedown', startDraw); canvas.addEventListener('mouseup', endDraw); canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('touchstart', startDraw, { passive: false }); canvas.addEventListener('touchend', endDraw); canvas.addEventListener('touchmove', draw, { passive: false });

    const clearBtn = document.getElementById("clearSigBtn");
    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            isSignatureBlank = true; canvas.style.borderColor = "#cbd5e1"; canvas.style.backgroundColor = "#fcfcfc";
        });
    }
};

export const handleWorkoutSubmit = async (userProfile, globalTeams, onSuccessCallback) => {
    if (currentSessionItems.length === 0) return alert("Add drills to your session first!");
    if (isSignatureBlank) return alert("A parent must sign to verify this workout.");

    const { tid } = window.getAppContext();
    const pname = userProfile ? userProfile.playerName : null;
    const mins = parseInt(document.getElementById("totalMinutes")?.value || 0);

    if (!tid || !pname) return alert("User profile is incomplete. Please complete setup.");
    if (mins <= 0) return alert("Please enter valid total minutes.");

    try {
        const batch = writeBatch(db);

        const newRepRef = doc(collection(db, "reps"));
        batch.set(newRepRef, {
            timestamp: new Date(),
            teamId: tid,
            player: pname,
            minutes: mins,
            drills: currentSessionItems,
            drillSummary: currentSessionItems.map(x => x.name).join(", "),
            outcome: document.querySelector(".outcome-btn.active")?.dataset.val || "Good"
        });

        const playerStatRef = doc(db, "player_stats", pname);
        batch.set(playerStatRef, {
            teamId: tid,
            totalMins: increment(mins),
            totalWorkouts: increment(1),
            lastActive: new Date()
        }, { merge: true });

        await batch.commit(); // Saves everything at exactly the same time

//Enterprise Success Modal & Confetti
        if (typeof confetti !== 'undefined') {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#0f172a', '#fbbf24', '#3b82f6'] // Aggie Blue, Gold, and Light Blue
            });
        }

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Workout Logged!',
                text: `Awesome job! +XP added to your profile.`,
                icon: 'success',
                confirmButtonColor: '#0f172a',
                confirmButtonText: 'Keep Grinding',
                customClass: { popup: 'card' } // Uses your glassmorphism CSS
            });
        } else {
            alert("Workout Logged successfully!"); // Fallback just in case
        }

        clearTrackerForm();
        if (onSuccessCallback) onSuccessCallback();
    } catch (e) { alert("Database Error: " + e.message); console.error(e); }
};