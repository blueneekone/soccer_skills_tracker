// data.js
export const dbData = {
  // Extracted from 'us-soccer-grassroots-roadmap.pdf'
  qualities: [
    { id: "q1", name: "Read & Understand Game", desc: "Make decisions, analyze situations" },
    { id: "q2", name: "Take Initiative", desc: "Be proactive, confident, brave" },
    { id: "q3", name: "Demonstrate Focus", desc: "Stay involved, deal with adversity" },
    { id: "q4", name: "Optimal Technical", desc: "Proficiency with ball, 1v1 effectiveness" },
    { id: "q5", name: "Optimal Physical", desc: "Coordination, agility, fitness" },
    { id: "q6", name: "Responsibility", desc: "Accountability for own development" }
  ],
  
  // Extracted from 'us-soccer-grassroots-roadmap.pdf' (Pages 3 & 5)
  roadmapActions: [
    // ATTACKING
    { id: "att_shoot", name: "Shoot", phase: "attack" },
    { id: "att_pass_dribble", name: "Pass or Dribble Forward", phase: "attack" },
    { id: "att_spread", name: "Spread Out", phase: "attack" },
    { id: "att_options", name: "Create Passing Options", phase: "attack" },
    { id: "att_support", name: "Support the Attack", phase: "attack" },
    { id: "att_create_1v1", name: "Create a 2v1 or 1v1", phase: "attack" },
    { id: "att_change_point", name: "Change Point of Attack", phase: "attack" },
    { id: "att_change_pace", name: "Change Pace/Rhythm", phase: "attack" },
    { id: "att_switch", name: "Switch Positions", phase: "attack" },
    
    // DEFENDING
    { id: "def_protect", name: "Protect the Goal", phase: "defend" },
    { id: "def_steal", name: "Steal the Ball", phase: "defend" },
    { id: "def_compact", name: "Make/Keep it Compact", phase: "defend" },
    { id: "def_pcb", name: "Pressure, Cover, Balance", phase: "defend" },
    { id: "def_outnumber", name: "Outnumber the Opponent", phase: "defend" },
    { id: "def_mark", name: "Mark Player/Area", phase: "defend" }
  ],

  // Extracted from 'Foundation_Model.pdf'
  // Mapped to pressure types as indicated in the document headers.
  foundationSkills: [
    // 1v1 TAKE ONS | FRONT & SIDE PRESSURE
    { id: "fs_shift_r_out", name: "Shift Right (Outside Right)", pressure: ["front", "side"], type: "take_on" },
    { id: "fs_shift_l_out", name: "Shift Left (Outside Left)", pressure: ["front", "side"], type: "take_on" },
    { id: "fs_shift_l_in", name: "Shift Left (Inside Right)", pressure: ["front", "side"], type: "take_on" },
    { id: "fs_shift_r_in", name: "Shift Right (Inside Left)", pressure: ["front", "side"], type: "take_on" },
    { id: "fs_step_l_shift_r", name: "Step Left / Shift Right", pressure: ["front", "side"], type: "take_on" },
    { id: "fs_step_r_shift_l", name: "Step Right / Shift Left", pressure: ["front", "side"], type: "take_on" },
    { id: "fs_stepover_l", name: "Step Over Left / Shift Right", pressure: ["front", "side"], type: "take_on" },
    { id: "fs_stepover_r", name: "Step Over Right / Shift Left", pressure: ["front", "side"], type: "take_on" },
    { id: "fs_twist_out_r", name: "Twist & Turn (Outside Right)", pressure: ["front", "side"], type: "take_on" },
    { id: "fs_twist_out_l", name: "Twist & Turn (Outside Left)", pressure: ["front", "side"], type: "take_on" },
    
    // 1v1 CHANGING DIRECTION | FRONT, SIDE & BACK PRESSURE
    { id: "fs_hook_out_r", name: "Outside Hook (Right)", pressure: ["front", "side", "back"], type: "change_dir" },
    { id: "fs_hook_out_l", name: "Outside Hook (Left)", pressure: ["front", "side", "back"], type: "change_dir" },
    { id: "fs_hook_in_r", name: "Inside Hook (Right)", pressure: ["front", "side", "back"], type: "change_dir" },
    { id: "fs_hook_in_l", name: "Inside Hook (Left)", pressure: ["front", "side", "back"], type: "change_dir" },
    { id: "fs_drag_sole_r", name: "Outside Drag Back (Sole Right)", pressure: ["front", "side", "back"], type: "change_dir" },
    { id: "fs_drag_sole_l", name: "Outside Drag Back (Sole Left)", pressure: ["front", "side", "back"], type: "change_dir" },

    // 1v1 SIDE & BACK PRESSURE (Control & Turn)
    { id: "fs_first_out_r", name: "First Time Touch (Outside Right)", pressure: ["side", "back"], type: "control" },
    { id: "fs_first_out_l", name: "First Time Touch (Outside Left)", pressure: ["side", "back"], type: "control" },
    { id: "fs_backfoot_in_r", name: "Back Foot Under Pressure (Right)", pressure: ["side", "back"], type: "control" },
    { id: "fs_backfoot_in_l", name: "Back Foot Under Pressure (Left)", pressure: ["side", "back"], type: "control" },
    { id: "fs_pin_r", name: "Pinning the Defender (Right)", pressure: ["back"], type: "control" },
    { id: "fs_pin_l", name: "Pinning the Defender (Left)", pressure: ["back"], type: "control" }
  ]
};