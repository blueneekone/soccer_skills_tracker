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
 // Inside data.js
  foundationSkills: [
    // 1v1 TAKE ONS
    { 
      id: "fs_shift_r_out", 
      name: "Shift Right (Outside)", 
      pressure: ["front", "side"], 
      video: "https://www.youtube.com/embed/dQw4w9WgXcQ" // <--- REPLACE THIS
    },
    { 
      id: "fs_shift_l_out", 
      name: "Shift Left (Outside)", 
      pressure: ["front", "side"], 
      video: "https://www.youtube.com/embed/YOUR_VIDEO_ID" 
    },
      // ... keep adding the 'video' line to all your skills ...
      // If you don't have a video yet, just leave the line out or put ""
    ]
  };