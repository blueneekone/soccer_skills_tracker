# run-launch-automation-v7.ps1
# Multi-Persona Swarm Orchestrator and Launch-Day Pipeline (Headless Secure Edition)

$ErrorActionPreference = "Stop"

# Ensure Git identity is established to prevent loops on self-commits
git config user.name "Nexus Command Automation"
git config user.email "automation@sstracker.app"

# Establish global Antigravity permissions if not already present
$SettingsPath = "$Home/.gemini/antigravity-cli/settings.json"
if (-not (Test-Path $SettingsPath)) {
    New-Item -ItemType File -Path $SettingsPath -Force | Out-Null
    $DefaultSettings = @{
        "enableTerminalSandbox" = $true
        "permissions" = @{
            "allow" = @(
                "command(node)",
                "command(pnpm)",
                "command(npm)",
                "command(git)",
                "command(gh)"
            )
        }
    }
    $DefaultSettings | ConvertTo-Json -Depth 5 | Out-File $SettingsPath -Encoding utf8
    Write-Host "[Nexus Command] Pre-configured global Antigravity permissions at $SettingsPath" -ForegroundColor Green
}

# Master list of personas and their configurations
$Personas = @(
    @{ Name = "admin"; Route = "src/routes/(app)/admin/overview"; Workflow = ".agents/workflows/jules-builds/tdd-admin-os.md" },
    @{ Name = "director"; Route = "src/routes/(app)/director/dashboard"; Workflow = ".agents/workflows/jules-builds/tdd-director-os.md" },
    @{ Name = "coach"; Route = "src/routes/(app)/coach/war-room"; Workflow = ".agents/workflows/jules-builds/tdd-coach-os.md" },
    @{ Name = "player"; Route = "src/routes/(app)/player/dashboard"; Workflow = ".agents/workflows/jules-builds/tdd-player-os.md" },
    @{ Name = "parent"; Route = "src/routes/(app)/parent/dashboard"; Workflow = ".agents/workflows/jules-builds/tdd-parent-os.md" },
    @{ Name = "recruiter"; Route = "src/routes/(app)/recruiter/onboarding"; Workflow = ".agents/workflows/jules-builds/tdd-recruiter-os.md" }
)

# Persistent state file configuration
$StatePath = ".agents/automation-state.json"
if (-not (Test-Path ".agents")) {
    New-Item -ItemType Directory -Path ".agents" -Force | Out-Null
}

# Load or initialize persistent state
if (Test-Path $StatePath) {
    $State = Get-Content $StatePath | ConvertFrom-Json
    Write-Host "[Nexus Command] Loaded existing automation state from $StatePath" -ForegroundColor Green
} else {
    $State = [PSCustomObject]@{
        CurrentPersona = "admin"
        CompletedPersonas = @()
        LastAuditedCommit = @{}
    }
    $State | ConvertTo-Json | Out-File $StatePath
    Write-Host "[Nexus Command] Initialized brand-new state file at $StatePath" -ForegroundColor Green
}

# Determine the latest available audit script in the project
function Get-AuditScript {
    $AuditScripts = Get-ChildItem -Path "./scripts" -Filter "audit-computed-styles*.js" | Sort-Object Name -Descending
    if ($AuditScripts.Count -gt 0) {
        return $AuditScripts[0].FullName
    }
    return "./scripts/audit-computed-styles-v4.js" # Fallback default
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " SSTRACKER COMMAND PLANE: ACTIVE AUTOMATION ORCHESTRATOR  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Active Persona: $($State.CurrentPersona)" -ForegroundColor Yellow

while ($true) {
    try {
        # 1. Fetch remote updates with prune to clear deleted remote branches
        Write-Host "[(Polling) $(Get-Date -Format 'HH:mm:ss')] Fetching origin changes with prune..." -ForegroundColor Gray
        git fetch origin --prune

        # Get active local branch name
        $LocalBranch = (git branch --show-current).Trim()

        # 2. Check for open PRs from Jules to pull directly
        Write-Host "Checking for open Pull Requests from Jules..." -ForegroundColor Gray
        $JulesPRs = gh pr list --author "google-jules" --state "open" --json headRefName,title,number | ConvertFrom-Json

        if ($JulesPRs -and $JulesPRs.Count -gt 0) {
            $TargetPR = $JulesPRs[0]
            Write-Host "Found open Jules PR: '$($TargetPR.title)' (Branch: $($TargetPR.headRefName))" -ForegroundColor Cyan
            
            # Save any uncommitted changes to prevent git conflicts
            $StashOutput = git stash -u
            
            Write-Host "Checking out Jules branch: $($TargetPR.headRefName)" -ForegroundColor Yellow
            git checkout $TargetPR.headRefName
            git pull origin $TargetPR.headRefName

            # Re-apply any local configurations safely
            if ($StashOutput -match "Saved working directory") {
                git stash pop | Out-Null
            }
        } else {
            # Check dev branch updates
            Write-Host "No open PRs found. Syncing branch $LocalBranch with origin..." -ForegroundColor Gray
            $StashOutput = git stash -u
            git pull origin $LocalBranch
            if ($StashOutput -match "Saved working directory") {
                git stash pop | Out-Null
            }
        }

        # 3. Locate active persona settings
        $CurrentPersonaObj = $Personas | Where-Object { $_.Name -eq $State.CurrentPersona }
        if (-not $CurrentPersonaObj) {
            Write-Host "[ERROR] Unknown persona state: $($State.CurrentPersona). Exiting." -ForegroundColor Red
            break
        }

        # Check the last commit on the active persona's route directory
        $PersonaRoute = $CurrentPersonaObj.Route
        $LastCommitOnRoute = (git log -1 --format="%H" -- $PersonaRoute).Trim()
        
        # Get the previously saved audited commit for this persona
        $SavedCommit = $State.LastAuditedCommit.$($CurrentPersonaObj.Name)

        # Check if there are new un-audited commits on the route
        if ($LastCommitOnRoute -and ($LastCommitOnRoute -ne $SavedCommit)) {
            Write-Host "[Nexus Command] New un-audited commits detected on $PersonaRoute! ($LastCommitOnRoute)" -ForegroundColor Yellow
            
            # Identify the most up-to-date Playwright audit file
            $AuditScriptPath = Get-AuditScript
            Write-Host "Running Visual Audit via $AuditScriptPath..." -ForegroundColor Yellow

            # Execute the Playwright visual audit
            $AuditResult = Start-Process node -ArgumentList $AuditScriptPath, $CurrentPersonaObj.Name -Wait -PassThru -NoNewWindow
            
            if ($AuditResult.ExitCode -ne 0) {
                Write-Host "[Nexus Command] Visual Audit failed. Triggering Antigravity CDO auto-fix..." -ForegroundColor Red
                
                # Execute CDO auto-healing
                $FixResult = Start-Process agy -ArgumentList "-p `"/tdd-ui-ux-autofix $($CurrentPersonaObj.Name)`" --dangerously-skip-permissions" -Wait -PassThru -NoNewWindow
                
                # Re-run the visual audit after healing
                Write-Host "Re-running Visual Audit..." -ForegroundColor Yellow
                $AuditResult = Start-Process node -ArgumentList $AuditScriptPath, $CurrentPersonaObj.Name -Wait -PassThru -NoNewWindow
            }

            if ($AuditResult.ExitCode -eq 0) {
                Write-Host "[Nexus Command] Visual Audit passed 100% Green!" -ForegroundColor Green

                # Get the last commit message and check if it's already a style lock to prevent recursive self-commits
                $LastCommitMsg = (git log -1 --pretty=%B).Trim()
                $LastAuthor = (git log -1 --format="%an").Trim()

                if ($LastAuthor -ne "Nexus Automation") {
                    # Commit and push the verified layout adjustments
                    Write-Host "Committing and pushing verified visual styling locks..." -ForegroundColor Yellow
                    git add .
                    git commit -m "style: visual styling lock and grid-alignment fix for $($CurrentPersonaObj.Name) dashboard"
                    git push origin $LocalBranch
                }

                # Update persistent state
                if ($State.CompletedPersonas -notcontains $CurrentPersonaObj.Name) {
                    $State.CompletedPersonas += $CurrentPersonaObj.Name
                }
                
                # Save the successfully audited commit hash to prevent re-running
                $State.LastAuditedCommit.$($CurrentPersonaObj.Name) = (git log -1 --format="%H" -- $PersonaRoute).Trim()

                # Determine the next persona in the sequence
                $CurrentIndex = [array]::IndexOf($Personas, $CurrentPersonaObj)
                $NextIndex = $CurrentIndex + 1

                if ($NextIndex -lt $Personas.Count) {
                    $NextPersona = $Personas[$NextIndex]
                    $State.CurrentPersona = $NextPersona.Name
                    
                    # Trigger Jules cloud VM for the next persona autonomously
                    Write-Host "Triggering Google Jules for next Phase: $($NextPersona.Name) OS..." -ForegroundColor Green
                    gh issue create --title "Build $($NextPersona.Name) OS" --body "@google-jules, please run $($NextPersona.Workflow)"
                } else {
                    Write-Host "==========================================================" -ForegroundColor Green
                    Write-Host " LAUNCH SUITE RECOVERY COMPLETED! ALL OS ROUTINES SECURED. " -ForegroundColor Green
                    Write-Host "==========================================================" -ForegroundColor Green
                    break
                }

                # Save updated state file
                $State | ConvertTo-Json | Out-File $StatePath
                Write-Host "Persistent state successfully saved. Persona advanced to: $($State.CurrentPersona)" -ForegroundColor Green
            } else {
                Write-Host "[WARNING] Visual checks still failing after auto-heal. Sleeping to await corrections..." -ForegroundColor Red
            }
        } else {
            Write-Host "No new commits detected on $PersonaRoute (Last audited hash: $SavedCommit)." -ForegroundColor Gray
        }

    } catch {
        Write-Host "[Nexus Command] Exception intercepted: $_" -ForegroundColor Red
        Write-Host "Sleeping 30 seconds before retrying to protect pipeline stability..." -ForegroundColor Yellow
    }

    # Polling throttle limit (30 seconds)
    Start-Sleep -Seconds 30
}
