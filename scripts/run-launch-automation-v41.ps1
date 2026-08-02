# SSTracker Integrated Launch Orchestrator (v41)
# Enforces strict programmatic handoff between local Playwright visual audits and Google Jules REST API.
# Now with -SkipPortCheck bypass to prevent loopback IP family connection failures.

param (
    [switch]$SkipPortCheck,
    [string]$TargetPersona = ""
)

$ErrorActionPreference = "Stop"
$env:NODE_ENV = "development"

# Define the absolute traversal pipeline of our specialized dashboards
$PersonaQueue = @("admin", "director", "coach", "player", "parent")

# Verify local state directory and load tracking file
$StateDir = ".agents"
if (-not (Test-Path -Path $StateDir)) {
    New-Item -ItemType Directory -Path $StateDir -Force | Out-Null
}

$StateFile = Join-Path -Path $StateDir -ChildPath "automation-state.json"
if (Test-Path -Path $StateFile) {
    $State = Get-Content -Path $StateFile -Raw | ConvertFrom-Json
} else {
    # Default fallback state
    $State = [PSCustomObject]@{
        admin    = "pending"
        director = "pending"
        coach    = "pending"
        player   = "pending"
        parent   = "pending"
    }
}

# Resolve active target persona
$ActivePersona = $TargetPersona
if ([string]::IsNullOrEmpty($ActivePersona)) {
    foreach ($P in $PersonaQueue) {
        if ($State.$P -eq "pending") {
            $ActivePersona = $P
            break
        }
    }
}

if ([string]::IsNullOrEmpty($ActivePersona)) {
    Write-Host "[SUCCESS] All personas have been fully built, visual-audited, and merged!" -ForegroundColor Green
    exit 0
}

Write-Host "[START] Launching unified pipeline for Target Persona: [$ActivePersona]" -ForegroundColor Cyan

# ── PRE-FLIGHT CHECKS ──────────────────────────────────────────────────

if (-not $SkipPortCheck) {
    Write-Host "[PRE-FLIGHT] Checking if local Svelte server is running on port 5173..." -ForegroundColor Gray
    $SvelteConnected = $false
    $ErrorActionPreference = "SilentlyContinue"
    
    # Test both IPv4 and IPv6 local loopbacks aggressively
    foreach ($IP in @("127.0.0.1", "[::1]")) {
        $TcpClient = New-Object System.Net.Sockets.TcpClient
        $ConnectTask = $TcpClient.ConnectAsync($IP, 5173)
        Start-Sleep -Milliseconds 250
        if ($ConnectTask.IsCompleted -and -not $ConnectTask.IsFaulted) {
            $SvelteConnected = $true
            $TcpClient.Close()
            break
        }
        $TcpClient.Dispose()
    }
    $ErrorActionPreference = "Stop"

    if (-not $SvelteConnected) {
        Write-Error "[PRE-FLIGHT] Local Svelte server not running on port 5173! Run 'npm run dev' first, or use 'run-launch-automation-v41.ps1 -SkipPortCheck' to bypass."
        exit 1
    }
    Write-Host "[PRE-FLIGHT] Local Svelte server detected on port 5173." -ForegroundColor Green
} else {
    Write-Host "[PRE-FLIGHT] Svelte port check bypassed via -SkipPortCheck." -ForegroundColor Yellow
}

# Ensure local Firebase Emulator Suite is active
Write-Host "[PRE-FLIGHT] Checking local Firestore Emulator on port 8080..." -ForegroundColor Gray
$FirestoreConnected = $false
$ErrorActionPreference = "SilentlyContinue"
$TcpClient = New-Object System.Net.Sockets.TcpClient
$ConnectTask = $TcpClient.ConnectAsync("127.0.0.1", 8080)
Start-Sleep -Milliseconds 250
if ($ConnectTask.IsCompleted -and -not $ConnectTask.IsFaulted) {
    $FirestoreConnected = $true
    $TcpClient.Close()
}
$TcpClient.Dispose()
$ErrorActionPreference = "Stop"

if (-not $FirestoreConnected) {
    Write-Error "[PRE-FLIGHT] Firestore Emulator is not running on port 8080! Boot your emulators first."
    exit 1
}

# ── EMULATOR SEEDING PHASE ─────────────────────────────────────────────
Write-Host "[SEED] Seeding Firestore with a completed profile to bypass SvelteKit route guards..." -ForegroundColor Gray
$MockProfile = @{
    uid               = "mock-$ActivePersona-uid"
    role              = $ActivePersona
    isProfileComplete = $true
    armory            = @{
        totalXP      = 2500
        streakFreeze = @{ available = 1 }
        stats        = @{
            scoutsSix = @{
                accuracy    = 88.00
                speed       = 75.00
                consistency = 90.00
                power       = 80.00
                endurance   = 85.00
                tactics     = 92.00
            }
        }
    }
} | ConvertTo-Json -Depth 10

try {
    # Programmatic write directly to local emulator REST API
    $Url = "http://127.0.0.1:8080/v1/projects/sstracker-nexus/databases/(default)/documents/users/mock-$ActivePersona-uid"
    $Headers = @{ "Content-Type" = "application/json" }
    Invoke-RestMethod -Uri $Url -Method Put -Headers $Headers -Body $MockProfile | Out-Null
    Write-Host "[SEED] Successfully injected mock profile for [mock-$ActivePersona-uid] into Firestore Emulator." -ForegroundColor Green
} catch {
    Write-Error "[SEED] Failed to communicate with Firestore Emulator REST API: $_"
    exit 1
}

# ── RUNNING PHYSICAL VISUAL AUDITS (PLAYWRIGHT v5 ENGINE) ──────────────
Write-Host "[AUDIT] Initiating browser-in-the-loop visual compliance assertions..." -ForegroundColor Gray
$env:AUDIT_TARGET = $ActivePersona

# Run the physical Svelte 5 visual check engine
$AuditProcess = Start-Process -FilePath "node" -ArgumentList "scripts/audit-computed-styles-v5.js" -NoNewWindow -PassThru -Wait
if ($AuditProcess.ExitCode -ne 0) {
    Write-Host "[AUDIT FAIL] Visual compliance check failed for [$ActivePersona]. Launching Antigravity auto-fix..." -ForegroundColor Red
    
    # Trigger Antigravity styling healing workflow
    $HealProcess = Start-Process -FilePath "agy" -ArgumentList "-p", "'/ui-ux-audit-v3 $ActivePersona'" -NoNewWindow -PassThru -Wait
    if ($HealProcess.ExitCode -ne 0) {
        Write-Error "[HEAL FAIL] Antigravity auto-heal routine aborted with error."
        exit 1
    }
    
    # Re-run visual audit after healing
    Write-Host "[AUDIT] Re-running Playwright visual compliance check..." -ForegroundColor Gray
    $AuditProcess = Start-Process -FilePath "node" -ArgumentList "scripts/audit-computed-styles-v5.js" -NoNewWindow -PassThru -Wait
    if ($AuditProcess.ExitCode -ne 0) {
        Write-Error "[AUDIT FAIL] Visual layout remains unaligned after auto-heal. Human review required."
        exit 1
    }
}

Write-Host "[AUDIT PASS] Visual layout successfully verified. High-definition snapshots captured." -ForegroundColor Green

# ── COMMIT AND MERGE PHASE ─────────────────────────────────────────────
Write-Host "[GIT] Securing layout specifications on dev branch..." -ForegroundColor Gray

# Configure git to sign commit clearly as our automated engine
git config user.name "Nexus Command Automation"
git config user.email "automation@sstracker.app"

# Stage, commit, and push styling variables and image assets
git add audit-artifacts/
git add src/
$ErrorActionPreference = "SilentlyContinue"
git commit -m "style: visual styling lock and grid-alignment fix for $ActivePersona dashboard"
$ErrorActionPreference = "Stop"

# Pull origin dev and push changes
git pull origin dev --rebase
git push origin dev

# Clear any override bypass flags for this persona
$BypassFile = Join-Path -Path $StateDir -ChildPath "bypass/$ActivePersona"
if (Test-Path -Path $BypassFile) {
    Remove-Item -Path $BypassFile -Force | Out-Null
}

# Advance the tracking queue
$State.$ActivePersona = "completed"
$State | ConvertTo-Json | Out-File -FilePath $StateFile -Encoding utf8

# Resolve the next target
$NextPersona = ""
foreach ($P in $PersonaQueue) {
    if ($State.$P -eq "pending") {
        $NextPersona = $P
        break
    }
}

if ([string]::IsNullOrEmpty($NextPersona)) {
    Write-Host "[SUCCESS] Pipeline complete. Platform fully verified and locked!" -ForegroundColor Green
    exit 0
}

# ── DIRECT GOOGLE JULES REST API CALL (ZERO-TOUCH HANDOFF) ──────────────
if ([string]::IsNullOrEmpty($env:JULES_API_KEY)) {
    Write-Warning "[REST BYPASS] JULES_API_KEY is not set. Resuming in standby mode. Trigger Jules manually or launch v41 with an API Key."
    exit 0
}

Write-Host "[REST] Programmatically triggering cloud VM build for next persona: [$NextPersona]..." -ForegroundColor Gray

$SessionBody = @{
    source = @{
        githubRepository = "blueneekone/soccer_skills_tracker"
        branch           = "dev"
    }
    prompt = "Review @ROADMAP.md and @GEMINI.md. Build the full backend logic, Svelte 5 state models, and database integrations for the [$NextPersona] persona. Create files if they are missing. Leave layout styling empty for CDO."
    requirePlanApproval = $false
    automationMode      = "PR_CREATION"
} | ConvertTo-Json

try {
    $JulesHeaders = @{
        "X-Goog-Api-Key" = $env:JULES_API_KEY
        "Content-Type"   = "application/json"
    }
    $JulesUrl = "https://labs.google.com/jules/v1/sessions"
    $JulesResponse = Invoke-RestMethod -Uri $JulesUrl -Method Post -Headers $JulesHeaders -Body $JulesHeaders
    Write-Host "[REST SUCCESS] Programmatic VM session launched successfully! Session ID: $($JulesResponse.id)" -ForegroundColor Green
    Write-Host "[REST] Go to bed! Jules is compiling the [$NextPersona] views in the cloud. The PR will be open by morning." -ForegroundColor Green
} catch {
    Write-Warning "[REST ERROR] Failed to connect to Jules REST API: $_. Standby mode active."
}
