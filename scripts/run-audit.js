import { execSync } from 'child_process';
import os from 'os';

// SSTracker Cross-Platform Audit Trigger
console.log('=====================================================================');
console.log(' 🏟️  SSTracker ENGINE: CROSS-PLATFORM AUDIT INITIALIZER');
console.log('=====================================================================');

const isWindows = os.platform() === 'win32';

try {
    if (isWindows) {
        console.log('\n[INFO] Windows platform detected. Initializing PowerShell Orchestrator...');
        // Execute the native Windows script, bypassing ExecutionPolicy for this session
        execSync('powershell -NoProfile -ExecutionPolicy Bypass -File ./run-all-persona-audits-v2.ps1', { stdio: 'inherit' });
    } else {
        console.log('\n[INFO] Unix-based platform detected. Initializing Bash Orchestrator...');
        // Execute the Unix bash script
        execSync('bash ./run-all-persona-audits.sh', { stdio: 'inherit' });
    }
} catch (error) {
    console.error('\n❌ [ERROR] Audit pipeline terminated with failures.');
    process.exit(1);
}
