import fs from 'node:fs';
import path from 'node:path';

/** @returns {{ buildDate: string; shortSha: string }} */
export function loadAcquisitionPrintMeta() {
	let shortSha =
		process.env.VITE_COMMIT_SHA ||
		process.env.COMMIT_SHA ||
		process.env.VERCEL_GIT_COMMIT_SHA ||
		'';

	if (shortSha) {
		shortSha = shortSha.slice(0, 7);
	} else {
		try {
			const headPath = path.join(process.cwd(), '.git', 'HEAD');
			const head = fs.readFileSync(headPath, 'utf-8').trim();
			if (head.startsWith('ref: ')) {
				const refPath = path.join(process.cwd(), '.git', head.substring(5));
				shortSha = fs.readFileSync(refPath, 'utf-8').trim().substring(0, 7);
			} else {
				shortSha = head.substring(0, 7);
			}
		} catch {
			shortSha = 'dev';
		}
	}

	return {
		buildDate: new Date().toISOString().slice(0, 10),
		shortSha: shortSha || 'dev',
	};
}
