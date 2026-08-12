const { execSync } = require('child_process');

const personas = ["admin", "player", "coach", "director", "parent", "commissioner", "fan"];

console.log("⚡ INITIATING MASTER PARALLEL SWARM DISPATCH SEQUENCE...");

personas.forEach((persona, index) => {
  const title = `Swarm Audit & Recovery: ${persona.toUpperCase()} OS`;
  const body = `@jules, please execute the workflow defined in .agents/workflows/jules-builds/audit-${persona}-os.md`;
  const command = `gh issue create --title "${title}" --body "${body}" --label "jules"`;

  console.log(`[${index + 1}/${personas.length}] Spawning cloud VM for: ${persona.toUpperCase()} OS...`);
  
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ Spawned successfully for ${persona.toUpperCase()} OS.
`);
  } catch (err) {
    console.error(`❌ Failed to spawn VM for ${persona.toUpperCase()} OS: `, err.message);
  }
});

console.log("🎯 ALL 7 PLATFORM PERSOAS DISPATCHED IN PARALLEL! YOU CAN CLOSE YOUR LAPTOP.");