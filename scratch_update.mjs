import fs from 'fs';

const file = 'src/lib/components/hud/ActiveBounties.svelte';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
	/import MissionHeroModal from '\$lib\/components\/hud\/MissionHeroModal\.svelte';/,
	`import MissionHeroModal from '$lib/components/hud/MissionHeroModal.svelte';\n\timport BountyRow from '$lib/components/hud/BountyRow.svelte';`
);

c = c.replace(
	/\{@render questRowEmbedded\(quest\)\}/g,
	`<BountyRow {quest} embedded={true} {cadenceCompletions} intentRow={intentDataById[quest.id]} {playerUid} {playerXpByAttribute} {playerEmail} drillPreview={drillPreviewByQuestId[quest.id]} isParentVerified={approvedIntentIds.has(quest.id)} onAction={handleQuestAction} />`
);

c = c.replace(
	/\{@render questRow\(quest, 'bounty'\)\}/g,
	`<BountyRow {quest} variant="bounty" onAction={handleQuestAction} />`
);

c = c.replace(
	/\{@render questRow\(quest, 'habit'\)\}/g,
	`<BountyRow {quest} variant="habit" onAction={handleQuestAction} />`
);

// Delete the snippets
const startIndex1 = c.indexOf('{#snippet questRowEmbedded(quest: QuestTask)}');
const endIndex1 = c.indexOf('{/snippet}', startIndex1) + '{/snippet}'.length;
if (startIndex1 !== -1) {
	c = c.slice(0, startIndex1) + c.slice(endIndex1);
}

const startIndex2 = c.indexOf("{#snippet questRow(quest: QuestTask, variant: 'bounty' | 'habit')}");
const endIndex2 = c.indexOf('{/snippet}', startIndex2) + '{/snippet}'.length;
if (startIndex2 !== -1) {
	c = c.slice(0, startIndex2) + c.slice(endIndex2);
}

// Eliminate double new lines again since we removed stuff
c = c.replace(/\n\s*\n\s*\n/g, '\n\n');

fs.writeFileSync(file, c);
console.log('Update complete');
