# run-launch-automation-v5.ps1
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

# Check for GitHub CLI (gh)
$HasGH = $null -ne (Get-Command gh -ErrorAction SilentlyContinue)
if (-not $HasGH) {
    Write-Host "[WARNING] GitHub CLI (gh) not found in PATH." -ForegroundColor Yellow
}

# 1. INFINITE LOOP GUARD: Set specific bot author for automated commits
$BotAuthor = "SSTracker Nexus Bot"
git config user.name $BotAuthor
git config user.email "nexus@sstracker.local"

function Run-VisualAudit ($Persona) {
    Write-Host "`n[1/3] Starting Local Svelte Dev Server and Firebase Emulators..." -ForegroundColor Green
    Write-Host "[2/3] Running Playwright Visual Styles Audit for $($Persona.Name)..." -ForegroundColor Green
    try {
        # 2. V3 UPDATE: Execute the v3 visual audit script
        node ./scripts/audit-computed-styles-v3.js $($Persona.Name)
        Write-Host "[SUCCESS] Visual audit passed for $($Persona.Name)!" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "[FAIL] Visual audit failed for $($Persona.Name)." -ForegroundColor Red
        return $false
    }
}

function Trigger-AutoHeal ($Persona) {
    Write-Host "`n[AUTO-HEAL] Launching local subagents to repair $($Persona.Name) layout..." -ForegroundColor Yellow
    try {
        # 3. V3 UPDATE: Trigger the exact command ID required by ui-ux-audit-v3.md
        agy -p "/ui-ux-audit-v3 $($Persona.Name)"
        
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
        Write-Host "`n[ACTION REQUIRED] Manual intervention needed. Type:" -ForegroundColor Yellow
        Write-Host "  @google-jules run .agents/workflows/jules-builds/$($Persona.NextTrigger).md" -ForegroundColor Cyan
        return
    }

    Write-Host "`n[3/3] Visuals locked. Programmatically triggering next cloud VM ($($Persona.NextTrigger))..." -ForegroundColor Green
    try {
        $PRNumber = gh pr list --limit 1 --json number --jq '.[0].number'
        if ($PRNumber) {
            gh pr comment $PRNumber --body "@google-jules run .agents/workflows/jules-builds/$($Persona.NextTrigger).md"
        } else {
            gh issue create --title "Trigger Swarm: $($Persona.NextTrigger)" --body "@google-jules run .agents/workflows/jules-builds/$($Persona.NextTrigger).md"
        }
        Write-Host "[SUCCESS] Sequential handoff complete." -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Failed to programmatically trigger next Jules phase: $_" -ForegroundColor Red
    }
}

# Master Loop
while ($true) {
    Write-Host "`nChecking Git tree for new merges from Google Jules..." -ForegroundColor Gray
    git fetch origin dev -q
    
    $LocalHash = git rev-parse HEAD
    $RemoteHash = git rev-parse origin/dev
    
    if ($LocalHash -ne $RemoteHash) {
        git pull origin dev -q
        
        # 4. INFINITE LOOP GUARD: Ignore our own styling commits
        $LastCommitAuthor = git log -1 --pretty=%an
        if ($LastCommitAuthor -eq $BotAuthor) {
            Write-Host "Ignoring local styling lock commit. Waiting for Jules..." -ForegroundColor DarkGray
            Start-Sleep -Seconds 10
            continue
        }
        
        $ChangedFiles = git diff --name-only HEAD~1 HEAD
        
        foreach ($Persona in $Personas) {
            if ($ChangedFiles -match "src/routes/\(app\)$($Persona.Route)") {
                Write-Host "`n=========================================================" -ForegroundColor Cyan
                Write-Host " INTERCEPTED: Merged updates for $($Persona.Name) OS!" -ForegroundColor Cyan
                Write-Host "=========================================================" -ForegroundColor Cyan
                
                $Passed = Run-VisualAudit $Persona
                
                if (-not $Passed) {
                    $Passed = Trigger-AutoHeal $Persona
                }
                
                if ($Passed) {
                    Write-Host "Committing and pushing visual styling lock..." -ForegroundColor Green
                    git add .
                    git commit -m "style: visual styling lock and grid-alignment fix for $($Persona.Name) dashboard" -q
                    git push origin dev -q
                    
                    Trigger-NextCloudPersona $Persona
                }
                break
            }
        }
    }
    
    Start-Sleep -Seconds 10
}