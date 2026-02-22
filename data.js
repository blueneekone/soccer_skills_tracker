export const dbData = {
  teams: [
    { id: "misc", name: "Unassigned", coachEmail: "ecwaechtler@gmail.com" } 
  ],

  roadmapActions: [],

  foundationSkills: [
    // --- CARDIO (Stage 1) ---
    { id: "fit_run", name: "Interval Run", type: "cardio", category: "Endurance", drill: "Run/Walk intervals", video: "", image: "" },
    { id: "fit_sprint", name: "Shuttle Sprints", type: "cardio", category: "Speed", drill: "10 Yard Shuttles", video: "", image: "" },
    { id: "fit_bike", name: "Biking", type: "cardio", category: "Endurance", drill: "Cycling", video: "", image: "" },
    { id: "fit_swim", name: "Swimming", type: "cardio", category: "Endurance", drill: "Swimming", video: "", image: "" },

    // --- CORE WORKOUTS (Stage 2) ---
    { id: "core_1", name: "Push-ups", type: "core", category: "Strength", drill: "Standard push-ups. Keep your back straight.", video: "", image: "" },
    { id: "core_2", name: "Sit-ups", type: "core", category: "Strength", drill: "Standard sit-ups.", video: "", image: "" },
    { id: "core_3", name: "Plank", type: "core", category: "Strength", drill: "Hold a forearm plank.", video: "", image: "" },
    { id: "core_4", name: "Lunges", type: "core", category: "Strength", drill: "Alternating forward lunges.", video: "", image: "" },

    // --- STATIONARY BALL MASTERY (Stage 3) ---
    // Level 1
    { id: "bm_l1_1", name: "Sole Drag (Both Feet)", type: "ball_mastery", category: "Level 1", drill: "Stationary Ball Mastery L1", video: "", image: "" },
    { id: "bm_l1_2", name: "Inside Taps (Both Feet)", type: "ball_mastery", category: "Level 1", drill: "Stationary Ball Mastery L1", video: "", image: "" },
    { id: "bm_l1_3", name: "Sole Drags (x4) to Inside Taps (x4)", type: "ball_mastery", category: "Level 1", drill: "Stationary Ball Mastery L1", video: "", image: "" },
    { id: "bm_l1_4", name: "Triple Roll Over (Both Feet)", type: "ball_mastery", category: "Level 1", drill: "Stationary Ball Mastery L1", video: "", image: "" },
    // Level 2
    { id: "bm_l2_1", name: "Sole Drag (R) + Inside Push (L)", type: "ball_mastery", category: "Level 2", drill: "Stationary Ball Mastery L2", video: "", image: "", reqLevel: 2 },
    { id: "bm_l2_2", name: "Sole Drag (L) + Inside Push (R)", type: "ball_mastery", category: "Level 2", drill: "Stationary Ball Mastery L2", video: "", image: "", reqLevel: 2 },
    { id: "bm_l2_3", name: "Sole Drag & Outside Push (Right)", type: "ball_mastery", category: "Level 2", drill: "Stationary Ball Mastery L2", video: "", image: "", reqLevel: 2 },
    { id: "bm_l2_4", name: "Sole Drag & Outside Push (Left)", type: "ball_mastery", category: "Level 2", drill: "Stationary Ball Mastery L2", video: "", image: "", reqLevel: 2 },
    // Level 3
    { id: "bm_l3_1", name: "Pull & Push (Right Foot)", type: "ball_mastery", category: "Level 3", drill: "Stationary Ball Mastery L3", video: "", image: "", reqLevel: 3 },
    { id: "bm_l3_2", name: "Pull & Push (Left Foot)", type: "ball_mastery", category: "Level 3", drill: "Stationary Ball Mastery L3", video: "", image: "", reqLevel: 3 },
    { id: "bm_l3_3", name: "Pull & Push (Both Feet)", type: "ball_mastery", category: "Level 3", drill: "Stationary Ball Mastery L3", video: "", image: "", reqLevel: 3 },
    { id: "bm_l3_4", name: "Inside 'V' Shape", type: "ball_mastery", category: "Level 3", drill: "Stationary Ball Mastery L3", video: "", image: "", reqLevel: 3 },
    { id: "bm_l3_5", name: "Outside 'V' Shape", type: "ball_mastery", category: "Level 3", drill: "Stationary Ball Mastery L3", video: "", image: "", reqLevel: 3 },
    // Level 4
    { id: "bm_l4_1", name: "Roll Over & Stop", type: "ball_mastery", category: "Level 4", drill: "Stationary Ball Mastery L4", video: "", image: "", reqLevel: 4 },
    { id: "bm_l4_2", name: "Inside Taps (x4) & Roll Over", type: "ball_mastery", category: "Level 4", drill: "Stationary Ball Mastery L4", video: "", image: "", reqLevel: 4 },
    { id: "bm_l4_3", name: "Inside Cut & Outside Push", type: "ball_mastery", category: "Level 4", drill: "Stationary Ball Mastery L4", video: "", image: "", reqLevel: 4 },
    { id: "bm_l4_4", name: "Roll Over Stop & Inside Step Over", type: "ball_mastery", category: "Level 4", drill: "Stationary Ball Mastery L4", video: "", image: "", reqLevel: 4 },
    // Level 5 (Juggling)
    { id: "bm_l5_1", name: "Juggle: Right (x1) & Bounce", type: "ball_mastery", category: "Level 5 Juggling", drill: "Stationary Ball Mastery L5", video: "", image: "", reqLevel: 5 },
    { id: "bm_l5_2", name: "Juggle: Left (x1) & Bounce", type: "ball_mastery", category: "Level 5 Juggling", drill: "Stationary Ball Mastery L5", video: "", image: "", reqLevel: 5 },
    { id: "bm_l5_3", name: "Juggle: Right (x2) & Bounce", type: "ball_mastery", category: "Level 5 Juggling", drill: "Stationary Ball Mastery L5", video: "", image: "", reqLevel: 5 },
    { id: "bm_l5_4", name: "Juggle: Left (x2) & Bounce", type: "ball_mastery", category: "Level 5 Juggling", drill: "Stationary Ball Mastery L5", video: "", image: "", reqLevel: 5 },
    // Level 6 (Advanced Juggling)
    { id: "bm_l6_1", name: "Juggle: R(x1) + L(x1) & Bounce", type: "ball_mastery", category: "Level 6 Juggling", drill: "Stationary Ball Mastery L6", video: "", image: "", reqLevel: 6 },
    { id: "bm_l6_2", name: "Juggle: Right Foot (No Bounce)", type: "ball_mastery", category: "Level 6 Juggling", drill: "Stationary Ball Mastery L6", video: "", image: "", reqLevel: 6 },
    { id: "bm_l6_3", name: "Juggle: Left Foot (No Bounce)", type: "ball_mastery", category: "Level 6 Juggling", drill: "Stationary Ball Mastery L6", video: "", image: "", reqLevel: 6 },
    { id: "bm_l6_4", name: "Juggle: Both Feet (No Bounce)", type: "ball_mastery", category: "Level 6 Juggling", drill: "Stationary Ball Mastery L6", video: "", image: "", reqLevel: 6 },

    // --- BRILLIANT BASICS (Stage 4 Foundation) ---
    // --- Level 1 skills already unlocked for all players, no reqLevel needed ---
    { id: "fm_1", name: "Shift Right | Outside Right", type: "foundation", category: "1v1 Take Ons F/S", drill: "Shift Right using Outside Right Foot", video: "https://youtu.be/imq7LHS_KwM", image: "" },
    { id: "fm_2", name: "Shift Left | Outside Left", type: "foundation", category: "1v1 Take Ons F/S", drill: "Shift Left using Outside Left Foot", video: "https://youtu.be/ply2uRiYik0", image: "" },
    { id: "fm_3", name: "Shift Left | Inside Right", type: "foundation", category: "1v1 Take Ons F/S", drill: "Shift Left using Inside Right Foot", video: "https://youtu.be/U1VJzIGovpE", image: "" },
    { id: "fm_4", name: "Shift Right | Inside Left", type: "foundation", category: "1v1 Take Ons F/S", drill: "Shift Right using Inside Left Foot", video: "https://youtu.be/YGl_KC0NjWA", image: "" },
    { id: "fm_5", name: "Step Left | Shift Right (Out R)", type: "foundation", category: "1v1 Take Ons F/S", drill: "Step Left, Shift Right (Outside Right)", video: "https://youtu.be/MjT6IsFdDqs", image: "" },
    { id: "fm_6", name: "Step Right | Shift Left (Out L)", type: "foundation", category: "1v1 Take Ons F/S", drill: "Step Right, Shift Left (Outside Left)", video: "", image: "" },
   
   // --- Requires Level 2 to unlock
    { id: "fm_7", name: "Step Over Left | Shift Right", type: "foundation", category: "1v1 Take Ons F/S", drill: "Step Over Left, Shift Right (Outside Right)", video: "", image: "", reqLevel: 2 },
    { id: "fm_8", name: "Step Over Right | Shift Left", type: "foundation", category: "1v1 Take Ons F/S", drill: "Step Over Right, Shift Left (Outside Left)", video: "", image: "", reqLevel: 2 },
    { id: "fm_9", name: "Twist & Turn | Outside Right", type: "foundation", category: "1v1 Take Ons F/S", drill: "Twist Off using Outside Right", video: "", image: "", reqLevel: 2 },
    { id: "fm_10", name: "Twist & Turn | Outside Left", type: "foundation", category: "1v1 Take Ons F/S", drill: "Twist Off using Outside Left", video: "", image: "", reqLevel: 2 },
    { id: "fm_11", name: "Twist & Turn | Inside Right", type: "foundation", category: "1v1 Take Ons F/S", drill: "Twist Off using Inside Right", video: "", image: "", reqLevel: 2 },
    { id: "fm_12", name: "Twist & Turn | Inside Left", type: "foundation", category: "1v1 Take Ons F/S", drill: "Twist Off using Inside Left", video: "", image: "", reqLevel: 2 },
    
    
    { id: "fm_13", name: "Outside Hook | Right Foot", type: "foundation", category: "Changing Direction F/S/B", drill: "Cut back with Outside Right", video: "", image: "", reqLevel: 3 },
    { id: "fm_14", name: "Outside Hook | Left Foot", type: "foundation", category: "Changing Direction F/S/B", drill: "Cut back with Outside Left", video: "", image: "", reqLevel: 3 },
    { id: "fm_15", name: "Inside Hook | Right Foot", type: "foundation", category: "Changing Direction F/S/B", drill: "Cut back with Inside Right", video: "", image: "", reqLevel: 3 },
    { id: "fm_16", name: "Inside Hook | Left Foot", type: "foundation", category: "Changing Direction F/S/B", drill: "Cut back with Inside Left", video: "", image: "", reqLevel: 3 },
    { id: "fm_17", name: "Drag Back | Sole Right", type: "foundation", category: "Changing Direction F/S/B", drill: "Pull back V with Right Sole", video: "", image: "", reqLevel: 3 },
    { id: "fm_18", name: "Drag Back | Sole Left", type: "foundation", category: "Changing Direction F/S/B", drill: "Pull back V with Left Sole", video: "", image: "", reqLevel: 3 },
    { id: "fm_19", name: "Inside Drag | Sole Right", type: "foundation", category: "Changing Direction F/S/B", drill: "Inside Drag Turn Right", video: "", image: "", reqLevel: 3 },
    { id: "fm_20", name: "Inside Drag | Sole Left", type: "foundation", category: "Changing Direction F/S/B", drill: "Inside Drag Turn Left", video: "", image: "", reqLevel: 3 },
    
    { id: "fm_21", name: "First Time Touch | Out Right", type: "foundation", category: "1v1 Take Ons S/B", drill: "Directional Control (Outside Right)", video: "", image: "", reqLevel: 4 },
    { id: "fm_22", name: "First Time Touch | Out Left", type: "foundation", category: "1v1 Take Ons S/B", drill: "Directional Control (Outside Left)", video: "", image: "", reqLevel: 4 },
    { id: "fm_23", name: "First Time Touch | In Right", type: "foundation", category: "1v1 Take Ons S/B", drill: "Directional Control (Inside Right)", video: "", image: "", reqLevel: 4 },
    { id: "fm_24", name: "First Time Touch | In Left", type: "foundation", category: "1v1 Take Ons S/B", drill: "Directional Control (Inside Left)", video: "", image: "", reqLevel: 4 },
    { id: "fm_25", name: "Back Foot Receive | In Right", type: "foundation", category: "1v1 Take Ons S/B", drill: "Open Body Shape (Right)", video: "", image: "", reqLevel: 4 },
    { id: "fm_26", name: "Back Foot Receive | In Left", type: "foundation", category: "1v1 Take Ons S/B", drill: "Open Body Shape (Left)", video: "", image: "", reqLevel: 4 },
    
    { id: "fm_27", name: "Draw & Turn | Out R Turn", type: "foundation", category: "1v1 Take Ons S/B", drill: "Draw in defender, spin outside", video: "", image: "", reqLevel: 5 },
    { id: "fm_28", name: "Draw & Turn | Out L Turn", type: "foundation", category: "1v1 Take Ons S/B", drill: "Draw in defender, spin outside", video: "", image: "", reqLevel: 5 },
    { id: "fm_29", name: "Draw & Turn | In R Turn", type: "foundation", category: "1v1 Take Ons S/B", drill: "Draw in defender, spin inside", video: "", image: "", reqLevel: 5 },
    { id: "fm_30", name: "Draw & Turn | In L Turn", type: "foundation", category: "1v1 Take Ons S/B", drill: "Draw in defender, spin inside", video: "", image: "", reqLevel: 5 },
    { id: "fm_31", name: "Pinning | Sole Right", type: "foundation", category: "1v1 Take Ons S/B", drill: "Shielding with back to defender", video: "", image: "", reqLevel: 5 },
    { id: "fm_32", name: "Pinning | Sole Left", type: "foundation", category: "1v1 Take Ons S/B", drill: "Shielding with back to defender", video: "", image: "", reqLevel: 5 }
  ]
};