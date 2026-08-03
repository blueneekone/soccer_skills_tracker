# start-nexus-command-recovery-v2.ps1
# Hardened, Auto-Healing Orchestration Script for SSTracker
# Enforces Zero-Trust, Svelte 5 snippet layouts, ESM test patching, and headed Playwright visual regression sequencing.

$ErrorActionPreference = "Stop"

# Set native identity to prevent commit loops
git config user.name "Nexus Command Automation"
git config user.email "automation@sstracker.app"

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "   INITIALIZING SYSTEM AUTO-HEALING GATES   " -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# 1. PRE-FLIGHT ESM PATH PATCHING
try {
    # File 1: check-file-budget-hotfix.test.ts
    $HotfixFile = "scripts/__tests__/check-file-budget-hotfix.test.ts"
    if (Test-Path $HotfixFile) {
        Write-Host "Patching check-file-budget-hotfix.test.ts for ES Modules..." -ForegroundColor Gray
        $Content = Get-Content $HotfixFile -Raw
        if ($Content -match "__dirname") {
            $NewHeader = @'
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
'@
            $Content = $Content -replace "import \{ join \} from 'node:path';", $NewHeader
            $Content = $Content -replace "const ROOT = join\(__dirname, '\.\.', '\.\.'\);", "const ROOT = join(__dirname, '..', '..');"
            Set-Content $HotfixFile -Value $Content -NoNewline
        }
    }

    # File 2: check-file-budget.test.ts
    $BudgetFile = "scripts/__tests__/check-file-budget.test.ts"
    if (Test-Path $BudgetFile) {
        Write-Host "Patching check-file-budget.test.ts for ES Modules..." -ForegroundColor Gray
        $Content = Get-Content $BudgetFile -Raw
        if ($Content -match "__dirname") {
            $NewHeader = @'
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
'@
            $Content = $Content -replace "import \{ join \} from 'node:path';", $NewHeader
            $Content = $Content -replace "const ROOT = join\(__dirname, '\.\.', '\.\.'\);", "const ROOT = join(__dirname, '..', '..');"
            Set-Content $BudgetFile -Value $Content -NoNewline
        }
    }

    # File 3: dev-tenant-reset.demo-stats.test.ts
    $ResetFile = "scripts/__tests__/dev-tenant-reset.demo-stats.test.ts"
    if (Test-Path $ResetFile) {
        Write-Host "Patching dev-tenant-reset.demo-stats.test.ts relative paths..." -ForegroundColor Gray
        $Content = Get-Content $ResetFile -Raw
        if ($Content -match "scripts/scripts/dev-tenant-reset.mjs") {
            $Content = $Content -replace "scripts/scripts/dev-tenant-reset.mjs", "scripts/dev-tenant-reset.mjs"
            Set-Content $ResetFile -Value $Content -NoNewline
        }
    }

    # File 4: vite.config.test.ts
    $ViteTestFile = "scripts/__tests__/vite.config.test.ts"
    if (Test-Path $ViteTestFile) {
        Write-Host "Patching vite.config.test.ts configuration path..." -ForegroundColor Gray
        $Content = Get-Content $ViteTestFile -Raw
        if ($Content -match "\./vite.config.js") {
            $Content = $Content -replace "\./vite.config.js", "../../vite.config.ts"
            Set-Content $ViteTestFile -Value $Content -NoNewline
        }
    }

    # 2. SVELTE 5 SNIPPET & GLOBAL STYLE RECONSTRUCTION
    $LayoutFile = "src/routes/+layout.svelte"
    if (Test-Path $LayoutFile) {
        Write-Host "Enforcing Svelte 5 layout snippet rendering and app.css imports..." -ForegroundColor Gray
        $LayoutContent = @'
<script lang="ts">
  import '../app.css';
  let { children } = $props();
</script>

{@render children()}
'@
        Set-Content $LayoutFile -Value $LayoutContent -NoNewline
    }

    # Clean Vite / SvelteKit Caches
    Write-Host "Purging SvelteKit and Vite temporary compilation caches..." -ForegroundColor Gray
    if (Test-Path ".svelte-kit") { Remove-Item -Recurse -Force ".svelte-kit" }
    if (Test-Path ".vite") { Remove-Item -Recurse -Force ".vite" }

} catch {
    Write-Host "WARNING: An error occurred during pre-flight patching: $_" -ForegroundColor Yellow
}

# 4. INITIALIZE AUDIT DIRECTORIES
$Personas = @("admin", "commissioner", "director", "coach", "player", "parent", "fan")
$AuditRoot = "audit-artifacts"
if (-not (Test-Path $AuditRoot)) {
    New-Item -ItemType Directory -Path $AuditRoot | Out-Null
}
foreach ($P in $Personas) {
    $Path = Join-Path $AuditRoot $P
    if (-not (Test-Path $Path)) {
        New-Item -ItemType Directory -Path $Path | Out-Null
        Write-Host "Created target review directory: $Path" -ForegroundColor Gray
    }
}

# 5. SEQUENTIAL TEST TRAVERSAL LOOP
Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "   STARTING INTEGRATED PERSONA TRAVERSAL   " -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

foreach ($Persona in $Personas) {
    $Approved = $false
    while (-not $Approved) {
        Write-Host ""
        Write-Host "--> Initializing Audit Sequence for Persona: [$($Persona.ToUpper())]" -ForegroundColor Yellow
        Write-Host "Launching Playwright headed traversal assertions..." -ForegroundColor Gray

        $TestProcess = Start-Process -FilePath "pnpm" -ArgumentList "playwright test visual-regression-v4.spec.ts --headed --project=chromium --grep=@$Persona" -Wait -NoNewWindow -PassThru

        if ($TestProcess.ExitCode -eq 0) {
            Write-Host "SUCCESS: Traversal assertions completed cleanly for [$Persona]" -ForegroundColor Green
            Write-Host "Screenshots compiled under: audit-artifacts/$Persona/" -ForegroundColor Green
        } else {
            Write-Host "FAIL: Layout collisions or visual regressions detected for [$Persona]" -ForegroundColor Red
            Write-Host "Action Required: Run local auto-healer to resolve spacing collisions:" -ForegroundColor Yellow
            Write-Host "   /microscopic-visual-autofix-v3 $Persona" -ForegroundColor Cyan
        }

        Write-Host ""
        Write-Host "==============================================" -ForegroundColor DarkYellow
        Write-Host "   PAUSED FOR HUMAN REVIEW: [$($Persona.ToUpper())]" -ForegroundColor DarkYellow
        Write-Host "==============================================" -ForegroundColor DarkYellow
        Write-Host "Review generated screenshots and hover transitions in: audit-artifacts/$Persona/" -ForegroundColor Gray
        Write-Host "Type one of the following commands:" -ForegroundColor Gray
        Write-Host "  [Press Enter] - Approve and proceed to next persona" -ForegroundColor Gray
        Write-Host "  'retry'       - Re-run the visual audit for [$Persona]" -ForegroundColor Gray
        Write-Host "  'exit'        - Safely terminate the recovery queue" -ForegroundColor Gray
        
        $Response = Read-Host "Action"
        
        if ($Response -eq "exit") {
            Write-Host "Orchestrator safely terminated by operator." -ForegroundColor Yellow
            exit 0
        } elseif ($Response -eq "retry") {
            Write-Host "Retrying visual audit..." -ForegroundColor Yellow
        } else {
            $Approved = $true
        }
    }
}

Write-Host "==============================================" -ForegroundColor Green
Write-Host "   NEXUS COMMAND RECOVERY PIPELINE COMPLETE   " -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
