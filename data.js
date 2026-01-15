export const dbData = {
  // 1. QUALITIES (From US Soccer Roadmap)
  qualities: [
    { id: "q1", name: "Read Game", desc: "Decisions & Awareness" },
    { id: "q2", name: "Initiative", desc: "Proactive & Brave" },
    { id: "q3", name: "Focus", desc: "Optimal Mental State" },
    { id: "q4", name: "Technical", desc: "Ball Mastery" },
    { id: "q5", name: "Physical", desc: "Speed & Agility" },
    { id: "q6", name: "Responsibility", desc: "Self-Regulation" }
  ],

  // 2. TACTICAL GOALS (From US Soccer Roadmap)
  roadmapActions: [
    // ATTACKING
    { id: "att_1v1", name: "Create a 1v1 / Dribble Past", phase: "attack" },
    { id: "att_shoot", name: "Shoot / Finish", phase: "attack" },
    { id: "att_pass_fwd", name: "Pass or Dribble Forward", phase: "attack" },
    { id: "att_spread", name: "Spread Out", phase: "attack" },
    { id: "att_options", name: "Create Passing Options", phase: "attack" },
    { id: "att_change_point", name: "Change Point of Attack", phase: "attack" },
    
    // DEFENDING
    { id: "def_protect", name: "Protect the Goal", phase: "defend" },
    { id: "def_steal", name: "Steal the Ball", phase: "defend" },
    { id: "def_pressure", name: "Pressure the Ball", phase: "defend" },
    { id: "def_compact", name: "Make it Compact", phase: "defend" }
  ],

  // 3. TECHNICAL SOLUTIONS (From Foundation Model & Brilliant Basics)
  foundationSkills: [
    // ============================================================
    // MODE 1: ATTACK (Front/Side Pressure) - "SEARCH, SHIFT, SPEED"
    // ============================================================
    { 
      id: "fs_shift_r_out", 
      name: "Shift Right (Outside)", 
      pressure: ["front", "side"], 
      video: "", 
      category: "Shift & Speed",
      drill: "Brilliant Basics Lvl 1: Toe Taps / Boxes"
    },
    { 
      id: "fs_shift_l_out", 
      name: "Shift Left (Outside)", 
      pressure: ["front", "side"], 
      video: "", 
      category: "Shift & Speed",
      drill: "Brilliant Basics Lvl 1: Toe Taps / Boxes"
    },
    { 
      id: "fs_step_over", 
      name: "Step Over (Scissors)", 
      pressure: ["front", "side"], 
      video: "", 
      category: "Shift & Speed",
      drill: "Brilliant Basics Lvl 2: Step Over"
    },
    { 
      id: "fs_twist_turn", 
      name: "Twist & Turn", 
      pressure: ["front", "side"], 
      video: "", 
      category: "Shift & Speed",
      drill: "Brilliant Basics Lvl 3: Twist Off"
    },

    // ============================================================
    // MODE 2: SURVIVAL (Side/Back Pressure) - "SEARCH, SHIELD, SLIP"
    // ============================================================
    { 
      id: "fs_pin_defender", 
      name: "Pinning the Defender", 
      pressure: ["back"], 
      video: "", 
      category: "Shield & Slip",
      drill: "Shielding: 1v1 Box (Back into player)"
    },
    { 
      id: "fs_first_touch", 
      name: "First Time Touch (Slip)", 
      pressure: ["side", "back"], 
      video: "", 
      category: "Shield & Slip",
      drill: "Wall Ball: One Touch Passing"
    },
    { 
      id: "fs_back_foot", 
      name: "Back Foot Receive", 
      pressure: ["side", "back"], 
      video: "", 
      category: "Shield & Slip",
      drill: "Passing Gate: Open Up Body"
    },
    { 
      id: "fs_hook_out", 
      name: "Outside Hook (Turn)", 
      pressure: ["side", "back"], 
      video: "", 
      category: "Turn Away",
      drill: "Cone Grid: U-Turn (Outside)"
    },
    { 
      id: "fs_drag_back", 
      name: "Drag Back (Turn)", 
      pressure: ["side", "back"], 
      video: "", 
      category: "Turn Away",
      drill: "Stationary: Pull Back V"
    }
  ]
};