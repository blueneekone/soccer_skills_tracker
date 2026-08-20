const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'functions', '.env.sports-skill-tracker-dev');
const dest = path.join(__dirname, '..', 'functions-compliance', '.env');

try {
  fs.copyFileSync(src, dest);
  console.log("Copied functions/.env.sports-skill-tracker-dev to functions-compliance/.env");

  fs.appendFileSync(dest, '\nWEBAUTHN_RP_ID=sstracker.app\nWEBAUTHN_RP_ORIGIN=https://sstracker.app,https://preview.sstracker.app,http://localhost:5173,http://localhost:4173\n');
  console.log("Appended WEBAUTHN variables to functions-compliance/.env");
} catch (err) {
  if (err.code === 'ENOENT') {
    // If the source file doesn't exist, it might be fine, but we'll log it.
    console.warn(`Source file not found: ${src}, skipping copy.`);
  } else {
    console.error("Error copying env file:", err);
    process.exit(1);
  }
}
