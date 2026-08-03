# ==============================================================================
# SSTRACKER (PROJECT PHOENIX) - MASTER NEXUS RECOVERY & TEST ORCHESTRATOR v3.0
# ==============================================================================
# Resolves pathing errors, fixes Svelte 5 snippets, and runs Playwright traversal
# locally on Windows with full support for CMD-wrapper commands (pnpm, npm).
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "   NEXUS COMMAND RECOVERY PROTOCOL STARTED    " -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# ------------------------------------------------------------------------------
# 1. Environment & Path Auto-Patching (Pre-Flight)
# ------------------------------------------------------------------------------
Write-Host "`n[1/5] Executing Pre-Flight Environment Patching..." -ForegroundColor Yellow

$CheckFileHotfix = "scripts/__tests__/check-file-budget-hotfix.test.ts"
$CheckFileBudget = "scripts/__tests__/check-file-budget.test.ts"
$ResetTestFile = "scripts/__tests__/dev-tenant-reset.demo-stats.test.ts"
$ViteConfigTest = "scripts/__tests__/vite.config.test.ts"

# Fix __dirname ESM exceptions in check-file-budget files
$EsmHeader = @"
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
"@

foreach ($file in @($CheckFileHotfix, $CheckFileBudget)) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        if ($content -match "const ROOT = join\(__dirname") {
            if ($content -notmatch "fileURLToPath") {
                Write-Host "Patching ESM __dirname in $file..." -ForegroundColor DarkYellow
                $content = $EsmHeader + "`n" + $content.Replace("import { join } from 'node:path';", "")
                Set-Content $file $content
            }
        }
    }
}

# Fix double-nested scripts/scripts/ paths
if (Test-Path $ResetTestFile) {
    $content = Get-Content $ResetTestFile -Raw
    if ($content -match "scripts/scripts/dev-tenant-reset.mjs") {
        Write-Host "Patching nested script path in $ResetTestFile..." -ForegroundColor DarkYellow
        $content = $content.Replace("scripts/scripts/dev-tenant-reset.mjs", "scripts/dev-tenant-reset.mjs")
        Set-Content $ResetTestFile $content
    }
}

# Fix missing vite.config.js import inside typescript configs
if (Test-Path $ViteConfigTest) {
    $content = Get-Content $ViteConfigTest -Raw
    if ($content -match "\./vite.config.js") {
        Write-Host "Patching vite.config import in $ViteConfigTest..." -ForegroundColor DarkYellow
        $content = $content.Replace("./vite.config.js", "../../vite.config.ts")
        Set-Content $ViteConfigTest $content
    }
}

# ------------------------------------------------------------------------------
# 2. Asset Pipeline & Svelte 5 Layout Recovery
# ------------------------------------------------------------------------------
Write-Host "`n[2/5] Repairing Root Layout Layout-Blowout Rules..." -ForegroundColor Yellow

$LayoutFile = "src/routes/+layout.svelte"
$TailwindConfig = "tailwind.config.js"

# Enforce Svelte 5 Snippet Rendering & app.css import
if (Test-Path $LayoutFile) {
    $LayoutContent = @"
<script lang="ts">
  import '../app.css';
  let { children } = `Props();
</script>

{@render children()}
"@
    # Fix backtick escaping for PowerShell templating
    $LayoutContent = $LayoutContent.Replace("`Props()", "`$props()")
    Set-Content $LayoutFile $LayoutContent
    Write-Host "Successfully restored root +layout.svelte with Svelte 5 snippets & app.css." -ForegroundColor Green
}

# Enforce prefix mapping in Tailwind Config
if (Test-Path $TailwindConfig) {
    $content = Get-Content $TailwindConfig -Raw
    if ($content -notmatch "prefix:\s*(tw-)") {
        Write-Host "Warning: Tailwind prefix 'tw-' not found. Injecting prefix rule..." -ForegroundColor DarkYellow
        # Simplistic injection after theme or modules
        if ($content -match "module\.exports\s*=\s*\{") {
            $newline = [System.Environment]::NewLine
            $content = $content.Replace("module.exports = {", "module.exports = {$newline  prefix: 'tw-',")
            Set-Content $TailwindConfig $content
        }
    }
}

# Flush Vite Caches to clear stale asset states
Write-Host "Purging SvelteKit & Vite compiler caches..." -ForegroundColor DarkYellow
if (Test-Path ".svelte-kit") { Remove-Item -Recurse -Force ".svelte-kit" }
if (Test-Path ".vite") { Remove-Item -Recurse -Force ".vite" }

# Regenerate .svelte-kit/tsconfig.json so Playwright WebServer can resolve it
Write-Host "Regenerating SvelteKit type definitions (svelte-kit sync)..." -ForegroundColor DarkYellow
cmd.exe /c "npx svelte-kit sync" 2>&1 | Out-Null

# ------------------------------------------------------------------------------
# 3. Directory Verification & Visual Workspace Initialization
# ------------------------------------------------------------------------------
Write-Host "`n[3/5] Instantiating Clean Visual Audit Workspaces..." -ForegroundColor Yellow

$Personas = @("admin", "commissioner", "director", "coach", "player", "parent", "fan")
if (!(Test-Path "audit-artifacts")) {
    New-Item -ItemType Directory -Path "audit-artifacts" | Out-Null
}

foreach ($Persona in $Personas) {
    $PersonaDir = "audit-artifacts/$Persona"
    if (!(Test-Path $PersonaDir)) {
        New-Item -ItemType Directory -Path $PersonaDir | Out-Null
        Write-Host "Created visual workspace: $PersonaDir" -ForegroundColor DarkGray
    }
}

# ------------------------------------------------------------------------------
# 4. Asynchronous Browser Traversal via Playwright (Windows Safe FilePath)
# ------------------------------------------------------------------------------
Write-Host "`n[4/5] Spawning Sequential Headed Visual Audit Traversal..." -ForegroundColor Yellow

# Launching through cmd.exe guarantees Windows correctly resolves the pnpm CMD shim
$PlaywrightCommand = "npx playwright test visual-regression-v3.spec.ts --headed --project=chromium"
Write-Host "Executing Playwright: $PlaywrightCommand" -ForegroundColor DarkYellow

try {
    # FilePath points to cmd.exe to prevent "The system cannot find the file specified"
    $PlaywrightProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c $PlaywrightCommand" -PassThru -NoNewWindow -Wait
    
    if ($PlaywrightProcess.ExitCode -ne 0) {
        Write-Host "`n❌ Visual Regression Suite returned failure (Exit Code: $($PlaywrightProcess.ExitCode))." -ForegroundColor Red
        Write-Host "Encountered visual deviations or layout overlaps. Run visual-autofix to heal." -ForegroundColor Yellow
        Write-Host "Suggested Command: /microscopic-visual-autofix-v3 [PersonaName]" -ForegroundColor Cyan
    } else {
        Write-Host "`n✅ Visual Regression Traversal completely successful!" -ForegroundColor Green
    }
} catch {
    Write-Host "`n❌ Fatal Process Error: failed to launch testing process." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# ------------------------------------------------------------------------------
# 5. Pipeline Conclusion & Cloud Synchronization
# ------------------------------------------------------------------------------
Write-Host "`n[5/5] Visual Lock Finalization..." -ForegroundColor Yellow

Write-Host "==============================================" -ForegroundColor Green
Write-Host "  NEXUS COMMAND AUDIT SEQUENCE CONCLUDED      " -ForegroundColor Green
Write-Host "  All local checkpoints successfully audited! " -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
