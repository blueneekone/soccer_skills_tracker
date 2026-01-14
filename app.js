// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc } 
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { dbData } from "./data.js";

// --- CONFIGURATION ---
// TODO: Replace with your actual Firebase project keys
const firebaseConfig = {
  apiKey: "AIzaSyDNmo6dACOLzOSkC93elMd5yMbFmsUXO1w",
  authDomain: "soccer-skills-tracker.firebaseapp.com",
  projectId: "soccer-skills-tracker",
  storageBucket: "soccer-skills-tracker.firebasestorage.app",
  messagingSenderId: "884044129977",
  appId: "1:884044129977:web:47d54f59c891340e505d68"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- UI LOGIC ---

// 1. Authentication Listener
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const appUI = document.getElementById("appUI");
const loginUI = document.getElementById("loginUI");

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginUI.style.display = "none";
    appUI.style.display = "block";
    document.getElementById("coachName").textContent = "Coach: " + user.displayName;
  } else {
    loginUI.style.display = "block";
    appUI.style.display = "none";
  }
});

loginBtn.addEventListener("click", () => {
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider).catch((error) => console.error("Login failed", error));
});

logoutBtn.addEventListener("click", () => signOut(auth));

// 2. Populate Dropdowns
const actionSelect = document.getElementById("action");
const qualitiesDiv = document.getElementById("qualities");

// Render Qualities Chips
dbData.qualities.forEach(q => {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.dataset.val = q.id;
    chip.textContent = q.name;
    qualitiesDiv.appendChild(chip);
});

// 3. Dynamic Filtering (Phase & Pressure)
const chips = {
    phase: document.getElementById("phase"),
    pressure: document.getElementById("pressure"),
    outcome: document.getElementById("outcome")
};

function getActiveChip(group) {
    return group.querySelector(".chip.active")?.dataset.val;
}

// Chip Click Handler
document.querySelectorAll(".chips").forEach(group => {
    group.addEventListener("click", (e) => {
        if(e.target.classList.contains("chip")) {
            Array.from(group.children).forEach(c => c.classList.remove("active"));
            e.target.classList.add("active");
            updateActionDropdown();
            updateSkillSuggestions();
        }
    });
});

// Quality Chips (Multi-select)
qualitiesDiv.addEventListener("click", (e) => {
    if(e.target.classList.contains("chip")) {
        e.target.classList.toggle("active");
    }
});

function updateActionDropdown() {
    const currentPhase = getActiveChip(chips.phase) || "attack";
    actionSelect.innerHTML = "";
    
    const filteredActions = dbData.roadmapActions.filter(a => a.phase === currentPhase);
    filteredActions.forEach(a => {
        const opt = document.createElement("option");
        opt.value = a.id;
        opt.textContent = a.name;
        actionSelect.appendChild(opt);
    });
}

function updateSkillSuggestions() {
    const suggestionsDiv = document.getElementById("skillSuggestions");
    suggestionsDiv.innerHTML = "";
    
    const currentPressure = getActiveChip(chips.pressure);
    
    const relevantSkills = dbData.foundationSkills.filter(s => {
        if (!currentPressure || currentPressure === "none") return true;
        return s.pressure.includes(currentPressure);
    });

    relevantSkills.forEach(s => {
        const chip = document.createElement("div");
        chip.className = "chip";
        chip.dataset.val = s.id;
        chip.textContent = s.name;
        chip.addEventListener("click", () => {
            Array.from(suggestionsDiv.children).forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
        });
        suggestionsDiv.appendChild(chip);
    });
}

// 4. Submit to Firebase
document.getElementById("logRep").addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return alert("Please sign in first");

    const playerInput = document.getElementById("player").value.trim();
    if (!playerInput) return alert("Please enter a player name");

    const repData = {
        coachEmail: user.email,
        timestamp: new Date(),
        player: playerInput,
        phase: getActiveChip(chips.phase),
        pressure: getActiveChip(chips.pressure),
        action: actionSelect.options[actionSelect.selectedIndex]?.text,
        skill: document.querySelector("#skillSuggestions .chip.active")?.textContent || "None",
        outcome: getActiveChip(chips.outcome),
        qualities: Array.from(qualitiesDiv.querySelectorAll(".active")).map(c => c.textContent),
        notes: document.getElementById("notes").value
    };

    const btn = document.getElementById("logRep");
    btn.textContent = "Saving...";
    btn.disabled = true;

    try {
        await addDoc(collection(db, "reps"), repData);
        document.getElementById("notes").value = "";
        btn.textContent = "Log Rep";
        btn.disabled = false;
        alert("Rep Saved!");
    } catch (e) {
        console.error("Error adding document: ", e);
        btn.textContent = "Error";
        alert("Error saving: Check console");
    }
});

// Initialize
updateActionDropdown();
updateSkillSuggestions();