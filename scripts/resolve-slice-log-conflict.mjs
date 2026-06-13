#!/usr/bin/env node
/**
 * Resolve SLICE_LOG.md merge conflicts by keeping both sides (append-only).
 * Usage: node scripts/resolve-slice-log-conflict.mjs [incoming-branch]
 */
import fs from 'fs';

const logPath = 'docs/acquisition/SLICE_LOG.md';
const incomingBranch = process.argv[2];

let content = fs.readFileSync(logPath, 'utf8');

if (!content.includes('<<<<<<<')) {
  console.log('No conflict markers in SLICE_LOG.md');
  process.exit(0);
}

const match = content.match(/<<<<<<< HEAD\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>>[^\n]*/);
if (!match) {
  console.error('Could not parse conflict markers');
  process.exit(1);
}

const ours = match[1].trimEnd();
const theirs = match[2].trimEnd();
const header = `# Slice log (append-only)

Agents append entries below. Do not edit prior rows.

---

`;

const merged = `${header}${ours}\n\n${theirs}\n`;
fs.writeFileSync(logPath, merged.endsWith('\n') ? merged : `${merged}\n`);
console.log(`Resolved SLICE_LOG.md${incomingBranch ? ` (incoming: ${incomingBranch})` : ''}`);
