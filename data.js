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
    // === TYPE: FOUNDATION (Daily Essentials - Simon's Brilliant Basics) ===
    { 
      id: "bb_toe_taps", name: "Toe Taps (Level 1)", type: "foundation",
      drill: "Brilliant Basics: Stationary Toe Taps", video: "", image: "images/toe_taps.png"
    },
    { 
      id: "bb_boxes", name: "Boxes / Tic Tocs (Level 1)", type: "foundation",
      drill: "Brilliant Basics: Stationary Boxes", video: "", image: "images/boxes.png"
    },
    { 
      id: "bb_step_over", name: "Step Over (Level 2)", type: "foundation",
      drill: "Brilliant Basics: Stationary Step Over", video: "", image: "images/step_over.png"
    },
    { 
      id: "bb_roll_over", name: "Roll Over (Level 2)", type: "foundation",
      drill: "Brilliant Basics: Stationary Roll Over", video: "", image: "images/roll_over.png"
    },

    // === TYPE: TACTICAL (Filtered by Position & Pressure) ===
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