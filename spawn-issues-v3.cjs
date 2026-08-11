const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Dynamically retrieve the spec file from the command line argument, defaulting to launch-night-tdd-spec.md
const specFile = process.argv[2] || 'launch-night-tdd-spec.md';
const specPath = path.join(process.cwd(), specFile);

if (!fs.existsSync(specPath)) {
  console.error(`❌ Error: Could not find specification file: ${specPath}`);
  console.error("Usage: node spawn-issues-v3.cjs <specification-file-name.md>");
  process.exit(1);
}

console.log(`\n📖 Reading and parsing ${specFile}...`);
const specContent = fs.readFileSync(specPath, 'utf8');

// Parse features from markdown headers
const features = [];
const sections = specContent.split(/(?=^(?:###|##) )/m);

sections.forEach(section => {
  const lines = section.trim().split('\n');
  const titleLine = lines[0] || '';
  const match = titleLine.match(/^(###|##)\s*(.*)$/);
  
  if (match) {
    const title = match[2].trim();
    // Target headers that represent Epic prompts, features, or tasks
    if (title.toLowerCase().includes('epic') || title.toLowerCase().includes('feature') || title.toLowerCase().includes('prompt') || title.match(/^\d+/)) {
      const body = lines.slice(1).join('\n').trim();
      features.push({ title, body });
    }
  }
});

if (features.length === 0) {
  console.error(`❌ Error: No features found in ${specFile} using expected header formats.`);
  process.exit(1);
}

console.log(`🚀 Found ${features.length} features to spawn on GitHub.`);

// Verify gh CLI authentication before launching issues
try {
  execSync('gh auth status', { stdio: 'ignore' });
} catch (e) {
  console.error("❌ Error: You are not logged into the GitHub CLI (gh). Please run 'gh auth login' first.");
  process.exit(1);
}

features.forEach((feature, index) => {
  const issueTitle = `[Epic Swarm] ${feature.title}`;
  // Append the Jules trigger tag to the issue body so the cloud VMs automatically pick it up
  const issueBody = `${feature.body}\n\n@jules please run /swarm-build to implement and verify this feature.`;
  
  console.log(`[${index + 1}/${features.length}] Spawning: "${issueTitle}"...`);
  
  try {
    const safeTitle = issueTitle.replace(/'/g, "'\\''");
    const tempBodyPath = path.join(process.cwd(), `.temp-issue-body-${index}.txt`);
    fs.writeFileSync(tempBodyPath, issueBody, 'utf8');
    
    execSync(`gh issue create --title "${safeTitle}" --body-file "${tempBodyPath}" --label "jules"`, { stdio: 'inherit' });
    
    fs.unlinkSync(tempBodyPath);
  } catch (error) {
    console.error(`❌ Failed to create issue for "${feature.title}":`, error.message);
  }
});

console.log(`\n🎯 Swarm creation complete! Executed ${features.length} pipelines from ${specFile} successfully.`);
