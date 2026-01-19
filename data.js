export const dbData = {
  // TEAMS NOW LOADED FROM FIREBASE "config" collection
  // This acts as a fallback for the very first load
  teams: [
    { id: "misc", name: "Unassigned", coachEmail: "ecwaechtler@gmail.com" } 
  ],

  roadmapActions: [],

  foundationSkills: [
    // === CARDIO ===
    { id: "fit_run", name: "Interval Run", type: "cardio", category: "Endurance", drill: "Run/Walk intervals", video: "", image: "" },
    { id: "fit_sprint", name: "Shuttle Sprints", type: "cardio", category: "Speed", drill: "10 Yard Shuttles", video: "", image: "" },
    { id: "fit_bike", name: "Biking", type: "cardio", category: "Endurance", drill: "Cycling", video: "", image: "" },
    { id: "fit_jump", name: "Jump Rope", type: "cardio", category: "Agility", drill: "Skipping", video: "", image: "" },

    // === BRILLIANT BASICS (32 SKILLS) ===
    // (Paste the same skills list from the previous response here)
    // GROUP 1
    { id: "fm_1", name: "1. Shift Right | Outside Right", type: "foundation", category: "1v1 Front/Side", drill: "Shift Right using Outside Right Foot", video: "", image: "" },
    // ... (Keep the rest of the 32 skills) ...
  ]
};