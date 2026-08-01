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

# Check for GitHub CLI (gh) which is required to trigger the next cloud step automatically
$HasGH = $null -ne (Get-Command gh -ErrorAction SilentlyContinue)
if (-not $HasGH) {
    Write-Host "[WARNING] GitHub CLI (gh) not found in PATH." -ForegroundColor Yellow
    Write-Host "Without 'gh', you will need to manually comment on GitHub to trigger the next Jules persona." -ForegroundColor Yellow
}

# --- Assume placeholder functions for Run-VisualAudit, Trigger-Heal, Trigger-NextCloudPersona are defined here ---

# Main Polling Loop
while ($true) {
    
    # Check for new commits on dev
    git fetch origin dev -q
    $LocalHash = git rev-parse HEAD
    $RemoteHash = git rev-parse origin/dev

    if ($LocalHash -ne $RemoteHash) {
        
        # Pull the new changes down
        git pull origin dev -q
        
        # ====================================================================
        # THE FIX: Guard clause to prevent infinite loops on our own commits
        # ====================================================================
        $LastCommitMsg = git log -1 --pretty=%B
        if ($LastCommitMsg -match "style: visual styling lock") {
            Write-Host "Skipping local automated style lock commit to prevent infinite loop..." -ForegroundColor DarkGray
            Start-Sleep -Seconds 10
            continue
        }
        # ====================================================================

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
                    
                    # OPTIONAL STATE FIX: Remove the persona from the queue so it can't be re-triggered
                    $Personas = $Personas | Where-Object { $_.Name -ne $Persona.Name }
                }
                break
            }
        }
    }
    
    # Poll repository state every 10 seconds
    Start-Sleep -Seconds 10
}