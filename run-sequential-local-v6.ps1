# run-sequential-local-v6.ps1
# Master Sequential Local Visual Auditor with ES Module Auto-Patching

$ErrorActionPreference = "Stop"

# 1. Pre-flight Environment Checks and ES Module Auto-Patching
Write-Host "==============================================" -ForegroundColor Green
Write-Host "🛠️  RUNNING PRE-FLIGHT ENVIRONMENT CHECKS" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green

# A. Patch scripts/__tests__/check-file-budget-hotfix.test.ts
$HotfixFile = "scripts/__tests__/check-file-budget-hotfix.test.ts"
if (Test-Path $HotfixFile) {
    $Content = Get-Content $HotfixFile -Raw
    if ($Content -match "__dirname") {
        Write-Host "Patching $HotfixFile for ES Module compatibility..." -ForegroundColor Yellow
        $NewHeader = @"
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
"@
        $Content = $Content -replace "import \{ join \} from 'node:path';", $NewHeader
        $Content = $Content -replace "const ROOT = join\(__dirname, '\.\.', '\.\.'\);", "const ROOT = join(__dirname, '..', '..');"
        Set-Content $HotfixFile $Content -NoNewline
    }
}

# B. Patch scripts/__tests__/check-file-budget.test.ts
$BudgetFile = "scripts/__tests__/check-file-budget.test.ts"
if (Test-Path $BudgetFile) {
    $Content = Get-Content $BudgetFile -Raw
    if ($Content -match "__dirname") {
        Write-Host "Patching $BudgetFile for ES Module compatibility..." -ForegroundColor Yellow
        $NewHeader = @"
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
"@
        $Content = $Content -replace "import \{ join \} from 'node:path';", $NewHeader
        $Content = $Content -replace "const ROOT = join\(__dirname, '\.\.', '\.\.'\);", "const ROOT = join(__dirname, '..', '..');"
        Set-Content $BudgetFile $Content -NoNewline
    }
}

# C. Patch scripts/__tests__/dev-tenant-reset.demo-stats.test.ts
$ResetTestFile = "scripts/__tests__/dev-tenant-reset.demo-stats.test.ts"
if (Test-Path $ResetTestFile) {
    $Content = Get-Content $ResetTestFile -Raw
    if ($Content -match "scripts/scripts/dev-tenant-reset.mjs") {
        Write-Host "Patching $ResetTestFile path alignment..." -ForegroundColor Yellow
        $Content = $Content -replace "scripts/scripts/dev-tenant-reset.mjs", "scripts/dev-tenant-reset.mjs"
        Set-Content $ResetTestFile $Content -NoNewline
    }
}

# D. Patch scripts/__tests__/vite.config.test.ts
$ViteTestFile = "scripts/__tests__/vite.config.test.ts"
if (Test-Path $ViteTestFile) {
    $Content = Get-Content $ViteTestFile -Raw
    if ($Content -match "import viteConfig from '\./vite.config.js';") {
        Write-Host "Patching $ViteTestFile configuration reference..." -ForegroundColor Yellow
        $Content = $Content -replace "import viteConfig from '\./vite.config.js';", "import viteConfig from '../../vite.config.ts';"
        Set-Content $ViteTestFile $Content -NoNewline
    }
}

Write-Host "✨ Pre-flight auto-patching complete. All test files optimized." -ForegroundColor Green

# 2. Sequential Audit Setup
$Personas = @("admin", "commissioner", "director", "coach", "player", "parent", "fan")

$PersonaSuites = @{
    "admin"        = "Admin OS"
    "commissioner" = "Commissioner OS"
    "director"     = "Director OS"
    "coach"        = "Coach OS"
    "player"       = "Player OS"
    "parent"       = "Parent OS"
    "fan"          = "Fan OS"
}

$BaseArtifactDir = "audit-artifacts"
if (!(Test-Path $BaseArtifactDir)) {
    New-Item -ItemType Directory -Path $BaseArtifactDir | Out-Null
}

# Initialize all persona directories immediately
foreach ($P in $Personas) {
    $PDir = Join-Path $BaseArtifactDir $P
    if (!(Test-Path $PDir)) {
        New-Item -ItemType Directory -Path $PDir | Out-Null
        Write-Host "Created directory: $PDir" -ForegroundColor DarkGray
    }
}

Write-Host "==============================================" -ForegroundColor Green
Write-Host "🚀 STARTING SEQUENTIAL PERSOAN AUDIT LOOP" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green

$i = 0
while ($i -lt $Personas.Length) {
    $Persona = $Personas[$i]
    $SuiteName = $PersonaSuites[$Persona]
    $ArtifactDir = Join-Path $BaseArtifactDir $Persona

    Write-Host ""
    Write-Host "==============================================" -ForegroundColor Green
    Write-Host "▶ STARTING AUDIT FOR PERSONA: [$Persona]" -ForegroundColor Cyan
    Write-Host "Target Suite: $SuiteName" -ForegroundColor Cyan
    Write-Host "Artifact Directory: $ArtifactDir" -ForegroundColor Cyan
    Write-Host "==============================================" -ForegroundColor Green

    # Run Playwright test suite for this persona
    Write-Host "Running Playwright headed assertions..." -ForegroundColor Green
    npx playwright test -g $SuiteName --headed

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ AUDIT FAILED for $SuiteName!" -ForegroundColor Red
        Write-Host "Visual regressions, layout overlaps, or CSS mismatches were detected." -ForegroundColor Red
        Write-Host "To automatically heal this persona's layout and styling, run:" -ForegroundColor Yellow
        Write-Host "    /microscopic-visual-autofix-v3 $Persona" -ForegroundColor Cyan
        Write-Host ""
    } else {
        Write-Host "✅ AUDIT PASSED for $SuiteName!" -ForegroundColor Green
        Write-Host "Typography, color system, and Bento Grid integrity are verified." -ForegroundColor Green
    }

    # 3. Human-in-the-Loop Intermission
    Write-Host "⏸ PAUSED FOR HUMAN REVIEW" -ForegroundColor Yellow
    Write-Host "Review generated screenshots and hover transitions in: $ArtifactDir" -ForegroundColor Yellow
    $Response = Read-Host "Press [Enter] to continue, type 'retry' to re-run this persona, or 'exit' to quit"

    if ($Response -eq "retry") {
        # Loop again without incrementing index
        continue
    } elseif ($Response -eq "exit") {
        Write-Host "Audit terminated by user." -ForegroundColor Red
        break
    }

    $i++
}

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "🏁 SEQUENTIAL LOCAL AUDIT FINISHED" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
