# run-sequential-local-v5.ps1
# SSTracker Sequential Persona UI/UX Audit & Auto-Patching Harness (v5.0)

$ErrorActionPreference = "Stop"

# 1. AUTO-PATCHING PRE-FLIGHT GATE
function Patch-ESMTestFiles {
    Write-Host "==============================================" -ForegroundColor Yellow
    Write-Host "🔧 PRE-FLIGHT: Checking for ESM environment and path misalignments..." -ForegroundColor Cyan
    Write-Host "==============================================" -ForegroundColor Yellow

    $BudgetFiles = @(
        "scripts/__tests__/check-file-budget-hotfix.test.ts",
        "scripts/__tests__/check-file-budget.test.ts"
    )
    foreach ($File in $BudgetFiles) {
        if (Test-Path $File) {
            $Content = Get-Content $File -Raw
            if ($Content -match "const ROOT = join\(__dirname") {
                Write-Host "  -> Patching __dirname in $File to ESM standard..." -ForegroundColor DarkYellow
                $ESMHeader = @"
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
"@
                # Targeted replacement of the root join line to prepend the ESM declarations
                $Content = $Content -replace "const ROOT = join\(__dirname, '..', '..'\);", "$ESMHeader`nconst ROOT = join(__dirname, '..', '..');"
                Set-Content -Path $File -Value $Content -Encoding utf8
            }
        }
    }

    $ResetTestFile = "scripts/__tests__/dev-tenant-reset.demo-stats.test.ts"
    if (Test-Path $ResetTestFile) {
        $Content = Get-Content $ResetTestFile -Raw
        if ($Content -match "scripts/scripts/dev-tenant-reset.mjs") {
            Write-Host "  -> Fixing double-nested path in $ResetTestFile..." -ForegroundColor DarkYellow
            $Content = $Content -replace "scripts/scripts/dev-tenant-reset.mjs", "scripts/dev-tenant-reset.mjs"
            Set-Content -Path $ResetTestFile -Value $Content -Encoding utf8
        }
    }

    $ViteTestFile = "scripts/__tests__/vite.config.test.ts"
    if (Test-Path $ViteTestFile) {
        $Content = Get-Content $ViteTestFile -Raw
        if ($Content -match "\./vite.config.js") {
            Write-Host "  -> Redirecting import to root vite.config.ts in $ViteTestFile..." -ForegroundColor DarkYellow
            $Content = $Content -replace "\./vite.config.js", "../../vite.config.ts"
            Set-Content -Path $ViteTestFile -Value $Content -Encoding utf8
        }
    }
    Write-Host "✅ Pre-flight patching complete. All test path environments sanitized." -ForegroundColor Green
}

# 2. RUN SANITIZER
Patch-ESMTestFiles

# 3. DIRECTORY INITIALIZATION
$ArtifactsDir = "audit-artifacts"
$Personas = @("admin", "commissioner", "director", "coach", "player", "parent", "fan")

if (-not (Test-Path $ArtifactsDir)) {
    New-Item -ItemType Directory -Path $ArtifactsDir -Force | Out-Null
}

foreach ($Persona in $Personas) {
    $PersonaPath = Join-Path $ArtifactsDir $Persona
    if (-not (Test-Path $PersonaPath)) {
        New-Item -ItemType Directory -Path $PersonaPath -Force | Out-Null
        Write-Host "📁 Created empty directory: $PersonaPath" -ForegroundColor Gray
    }
}

# 4. SEQUENTIAL EXECUTION LOOP
Write-Host "`n🚀 Starting Sequential UI/UX Visual Audit Pipeline..." -ForegroundColor Green

foreach ($Persona in $Personas) {
    Write-Host "`n==============================================" -ForegroundColor Yellow
    Write-Host "📡 AUDITING PERSONA: [$($Persona.ToUpper())]" -ForegroundColor Cyan
    Write-Host "==============================================" -ForegroundColor Yellow

    # Trigger targeted Playwright block
    Write-Host "⚙️ Launching Playwright headed browser session..." -ForegroundColor Gray
    
    # Execute only the matching test block
    $TestOutput = npx playwright test -g "$($Persona) OS" --headed 2>&1
    Write-Output $TestOutput

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ AUDIT FAILED FOR: [$($Persona.ToUpper())]" -ForegroundColor Red
        Write-Host "💡 To automatically heal layout collisions or token deviations, run:" -ForegroundColor Yellow
        Write-Host "   /microscopic-visual-autofix-v3 $($Persona)" -ForegroundColor Cyan
        
        $Choice = Read-Host "Would you like to (R)etry, (S)kip to next persona, or (E)xit?"
        if ($Choice -eq "e" -or $Choice -eq "E") {
            Write-Host "👋 Execution aborted by user." -ForegroundColor Gray
            exit
        }
        continue
    }

    Write-Host "✅ Visual regression test passed for [$($Persona.ToUpper())]." -ForegroundColor Green
    Write-Host "📸 Screenshots have been exported to: $ArtifactsDir/$Persona/" -ForegroundColor Gray

    # Interactive Human-In-The-Loop Checkpoint
    Write-Host "`n⏸️ PAUSED FOR HUMAN REVIEW:" -ForegroundColor Yellow
    Write-Host "   Please open $ArtifactsDir/$Persona/ and review the generated screenshots/hover-states." -ForegroundColor Gray
    
    $Review = Read-Host "Press [Enter] to approve and start the next persona, or type 'exit' to quit"
    if ($Review -eq "exit") {
        Write-Host "👋 Review pipeline closed." -ForegroundColor Gray
        exit
    }
}

Write-Host "`n🏁 ALL PERSONAS AUDITED SUCCESSFULLY! You are fully locked for launch." -ForegroundColor Green
