# run-launch-automation-v4.ps1
# SSTracker Nexus Command Unattended Launch-Day Orchestrator
# Enforces the cloud-to-local sequential assembly line

$ErrorActionPreference = "Stop"

# Define the personas in the sequential build queue
$Personas = @(
    @{ Name = "admin"; Route = "/admin/overview"; NextTrigger = "tdd-director-os" },
    @{ Name = "director"; Route = "/director/dashboard"; NextTrigger = "tdd-coach-os" },
    @{ Name = "coach"; Route = "/coach/dashboard"; NextTrigger = "tdd-player-os" },
    @{ Name = "player"; Route = "/player/dashboard"; NextTrigger = "tdd-parent-os" },
    @{ Name = "parent"; Route = "/parent/dashboard"; NextTrigger = "tdd-recruiter-os" },
    @{ Name = "recruiter"; Route = "/recruiter/onboarding"; NextTrigger = "launch-complete" }
)

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host " SSTRACKER UNATTENDED LAUNCH-DAY ORCHESTRATOR ACTIVE      " -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan

# Check for GitHub CLI (gh) which is required to trigger the next cloud step automatically
$HasGH = $null -ne (Get-Command gh -ErrorAction SilentlyContinue)
if (-not $HasGH) {
    Write-Host "[WARNING] GitHub CLI (gh) not found in PATH." -ForegroundColor Yellow
    Write-Host "Without 'gh', you will need to manually comment on GitHub to trigger the next Jules persona." -ForegroundColor Yellow
}

function Run-VisualAudit ($Persona) {
    Write-Host "`n[1/3] Starting Local Svelte Dev Server and Firebase Emulators..." -ForegroundColor Green
    # Launch dev server and emulators in background if not already running
    # (Assuming start-overnight-build-v2.ps1 handles backend or we invoke it here)
    
    Write-Host "[2/3] Running Playwright Visual Styles Audit for $($Persona.Name)..." -ForegroundColor Green
    try {
        # Execute the visual audit script
        node ./scripts/audit-computed-styles-v4.js $($Persona.Name)
        Write-Host "[SUCCESS] Visual audit passed for $($Persona.Name)!" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "[FAIL] Visual audit failed for $($Persona.Name)." -ForegroundColor Red
        return $false
    }
}

function Trigger-AutoHeal ($Persona) {
    Write-Host "`n[AUTO-HEAL] Launching local CDO Agent to repair $($Persona.Name) layout..." -ForegroundColor Yellow
    try {
        # Execute the local Svelte / Tailwind auto-fix command
        # This triggers the local CDO subagent to repair bento-grid and typography drift in place
        igy run .agents/workflows/tdd-ui-ux-autofix.md --persona $($Persona.Name)
        
        Write-Host "[AUTO-HEAL] Repair complete. Re-running visual audit..." -ForegroundColor Yellow
        return Run-VisualAudit $Persona
    } catch {
        Write-Host "[ERROR] Auto-heal failed to resolve styling discrepancies." -ForegroundColor Red
        return $false
    }
}

function Trigger-NextCloudPersona ($Persona) {
    if ($Persona.NextTrigger -eq "launch-complete") {
        Write-Host "`n=========================================================" -ForegroundColor Green
        Write-Host " LAUNCH-DAY BLUEPRINTS 100% COMPLETE AND LOCKED DOWN!     " -ForegroundColor Green
        Write-Host "=========================================================" -ForegroundColor Green
        return
    }

    if (-not $HasGH) {
        Write-Host "`n[ACTION REQUIRED] Manual intervention needed." -ForegroundColor Yellow
        Write-Host "Please type this comment in your open GitHub PR to trigger Jules for the next phase:" -ForegroundColor White
        Write-Host "  @google-jules run .agents/workflows/jules-builds/$($Persona.NextTrigger).md" -ForegroundColor Cyan
        return
    }

    Write-Host "`n[3/3] Visuals locked. Programmatically triggering next cloud VM ($($Persona.NextTrigger))..." -ForegroundColor Green
    try {
        # Open an issue or comment on the current PR to kick off the next step for Jules
        $PRNumber = gh pr list --limit 1 --json number --jq '.[0].number'
        if ($PRNumber) {
            gh pr comment $PRNumber --body "@google-jules run .agents/workflows/jules-builds/$($Persona.NextTrigger).md"
            Write-Host "[SUCCESS] Sequential handoff complete. Jules is now building $($Persona.NextTrigger) in the cloud!" -ForegroundColor Green
        } else {
            # Fallback to creating a tracking issue if no active PR is open
            gh issue create --title "Trigger Swarm: $($Persona.NextTrigger)" --body "@google-jules run .agents/workflows/jules-builds/$($Persona.NextTrigger).md"
            Write-Host "[SUCCESS] Opened trigger issue. Jules is spinning up next cloud VM!" -ForegroundColor Green
        }
    } catch {
        Write-Host "[ERROR] Failed to programmatically trigger next Jules phase via GitHub CLI: $_" -ForegroundColor Red
    }
}

# Master Loop: Check active state of repository and orchestrate
while ($true) {
    Write-Host "`nChecking Git tree for new merges from Google Jules..." -ForegroundColor Gray
    git fetch origin
    
    # Check if we have merged changes on the dev branch
    $LocalHash = git rev-parse HEAD
    $RemoteHash = git rev-parse origin/dev
    
    if ($LocalHash -ne $RemoteHash) {
        Write-Host "Incoming merged commit detected. Pulling changes..." -ForegroundColor Green
        git pull origin dev
        
        # Identify which Svelte views changed to resolve the active persona
        $ChangedFiles = git diff --name-only HEAD~1 HEAD
        
        foreach ($Persona in $Personas) {
            # Map changed files to target Svelte routes
            if ($ChangedFiles -match "src/routes/\(app\)$($Persona.Route)") {
                Write-Host "`n=========================================================" -ForegroundColor Cyan
                Write-Host " INTERCEPTED: Merged updates for $($Persona.Name) OS!" -ForegroundColor Cyan
                Write-Host "=========================================================" -ForegroundColor Cyan
                
                # 1. Run visual checks
                $Passed = Run-VisualAudit $Persona
                
                # 2. Trigger auto-heal if visual checks fail
                if (-not $Passed) {
                    $Passed = Trigger-Heal $Persona
                }
                
                # 3. If passed/healed, commit visual lock and hand off back to Cloud (Jules)
                if ($Passed) {
                    Write-Host "Committing and pushing visual styling lock to dev branch..." -ForegroundColor Green
                    git add .
                    git commit -m "style: visual styling lock and grid-alignment fix for $($Persona.Name) dashboard"
                    git push origin dev
                    
                    # 4. Trigger next sequential persona build in Cloud
                    Trigger-NextCloudPersona $Persona
                }
                break
            }
        }
    }
    
    # Poll repository state every 10 seconds
    Start-Sleep -Seconds 10
}
