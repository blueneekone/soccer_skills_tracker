import fs from 'fs';
import path from 'path';

const dirs = [
    path.join(process.cwd(), 'src/lib/components/player/dashboard/__tests__'),
    path.join(process.cwd(), 'src/lib/gamification/__tests__')
];

function fixTests() {
    let fixed = 0;
    
    for (const dir of dirs) {
        if (!fs.existsSync(dir)) continue;
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));
        
        for (const file of files) {
            const filePath = path.join(dir, file);
            let content = fs.readFileSync(filePath, 'utf-8');
            let originalContent = content;
            
            // Fix DASHBOARD readFileSync to also read Engine, Arena, HUD in Gamification tests
            if (content.includes('const DASHBOARD = join(ROOT, \'routes/(app)/player/dashboard/+page.svelte\');') && !content.includes('PlayerArena.svelte')) {
                content = content.replace(
                    /const DASHBOARD = join\(ROOT, 'routes\/\(app\)\/player\/dashboard\/\+page\.svelte'\);/,
                    `const DASHBOARD = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');\nconst ARENA = join(ROOT, 'routes/(app)/player/dashboard/PlayerArena.svelte');\nconst HUD = join(ROOT, 'routes/(app)/player/dashboard/PlayerHUD.svelte');\nconst ENGINE = join(ROOT, 'routes/(app)/player/dashboard/PlayerDashboardEngine.svelte.ts');`
                );
                content = content.replace(
                    /const dash = readFileSync\(DASHBOARD, 'utf-8'\);/g,
                    `const dash = (existsSync(DASHBOARD) ? readFileSync(DASHBOARD, 'utf-8') : '') + (existsSync(ARENA) ? readFileSync(ARENA, 'utf-8') : '') + (existsSync(HUD) ? readFileSync(HUD, 'utf-8') : '') + (existsSync(ENGINE) ? readFileSync(ENGINE, 'utf-8') : '');`
                );
            }
            
            // Gamification +page reading fixes
            if (content.includes('const PAGE = join(ROOT, \'routes/(app)/player/dashboard/+page.svelte\');') && !content.includes('PlayerArena.svelte')) {
                content = content.replace(
                    /const PAGE = join\(ROOT, 'routes\/\(app\)\/player\/dashboard\/\+page\.svelte'\);/,
                    `const PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');\nconst ARENA = join(ROOT, 'routes/(app)/player/dashboard/PlayerArena.svelte');\nconst HUD = join(ROOT, 'routes/(app)/player/dashboard/PlayerHUD.svelte');\nconst ENGINE = join(ROOT, 'routes/(app)/player/dashboard/PlayerDashboardEngine.svelte.ts');`
                );
                content = content.replace(
                    /const pageSrc = existsSync\(PAGE\) \? readFileSync\(PAGE, 'utf-8'\) : '';/,
                    `const pageSrc = (existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '') + (existsSync(ARENA) ? readFileSync(ARENA, 'utf-8') : '') + (existsSync(HUD) ? readFileSync(HUD, 'utf-8') : '') + (existsSync(ENGINE) ? readFileSync(ENGINE, 'utf-8') : '');`
                );
            }

            if (content !== originalContent) {
                fs.writeFileSync(filePath, content, 'utf-8');
                fixed++;
            }
        }
    }
    
    console.log(`Fixed ${fixed} files in Sprint 4.5 remediation.`);
}

fixTests();
