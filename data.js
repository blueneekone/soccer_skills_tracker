export const dbData = {
  // 1. POSITIONS (New!)
  positions: [
    { id: "all", name: "Show All" },
    { id: "fwd", name: "Forward / Striker" },
    { id: "mid", name: "Midfielder (CAM/CDM)" },
    { id: "wing", name: "Winger" },
    { id: "def", name: "Defender (CB/LB/RB)" },
    { id: "gk", name: "Goalkeeper" }
  ],

  // 2. QUALITIES
  qualities: [
    { id: "q1", name: "Read Game", desc: "Decisions" },
    { id: "q2", name: "Initiative", desc: "Brave" },
    { id: "q3", name: "Focus", desc: "Mental" },
    { id: "q4", name: "Technical", desc: "Mastery" },
    { id: "q5", name: "Physical", desc: "Fitness" },
    { id: "q6", name: "Responsibility", desc: "Self-Reg" }
  ],

  // 3. TACTICAL GOALS
  roadmapActions: [
    { id: "att_1v1", name: "Create a 1v1 / Dribble Past", phase: "attack" },
    { id: "att_shoot", name: "Shoot / Finish", phase: "attack" },
    { id: "att_pass", name: "Pass / Distribute", phase: "attack" },
    { id: "def_protect", name: "Protect the Goal", phase: "defend" },
    { id: "def_steal", name: "Steal the Ball", phase: "defend" },
    { id: "def_air", name: "Win Aerial Ball", phase: "defend" }
  ],

  // 4. SKILLS (Updated with Position Tags)
  foundationSkills: [
    // --- FOUNDATION (FOR EVERYONE) ---
    { 
      id: "fs_shift_r", name: "Shift Right (Foundation)", 
      pressure: ["front", "side"], positions: ["all"], 
      drill: "Brilliant Basics Lvl 1: Toe Taps", video: "" 
    },
    { 
      id: "fs_step_over", name: "Step Over (Foundation)", 
      pressure: ["front", "side"], positions: ["all"], 
      drill: "Brilliant Basics Lvl 2: Step Over", video: "" 
    },
    { 
      id: "fs_pin", name: "Pinning (Foundation)", 
      pressure: ["back"], positions: ["all"], 
      drill: "Shielding: 1v1 Box", video: "" 
    },

    // --- POSITIONAL SPECIFIC (From your PDFs) ---
    // GOALKEEPER
    { 
      id: "gk_dive", name: "Dive & Recovery", 
      pressure: ["front", "side"], positions: ["gk"], 
      drill: "Defensive Template: Dive & Recov", video: "" 
    },
    { 
      id: "gk_high_ball", name: "High Ball Catch", 
      pressure: ["front"], positions: ["gk"], 
      drill: "Defensive Template: High Ball", video: "" 
    },

    // DEFENDER
    { 
      id: "def_clear", name: "Long Clearance", 
      pressure: ["front", "side"], positions: ["def"], 
      drill: "Defensive Template: Distribution", video: "" 
    },

    // WINGER / STRIKER
    { 
      id: "att_cross", name: "Crossing on the Run", 
      pressure: ["side"], positions: ["wing", "fwd"], 
      drill: "Offensive Template: Crossing Grid", video: "" 
    },
    { 
      id: "att_shoot_pwr", name: "Power Shot", 
      pressure: ["front"], positions: ["fwd", "mid", "wing"], 
      drill: "Offensive Template: Shooting Wall", video: "" 
    }
  ]
};