export const dbData = {
  positions: [
    { id: "all", name: "Show All" },
    { id: "fwd", name: "Forward" },
    { id: "mid", name: "Midfielder" },
    { id: "wing", name: "Winger" },
    { id: "def", name: "Defender" },
    { id: "gk", name: "Goalkeeper" }
  ],

  roadmapActions: [
    { id: "att_1v1", name: "Create a 1v1", phase: "attack" },
    { id: "att_shoot", name: "Shoot / Finish", phase: "attack" },
    { id: "att_pass", name: "Distribute", phase: "attack" },
    { id: "def_steal", name: "Steal Ball", phase: "defend" },
    { id: "def_protect", name: "Protect Goal", phase: "defend" }
  ],

  foundationSkills: [
    // === TYPE: CARDIO (New) ===
    { 
      id: "fit_run_1", name: "Interval Run (15m)", type: "cardio",
      drill: "Run 1 min, Walk 1 min (x7)", video: "", image: ""
    },
    { 
      id: "fit_sprint", name: "Shuttle Sprints", type: "cardio",
      drill: "Cone Shuttles (10 yards) x 10", video: "", image: ""
    },
    { 
      id: "fit_agility", name: "Ladder Agility", type: "cardio",
      drill: "Agility Ladder Routine", video: "", image: ""
    },

    // === TYPE: FOUNDATION (Ball Mastery) ===
    { 
      id: "bb_toe_taps", name: "Toe Taps (Lvl 1)", type: "foundation",
      drill: "Brilliant Basics: Stationary Toe Taps", video: "", image: "images/toe_taps.png"
    },
    { 
      id: "bb_boxes", name: "Boxes / Tic Tocs (Lvl 1)", type: "foundation",
      drill: "Brilliant Basics: Stationary Boxes", video: "", image: "images/boxes.png"
    },
    { 
      id: "bb_step_over", name: "Step Over (Lvl 2)", type: "foundation",
      drill: "Brilliant Basics: Stationary Step Over", video: "", image: "images/step_over.png"
    },

    // === TYPE: TACTICAL ===
    { 
      id: "fs_shift_r", name: "Shift Right (Speed)", type: "tactical",
      pressure: ["front", "side"], positions: ["all"], 
      drill: "1v1: Shift & Speed", video: "", image: "" 
    },
    { 
      id: "fs_pin", name: "Pinning (Shield)", type: "tactical",
      pressure: ["back"], positions: ["all"], 
      drill: "1v1: Shielding Box", video: "", image: "" 
    },
    { 
      id: "gk_dive", name: "Dive & Recovery", type: "tactical",
      pressure: ["front"], positions: ["gk"], 
      drill: "GK: Low Dive", video: "", image: "" 
    },
    { 
      id: "att_cross", name: "Crossing Run", type: "tactical",
      pressure: ["side"], positions: ["wing", "fwd"], 
      drill: "Wing Play: Cross & Finish", video: "", image: "" 
    }
  ]
};