const fs = require('fs');
let file1 = 'src/lib/components/director/RegistrarRosterTransferPanel.svelte';
let code1 = fs.readFileSync(file1, 'utf-8');
code1 = code1.replace(
`	let email = $state('');
	let teamId = $state('');`,
`	// eslint-disable-next-line svelte/prefer-writable-derived
	let email = $state('');
	// eslint-disable-next-line svelte/prefer-writable-derived
	let teamId = $state('');`
);
fs.writeFileSync(file1, code1);
