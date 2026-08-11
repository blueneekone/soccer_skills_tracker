import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

// Read from command-line argument if provided, otherwise default to main spec
const specFile = process.argv[1] || 'launch-night-tdd-spec.md';
const specPath = path.join(process.cwd(), specFile);

if (!fs.existsSync(specPath)) {
  console.error(`❌ Error: Could not find ${specPath}`);
  console.error("Please ensure you run this script from your codebase root folder.");
  process.exit(1);
}

console.log(`📖 Reading ${specFile}...`);
const specContent = fs.readFileSync(specPath, 'utf8');

// Parse issues/features from the markdown
const features = [];
const sections = specContent.split(/(?=^(?:###|##) )/m);

sections.forEach(section => {
  const lines = section.trim().split('\n');
  const titleLine = lines || '';
  const match = titleLine.match(/^(###|##)\s*(.*)$/);
  
  if (match) {
    const title = match[1].trim();
    // Target actual features or Epics
    if (title.toLowerCase().includes('epic') || title.toLowerCase().includes('feature') || title.match(/^\d+/)) {
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

features.forEach((feature, index) => {
  const issueTitle = `[Epic Swarm] ${feature.title}`;
  // Append the Jules trigger tag to the issue body so the cloud VMs automatically pick it up
  const issueBody = `${feature.body}\n\n@jules please run /swarm-build to implement and verify this feature.`;
  
  console.log(`[${index + 1}/${features.length}] Spawning: "${issueTitle}"...`);
  
  try {
    // Escape single quotes for shell safety
    const safeTitle = issueTitle.replace(/'/g, "'\\''");
    const tempBodyPath = path.join(process.cwd(), `.temp-issue-body-${index}.txt`);
    fs.writeFileSync(tempBodyPath, issueBody, 'utf8');
    
    execSync(`gh issue create --title "${safeTitle}" --body-file "${tempBodyPath}" --label "jules"`, { stdio: 'inherit' });
    
    // Clean up temp file
    fs.unlinkSync(tempBodyPath);
  } catch (error) {
    console.error(`❌ Failed to create issue for "${feature.title}":`, error.message);
  }
});

console.log(`\n🎯 All ${features.length} extension pipelines spawned successfully under ${specFile}!`);
