const fs = require('fs');
const path = require('path');

function getAllSvelteFiles(dirPath, arrayOfFiles = []) {
	const files = fs.readdirSync(dirPath);

	files.forEach((file) => {
		const fullPath = path.join(dirPath, file);
		if (fs.statSync(fullPath).isDirectory()) {
			arrayOfFiles = getAllSvelteFiles(fullPath, arrayOfFiles);
		} else {
			if (fullPath.endsWith('.svelte') || fullPath.endsWith('.css')) {
				arrayOfFiles.push(fullPath);
			}
		}
	});

	return arrayOfFiles;
}

const allFiles = getAllSvelteFiles(path.join(process.cwd(), 'src'));

let totalFixes = 0;

const replacements = [
	{ regex: /\bbg-white\b/g, replacement: 'tw-bg-[#0f172a]' },
	{ regex: /\bbg-black\b/g, replacement: 'tw-bg-[#000000]' },
	{ regex: /\btext-white\b/g, replacement: 'text-[#fafafa]' },
	{ regex: /\btext-black\b/g, replacement: 'text-[#000000]' },
	{ regex: /#ffffff/gi, replacement: '#fafafa' },
	{ regex: /#ff0000/gi, replacement: '#f59e0b' },
	{ regex: /#00ff00/gi, replacement: '#14b8a6' },
	{ regex: /#0000ff/gi, replacement: '#14b8a6' },
	{ regex: /\btw-bg-blue-\d{3,4}\b/g, replacement: 'tw-bg-[#14b8a6]' },
	{ regex: /\btw-bg-red-\d{3,4}\b/g, replacement: 'tw-bg-[#f59e0b]' },
	{ regex: /\btw-bg-purple-\d{3,4}\b/g, replacement: 'tw-bg-[#14b8a6]' },
	{ regex: /\btw-bg-green-\d{3,4}\b/g, replacement: 'tw-bg-[#14b8a6]' },
	{ regex: /rgba\(\s*0\s*,\s*255\s*,\s*255/g, replacement: 'rgba(20, 184, 166' },
	{ regex: /rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*1\s*\)/g, replacement: '#000000' }
];

allFiles.forEach((file) => {
	let content = fs.readFileSync(file, 'utf-8');
	let modified = false;

	replacements.forEach(({ regex, replacement }) => {
		if (regex.test(content)) {
			content = content.replace(regex, replacement);
			modified = true;
			totalFixes++;
		}
	});

	if (modified) {
		fs.writeFileSync(file, content, 'utf-8');
		console.log(`Fixed: ${file}`);
	}
});

console.log(`\nCompleted auto-fix! Total files modified: ${totalFixes}`);
