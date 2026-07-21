import { db } from "../firebase-config.js";
import { collection, doc, deleteDoc, setDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export const handleCoachViewClick = async (e, currentCoachTeamId, secureRemovePlayerFn, secureUpdateJerseyFn, loadCoachDashboard, loadCoachScheduleAndHW, loadWorkouts) => {
    const target = e.target;

    if (target.classList.contains("action-delete-player")) {
        const pName = target.getAttribute("data-player");
        if (!confirm(`Remove ${pName}?`)) return;
        if (!currentCoachTeamId) return alert("Select a team first.");
        try {
            const res = await secureRemovePlayerFn({
                teamId: currentCoachTeamId,
                playerName: pName
            });
            const data = res && res.data ? res.data : {};
            if (data.notFound) {
                if (typeof Swal !== "undefined") {
                    Swal.fire({
                        title: "Not on roster",
                        text: "That player was not found on this team roster.",
                        icon: "info",
                        confirmButtonColor: "#0f172a"
                    });
                } else {
                    alert("Player was not on the roster.");
                }
            }
            loadCoachDashboard(false, window.globalTeams);
        } catch (err) {
            const code = err && err.code ? String(err.code) : "";
            console.error("[coach.js] secureRemovePlayer failed:", code, err && err.message);
            const msg = err && err.message ? err.message : "Could not remove player.";
            if (typeof Swal !== "undefined") {
                Swal.fire({ title: "Could not remove player", text: msg, icon: "error", confirmButtonColor: "#0f172a" });
            } else {
                alert(msg);
            }
        }
    }

    if (target.classList.contains("action-edit-jersey")) {
        const pName = target.getAttribute("data-player");
        const currentJersey = target.getAttribute("data-jersey");
        let num = prompt(`Enter new jersey number for ${pName} (or leave blank to clear):`, currentJersey);
        if (num === null) return;
        num = num.trim();
        if (!currentCoachTeamId) return alert("Select a team first.");
        try {
            await secureUpdateJerseyFn({
                teamId: currentCoachTeamId,
                playerName: pName,
                jersey: num
            });
            loadCoachDashboard(false, window.globalTeams);
        } catch (err) {
            const code = err && err.code ? String(err.code) : "";
            console.error("[coach.js] secureUpdateJersey failed:", code, err && err.message);
            const msg = err && err.message ? err.message : "Could not update jersey.";
            alert(msg);
        }
    }

    if (target.classList.contains("action-delete-schedule")) {
        if (confirm("Delete event?")) { await deleteDoc(doc(db, "schedules", target.getAttribute("data-id"))); loadCoachScheduleAndHW(); }
    }
    if (target.classList.contains("action-delete-homework")) {
        if (confirm("Delete assignment?")) { await deleteDoc(doc(db, "assignments", target.getAttribute("data-id"))); loadCoachScheduleAndHW(); }
    }

    if (target.classList.contains("action-delete-workout")) {
        if (!confirm("Delete this workout?")) return;
        await deleteDoc(doc(db, "team_workouts", target.getAttribute("data-id")));
        if (window.fetchWorkouts) await window.fetchWorkouts();
        if (window.buildCoachDropdowns) window.buildCoachDropdowns();
        loadWorkouts();
    }

    if (target.classList.contains("action-remove-assistant")) {
        const email = target.getAttribute("data-email");
        if (!confirm(`Revoke access for ${email}?`)) return;
        const teamIdx = window.globalTeams.findIndex(t => t.id === currentCoachTeamId);
        if (teamIdx > -1) {
            window.globalTeams[teamIdx].assistants = window.globalTeams[teamIdx].assistants.filter(e => e!== email);
            await setDoc(doc(db, "teams", currentCoachTeamId), { assistants: window.globalTeams[teamIdx].assistants }, { merge: true });
            loadCoachDashboard(false, window.globalTeams);
        }
    }

    if (target.id === "addWorkoutBtn") {
        if(!currentCoachTeamId) return alert("Select a team in the Roster tab first.");

        const type = document.getElementById("manageWorkoutType").value;
        const name = document.getElementById("manageWorkoutName").value.trim();
        const level = document.getElementById("manageWorkoutLevel").value;
        const desc = document.getElementById("manageWorkoutDesc").value.trim();

        if(!name) return alert("Workout Name is required.");

        let layoutData = null;
        if (window.spatialCanvas && window.spatialCanvas.getObjects().length > 0) {
            layoutData = JSON.stringify(window.spatialCanvas.toJSON());
        }

        target.innerText = "Saving...";
        try {
            await addDoc(collection(db, "team_workouts"), {
                teamId: currentCoachTeamId, type: type, name: name, reqLevel: parseInt(level), drill: desc, spatialLayout: layoutData, createdAt: new Date()
            });

            if (typeof Swal!== 'undefined') {
                Swal.fire({
                    title: 'Drill Saved!',
                    text: 'Your workout and spatial layout have been securely saved.',
                    icon: 'success',
                    confirmButtonColor: '#0f172a',
                    customClass: { popup: 'card' }
                });
            } else {
                alert("Workout Added!");
            }

            document.getElementById("manageWorkoutName").value = "";
            document.getElementById("manageWorkoutDesc").value = "";
            if (window.spatialCanvas) window.spatialCanvas.clear();

            if(window.fetchWorkouts) await window.fetchWorkouts();
            if(window.buildCoachDropdowns) window.buildCoachDropdowns();
            loadCoachDashboard(false, window.globalTeams);
        } catch(err) { alert("Error: " + err.message); }
        target.innerText = "Save Workout";
    }
};
