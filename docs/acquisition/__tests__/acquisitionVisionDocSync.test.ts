/**
 * ACQ-VISION-DOC-SYNC — guards multi-sport OS vision in acquisition + QA docs.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(process.cwd());

function readDoc(rel: string): string {
	return readFileSync(join(ROOT, rel), 'utf8');
}

describe('ACQ-VISION-DOC-SYNC — acquisition vision language', () => {
	it('ONE_PAGER.md contains multi-sport / sport-configurable language', () => {
		const doc = readDoc('docs/acquisition/ONE_PAGER.md');
		expect(doc).toMatch(/multi-sport|sport-configurable|any team sport/i);
		expect(doc).toMatch(/sports_configs/);
	});

	it('PROSPECTUS.md executive summary does not lead with soccer-only framing', () => {
		const doc = readDoc('docs/acquisition/PROSPECTUS.md');
		const execSummary = doc.slice(doc.indexOf('## 1. Executive summary'), doc.indexOf('## 2.'));
		expect(execSummary).toMatch(/youth sports operating system|any team sport|sport-configurable/i);
		expect(execSummary).not.toMatch(/^[\s\S]{0,400}soccer-only/i);
		expect(execSummary).not.toMatch(/^[\s\S]{0,200}soccer app/i);
	});

	it('OWNER_QA_CHECKLIST.md contains soccer-configured or sport-agnostic QA framing', () => {
		const doc = readDoc('docs/vision/OWNER_QA_CHECKLIST.md');
		expect(doc).toMatch(/soccer-configured|sport-agnostic/i);
	});

	it('OUTREACH.md references multi-sport strategics (GameChanger or Stack Sports)', () => {
		const doc = readDoc('docs/acquisition/OUTREACH.md');
		expect(doc).toMatch(/GameChanger|Stack Sports/i);
	});

	it('DEMO_SCRIPT.md exec cut includes multi-sport OS talk track phrase', () => {
		const doc = readDoc('docs/acquisition/DEMO_SCRIPT.md');
		const execCut = doc.slice(doc.indexOf('## Exec cut'), doc.indexOf('## Full demo'));
		expect(execCut).toMatch(/multi-sport OS|youth sports OS for any team sport/i);
		expect(execCut).toMatch(/sports_configs/);
	});

	it('PRODUCT_STATE.md exists with pre-revenue and multi-sport language', () => {
		const doc = readDoc('docs/acquisition/PRODUCT_STATE.md');
		expect(doc).toMatch(/\$0|pre-revenue/i);
		expect(doc).toMatch(/multi-sport|sport-configurable/i);
	});

	it('PERSONA_DILIGENCE.md exists with core personas and shipped status', () => {
		const doc = readDoc('docs/acquisition/PERSONA_DILIGENCE.md');
		expect(doc).toMatch(/Player/);
		expect(doc).toMatch(/Parent/);
		expect(doc).toMatch(/Coach/);
		expect(doc).toMatch(/Director/);
		expect(doc).toMatch(/Shipped|shipped/);
	});

	it('ARCHITECTURE_DATA_FLOWS.md exists with GP-ACQ and mermaid', () => {
		const doc = readDoc('docs/acquisition/ARCHITECTURE_DATA_FLOWS.md');
		expect(doc).toMatch(/logTrainingSession|GP-ACQ/);
		expect(doc).toMatch(/```mermaid/);
	});

	it('legal/MUTUAL_NDA_TEMPLATE.md exists with counsel disclaimer', () => {
		const doc = readDoc('docs/acquisition/legal/MUTUAL_NDA_TEMPLATE.md');
		expect(doc).toMatch(/NOT LEGAL ADVICE|counsel/i);
	});

	it('legal/README.md exists', () => {
		expect(() => readDoc('docs/acquisition/legal/README.md')).not.toThrow();
	});

	it('INBOUND_PLAYBOOK.md exists', () => {
		expect(() => readDoc('docs/acquisition/INBOUND_PLAYBOOK.md')).not.toThrow();
	});

	it('INDEX.md contains Before NDA or NDA gating', () => {
		const doc = readDoc('docs/acquisition/INDEX.md');
		expect(doc).toMatch(/Before NDA|NDA/);
	});

	it('package.json has bundle:dataroom script', () => {
		const pkg = readDoc('package.json');
		expect(pkg).toMatch(/"bundle:dataroom"/);
	});

	it('PRODUCT_STATE.md does not claim stale Phase 5 exec-cut QA pending', () => {
		const doc = readDoc('docs/acquisition/PRODUCT_STATE.md');
		expect(doc).not.toMatch(/Phase 5 exec-cut QA pending/i);
		expect(doc).toMatch(/Phase 5.*(complete|signed|sign-off)/i);
	});

	it('OWNER_QA_CHECKLIST.md reflects Phase 5 complete', () => {
		const doc = readDoc('docs/vision/OWNER_QA_CHECKLIST.md');
		expect(doc).toMatch(/Phase 5.*complete|Phases 0–5/i);
	});

	it('INDEX.md reflects partial exec cut (5/6)', () => {
		const doc = readDoc('docs/acquisition/INDEX.md');
		expect(doc).toMatch(/GP-ACQ-06|exec cut 5\/6|5 of 6/i);
	});

	it('COMMS_CHANNEL_CANON.md exists with channel registry, deliveryReport, and SafeSport', () => {
		const doc = readDoc('docs/vision/COMMS_CHANNEL_CANON.md');
		expect(doc).toMatch(/Channel Type Registry/i);
		expect(doc).toMatch(/deliveryReport|DeliveryReport|delivery contract/i);
		expect(doc).toMatch(/SafeSport/i);
		expect(doc).toMatch(/announcements|parent_lounge|household|club_wide/);
	});

	it('COMMS_HUB.md links to COMMS_CHANNEL_CANON as channel type authority', () => {
		const doc = readDoc('docs/vision/COMMS_HUB.md');
		expect(doc).toMatch(/COMMS_CHANNEL_CANON\.md/);
		expect(doc).toMatch(/channel types|channel type/i);
	});
});
