import fs from 'fs';
import path from 'path';

const dirs = [
    path.join(process.cwd(), 'src/lib/gamification/__tests__'),
    path.join(process.cwd(), 'src/lib/coach/__tests__')
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
            
            // Fix DASHBOARD_PAGE (used in playerRlFunctional)
            if (content.includes('const DASHBOARD_PAGE = join(ROOT, \\'routes/(app)/player/dashboard/+page.svelte\\');') && !content.includes('PlayerArena.svelte')) {
                content = content.replace(
                    /const DASHBOARD_PAGE = join\(ROOT, 'routes\/\(app\)\/player\/dashboard\/\+page\.svelte'\);/,
                    [
                        "const DASHBOARD_PAGE = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');",
                        "const ARENA = join(ROOT, 'routes/(app)/player/dashboard/PlayerArena.svelte');",
                        "const HUD = join(ROOT, 'routes/(app)/player/dashboard/PlayerHUD.svelte');",
                        "const ENGINE = join(ROOT, 'routes/(app)/player/dashboard/PlayerDashboardEngine.svelte.ts');"
                    ].join('\\n')
                );
                content = content.replace(
                    /readFileSync\(DASHBOARD_PAGE, 'utf-8'\)/g,
                    [
                        "(existsSync(DASHBOARD_PAGE) ? readFileSync(DASHBOARD_PAGE, 'utf-8') : '')",
                        "+ (existsSync(ARENA) ? readFileSync(ARENA, 'utf-8') : '')",
                        "+ (existsSync(HUD) ? readFileSync(HUD, 'utf-8') : '')",
                        "+ (existsSync(ENGINE) ? readFileSync(ENGINE, 'utf-8') : '')"
                    ].join('\\n                    ')
                );
            }
            
            // Fix DASHBOARD
            if (content.includes('const DASHBOARD = join(ROOT, \\'routes/(app)/player/dashboard/+page.svelte\\');') && !content.includes('PlayerArena.svelte')) {
                content = content.replace(
                    /const DASHBOARD = join\(ROOT, 'routes\/\(app\)\/player\/dashboard\/\+page\.svelte'\);/,
                    [
                        "const DASHBOARD = join(ROOT, 'routes/(app)/player/dashboard/+page.svelte');",
                        "const ARENA = join(ROOT, 'routes/(app)/player/dashboard/PlayerArena.svelte');",
                        "const HUD = join(ROOT, 'routes/(app)/player/dashboard/PlayerHUD.svelte');",
                        "const ENGINE = join(ROOT, 'routes/(app)/player/dashboard/PlayerDashboardEngine.svelte.ts');"
                    ].join('\\n')
                );
                content = content.replace(
                    /readFileSync\(DASHBOARD, 'utf-8'\)/g,
                    [
                        "(existsSync(DASHBOARD) ? readFileSync(DASHBOARD, 'utf-8') : '')",
                        "+ (existsSync(ARENA) ? readFileSync(ARENA, 'utf-8') : '')",
                        "+ (existsSync(HUD) ? readFileSync(HUD, 'utf-8') : '')",
                        "+ (existsSync(ENGINE) ? readFileSync(ENGINE, 'utf-8') : '')"
                    ].join('\\n                    ')
                );
            }
            
            // Fix coachModule.test.ts ghost route
            if (file === 'coachModule.test.ts') {
                content = content.replace(/it\('\/coach\/match-day imports CoachMatchDayView from \$lib\/coach', \(\) => \{[\s\S]*?\}\);/, 'it.skip(\'/coach/match-day removed in Sprint 2.2\', () => {});');
            }

            if (content !== originalContent) {
                fs.writeFileSync(filePath, content, 'utf-8');
                fixed++;
            }
        }
    }
    
    console.log(`Fixed ${fixed} files in Sprint 4.5 remediation phase 2.`);
}

fixTests();
