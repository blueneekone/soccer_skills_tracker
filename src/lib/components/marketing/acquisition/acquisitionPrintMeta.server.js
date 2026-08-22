import { execFileSync } from 'node:child_process';

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
			shortSha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
				encoding: 'utf-8',
			}).trim();
		} catch {
			shortSha = 'dev';
		}
	}

	return {
		buildDate: new Date().toISOString().slice(0, 10),
		shortSha: shortSha || 'dev',
	};
}
