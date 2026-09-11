# =============================================================================
# SSTRACKER REPOSITORY SANITIZATION & FILE ORGANIZER SCRIPT
# This script eliminates versioned script duplicates (v1-v40) to prevent context rot.
# =============================================================================

$ErrorActionPreference = "SilentlyContinue"

Write-Host "Starting repository sweep and organization..." -ForegroundColor Cyan

# 1. Create a standardized folder for deprecated developer artifacts
$BackupDir = ".deprecated_backups"
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

# 2. Sweep old versions of launch automation scripts (v1 to v41)
Write-Host "Archiving obsolete launch scripts..." -ForegroundColor Gray
$ScriptsToClean = Get-ChildItem -Filter "run-launch-automation-v*.ps1" | Where-Object {
    $_.Name -match "run-launch-automation-v(\d+)\.ps1"
}

foreach ($Script in $ScriptsToClean) {
    Move-Item -Path $Script.FullName -Destination $BackupDir -Force
}

# 3. Archive deprecated visual audits & old sequential runners
Write-Host "Archiving obsolete sequential runners and visual audits..." -ForegroundColor Gray
$OldSequentials = Get-ChildItem -Filter "run-sequential-local-v*.ps1" | Where-Object {
    $_.Name -match "run-sequential-local-v(\d+)\.ps1"
}

foreach ($Seq in $OldSequentials) {
    Move-Item -Path $Seq.FullName -Destination $BackupDir -Force
}

# Move other miscellaneous unversioned audit files into the backup folder
$MiscFiles = @(
    "audit-computed-styles.js",
    "audit-computed-styles-v2.js",
    "audit-computed-styles-v3.js",
    "audit-computed-styles-v4.js",
    "audit-computed-styles-v5.js",
    "audit-computed-styles-v6.js",
    "run-all-local-audits.ps1",
    "run-all-local-audits-v2.ps1",
    "run-all-local-audits-v3.ps1",
    "run-all-local-audits-v4.ps1",
    "run-all-local-audits-v5.ps1",
    "run-all-local-audits-v6.ps1",
    "run-sequential-local.ps1",
    "run-sequential-local-v2.ps1",
    "run-sequential-local-v3.ps1",
    "run-sequential-local-v4.ps1",
    "run-sequential-local-v5.ps1",
    "run-sequential-local-v6.ps1",
    "run-parent-visual-audit.ps1",
    "patch-layout-blowout-v1.ps1",
    "start-nexus-command-recovery-v2.ps1",
    "start-nexus-command-recovery-v3.ps1",
    "run-master-visual-swarm-v1.ps1",
    "run-master-visual-swarm-v2.ps1",
    "run-launch-automation-v41.ps1"
)

foreach ($File in $MiscFiles) {
    if (Test-Path $File) {
        Move-Item -Path $File -Destination $BackupDir -Force
    }
}

# 4. Clean up old mood boards & marketing asset duplication
Write-Host "Organizing branding assets..." -ForegroundColor Gray
$AssetDir = "src/assets/branding"
if (-not (Test-Path $AssetDir)) {
    New-Item -ItemType Directory -Path $AssetDir -Force | Out-Null
}

$BrandingImages = Get-ChildItem -Filter "sstracker_*.jpg"
foreach ($Img in $BrandingImages) {
    Move-Item -Path $Img.FullName -Destination $AssetDir -Force
}

# 5. Lock Git Configurations to prevent untracked file pollution
if (Test-Path ".gitignore") {
    $GitIgnoreContent = Get-Content ".gitignore"
    if ($GitIgnoreContent -notcontains "audit-artifacts/") {
        Add-Content -Path ".gitignore" -Value "audit-artifacts/"
        Write-Host "Added audit-artifacts to gitignore" -ForegroundColor Green
    }
    if ($GitIgnoreContent -notcontains ".deprecated_backups/") {
        Add-Content -Path ".gitignore" -Value ".deprecated_backups/"
        Write-Host "Added .deprecated_backups to gitignore" -ForegroundColor Green
    }
}

Write-Host "Cleanup Complete!" -ForegroundColor Green
Write-Host "Running git status to inspect workspace..." -ForegroundColor Cyan
git status
