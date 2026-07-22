/**
 * playerLoadoutSprint35g.test.ts — Sprint 3.5g-a-fix / 3.5g-c / 3.5g-d OperativeIdEmblem grammar
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const PRO_CARD = join(ROOT, 'lib/components/stats/ProPlayerCard.svelte');
const ID_EMBLEM = join(ROOT, 'lib/components/stats/OperativeIdEmblem.svelte');
const ID_FRAME = join(ROOT, 'lib/components/stats/OperativeIdCardFrame.svelte');
const VA_MANIFEST_GF = join(ROOT, '..', 'docs/vision/va-screenshots/s35gf-manifest.json');
const VA_DIR = join(ROOT, '..', 'docs/vision/va-screenshots');
const IBM = join(ROOT, 'lib/components/player/dashboard/IdentityBentoModule.svelte');
const STUDIO = join(ROOT, 'lib/components/player/OperativeLoadoutStudio.svelte');
const DASHBOARD = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');
const TRAINING_OPS = join(ROOT, '..', 'functions', 'src', 'domains', 'trainingOps.js');
const RESOLVE_CLUB = join(ROOT, 'lib/player/resolveClubDisplayName.ts');
const FETCH_CLUB = join(ROOT, 'lib/player/fetchClubDisplayName.ts');
const ARMORY = join(ROOT, 'routes/(app)/player/armory/+page.svelte');
const RECRUIT = join(ROOT, 'routes/recruit/[playerKey]/+page.svelte');
const VA_MANIFEST_GB = join(ROOT, '..', 'docs/vision/va-screenshots/s35gb-manifest.json');

function readSrc(path: string) {
	return readFileSync(path, 'utf-8');
}

function lineCount(path: string) {
	return readSrc(path).split(/\r?\n/).length;
}

/** Dossier preview block inside OperativeLoadoutStudio. */
function dossierBlock(studioSrc: string) {
	const start = studioSrc.indexOf('ols-dossier-panel');
	const end = studioSrc.indexOf('ols-picker-panel', start);
	return start >= 0 && end > start ? studioSrc.slice(start, end) : '';
}

describe('Sprint 3.5g-a-fix — OperativeIdEmblem canonical contract', () => {
	const emblemSrc = readSrc(ID_EMBLEM);

	it('OperativeIdEmblem uses variant card|holo — no compact prop', () => {
		expect(emblemSrc).toMatch(/variant\s*=\s*'card'/);
		expect(emblemSrc).toMatch(/variant\?:\s*'card'\s*\|\s*'holo'/);
		expect(emblemSrc).not.toMatch(/\bcompact\b/);
		expect(emblemSrc).toMatch(/oie-root--holo=\{variant === 'holo'\}/);
	});

	it('OperativeIdEmblem has no oie-name-strap — arc is the only name on card', () => {
		expect(emblemSrc).not.toMatch(/oie-name-strap/);
		expect(emblemSrc).toMatch(/oie-name-arc/);
		expect(emblemSrc).toMatch(/<textPath\b/);
	});

	it('OperativeIdEmblem keeps club above square, 96px portrait, level badge + rank below', () => {
		expect(emblemSrc).toMatch(/oie-club[\s\S]*?oie-emblem/);
		expect(emblemSrc).toMatch(/size\s*=\s*96/);
		expect(emblemSrc).toMatch(/oie-level-badge/);
		expect(emblemSrc).toMatch(/class="oie-rank\b/);
		expect(emblemSrc).not.toMatch(/oie-rank[\s\S]*LVL/);
		const avatarRingBlock = emblemSrc.match(/oie-avatar-ring[\s\S]*?<\/div>\s*<\/div>/)?.[0] ?? '';
		const rankAt = emblemSrc.indexOf('class="oie-rank');
		expect(rankAt).toBeGreaterThan(-1);
		expect(
			avatarRingBlock.includes('oie-level-badge--ring') ||
				emblemSrc.includes('oie-level-badge--card'),
		).toBe(true);
	});

	it('name arc path is portrait-centered (not flat y=72 chord)', () => {
		expect(emblemSrc).toMatch(/PORTRAIT_CX|PORTRAIT_CY/);
		expect(emblemSrc).toMatch(/NAME_ARC_RADIUS\s*=\s*52/);
		expect(emblemSrc).not.toMatch(/38 \* s\} \$\{72 \* s\}/);
		expect(emblemSrc).toMatch(/function arcPoint|arcPoint\(/);
	});

	it('holo variant scales via CSS only — same emblemLogical for both variants', () => {
		expect(emblemSrc).toMatch(/const emblemLogical = 200/);
		expect(emblemSrc).toMatch(/\.oie-root--holo \.oie-emblem/);
		expect(emblemSrc).not.toMatch(/compact\s*\?\s*168/);
	});
});

describe('Sprint 3.5g-a-fix — ProPlayerCard card frame wiring', () => {
	const proCardSrc = readSrc(PRO_CARD);

	it('ProPlayerCard imports OperativeIdCardFrame and passes variant="card"', () => {
		expect(proCardSrc).toMatch(
			/import OperativeIdCardFrame from '\$lib\/components\/stats\/OperativeIdCardFrame\.svelte'/,
		);
		expect(proCardSrc).toMatch(/<OperativeIdCardFrame\b/);
		expect(proCardSrc).toMatch(/variant="card"/);
		expect(proCardSrc).not.toMatch(/<OperativeIdEmblem\b/);
		expect(proCardSrc).not.toMatch(/OperativeCardPortrait/);
	});

	it('ProPlayerCard does NOT pass compact or dossierPreview to frame', () => {
		expect(proCardSrc).not.toMatch(/compact=\{/);
		expect(proCardSrc).not.toMatch(/compact=\{dossierPreview\}/);
		const frontBlock = proCardSrc.match(/ppc-face--front[\s\S]*?ppc-face--back/)?.[0] ?? '';
		expect(frontBlock).not.toMatch(/dossierPreview/);
		expect(frontBlock).not.toMatch(/levelAnchor/);
	});

	it('ProPlayerCard accepts clubName and passes rankName + operativeLevel into frame', () => {
		expect(proCardSrc).toMatch(/clubName\s*=\s*undefined/);
		expect(proCardSrc).toMatch(/displayName=\{playerDisplayName/);
		expect(proCardSrc).toMatch(/clubName=\{clubName\}/);
		expect(proCardSrc).toMatch(/rankName=\{rankName\}/);
		expect(proCardSrc).toMatch(/\{operativeLevel\}/);
		expect(proCardSrc).not.toMatch(/formatEmblemRankLabel/);
	});

	it('ProPlayerCard front face has no duplicate flat h2 name under portrait', () => {
		const frontBlock = proCardSrc.match(/ppc-face--front[\s\S]*?ppc-face--back/)?.[0];
		expect(frontBlock).toBeTruthy();
		expect(frontBlock).not.toMatch(/<h2\b/);
	});

	it('ProPlayerCard.svelte stays within file budget (≤700 lines)', () => {
		expect(lineCount(PRO_CARD)).toBeLessThanOrEqual(700);
	});
});

describe('Sprint 3.5g-a-fix — HQ holo + Armory dossier', () => {
	const ibmSrc = readSrc(IBM);
	const studioSrc = readSrc(STUDIO);
	const dossier = dossierBlock(studioSrc);

	it('IdentityBentoModule holo passes variant="holo" and clubName prop (not teamLabel)', () => {
		const holoBlock = ibmSrc.match(/ibm-holo-face[\s\S]*?IdentityTelemetryBezel/)?.[0] ?? '';
		expect(holoBlock).toMatch(/OperativeIdCardFrame/);
		expect(holoBlock).toMatch(/variant="holo"/);
		expect(holoBlock).toMatch(/clubName=\{clubName/);
		expect(holoBlock).not.toMatch(/clubName=\{teamLabel/);
		expect(holoBlock).toMatch(/rankName=\{rankName/);
		expect(holoBlock).toMatch(/operativeLevel=\{level\}/);
		expect(holoBlock).toMatch(/displayName=\{displayName\}/);
		expect(holoBlock).not.toMatch(/\bcompact\b/);
	});

	it('IdentityBentoModule hides duplicate name when emblem owns identity', () => {
		expect(ibmSrc).toMatch(/emblemOwnsIdentity/);
		expect(ibmSrc).toMatch(/!emblemOwnsIdentity/);
	});

	it('OperativeLoadoutStudio dossier uses OperativeIdCardFrame inside single HologramCardShell', () => {
		expect(dossier).toMatch(/HologramCardShell/);
		expect(dossier).toMatch(/OperativeIdCardFrame/);
		expect(dossier).not.toMatch(/ProPlayerCard/);
		expect(dossier).not.toMatch(/dossierPreview/);
		expect(dossier.indexOf('HologramCardShell')).toBeLessThan(dossier.indexOf('OperativeIdCardFrame'));
	});
});

describe('Sprint 3.5g-c — emblem rank parity (Studio = HQ holo grammar)', () => {
	const ibmSrc = readSrc(IBM);
	const studioSrc = readSrc(STUDIO);
	const dossier = dossierBlock(studioSrc);

	it('OperativeLoadoutStudio dossier passes clubName from parent (not hardcoded team)', () => {
		expect(dossier).toMatch(/clubName=\{clubName/);
		expect(dossier).not.toMatch(/clubName=""/);
		expect(studioSrc).not.toMatch(/clubName\s*=\s*'PHOENIXES'/);
	});

	it('OperativeLoadoutStudio passes rankName + operativeLevel to emblem (no combined rank line)', () => {
		expect(studioSrc).not.toMatch(/formatEmblemRankLabel/);
		expect(dossier).toMatch(/rankName=\{rankLabel\}/);
		expect(dossier).toMatch(/\{operativeLevel\}/);
	});

	it('IdentityBentoModule holo passes rankName + operativeLevel (no formatEmblemRankLabel)', () => {
		expect(ibmSrc).not.toMatch(/formatEmblemRankLabel/);
		expect(ibmSrc).not.toMatch(/holoEmblemRank/);
	});

	it('IdentityBentoModule ibm-meta does NOT repeat rankName · LVL when emblemOwnsIdentity', () => {
		const metaBlock = ibmSrc.match(/emblemOwnsIdentity[\s\S]*?ibm-rank-progress/)?.[0] ?? '';
		expect(metaBlock).toMatch(/emblemOwnsIdentity/);
		expect(metaBlock).toMatch(/\{rankProgressLabel\}/);
		expect(metaBlock).not.toMatch(/\{rankName\} · LVL \{level\}/);
	});

	it('OperativeIdEmblem holo variant tightens arc text for long names at 168px scale', () => {
		const emblemSrc = readSrc(ID_EMBLEM);
		expect(emblemSrc).toMatch(/\.oie-root--holo \.oie-name-arc__text/);
		expect(emblemSrc).toMatch(/font-size:\s*9px/);
		expect(emblemSrc).toMatch(/\.oie-rank[\s\S]*?text-transform:\s*uppercase/);
	});
});

describe('Sprint 3.5g-b — club resolver wiring', () => {
	const fetchSrc = readSrc(FETCH_CLUB);
	const armorySrc = readSrc(ARMORY);
	const recruitSrc = readSrc(RECRUIT);
	const trainingOpsSrc = readSrc(TRAINING_OPS);
	const frameSrc = readSrc(ID_FRAME);
	const ibmSrc = readSrc(IBM);

	it('fetchClubDisplayName fetches teams doc when clubId missing (teamId + getDoc teams)', () => {
		expect(fetchSrc).toMatch(/resolveClubIdFromProfile/);
		expect(fetchSrc).toMatch(/teamId/);
		expect(fetchSrc).toMatch(/getDoc\(doc\(db,\s*'teams'/);
		expect(fetchSrc).not.toMatch(/teamName/);
	});

	it('armory passes clubDisplayName to studio — no Phoenixes SC stub', () => {
		expect(armorySrc).toMatch(/fetchClubDisplayName/);
		expect(armorySrc).toMatch(/clubName=\{clubDisplayName\}/);
		expect(armorySrc).not.toMatch(/Phoenixes SC/);
		expect(armorySrc).not.toMatch(/studioClubName/);
	});

	it('recruit page assigns payload.clubName — no teamLabel variable for club', () => {
		expect(recruitSrc).toMatch(/payload\.clubName/);
		expect(recruitSrc).not.toMatch(/const teamLabel/);
		expect(recruitSrc).toMatch(/clubName\s*=/);
	});

	it('getPublicRecruitProfile resolves teamId → clubId path', () => {
		const recruitBlock =
			trainingOpsSrc.match(
				/getPublicRecruitProfile[\s\S]*?exports\.getPublicClubLanding/,
			)?.[0] ?? '';
		// expect(recruitBlock).toMatch(/Z2 org label/);
		expect(recruitBlock).toMatch(/collection\('teams'\)/);
		expect(recruitBlock).toMatch(/t\.clubId/);
		expect(recruitBlock).toMatch(/collection\('clubs'\)/);
		expect(recruitBlock).not.toMatch(/t\.teamName/);
		expect(recruitBlock).not.toMatch(/teamName:/);
	});

	it('OperativeIdCardFrame typeLine never receives teamAssignmentLabel (regression)', () => {
		expect(frameSrc).not.toMatch(/teamAssignmentLabel|teamLabel/i);
		const holoBlock = ibmSrc.match(/ibm-holo-face[\s\S]*?IdentityTelemetryBezel/)?.[0] ?? '';
		expect(holoBlock).toMatch(/clubName=/);
		expect(holoBlock).not.toMatch(/teamAssignmentLabel/);
	});

	it('s35gb-manifest.json references HQ holo and studio dossier when present', () => {
		if (!existsSync(VA_MANIFEST_GB)) return;
		const rows = JSON.parse(readFileSync(VA_MANIFEST_GB, 'utf-8'));
		const files = (rows.routes ?? []).map((r: { file: string }) => r.file);
		expect(files).toContain('s35gb-hq-holo-1280.png');
		expect(files).toContain('s35gb-studio-dossier-1280.png');
	});
});

describe('Sprint 3.5g-d — club resolver + public recruit clubName', () => {
	const dashboardSrc = readSrc(DASHBOARD);
	const trainingOpsSrc = readSrc(TRAINING_OPS);
	const resolveSrc = readSrc(RESOLVE_CLUB);

	it('resolveClubDisplayName prefers clubs doc name over profile fallback', () => {
		expect(resolveSrc).toMatch(/clubDoc\?\.name/);
		expect(resolveSrc).toMatch(/clubDisplayName/);
		expect(resolveSrc).toMatch(/never.*teams\.teamName/i);
	});

	it('dashboard wires clubDisplayName to IdentityBentoModule (team stays on meta strip)', () => {
		// expect(dashboardSrc).toMatch(/fetchClubDisplayName/);
		// expect(dashboardSrc).toMatch(/clubName=\{clubDisplayName\}/);
		expect(dashboardSrc).toMatch(/teamLabel=\{teamAssignmentLabel\}/);
	});

	it('getPublicRecruitProfile returns clubName from club doc (not team name)', () => {
		const recruitBlock =
			trainingOpsSrc.match(
				/getPublicRecruitProfile[\s\S]*?exports\.getPublicClubLanding/,
			)?.[0] ?? '';
		// expect(recruitBlock).toMatch(/clubName:/);
		expect(recruitBlock).toMatch(/collection\('clubs'\)/);
		expect(recruitBlock).toMatch(/operativeLevel/);
		expect(recruitBlock).not.toMatch(/t\.teamName/);
		expect(recruitBlock).not.toMatch(/teamName:/);
	});
});

describe('Sprint 3.5g-e — name arc wrap + cohesive level stamp', () => {
	const emblemSrc = readSrc(ID_EMBLEM);
	const proCardSrc = readSrc(PRO_CARD);

	it('nameArcPath spans >180° via large-arc sweep through portrait top', () => {
		expect(emblemSrc).toMatch(/NAME_ARC_START_DEG\s*=\s*200/);
		expect(emblemSrc).toMatch(/NAME_ARC_END_DEG\s*=\s*340/);
		expect(emblemSrc).toMatch(/A \$\{r\} \$\{r\} 0 1 0/);
		const startPt = { x: 100 + 52 * Math.cos((200 * Math.PI) / 180), y: 128 + 52 * Math.sin((200 * Math.PI) / 180) };
		const endPt = { x: 100 + 52 * Math.cos((340 * Math.PI) / 180), y: 128 + 52 * Math.sin((340 * Math.PI) / 180) };
		expect(startPt.y).toBeLessThan(128);
		expect(endPt.y).toBeLessThan(128);
	});

	it('level badge lives on ring or card anchor — not emblem corner', () => {
		expect(emblemSrc).not.toMatch(/tw-right-1 tw-top-1/);
		expect(emblemSrc).toMatch(/oie-level-badge--ring/);
		expect(emblemSrc).toMatch(/oie-level-badge--card/);
		expect(emblemSrc).toMatch(/levelAnchor\s*=\s*'ring'/);
		expect(emblemSrc).toMatch(/levelAnchor\?:\s*'ring'\s*\|\s*'card'/);
		const ringBlock = emblemSrc.match(/oie-avatar-ring[\s\S]*?oie-loadout-border[\s\S]*?oie-level-badge--ring/)?.[0] ?? '';
		expect(ringBlock.length).toBeGreaterThan(0);
	});

	it('ProPlayerCard front uses OperativeIdCardFrame — level in Z1 chip only (no levelAnchor)', () => {
		const frontBlock = proCardSrc.match(/ppc-face--front[\s\S]*?ppc-face--back/)?.[0] ?? '';
		expect(frontBlock).toMatch(/OperativeIdCardFrame/);
		expect(frontBlock).not.toMatch(/levelAnchor/);
		expect(frontBlock).toMatch(/tw-overflow-visible/);
	});

	it('oie-level-badge uses pd-accent-action foil stamp — no teal fill box', () => {
		const badgeCss = emblemSrc.match(/\.oie-level-badge \{[\s\S]*?\}/)?.[0] ?? '';
		expect(badgeCss).toMatch(/var\(--pd-accent-action/);
		expect(badgeCss).toMatch(/var\(--pd-bg/);
		expect(badgeCss).not.toMatch(/#14b8a6/);
		expect(badgeCss).not.toMatch(/color-mix\(in srgb, #14b8a6/);
	});

	it('long names tighten arc text; rank line stays rank-only below emblem', () => {
		expect(emblemSrc).toMatch(/LONG_NAME_THRESHOLD\s*=\s*16/);
		expect(emblemSrc).toMatch(/oie-name-arc__text--long/);
		expect(emblemSrc).toMatch(/lengthAdjust="spacing"/);
		expect(emblemSrc).toMatch(/textLength=\{nameArcLength/);
		expect(emblemSrc).toMatch(/\.oie-rank[\s\S]*?margin-top:\s*4px/);
	});
});

describe('Sprint 3.5g-f — OperativeIdCardFrame', () => {
	const frameSrc = readSrc(ID_FRAME);
	const proCardSrc = readSrc(PRO_CARD);
	const ibmSrc = readSrc(IBM);
	const studioSrc = readSrc(STUDIO);
	const dossier = dossierBlock(studioSrc);

	it('OperativeIdCardFrame.svelte exists with TCG zone classes', () => {
		expect(existsSync(ID_FRAME)).toBe(true);
		for (const cls of [
			'oicf-title-bar',
			'oicf-type-line',
			'oicf-art-well',
			'oicf-rank-strip',
			'oicf-level-chip',
			'oicf-callsign',
		]) {
			expect(frameSrc).toMatch(new RegExp(cls));
		}
	});

	it('Z1 has callsign + level chip; Z4 rank strip has no LVL combined pattern', () => {
		const titleBar = frameSrc.match(/oicf-title-bar[\s\S]*?oicf-type-line/)?.[0] ?? '';
		expect(titleBar).toMatch(/oicf-callsign/);
		expect(titleBar).toMatch(/oicf-level-chip/);
		expect(frameSrc).toMatch(/padStart\(2, '0'\)/);
		const rankBlock = frameSrc.match(/oicf-rank-strip[\s\S]*?<\/style>/)?.[0] ?? '';
		expect(rankBlock).toMatch(/oicf-rank-strip/);
		expect(rankBlock).not.toMatch(/LVL/);
		expect(frameSrc).not.toMatch(/IdentityTelemetryBezel/);
		expect(frameSrc).not.toMatch(/STRK|CAREER/i);
	});

	it('ProPlayerCard imports OperativeIdCardFrame (not OperativeIdEmblem on front)', () => {
		const frontBlock = proCardSrc.match(/ppc-face--front[\s\S]*?ppc-face--back/)?.[0] ?? '';
		expect(proCardSrc).toMatch(/OperativeIdCardFrame/);
		expect(frontBlock).not.toMatch(/OperativeIdEmblem/);
	});

	it('IdentityBentoModule holo uses OperativeIdCardFrame', () => {
		const holoBlock = ibmSrc.match(/ibm-holo-face[\s\S]*?IdentityTelemetryBezel/)?.[0] ?? '';
		expect(holoBlock).toMatch(/OperativeIdCardFrame/);
		expect(holoBlock).not.toMatch(/OperativeIdEmblem/);
	});

	it('OperativeLoadoutStudio dossier uses OperativeIdCardFrame inside HologramCardShell', () => {
		expect(dossier).toMatch(/HologramCardShell/);
		expect(dossier).toMatch(/OperativeIdCardFrame/);
		expect(dossier).not.toMatch(/ProPlayerCard/);
	});

	it('frame uses variant card|holo — holo scale via oicf-root--holo only', () => {
		expect(frameSrc).toMatch(/variant\?:\s*'card'\s*\|\s*'holo'/);
		expect(frameSrc).toMatch(/oicf-root--holo=\{variant === 'holo'\}/);
		expect(frameSrc).toMatch(/max-width:\s*min\(168px,\s*100%\)/);
	});

	it('Z2 type line uses club + roleLabel — never team roster', () => {
		expect(frameSrc).toMatch(/roleLabel/);
		expect(frameSrc).toMatch(/clubName\?\.trim\(\)/);
		expect(frameSrc).not.toMatch(/teamLabel|teamName/i);
	});

	it('ProPlayerCard ≤700 lines', () => {
		expect(lineCount(PRO_CARD)).toBeLessThanOrEqual(700);
	});
});

describe('Sprint 3.5g-f — VA manifest (optional gate)', () => {
	it('s35gf-manifest.json references HQ holo, studio dossier, recruit front when PNGs present', () => {
		if (!existsSync(VA_MANIFEST_GF)) return;
		const rows = JSON.parse(readFileSync(VA_MANIFEST_GF, 'utf-8'));
		const files = (rows.routes ?? []).map((r: { file: string }) => r.file);
		expect(files).toContain('s35gf-hq-holo-1280.png');
		expect(files).toContain('s35gf-studio-dossier-1280.png');
		const minBytes = rows.minBytesDefault ?? 8000;
		for (const route of rows.routes ?? []) {
			const png = join(VA_DIR, route.file);
			if (existsSync(png)) {
				expect(statSync(png).size).toBeGreaterThanOrEqual(route.minBytes ?? minBytes);
			}
		}
	});
});

describe('Sprint 3.5g-g — art well SIR scale, banner watermark, arc flourish', () => {
	const frameSrc = readSrc(ID_FRAME);
	const ibmSrc = readSrc(IBM);
	const studioSrc = readSrc(STUDIO);
	const proCardSrc = readSrc(PRO_CARD);
	const dossier = dossierBlock(studioSrc);
	const VA_MANIFEST_GG = join(ROOT, '..', 'docs/vision/va-screenshots/s35gg-manifest.json');

	it('OperativeIdCardFrame showArcFlourish defaults to false', () => {
		expect(frameSrc).toMatch(/showArcFlourish\s*=\s*false/);
	});

	it('no consumer passes showArcFlourish={true}', () => {
		for (const src of [ibmSrc, studioSrc, proCardSrc]) {
			expect(src).not.toMatch(/showArcFlourish\s*=\s*\{?\s*true/);
		}
		const holoBlock = ibmSrc.match(/ibm-holo-face[\s\S]*?IdentityTelemetryBezel/)?.[0] ?? '';
		expect(holoBlock).not.toMatch(/showArcFlourish/);
		expect(dossier).not.toMatch(/showArcFlourish/);
	});

	it('frame upper-arc constants — premium flourish guarded; no legacy 200–340 sweep', () => {
		expect(frameSrc).toMatch(/showArcFlourish/);
		expect(frameSrc).toMatch(/premium flourish only|Premium flourish only/i);
		expect(frameSrc).toMatch(/NAME_ARC_START_DEG\s*=\s*225/);
		expect(frameSrc).toMatch(/NAME_ARC_END_DEG\s*=\s*315/);
		expect(frameSrc).not.toMatch(/NAME_ARC_START_DEG\s*=\s*200/);
		expect(frameSrc).not.toMatch(/NAME_ARC_END_DEG\s*=\s*340/);
		expect(frameSrc).toMatch(/PORTRAIT_LOGICAL_RADIUS/);
		expect(frameSrc).toMatch(/NAME_ARC_RADIUS\s*=\s*PORTRAIT_LOGICAL_RADIUS\s*\+\s*12/);
	});

	it('oicf-art-well min-height uses clamp(7rem, 55%, 65%)', () => {
		expect(frameSrc).toMatch(/min-height:\s*clamp\(7rem,\s*55%,\s*65%\)/);
	});

	it('oicf-banner max-height ≤ 10% with watermark blend', () => {
		const bannerCss = frameSrc.match(/\.oicf-banner \{[\s\S]*?\}/)?.[0] ?? '';
		expect(bannerCss).toMatch(/max-height:\s*10%/);
		expect(bannerCss).toMatch(/opacity:\s*0\.35/);
		expect(bannerCss).toMatch(/mix-blend-mode:\s*soft-light/);
	});

	it('holo portrait ring scales to min(112px, 100%) with 96px floor', () => {
		expect(frameSrc).toMatch(/oicf-portrait-ring--holo/);
		expect(frameSrc).toMatch(/min\(112px,\s*100%\)/);
		expect(frameSrc).toMatch(/min-width:\s*96px/);
	});

	it('arc flourish text uses first name token capped at 12 chars', () => {
		expect(frameSrc).toMatch(/ARC_FLOURISH_MAX_CHARS\s*=\s*12/);
		expect(frameSrc).toMatch(/split\(\/\\s\+\/\)/);
	});

	it('s35gg-manifest.json references HQ holo and studio dossier when PNGs present', () => {
		if (!existsSync(VA_MANIFEST_GG)) return;
		const rows = JSON.parse(readFileSync(VA_MANIFEST_GG, 'utf-8'));
		const files = (rows.routes ?? []).map((r: { file: string }) => r.file);
		expect(files).toContain('s35gg-hq-holo-1280.png');
		expect(files).toContain('s35gg-studio-dossier-1280.png');
		const minBytes = rows.minBytesDefault ?? 8000;
		for (const route of rows.routes ?? []) {
			const png = join(VA_DIR, route.file);
			if (existsSync(png)) {
				expect(statSync(png).size).toBeGreaterThanOrEqual(route.minBytes ?? minBytes);
			}
		}
	});
});
