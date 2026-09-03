// server.js - Production static file server for Firebase App Hosting / Cloud Run
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BUILD_DIR = path.join(__dirname, 'build');
const PORT = Number(process.env.PORT) || 8080;
const HOST = '0.0.0.0';

const MIME_TYPES = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'application/javascript; charset=utf-8',
	'.mjs': 'application/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.webp': 'image/webp',
	'.svg': 'image/svg+xml',
	'.ico': 'image/x-icon',
	'.woff2': 'font/woff2',
	'.woff': 'font/woff',
	'.ttf': 'font/ttf',
	'.pdf': 'application/pdf',
	'.txt': 'text/plain; charset=utf-8'
};

function getSafeFilePath(urlPath) {
	const sanitized = path.normalize(decodeURIComponent(urlPath).split('?')[0]);
	const candidate = path.join(BUILD_DIR, sanitized);
	if (!candidate.startsWith(BUILD_DIR)) return null;
	return candidate;
}

function serveFile(res, filePath, statusCode = 200) {
	const ext = path.extname(filePath).toLowerCase();
	const contentType = MIME_TYPES[ext] || 'application/octet-stream';
	const isImmutable = filePath.includes(`${path.sep}_app${path.sep}`);
	const cacheControl = isImmutable
		? 'public, max-age=31536000, immutable'
		: 'public, max-age=0, must-revalidate';

	res.writeHead(statusCode, {
		'Content-Type': contentType,
		'Cache-Control': cacheControl,
		'X-Content-Type-Options': 'nosniff'
	});
	fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
	if (req.url === '/_healthz' || req.url === '/healthz') {
		res.writeHead(200, { 'Content-Type': 'text/plain' });
		res.end('ok');
		return;
	}

	const candidatePath = getSafeFilePath(req.url);
	if (candidatePath && fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
		serveFile(res, candidatePath);
		return;
	}

	// SPA Fallback
	const indexPath = path.join(BUILD_DIR, 'index.html');
	if (fs.existsSync(indexPath)) {
		serveFile(res, indexPath, 200);
	} else {
		res.writeHead(404, { 'Content-Type': 'text/plain' });
		res.end('Not Found - Application not built');
	}
});

server.listen(PORT, HOST, () => {
	console.log(`SSTracker App Hosting server listening on http://${HOST}:${PORT}`);
});
