const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/routes/(app)/director/**/*.svelte');
const files2 = glob.sync('src/lib/components/director/**/*.svelte');

[...files, ...files2].forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // Check for $effect and untrack usage. If untrack not imported, import it.
    if (content.includes('$effect') && !content.includes("import { untrack }")) {
       content = content.replace(/<script[^>]*>/, "$&\n\timport { untrack } from 'svelte';");
    }

    fs.writeFileSync(file, content);
});
