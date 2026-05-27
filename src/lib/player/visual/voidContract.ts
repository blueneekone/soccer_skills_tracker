/**
 * Player OS void contract — measurable thresholds for HQ baseline sign-off.
 *
 * Source: PLAYER_OS_FOUNDATION.md §3 · PLAYER_OS_VISUAL_ACCEPTANCE.md void table
 *
 * | Metric                              | Threshold              | Pass when        |
 * |-------------------------------------|------------------------|------------------|
 * | Black canvas pixels at viewport rest| ≥ 40% (HQ 1280×900)    | blackCanvasPass  |
 * | Visible matte panel fill ratio      | ≤ 35%                  | mattePanelPass   |
 * | Emissive edges + bloom + light      | ≥ 15% of lit (non-void)| emissivePass     |
 * | Largest Z2 panel (desktop)          | ≤ 60% viewport width   | (layout measure) |
 * | Hero identity (Z3) min footprint    | ≥ 280px ring + rank bar| (DOM measure)    |
 *
 * Wave F only: mark VA checkboxes ☑ after Playwright screenshot pixel sample pass.
 */

/** HQ viewport reference for automated sampling (1280×900). */
export const VOID_CONTRACT_HQ_VIEWPORT = { width: 1280, height: 900 } as const;

export const VOID_CONTRACT_THRESHOLDS = {
	/** Black canvas (#000 / near-black Z0) — minimum share of viewport pixels. */
	blackCanvasMinRatio: 0.4,
	/** Matte panel fill (#05050a / panel gradient) — maximum share. */
	mattePanelMaxRatio: 0.35,
	/** Emissive edges, bloom, teal/gold accent light — minimum share of lit (non-void) pixels. */
	emissiveMinRatio: 0.15,
	/** Largest Z2 panel width vs viewport (desktop layout measure). */
	largestZ2PanelMaxWidthRatio: 0.6,
	/** Hero identity ring minimum diameter in px. */
	heroIdentityMinPx: 280,
} as const;

export type VoidContractSample = {
	blackCanvasRatio: number;
	mattePanelRatio: number;
	emissiveRatio: number;
};

export type VoidContractEvaluation = VoidContractSample & {
	/** Emissive share among non-void (lit) pixels — used for §3 emissive threshold. */
	emissiveOfLitRatio: number;
	blackCanvasPass: boolean;
	mattePanelPass: boolean;
	emissivePass: boolean;
	allPixelRatiosPass: boolean;
};

/** Classify a single RGB pixel for void-contract sampling. */
export function classifyVoidPixel(r: number, g: number, b: number): 'black' | 'matte' | 'emissive' | 'other' {
	// Z0 canvas — pure or near-black void
	if (r <= 12 && g <= 12 && b <= 16) return 'black';

	// Z2 matte panel fill (#05050a band)
	if (r <= 28 && g <= 28 && b <= 36 && r + g + b >= 8) return 'matte';

	// Lit UI: emissive accent, bloom, typography, and borders — exclude flat neutral greys only
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const isNeutralGrey = max - min < 12 && max < 120;
	if (isNeutralGrey) return 'other';

	return 'emissive';
}

/** Sample pixel ratios from raw RGBA buffer or ImageData. */
export function sampleVoidContractRatios(
	imageData: ImageData | { data: Uint8ClampedArray; width: number; height: number },
	opts?: { width?: number; height?: number },
): VoidContractSample {
	const w = opts?.width ?? ('width' in imageData ? imageData.width : 0);
	const h = opts?.height ?? ('height' in imageData ? imageData.height : 0);
	const data = imageData.data;
	let black = 0;
	let matte = 0;
	let emissive = 0;
	let total = 0;

	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const i = (y * w + x) * 4;
			const r = data[i] ?? 0;
			const g = data[i + 1] ?? 0;
			const b = data[i + 2] ?? 0;
			const a = data[i + 3] ?? 255;
			if (a < 16) continue;
			total++;
			const bucket = classifyVoidPixel(r, g, b);
			if (bucket === 'black') black++;
			else if (bucket === 'matte') matte++;
			else if (bucket === 'emissive') emissive++;
		}
	}

	if (total === 0) {
		return { blackCanvasRatio: 0, mattePanelRatio: 0, emissiveRatio: 0 };
	}

	return {
		blackCanvasRatio: black / total,
		mattePanelRatio: matte / total,
		emissiveRatio: emissive / total,
	};
}

/** Evaluate sample against FOUNDATION §3 thresholds. */
export function evaluateVoidContract(sample: VoidContractSample): VoidContractEvaluation {
	const blackCanvasPass = sample.blackCanvasRatio >= VOID_CONTRACT_THRESHOLDS.blackCanvasMinRatio;
	const mattePanelPass = sample.mattePanelRatio <= VOID_CONTRACT_THRESHOLDS.mattePanelMaxRatio;
	const litRatio = Math.max(0, 1 - sample.blackCanvasRatio);
	const emissiveOfLitRatio = litRatio > 0 ? sample.emissiveRatio / litRatio : 0;
	const emissivePass = emissiveOfLitRatio >= VOID_CONTRACT_THRESHOLDS.emissiveMinRatio;

	return {
		...sample,
		emissiveOfLitRatio,
		blackCanvasPass,
		mattePanelPass,
		emissivePass,
		allPixelRatiosPass: blackCanvasPass && mattePanelPass && emissivePass,
	};
}
