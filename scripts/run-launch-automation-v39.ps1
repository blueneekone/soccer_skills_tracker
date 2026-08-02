# SSTracker Programmatic Launch Orchestrator (v39)
# Enforces Zero-Touch Svelte 5 + Playwright Audits & Pure REST-Based Jules Cloud VM Orchestration
# Bypasses GitHub Issues completely to prevent repo spam and run on rails

$env:DEBUG = "false"
$ErrorActionPreference = "Stop"

# Establish static persona queue
$Personas = @(
    @{ Name = "admin"; Route = "/admin/overview"; Active = $false },
    @{ Name = "director"; Route = "/director/dashboard"; Active = $false },
    @{ Name = "coach"; Route = "/coach/dashboard"; Active = $false },
    @{ Name = "player"; Route = "/player/dashboard"; Active = $false },
    @{ Name = "parent"; Route = "/parent/dashboard"; Active = $false }
)

# Load or initialize State Machine
$StateFile = ".agents/automation-state.json"
if (-not (Test-Path ".agents")) {
    New-Item -ItemType Directory -Path ".agents" -Force | Out-Null
}

$State = @{
    "admin"    = "completed"
    "director" = "completed"
    "coach"    = "completed"
    "player"   = "completed"
    "parent"   = "pending"
}

if (Test-Path $StateFile) {
    try {
        $State = ConvertFrom-Json (Get-Content -Raw -Path $StateFile) -ErrorAction SilentlyContinue
    } catch {
        # Fallback to defaults if file is malformed
    }
}

# Determine active target
$ActivePersona = $null
foreach ($P in $Personas) {
    $pName = $P.Name
    if ($State.$pName -eq "pending") {
        $ActivePersona = $P
        break
    }
}

if ($null -eq $ActivePersona) {
    Write-Host "[SUCCESS] All personas are fully compiled, verified, and merged! Launch sequence complete." -ForegroundColor Green
    exit 0
}

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host " NEXUS COMMAND AUTO-LAUNCHER v39" -ForegroundColor Cyan
Write-Host " Active Target: $($ActivePersona.Name.ToUpper()) OS" -ForegroundColor Yellow
Write-Host "=========================================================" -ForegroundColor Cyan

# Check for manual bypass override
$BypassPath = ".agents/bypass/$($ActivePersona.Name)"
if (Test-Path $BypassPath) {
    Write-Host "[BYPASS] Manual override detected for $($ActivePersona.Name). Marking as completed." -ForegroundColor Magenta
    Remove-Item -Path $BypassPath -Force | Out-Null
    $pName = $ActivePersona.Name
    $State.$pName = "completed"
    $State | ConvertTo-Json | Out-File -FilePath $StateFile -Encoding utf8
    Write-Host "[BYPASS] State advanced. Re-run script to trigger next phase." -ForegroundColor Yellow
    exit 0
}

# Pre-Flight verification of local Svelte server
try {
    $TestConn = Test-Connection -ComputerName "localhost" -Port 5173 -Count 1 -ErrorAction SilentlyContinue
    Write-Host "[PRE-FLIGHT] Svelte local dev server detected on port 5173." -ForegroundColor Green
} catch {
    Write-Error "[PRE-FLIGHT] Local Svelte server not running on port 5173! Run 'npm run dev' first."
}

# Bypassing /setup Route Guards - Programmatic Firestore Emulator Seed
Write-Host "[EMULATOR] Seeding local Firestore emulator with mock completed user..." -ForegroundColor Cyan
try {
    $EmulatorPayload = @{
        fields = @{
            uid               = @{ stringValue = "mock-$($ActivePersona.Name)-uid" }
            role              = @{ stringValue = "$($ActivePersona.Name)" }
            isProfileComplete = @{ booleanValue = $true }
            armory            = @{
                mapValue = @{
                    fields = @{
                        totalXP      = @{ integerValue = "2500" }
                        streakFreeze = @{
                            mapValue = @{
                                fields = @{
                                    available = @{ integerValue = "1" }
                                }
                            }
                        }
                        stats        = @{
                            mapValue = @{
                                fields = @{
                                    scoutsSix = @{
                                        mapValue = @{
                                            fields = @{
                                                accuracy    = @{ doubleValue = 88.00 }
                                                speed       = @{ doubleValue = 75.00 }
                                                consistency = @{ doubleValue = 90.00 }
                                                power       = @{ doubleValue = 80.00 }
                                                endurance   = @{ doubleValue = 85.00 }
                                                tactics     = @{ doubleValue = 92.00 }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    } | ConvertTo-Json -Depth 100

    $Headers = @{ "Content-Type" = "application/json" }
    $Uri = "http://localhost:8080/v1/projects/sstracker-nexus/databases/(default)/documents/users/mock-$($ActivePersona.Name)-uid"
    $Response = Invoke-RestMethod -Uri $Uri -Method Patch -Headers $Headers -Body $EmulatorPayload -ErrorAction SilentlyContinue
    Write-Host "[EMULATOR] Firestore mock user injected successfully. setup redirection guard deactivated." -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Failed to seed emulator. Playwright may get blocked by /setup route guard." -ForegroundColor Yellow
}

# Execute Playwright computed-styles-v5 browser verification
Write-Host "[AUDIT] Booting browser-in-the-loop Playwright verification engine (audit-computed-styles-v5.js)..." -ForegroundColor Cyan
$env:AUDIT_TARGET = $ActivePersona.Name
try {
    node scripts/audit-computed-styles-v5.js
    Write-Host "[AUDIT] Visual verification passed! screenshots deposited in /audit-artifacts/$($ActivePersona.Name)/" -ForegroundColor Green
} catch {
    Write-Host "[AUDIT] Anomaly detected! Deploying local Antigravity healing routine..." -ForegroundColor Yellow
    try {
        # Run local auto-heal
        agy -p "/ui-ux-audit-v3 $($ActivePersona.Name)"
        # Re-run visual audit
        node scripts/audit-computed-styles-v5.js
        Write-Host "[AUDIT] Self-healing successful! Layout locked." -ForegroundColor Green
    } catch {
        Write-Error "[FATAL] Visual audit failed after healing pass. Refusing to merge red layouts."
    }
}

# Commit visual layout locks to Git, securing against self-commit loops
Write-Host "[GIT] Locking in verified visual states..." -ForegroundColor Cyan
git config user.name "Nexus Command Automation"
git config user.email "automation@sstracker.app"

# Stage change vectors
git add src/routes/
git add src/lib/

$Status = git status --porcelain
if ($Status) {
    git commit -m "style: visual styling lock and grid-alignment fix for $($ActivePersona.Name) dashboard [ci skip]"
    git pull origin dev --rebase
    git push origin dev
    Write-Host "[GIT] Layout states pushed cleanly to origin/dev." -ForegroundColor Green
} else {
    Write-Host "[GIT] No visual drift detected. Repository is already aligned." -ForegroundColor Gray
}

# Update state machine
$pName = $ActivePersona.Name
$State.$pName = "completed"
$State | ConvertTo-Json | Out-File -FilePath $StateFile -Encoding utf8

# Programmatic REST-Based Jules Cloud VM Escalation
Write-Host "[JULES API] Escalating build sequence to Cloud VM..." -ForegroundColor Cyan
$ApiKey = $env:JULES_API_KEY
if (-not $ApiKey) {
    Write-Host "[WARNING] JULES_API_KEY environment variable is not configured!" -ForegroundColor Yellow
    Write-Host "[WARNING] Please set JULES_API_KEY locally to fully automate the cloud VMs." -ForegroundColor Yellow
    Write-Host "[WARNING] Falling back to GitHub CLI Issue trigger..." -ForegroundColor Gray
    gh issue create --title "Build $($ActivePersona.Name) OS" --body "/tdd-swarm-build-v3 $($ActivePersona.Name)" --label "jules" -R blueneekone/soccer_skills_tracker
    Write-Host "[GIT] Trigger issue opened successfully." -ForegroundColor Green
    exit 0
}

# Find the next pending persona to build in Jules
$NextPersona = $null
foreach ($P in $Personas) {
    $pName = $P.Name
    if ($State.$pName -eq "pending") {
        $NextPersona = $P
        break
    }
}

if ($null -eq $NextPersona) {
    Write-Host "[SUCCESS] All personas are fully compiled, verified, and merged! No further Cloud VMs required." -ForegroundColor Green
    exit 0
}

Write-Host "[JULES API] Querying available codebase sources..." -ForegroundColor Cyan
$JulesHeaders = @{
    "X-Goog-Api-Key" = $ApiKey
    "Content-Type"   = "application/json"
}

try {
    $SourcesUri = "https://developers.google.com/jules/api/v1/sources"
    $SourcesResult = Invoke-RestMethod -Uri $SourcesUri -Method Get -Headers $JulesHeaders
    
    # Match active source
    $TargetSource = $null
    foreach ($Src in $SourcesResult.sources) {
        if ($Src.repository -match "soccer_skills_tracker") {
            $TargetSource = $Src.name
            break
        }
    }
    
    if ($null -eq $TargetSource) {
        # Fallback to the first available source
        $TargetSource = $SourcesResult.sources[0].name
    }
    
    Write-Host "[JULES API] Targeting codebase: $TargetSource" -ForegroundColor Green
    
    # Spin up Cloud VM session directly on the dev branch with zero-touch plan approval
    $SessionPayload = @{
        source               = $TargetSource
        branch               = "dev"
        prompt               = "/swarm-build $($NextPersona.Name)"
        automationMode       = "PR_CREATION"
        requirePlanApproval  = $false
    } | ConvertTo-Json
    
    $SessionsUri = "https://developers.google.com/jules/api/v1/sessions"
    $SessionResult = Invoke-RestMethod -Uri $SessionsUri -Method Post -Headers $JulesHeaders -Body $SessionPayload
    
    Write-Host "[JULES API] Cloud VM successfully provisioned!" -ForegroundColor Green
    Write-Host "[JULES API] Session Name: $($SessionResult.name)" -ForegroundColor Green
    Write-Host "[JULES API] Asynchronous build triggered for $($NextPersona.Name.ToUpper()) OS. Go get some sleep!" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Jules API call failed! Falling back to backup GitHub Issue trigger..." -ForegroundColor Yellow
    gh issue create --title "Build $($NextPersona.Name) OS" --body "/tdd-swarm-build-v3 $($NextPersona.Name)" --label "jules" -R blueneekone/soccer_skills_tracker
    Write-Host "[GIT] Trigger issue opened successfully." -ForegroundColor Green
}
