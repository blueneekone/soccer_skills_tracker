import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const PENDING_DIR = path.resolve('marketing', 'pending-review');
const TEST_RESULTS_DIR = path.resolve('test-results');

console.log('🎬 Starting CMO Marketing Capture Process...');

if (!fs.existsSync(PENDING_DIR)) fs.mkdirSync(PENDING_DIR, { recursive: true });

const existingFiles = fs.readdirSync(PENDING_DIR);
for (const file of existingFiles) {
	fs.unlinkSync(path.join(PENDING_DIR, file));
}

console.log('🚀 Launching headless browser capture (approx 90 seconds)...');
try {
	execSync('npx playwright test tests/marketing-capture.spec.ts --project="chromium"', { stdio: 'inherit' });
} catch (e) {
	console.error('❌ Playwright capture failed.');
}

function findWebms(dir) {
    let results = [];
	const files = fs.readdirSync(dir);
	for (const f of files) {
		const fullPath = path.join(dir, f);
		if (fs.statSync(fullPath).isDirectory()) {
			results = results.concat(findWebms(fullPath));
		} else if (f.endsWith('.webm')) {
			results.push(fullPath);
		}
	}
	return results;
}

const webms = findWebms(TEST_RESULTS_DIR);
if (webms.length === 0) {
	console.error('❌ No WebM files generated in test-results.');
	process.exit(1);
}

console.log(`✅ Capture successful. Found ${webms.length} videos.`);

webms.forEach((webmPath, index) => {
    let descriptiveName = `Scene-${index + 1}.webm`;
    if (webmPath.includes('Scene-1')) descriptiveName = 'Scene-1-Coach-OS.webm';
    else if (webmPath.includes('Scene-2')) descriptiveName = 'Scene-2-Parent-OS.webm';
    else if (webmPath.includes('Scene-3')) descriptiveName = 'Scene-3-Player-OS.webm';
    else if (webmPath.includes('Scene-4')) descriptiveName = 'Scene-4-Coach-OS.webm';

    const newPath = path.join(PENDING_DIR, descriptiveName);
    fs.copyFileSync(webmPath, newPath);
    console.log(`📦 Saved: ${newPath}`);
});

console.log('🧹 Cleaning up test-results directory...');
try {
    fs.rmSync(TEST_RESULTS_DIR, { recursive: true, force: true });
} catch(e) {}

console.log(`🎉 Demo compilation successfully copied to: ./marketing/pending-review/`);
