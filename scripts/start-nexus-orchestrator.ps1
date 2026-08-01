# start-nexus-orchestrator.ps1
# SSTracker Nexus Command - Resilient Night-Shift Orchestrator

$ErrorActionPreference = "Stop"

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host " NEXUS COMMAND: UNATTENDED ORCHESTRATOR ONLINE            " -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan

# 1. BULLETPROOFING: Set a dedicated local Git Author to prevent infinite loops
$AutomationAuthor = "Nexus Command Automation"
git config user.name $AutomationAuthor
git config user.email "nexus-automation@sstracker.local"

# 2. Define the exact sequential build queue
$PendingPersonas = @(
    @{ Name = "admin"; Route = "/admin/overview"; NextTask = "Build Director OS Backend" },
    @{ Name = "director"; Route = "/director/dashboard"; NextTask = "Build Coach OS Backend" },
    @{ Name = "coach"; Route = "/coach/dashboard"; NextTask = "Build Player OS Gamification" },
    @{ Name = "player"; Route = "/player/dashboard"; NextTask = "Build Parent OS Vault" },
    @{ Name = "parent"; Route = "/parent/dashboard"; NextTask = "Build Recruiter OS Vetting" },
    @{ Name = "recruiter"; Route = "/recruiter/onboarding"; NextTask = "SYSTEM COMPLETE" }
)

# --- Subroutines ---

function Run-AntigravityAudit ($PersonaName) {
    Write-Host "--> [Antigravity] Running Visual/Data Flow Audit for $PersonaName..." -ForegroundColor Magenta
    # Invokes the local Antigravity CLI non-interactively
    agy -p "/ui-ux-audit $PersonaName"
    return $LASTEXITCODE -eq 0
}

function Run-AntigravityHeal ($PersonaName) {
    Write-Host "--> [Antigravity] Audit failed. Triggering Critic-Augmented Auto-Fix for $PersonaName..." -ForegroundColor Yellow
    agy -p "/tdd-ui-ux-autofix $PersonaName"
    return $LASTEXITCODE -eq 0
}

function Trigger-JulesCloud ($NextTask) {
    if ($NextTask -eq "SYSTEM COMPLETE") {
        Write-Host "--> [SUCCESS] Master Assembly Line Complete! Shutting down." -ForegroundColor Green
        exit 0
    }
    
    Write-Host "--> [GitHub] Handing off to Jules. Triggering: $NextTask" -ForegroundColor Blue
    # Use GitHub CLI to assign the next epic to Jules
    gh issue create --title "Jules Action Required: $NextTask" --body "@jules, proceed with the next Master Roadmap phase." --label "jules"
}

# --- Main Resilient Polling Loop ---

Write-Host "Monitoring 'dev' branch for Jules Cloud merges..." -ForegroundColor DarkGray

while ($PendingPersonas.Count -gt 0) {
    try {
        # Fetch silently
        git fetch origin dev -q
        $LocalHash = git rev-parse HEAD
        $RemoteHash = git rev-parse origin/dev

        if ($LocalHash -ne $RemoteHash) {
            
            # Pull new changes
            git pull origin dev -q
            
            # THE GUARD CLAUSE: Check who authored the last commit
            $LastCommitAuthor = git log -1 --pretty=%an
            
            if ($LastCommitAuthor -eq $AutomationAuthor) {
                Write-Host "Ignoring local styling lock commit. Waiting for Jules..." -ForegroundColor DarkGray
                Start-Sleep -Seconds 15
                continue
            }

            # If it's from Jules/Cloud, get changed files
            $ChangedFiles = git diff --name-only HEAD~1 HEAD
            $TargetPersona = $null

            # Check if this merge matches the next persona in our queue
            foreach ($Persona in $PendingPersonas) {
                if ($ChangedFiles -match "src/routes/\(app\)$($Persona.Route)") {
                    $TargetPersona = $Persona
                    break
                }
            }

            if ($TargetPersona) {
                Write-Host "`n=========================================================" -ForegroundColor Cyan
                Write-Host " INTERCEPTED: Jules finished backend for $($TargetPersona.Name)!" -ForegroundColor Cyan
                Write-Host "=========================================================" -ForegroundColor Cyan
                
                # 1. Antigravity Audit
                $Passed = Run-AntigravityAudit $TargetPersona.Name
                
                # 2. Antigravity Heal (if needed)
                if (-not $Passed) {
                    $Passed = Run-AntigravityHeal $TargetPersona.Name
                }
                
                # 3. Lock, Commit, and Handoff
                if ($Passed) {
                    Write-Host "--> [Git] Committing visual styling lock..." -ForegroundColor Green
                    git add .
                    git commit -m "style: fix UX/UI deviations and lock visual layout for $($TargetPersona.Name)" -q
                    git push origin dev -q
                    
                    # 4. Trigger Jules for the next step
                    Trigger-JulesCloud $TargetPersona.NextTask
                    
                    # 5. Remove completed persona from the queue
                    $PendingPersonas = $PendingPersonas | Where-Object { $_.Name -ne $TargetPersona.Name }
                    
                    Write-Host "Waiting for Jules to complete the next phase..." -ForegroundColor DarkGray
                } else {
                    Write-Host "[ERROR] Antigravity failed to heal the UI. Human intervention required." -ForegroundColor Red
                    exit 1
                }
            }
        }
    }
    catch {
        Write-Host "[WARNING] Network or Git state error encountered. Retrying in 30 seconds... ($($_.Exception.Message))" -ForegroundColor Yellow
        Start-Sleep -Seconds 30
        continue
    }
    
    # Standard polling interval
    Start-Sleep -Seconds 15
}