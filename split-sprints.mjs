import fs from 'fs';
import path from 'path';

const workflowDir = path.join(process.cwd(), '.agents', 'workflows', 'jules-builds');
const monolithPath = path.join(workflowDir, 'remaining-sprints.md');
const content = fs.readFileSync(monolithPath, 'utf8');

const lines = content.split('\n');
const sprints = [];
let currentSprint = null;

// The file has some header content. We'll skip it until we hit the first sprint.
let blockText = [];

for (let line of lines) {
  const match = line.match(/^### Sprint ([\w\.]+):/);
  if (match) {
    if (currentSprint) {
      sprints.push({
        id: currentSprint.id,
        name: currentSprint.name,
        content: blockText.join('\n')
      });
    }
    const sprintId = match[1].toLowerCase();
    currentSprint = {
      id: `sprint-${sprintId}`,
      name: `sprint-${sprintId}`
    };
    blockText = [line];
  } else {
    if (currentSprint) {
      blockText.push(line);
    }
  }
}

if (currentSprint) {
  sprints.push({
    id: currentSprint.id,
    name: currentSprint.name,
    content: blockText.join('\n')
  });
}

const queue = [];

for (let sprint of sprints) {
  const filename = `${sprint.id}.md`;
  fs.writeFileSync(path.join(workflowDir, filename), sprint.content);
  queue.push({
    id: sprint.id,
    name: sprint.name,
    sessionId: null,
    workflowFile: `.agents/workflows/jules-builds/${filename}`,
    dispatched: false
  });
  console.log(`Created ${filename}`);
}

fs.writeFileSync('queue.json', JSON.stringify(queue, null, 2));
console.log('Done!');
