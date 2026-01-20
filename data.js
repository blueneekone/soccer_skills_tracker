export const dbData = {
  // FALLBACK TEAMS (If Firestore is empty)
  teams: [
    { id: "misc", name: "Unassigned", coachEmail: "ecwaechtler@gmail.com" } 
  ],

  roadmapActions: [],

  foundationSkills: [
    // === CARDIO ===
    { id: "fit_run", name: "Interval Run", type: "cardio", category: "Endurance", drill: "Run/Walk intervals", video: "", image: "" },
    { id: "fit_sprint", name: "Shuttle Sprints", type: "cardio", category: "Speed", drill: "10 Yard Shuttles", video: "", image: "" },
    { id: "fit_bike", name: "Biking", type: "cardio", category: "Endurance", drill: "Cycling", video: "", image: "" },
    { id: "fit_swim", name: "Swimming", type: "cardio", category: "Endurance", drill: "Swimming", video: "", image: "" },

    // === BRILLIANT BASICS (32 SKILLS) ===
    { id: "fm_1", name: "1. Shift Right | Outside Right", type: "foundation", category: "1v1 Take Ons F/S", drill: "Shift Right using Outside Right Foot", video: "https://youtu.be/imq7LHS_KwM", image: "" },
    { id: "fm_2", name: "2. Shift Left | Outside Left", type: "foundation", category: "1v1 Take Ons F/S", drill: "Shift Left using Outside Left Foot", video: "", image: "" },
    { id: "fm_3", name: "3. Shift Left | Inside Right", type: "foundation", category: "1v1 Take Ons F/S", drill: "Shift Left using Inside Right Foot", video: "", image: "" },
    { id: "fm_4", name: "4. Shift Right | Inside Left", type: "foundation", category: "1v1 Take Ons F/S", drill: "Shift Right using Inside Left Foot", video: "", image: "" },
    { id: "fm_5", name: "5. Step Left | Shift Right (Out R)", type: "foundation", category: "1v1 Take Ons F/S", drill: "Step Left, Shift Right (Outside Right)", video: "", image: "" },
    { id: "fm_6", name: "6. Step Right | Shift Left (Out L)", type: "foundation", category: "1v1 Take Ons F/S", drill: "Step Right, Shift Left (Outside Left)", video: "", image: "" },
    { id: "fm_7", name: "7. Step Over Left | Shift Right", type: "foundation", category: "1v1 Take Ons F/S", drill: "Step Over Left, Shift Right (Outside Right)", video: "", image: "" },
    { id: "fm_8", name: "8. Step Over Right | Shift Left", type: "foundation", category: "1v1 Take Ons F/S", drill: "Step Over Right, Shift Left (Outside Left)", video: "", image: "" },
    { id: "fm_9", name: "9. Twist & Turn | Outside Right", type: "foundation", category: "1v1 Take Ons F/S", drill: "Twist Off using Outside Right", video: "", image: "" },
    { id: "fm_10", name: "10. Twist & Turn | Outside Left", type: "foundation", category: "1v1 Take Ons F/S", drill: "Twist Off using Outside Left", video: "", image: "" },
    { id: "fm_11", name: "11. Twist & Turn | Inside Right", type: "foundation", category: "1v1 Take Ons F/S", drill: "Twist Off using Inside Right", video: "", image: "" },
    { id: "fm_12", name: "12. Twist & Turn | Inside Left", type: "foundation", category: "1v1 Take Ons F/S", drill: "Twist Off using Inside Left", video: "", image: "" },
    { id: "fm_13", name: "1. Outside Hook | Right Foot", type: "foundation", category: "Changing Direction F/S/B F/S/B", drill: "Cut back with Outside Right", video: "", image: "" },
    { id: "fm_14", name: "2. Outside Hook | Left Foot", type: "foundation", category: "Changing Direction F/S/B", drill: "Cut back with Outside Left", video: "", image: "" },
    { id: "fm_15", name: "3. Inside Hook | Right Foot", type: "foundation", category: "Changing Direction F/S/B", drill: "Cut back with Inside Right", video: "", image: "" },
    { id: "fm_16", name: "4. Inside Hook | Left Foot", type: "foundation", category: "Changing Direction F/S/B", drill: "Cut back with Inside Left", video: "", image: "" },
    { id: "fm_17", name: "5. Drag Back | Sole Right", type: "foundation", category: "Changing Direction F/S/B", drill: "Pull back V with Right Sole", video: "", image: "" },
    { id: "fm_18", name: "6. Drag Back | Sole Left", type: "foundation", category: "Changing Direction F/S/B", drill: "Pull back V with Left Sole", video: "", image: "" },
    { id: "fm_19", name: "7. Inside Drag | Sole Right", type: "foundation", category: "Changing Direction F/S/B", drill: "Inside Drag Turn Right", video: "", image: "" },
    { id: "fm_20", name: "8. Inside Drag | Sole Left", type: "foundation", category: "Changing Direction F/S/B", drill: "Inside Drag Turn Left", video: "", image: "" },
    { id: "fm_21", name: "1. First Time Touch | Out Right", type: "foundation", category: "1v1 Take Ons S/B", drill: "Directional Control (Outside Right)", video: "", image: "" },
    { id: "fm_22", name: "2. First Time Touch | Out Left", type: "foundation", category: "1v1 Take Ons S/B", drill: "Directional Control (Outside Left)", video: "", image: "" },
    { id: "fm_23", name: "3. First Time Touch | In Right", type: "foundation", category: "1v1 Take Ons S/B", drill: "Directional Control (Inside Right)", video: "", image: "" },
    { id: "fm_24", name: "4. First Time Touch | In Left", type: "foundation", category: "1v1 Take Ons S/B", drill: "Directional Control (Inside Left)", video: "", image: "" },
    { id: "fm_25", name: "5. Back Foot Receive | In Right", type: "foundation", category: "1v1 Take Ons S/B", drill: "Open Body Shape (Right)", video: "", image: "" },
    { id: "fm_26", name: "6. Back Foot Receive | In Left", type: "foundation", category: "1v1 Take Ons S/B", drill: "Open Body Shape (Left)", video: "", image: "" },
    { id: "fm_27", name: "7. Draw & Turn | Out R Turn", type: "foundation", category: "1v1 Take Ons S/B", drill: "Draw in defender, spin outside", video: "", image: "" },
    { id: "fm_28", name: "8. Draw & Turn | Out L Turn", type: "foundation", category: "1v1 Take Ons S/B", drill: "Draw in defender, spin outside", video: "", image: "" },
    { id: "fm_29", name: "9. Draw & Turn | In R Turn", type: "foundation", category: "1v1 Take Ons S/B", drill: "Draw in defender, spin inside", video: "", image: "" },
    { id: "fm_30", name: "10. Draw & Turn | In L Turn", type: "foundation", category: "1v1 Take Ons S/B", drill: "Draw in defender, spin inside", video: "", image: "" },
    { id: "fm_31", name: "11. Pinning | Sole Right", type: "foundation", category: "1v1 Take Ons S/B", drill: "Shielding with back to defender", video: "", image: "" },
    { id: "fm_32", name: "12. Pinning | Sole Left", type: "foundation", category: "1v1 Take Ons S/B", drill: "Shielding with back to defender", video: "", image: "" }
  ]
};
