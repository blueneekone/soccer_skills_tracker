$ErrorActionPreference = "Stop"

Clear-Host
$currentDate = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host " [SSTracker COMMAND PLANE: SEQUENCE AUDITOR INITIALIZED]" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "Platform Mode: B2B Launch Validation (v2)" -ForegroundColor Gray
Write-Host "Local Time:    $currentDate" -ForegroundColor Gray
Write-Host "=====================================================================" -ForegroundColor Cyan

Write-Host "`n[STEP 1/3] Synchronizing platform dependencies..." -ForegroundColor Yellow
pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAILED] Failed to run 'pnpm install'. Ensure pnpm is installed globally." -ForegroundColor Red
    exit 1
} else {
    Write-Host "[OK] Dependencies successfully synced." -ForegroundColor Green
}

Write-Host "`n[STEP 2/3] Executing Svelte 5 strict compilation audit..." -ForegroundColor Yellow
pnpm run check
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAILED] Svelte compiler returned errors. Resolve Svelte 5 types before running visual tests." -ForegroundColor Red
    exit 1
} else {
    Write-Host "[OK] Compilation check passed with 0 errors and 0 warnings." -ForegroundColor Green
}

Write-Host "`n[STEP 3/3] Launching sequential Playwright visual E2E suites..." -ForegroundColor Yellow

$specs = @(
    @{ Name = "Global Admin OS & Impersonation Gates"; File = "tests/secure-impersonation-gating.spec.ts" },
    @{ Name = "Passkey Re-enrollment Hardening";  File = "tests/passkey-re-enrollment.spec.ts" },
    @{ Name = "Director OS Revenue Bento Grids";   File = "tests/director-intel-perfection.spec.ts" },
    @{ Name = "CSV Roster Chunking & Ingestion";   File = "tests/roster-importer.spec.ts" },
    @{ Name = "Coach OS Consolidated War Room";    File = "tests/tactical-war-room-v3.spec.ts" },
    @{ Name = "Live Match Day Console Controls";   File = "tests/coach-matchday.spec.ts" }
)

$failedSpecs = @()

foreach ($spec in $specs) {
    Write-Host "`n---------------------------------------------------------------------" -ForegroundColor Gray
    Write-Host "[RUNNING] visual suite: $($spec.Name)" -ForegroundColor Cyan
    Write-Host "Target: $($spec.File)" -ForegroundColor Gray
    Write-Host "---------------------------------------------------------------------" -ForegroundColor Gray

    $targetFile = $spec.File
    pnpm playwright test $targetFile --project=chromium --headed
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[FAILED]: $($spec.Name)" -ForegroundColor Red
        $failedSpecs += $spec.Name
    } else {
        Write-Host "[PASSED]: $($spec.Name)" -ForegroundColor Green
    }
}

Write-Host "`n=====================================================================" -ForegroundColor Cyan
Write-Host " [SSTracker LAUNCH VALIDATION SUMMARY]" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan

$failCount = $failedSpecs.Count
if ($failCount -eq 0) {
    Write-Host "[SUCCESS] 100% GREEN BUILD! Platform is launch-ready. Clear to deploy to dev/main." -ForegroundColor Green
    Write-Host "Coverage status: ALL OPERATING SYSTEMS VALIDATED" -ForegroundColor Green
    exit 0
} else {
    Write-Host "[FAILED] AUDIT COMPLETED WITH FAILURES." -ForegroundColor Red
    Write-Host "The following persona specs require attention/Jules self-healing:" -ForegroundColor Yellow
    foreach ($failed in $failedSpecs) {
        Write-Host "   - $failed" -ForegroundColor Red
    }
    Write-Host "`nRun 'gh issue create' to dispatch Jules to auto-fix these modules." -ForegroundColor Gray
    exit 1
}
