const fs = require('fs');
const path = require('path');

const workflows = [
  {
    id: 'sprint-r1',
    name: 'sprint-r1-parent-compliance-overhaul',
    title: 'Sprint R1 (P0): Parent Compliance Form Complete Overhaul',
    desc: 'Delete 85-line prototype +page.svelte, wire page to existing WaiverConsoleArena.svelte + WaiverController.svelte.ts Trinity, replace banned tw-bg-blue-600 / tw-bg-emerald-600 with Enterprise Palette CTAs (Action Gold #fbbf24), add Geist Mono + Switzer typography, add Icon component usage'
  },
  {
    id: 'sprint-r2',
    name: 'sprint-r2-transfer-portal-upgrade',
    title: 'Sprint R2 (P0): Transfer Portal Full Prefix Fix + Design Upgrade',
    desc: 'Add tw- prefix to 100+ bare Tailwind utility classes in TransferPortal.svelte (currently renders with zero styling in production), replace all rgba(0,255,255,...) with #14b8a6 Data Cyan, fix border-radius: 4px -> 0/2px, fix font-size: 8px -> minimum 10px, replace inline onmouseenter/onmouseleave with CSS :hover'
  },
  {
    id: 'sprint-r3',
    name: 'sprint-r3-global-geist-migration',
    title: 'Sprint R3 (P1): Global JetBrains Mono -> Geist Mono Migration',
    desc: 'Atomic find-and-replace across 37 files (consent/[token], terms, privacy, reset, clearance-policy, MarketingNav, PricingTable, +error.svelte, VanguardEmptyState, VanguardPrism, SkillTreeArena, RecruiterPortal, ParentHouseholdArena, and 24 more)'
  },
  {
    id: 'sprint-r4',
    name: 'sprint-r4-consent-token-polish',
    title: 'Sprint R4 (P1): Consent Token Page Design Polish',
    desc: 'Migrate JetBrains Mono -> Geist Mono in consent/[token]/+page.svelte, fix #020208 -> #000000/#0B0F19, fix #ffffff -> #fafafa (halation), consider extracting 340-line <style> block per 500-line extraction mandate'
  },
  {
    id: 'sprint-r5',
    name: 'sprint-r5-ghost-route-cleanup',
    title: 'Sprint R5 (P2): Ghost Route Cleanup',
    desc: 'Delete duplicate /coach/match-day (keep /coach/matchday), delete /admin/audit-log (keep /admin/audit-logs), delete /parent/vpc (keep /parent/dashboard/vpc), add goto() redirects from deleted paths'
  },
  {
    id: 'sprint-r6',
    name: 'sprint-r6-color-normalization',
    title: 'Sprint R6 (P2): Generic Color Normalization',
    desc: 'Migrate tw-bg-emerald-* success badges to Data Cyan #14b8a6 tokens across 12 files, audit tw-bg-green-500 indicator in HouseholdComplianceTab.svelte'
  },
  {
    id: 'sprint-r7',
    name: 'sprint-r7-raw-cyan-purge',
    title: 'Sprint R7 (P2): Raw Cyan Purge',
    desc: 'Replace rgba(0,255,255,...) -> #14b8a6 / rgba(20,184,166,...) in VanguardEmptyState.svelte, SeasonRegistration.svelte, TransferPortal.svelte'
  },
  {
    id: 'sprint-r8',
    name: 'sprint-r8-backend-parity',
    title: 'Sprint R8 (P0): Backend Functional Parity',
    desc: 'Implement missing httpsCallable endpoints for all personas (commitMatchTelemetry, getAccountabilityReport, secureFulfillIntent, initiateStripeConnect, logPlayerActivity, getPublicRecruitProfile, extractTenantData, replayIngestionRow)'
  }
];

const dir = path.join(__dirname, '.agents', 'workflows', 'jules-builds');
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

const queueEntries = [];

for (const wf of workflows) {
    const filename = `${wf.name}.md`;
    const filepath = path.join(dir, filename);
    const content = `# ${wf.title}\n\n**Goal**: ${wf.desc}\n\n**Instructions**:\nFollow the architectural guidelines and execute this sprint. Do NOT modify unrelated features. Adhere to the "Pessimistic Definition of Done" and ensure tests pass.`;
    fs.writeFileSync(filepath, content);
    
    queueEntries.push(`  {
    id: '${wf.id}',
    name: '${wf.name}',
    sessionId: null,
    workflowFile: '.agents/workflows/jules-builds/${filename}',
    dispatched: false
  }`);
}

const orchScriptPath = path.join(__dirname, 'scripts', 'overnight-sprint-chain-orchestrator.mjs');
let orchCode = fs.readFileSync(orchScriptPath, 'utf8');

// Insert the new entries into SPRINT_QUEUE
const queueStr = queueEntries.join(',\n');
if (!orchCode.includes('sprint-r1')) {
    orchCode = orchCode.replace(
        /id: 'sprint-6\.4'[^}]+\}[^\]]*\];/,
        match => match.replace('];', `},\n${queueStr}\n];`)
    );
    fs.writeFileSync(orchScriptPath, orchCode);
    console.log("Updated orchestrator script with new sprints.");
} else {
    console.log("Orchestrator script already updated.");
}
