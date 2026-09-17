const fs = require('fs');

const extractAndRemove = (content, regex) => {
    const match = content.match(regex);
    if (match) {
        content = content.replace(regex, '');
        return { extracted: match[0] + '\n\n', newContent: content };
    }
    return { extracted: '', newContent: content };
};

let shell = fs.readFileSync('src/lib/components/field-ops/FacilityMapVault.svelte', 'utf8');
let arena = fs.readFileSync('src/lib/components/field-ops/FacilityMapVaultArena.svelte', 'utf8');
let hud = fs.readFileSync('src/lib/components/field-ops/FacilityMapVaultHUD.svelte', 'utf8');

// The styles to move out of Shell
const stylesToArenaRegexes = [
    /\.fm-preview-drawer[\s\S]*?}/,
    /\.fm-preview-body[\s\S]*?}/,
    /\.fm-preview-meta[\s\S]*?}/,
    /\.fm-preview-meta--asset[\s\S]*?}/,
    /\.fm-preview-img,[\s\S]*?\.fm-preview-canvas[\s\S]*?}/,
    /\.fm-logistics-wrap,[\s\S]*?\.fm-tactical-wrap[\s\S]*?}/,
    /\.fm-logistics__title[\s\S]*?}/,
    /\.fm-logistics__hint[\s\S]*?}/,
    /\.fm-logistics-input[\s\S]*?}/,
    /\.fm-routing-uri-input[\s\S]*?}/,
    /\.fm-logistics__route-link[\s\S]*?}/,
    /\.fm-logistics__route-link:hover[\s\S]*?}/,
    /\.fm-embedded-map-toolbar[\s\S]*?}/,
    /\.fm-embedded-map-toolbar__label[\s\S]*?}/,
    /\.fm-embedded-map-toolbar__select[\s\S]*?}/,
    /\.fm-embedded-map-frame\s*{[\s\S]*?}/,
    /\.fm-embedded-map-frame > :global\(\*\)[\s\S]*?}/,
    /\.fm-modal-edit\s*{[\s\S]*?}/,
    /\.fm-modal-edit \.fm-input--status[\s\S]*?}/,
    /\.fm-modal-edit__actions[\s\S]*?}/
];

const stylesToHudRegexes = [
    /\.fm-table-wrap\s*{[\s\S]*?}/,
    /\.fm-table-wrap--vault[\s\S]*?}/,
    /\.fm-table\s*{[\s\S]*?}/,
    /\.fm-table th,[\s\S]*?\.fm-table td[\s\S]*?}/,
    /\.fm-table th\s*{[\s\S]*?}/,
    /\.fm-table tr:last-child td[\s\S]*?}/,
    /\.fm-table tr:hover td[\s\S]*?}/,
    /\.fm-table-empty[\s\S]*?}/,
    /\.fm-table-id-cell[\s\S]*?}/,
    /\.fm-table-actions-col[\s\S]*?}/,
    /\.fm-table-actions\s*{[\s\S]*?}/,
    /\.fm-badge\s*{[\s\S]*?}/,
    /\.fm-badge--logistics[\s\S]*?}/,
    /\.fm-badge-status\s*{[\s\S]*?}/,
    /\.fm-badge-status--active[\s\S]*?}/,
    /\.fm-badge-status--locked[\s\S]*?}/,
    /\.fm-badge-status--legacy-locked[\s\S]*?}/
];

let arenaStyles = '';
let hudStyles = '';

stylesToArenaRegexes.forEach(regex => {
    let result = extractAndRemove(shell, regex);
    arenaStyles += result.extracted;
    shell = result.newContent;
});

stylesToHudRegexes.forEach(regex => {
    let result = extractAndRemove(shell, regex);
    hudStyles += result.extracted;
    shell = result.newContent;
});

// Append to Arena and HUD
if(arenaStyles) {
    arena += `\n<style>\n${arenaStyles}</style>\n`;
    fs.writeFileSync('src/lib/components/field-ops/FacilityMapVaultArena.svelte', arena);
}

if(hudStyles) {
    hud += `\n<style>\n${hudStyles}</style>\n`;
    fs.writeFileSync('src/lib/components/field-ops/FacilityMapVaultHUD.svelte', hud);
}

fs.writeFileSync('src/lib/components/field-ops/FacilityMapVault.svelte', shell);

console.log("Shell lines:", shell.split('\n').length);
console.log("Arena lines:", arena.split('\n').length);
console.log("HUD lines:", hud.split('\n').length);

