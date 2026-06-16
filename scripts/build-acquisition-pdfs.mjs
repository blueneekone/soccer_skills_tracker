#!/usr/bin/env node
/**
 * Build acquisition PDFs from prerendered print routes.
 *
 * Run before deploy (hosting serves static/acquisition/*.pdf):
 *   npm run build:acquisition-pdfs
 *
 * Requires Playwright Chromium once:
 *   npx playwright install chromium
 *
 * Env:
 *   BUILD_FIRST=1 — fail if build/ missing instead of running npm run build
 *   SKIP_BUILD=1  — skip npm run build even when build/ is missing
 */
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:net';

const ROOT = path.resolve(import.meta.dirname, '..');
const BUILD_DIR = path.join(ROOT, 'build');
const OUT_DIR = path.join(ROOT, 'static', 'acquisition');

const ROUTES = [
	{
		path: '/acquisition/print/executive-brief.html',
		out: 'sstracker-executive-brief.pdf',
	},
	{
		path: '/acquisition/print/prospectus.html',
		out: 'sstracker-prospectus.pdf',
	},
];

function run(cmd, args, opts = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts });
		child.on('error', reject);
		child.on('close', (code) => {
			if (code === 0) resolve(undefined);
			else reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`));
		});
	});
}

function findFreePort() {
	return new Promise((resolve, reject) => {
		const server = createServer();
		server.listen(0, '127.0.0.1', () => {
			const addr = server.address();
			if (!addr || typeof addr === 'string') {
				server.close();
				reject(new Error('Could not allocate port'));
				return;
			}
			const { port } = addr;
			server.close(() => resolve(port));
		});
		server.on('error', reject);
	});
}

async function waitForHttp(url, timeoutMs = 90_000) {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		try {
			const res = await fetch(url);
			if (res.ok) return;
		} catch {
			/* preview still starting */
		}
		await new Promise((r) => setTimeout(r, 400));
	}
	throw new Error(`Preview server did not respond at ${url}`);
}

async function ensureBuild() {
	if (fs.existsSync(BUILD_DIR)) return;

	if (process.env.BUILD_FIRST === '1') {
		console.error('build/ missing and BUILD_FIRST=1 — run npm run build first');
		process.exit(1);
	}

	if (process.env.SKIP_BUILD === '1') {
		console.error('build/ missing and SKIP_BUILD=1 — cannot generate PDFs');
		process.exit(1);
	}

	console.log('build/ missing — running npm run build …');
	await run('npm', ['run', 'build'], { cwd: ROOT });
}

async function startPreview(port) {
	const preview = spawn('npm', ['run', 'preview', '--', '--port', String(port), '--strictPort'], {
		cwd: ROOT,
		shell: process.platform === 'win32',
		stdio: ['ignore', 'pipe', 'pipe'],
		env: { ...process.env, BROWSER: 'none' },
	});

	preview.stdout?.on('data', (d) => process.stdout.write(d));
	preview.stderr?.on('data', (d) => process.stderr.write(d));

	return preview;
}

async function main() {
	await ensureBuild();
	fs.mkdirSync(OUT_DIR, { recursive: true });

	const port = await findFreePort();
	const baseUrl = `http://localhost:${port}`;
	const preview = await startPreview(port);

	try {
		await waitForHttp(`${baseUrl}/acquisition/print/executive-brief.html`);

		const browser = await chromium.launch({ headless: true });
		const context = await browser.newContext();
		const page = await context.newPage();

		for (const route of ROUTES) {
			const url = `${baseUrl}${route.path}`;
			const outPath = path.join(OUT_DIR, route.out);
			console.log(`PDF ← ${url} → ${outPath}`);

			await page.goto(url, { waitUntil: 'networkidle', timeout: 120_000 });
			await page.locator('.acq-print-section__title').first().waitFor({ state: 'attached', timeout: 30_000 });
			await page.evaluate(() => {
				for (const el of document.querySelectorAll('.vanguard-os-shell > div')) {
					el.style.opacity = '1';
				}
			});
			await page.emulateMedia({ media: 'print' });
			await page.pdf({
				path: outPath,
				format: 'Letter',
				printBackground: true,
				margin: { top: '0.55in', right: '0.55in', bottom: '0.75in', left: '0.55in' },
			});

			const stat = fs.statSync(outPath);
			const kb = Math.round(stat.size / 1024);
			console.log(`  wrote ${route.out} (${kb} KB)`);
			if (stat.size < 10 * 1024) {
				throw new Error(`${route.out} is only ${kb} KB — expected >10 KB; check prerender HTML served by preview`);
			}
		}

		await browser.close();
		console.log('Acquisition PDFs built successfully.');
	} finally {
		preview.kill('SIGTERM');
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
