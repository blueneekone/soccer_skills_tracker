#!/usr/bin/env node
/**
 * Resolve CHECK_ZERO_STATUS.md merge conflicts by merging table rows from both sides.
 */
import fs from 'fs';

const path = 'docs/acquisition/CHECK_ZERO_STATUS.md';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('<<<<<<<')) {
  console.log('No conflict markers in CHECK_ZERO_STATUS.md');
  process.exit(0);
}

const match = content.match(/<<<<<<< HEAD\r?\n([\s\S]*?)=======\r?\n([\s\S]*?)>>>>>>>[^\n\r]*/);
if (!match) {
  console.error('Could not parse CHECK_ZERO_STATUS conflict');
  process.exit(1);
}

const ours = match[1];
const theirs = match[2];

function extractRows(text) {
  const rows = new Map();
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\| (\d{2}-[^\|]+) \|/);
    if (m) rows.set(m[1].trim(), line);
  }
  return rows;
}

const mergedRows = new Map([...extractRows(ours), ...extractRows(theirs)]);
const header = `# svelte-check zero status

**Baseline:** TBD (RUNNER-0 bootstrap)

| Agent | Scope | Errors (start) | Errors (end) | Updated |
|-------|-------|----------------|--------------|---------|
`;

const ordered = [...mergedRows.values()].sort((a, b) => a.localeCompare(b));
const footer = `
Agents 08–13: log \`npm run check\` error count at start and after each commit batch.
`;

fs.writeFileSync(path, `${header}${ordered.join('\n')}\n${footer}`);
console.log('Resolved CHECK_ZERO_STATUS.md');
