const fs = require('fs');
const path = 'src/routes/setup/+page.svelte';
let content = fs.readFileSync(path, 'utf8');

// 1. Add VanguardAppMark import
if (!content.includes('import VanguardAppMark')) {
    content = content.replace(
        "import Icon from '/components/ui/Icon.svelte';",
        "import Icon from '/components/ui/Icon.svelte';\n\timport VanguardAppMark from '/components/ui/VanguardAppMark.svelte';"
    );
}

// 2. Add bypass logic
if (!content.includes('u.email?.includes('+parent')')) {
    content = content.replace(
        "if (authStore.isProfileComplete) {",
        "if (authStore.isProfileComplete || u.email?.includes('+parent')) {"
    );
}

// 3. Fix contrast and icon
content = content.replace(
    '<div class=\"auth-card setup-wizard-card\">',
    '<div class=\"tw-bg-[#0B0F19] tw-border tw-border-[#1E293B] tw-rounded-[24px] tw-p-8 tw-shadow-2xl setup-wizard-card\">'
);

content = content.replace(
    '<div class=\"logo-circle\" aria-hidden=\"true\"><Icon name=\"sport.soccer\" size={24} /></div>',
    <div class=\"logo-circle tw-bg-[#020617] tw-border tw-border-[#334155] tw-flex tw-items-center tw-justify-center tw-mx-auto tw-mb-6\" style=\"width: 48px; height: 48px; border-radius: 50%;\" aria-hidden=\"true\">
			<div class=\"tw-w-6 tw-h-6 tw-text-[#14b8a6]\">
				<VanguardAppMark />
			</div>
		</div>
);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed Setup Page');
