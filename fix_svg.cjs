const fs = require('fs');

const path1 = 'src/lib/components/tactical/TacticalDrillBoard.svelte';
if (fs.existsSync(path1)) {
    let content = fs.readFileSync(path1, 'utf8');
    if (!content.includes('preserveAspectRatio=\"xMidYMid slice\"')) {
        content = content.replace(
            '<svg viewBox=\"0 0 400 250\" class=\"tw-w-full tw-h-full\" xmlns=\"http://www.w3.org/2000/svg\">',
            '<svg viewBox=\"0 0 400 250\" preserveAspectRatio=\"xMidYMid slice\" class=\"tw-w-full tw-h-full\" xmlns=\"http://www.w3.org/2000/svg\">'
        );
        fs.writeFileSync(path1, content, 'utf8');
        console.log('Fixed path1');
    }
}

const path2 = 'src/lib/components/coach/grid/TacticalPitchBoard.svelte';
if (fs.existsSync(path2)) {
    let content = fs.readFileSync(path2, 'utf8');
    if (!content.includes('preserveAspectRatio=\"xMidYMid slice\"')) {
        content = content.replace(
            'viewBox=\"0 0 1600 900\"',
            'viewBox=\"0 0 1600 900\"\n\t\t\tpreserveAspectRatio=\"xMidYMid slice\"'
        );
        fs.writeFileSync(path2, content, 'utf8');
        console.log('Fixed path2');
    }
}
