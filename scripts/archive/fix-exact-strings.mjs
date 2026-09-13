import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testsDir = path.join(__dirname, '../src/lib/components/player/dashboard/__tests__');

const files = fs.readdirSync(testsDir).filter(f => f.endsWith('.test.ts'));

for (const file of files) {
    const filePath = path.join(testsDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');

    const replacements = [
        ["{activePlayer\\?\\.operativeLoadout}", "{engine.activePlayer?.operativeLoadout as any}"],
        ["operativeLoadout=\\{activePlayer\\?\\.operativeLoadout\\}", "operativeLoadout=\\{engine.activePlayer?.operativeLoadout as any\\}"],
        ["compact=\\{!telemetryReady\\}", "compact=\\{!engine.telemetryReady\\}"],
        ["player-analytics-void--compact=\\{!telemetryReady\\}", "player-analytics-void--compact=\\{!engine.telemetryReady\\}"],
        ["profileIncomplete=\\{!hasArmoryProfile\\}", "profileIncomplete=\\{!engine.hasArmoryProfile\\}"],
        ["\\bqa-strap\\b", "pd-strap"], // fix for playerOsCohesion.test.ts
        ["init-modal[\\\\s\\\\S]{0,120}tw-bg-slate-900", "init-modal[\\\\s\\\\S]{0,120}pd-panel"],
    ];

    let modified = false;
    for (const [find, replace] of replacements) {
        if (content.includes(find)) {
            content = content.replaceAll(find, replace);
            modified = true;
        }
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Fixed string exact matches in ${file}`);
    }
}
