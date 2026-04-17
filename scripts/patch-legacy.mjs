import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const legacy = path.join(__dirname, '..', 'src', 'lib', 'legacy');

function walk(dir) {
	for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, ent.name);
		if (ent.isDirectory()) walk(p);
		else if (ent.name.endsWith('.js')) patchFile(p);
	}
}

function patchFile(file) {
	let c = fs.readFileSync(file, 'utf8');
	c = c.replace(/from "\.\.\/firebase-config\.js"/g, "from '$lib/firebase.js'");
	c = c.replace(
		/from "https:\/\/www\.gstatic\.com\/firebasejs\/10\.7\.1\/firebase-firestore\.js"/g,
		"from 'firebase/firestore'"
	);
	c = c.replace(/from "https:\/\/www\.gstatic\.com\/firebasejs\/10\.7\.1\/firebase-auth\.js"/g, "from 'firebase/auth'");
	c = c.replace(/\.exists\(\)/g, '.exists');
	fs.writeFileSync(file, c);
}

walk(legacy);
console.log('patched', legacy);
