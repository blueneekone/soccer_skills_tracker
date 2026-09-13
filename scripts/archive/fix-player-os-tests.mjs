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
        [/\{!telemetryReady\}/g, '{!engine.telemetryReady}'],
        [/activePlayer\?\\.operativeLoadout/g, 'engine.activePlayer?.operativeLoadout'],
        [/\{osLevel\}/g, '{engine.osLevel}'],
        [/\{!hasArmoryProfile\}/g, '{!engine.hasArmoryProfile}'],
        [/\{activePlayer\?\\.operativeLoadout\}/g, '{engine.activePlayer?.operativeLoadout as any}'],
        [/profileIncomplete=\{!hasArmoryProfile\}/g, 'profileIncomplete={!engine.hasArmoryProfile}'],
        [/telemetryReady\s*=\s*\$derived\(hasVanguardTelemetry\)/g, ''],
        [/player-analytics-void--compact=\{!telemetryReady\}/g, 'player-analytics-void--compact={!engine.telemetryReady}'],
        [/compact=\{!telemetryReady\}/g, 'compact={!engine.telemetryReady}']
    ];

    let modified = false;
    for (const [pattern, replacement] of replacements) {
        if (pattern.test(content)) {
            content = content.replace(pattern, replacement);
            modified = true;
        }
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Updated ${file}`);
    }
}
