import { execSync } from 'node:child_process';

/** @returns {{ buildDate: string; shortSha: string }} */
export function loadAcquisitionPrintMeta() {
	let shortSha = 'dev';
	try {
		shortSha = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
	} catch {
		/* not a git checkout */
	}

	return {
		buildDate: new Date().toISOString().slice(0, 10),
		shortSha,
	};
}
