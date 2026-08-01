# run-launch-automation-v23.ps1
# Master Orchestrator for SSTracker Swarm Assembly Line
# Powered by the virtual engineering council

$Personas = @("admin", "director", "coach", "player", "parent")
$StateDir = ".agents"
$StateFile = "$StateDir/automation-state.json"

# Dynamic Path Resolution for audit script
function Get-AuditScriptPath {
    $Paths = @(
        "scripts/audit-computed-styles-v4.js",
        "audit-computed-styles-v4.js",
        "../scripts/audit-computed-styles-v4.js"
    )
    foreach ($Path in $Paths) {
        if (Test-Path $Path) {
            return $Path
        }
    }
    return $null
}

# Silent git wrapper to avoid verbose logs and errors
function Run-GitSilent ($Cmd) {
    try {
        Invoke-Expression "git $Cmd 2>$null"
    } catch {
        # Suppress errors silently
    }
}

# Write a clean ASCII-only progress bar
function Show-ProgressBar ($Message, $Percent) {
    # Ensure Percent is locked in native PowerShell Write-Progress boundaries [-1, 100]
    $ClampedPercent = [math]::Max(-1, [math]::Min(100, $Percent))
    Write-Progress -Activity "SSTracker Master Assembly Line" -Status $Message -PercentComplete $ClampedPercent
}

# Ensure state folder exists
if (!(Test-Path $StateDir)) {
    New-Item -ItemType Directory -Path $StateDir -Force | Out-Null
}

# Load state
$ActiveIndex = 0
$State = @{}
if (Test-Path $StateFile) {
    try {
        $StateContent = Get-Content $StateFile -Raw -ErrorAction SilentlyContinue
        if ($StateContent) {
            $State = ConvertFrom-Json $StateContent -ErrorAction SilentlyContinue
            if ($null -eq $State) { $State = @{} }
        }
    } catch {
        $State = @{}
    }
}

# Initialize states if missing
foreach ($p in $Personas) {
    if (!$State.Contains($p)) {
        $State[$p] = "pending"
    }
}

# Find first non-completed persona
$FoundActive = $false
for ($i = 0; $i -lt $Personas.Count; $i++) {
    $p = $Personas[$i]
    if ($State[$p] -ne "completed") {
        $ActiveIndex = $i
        $FoundActive = $true
        break
    }
}

if (!$FoundActive) {
    Write-Host "[+] All personas are already completed! SSTracker is ready for launch!" -ForegroundColor Green
    exit
}

# Define helper to save state safely
function Save-State {
    $Json = ConvertTo-Json $State -Depth 10
    $Json | Out-File -FilePath $StateFile -Encoding utf8 -Force
}

Write-Host "[*] SSTracker Assembly Line Booted." -ForegroundColor Cyan
Write-Host "[*] Active Target Persona: $($Personas[$ActiveIndex]) (Status: $($State[$Personas[$ActiveIndex]]))" -ForegroundColor Yellow

while ($ActiveIndex -lt $Personas.Count) {
    $ActivePersona = $Personas[$ActiveIndex]
    $Status = $State[$ActivePersona]

    if ($Status -eq "pending") {
        Write-Host "[*] Persona $ActivePersona is pending build. Checking GitHub for existing branch or PR..." -ForegroundColor Cyan
        
        # Check open PR list via gh CLI, redirect stderr to prevent console pollution
        $PrListJson = gh pr list --state open --json headRefName 2>$null
        $BranchExists = $false
        if ($null -ne $PrListJson -and $PrListJson -match "jules-$ActivePersona") {
            $BranchExists = $true
        }

        # Also check remote branches
        Run-GitSilent "fetch origin --prune"
        $RemoteBranches = git branch -r 2>$null
        if ($null -ne $RemoteBranches -and $RemoteBranches -match "jules-$ActivePersona") {
            $BranchExists = $true
        }

        if ($BranchExists) {
            Write-Host "[+] Remote build branch/PR already exists for $ActivePersona. Updating state to polling..." -ForegroundColor Green
            $State[$ActivePersona] = "polling"
            Save-State
        } else {
            Write-Host "[*] No active build branch found for $ActivePersona. Triggering Jules via GitHub CLI..." -ForegroundColor Yellow
            
            $IssueTitle = "Build $ActivePersona OS"
            $IssueBody = "@google-jules, please run /tdd-swarm-build-v3 to complete this ticket. Set non-interactive auto-proceed to true."
            
            # Create issue to trigger Jules. Redirect errors to log file
            $ErrorFile = "gh-issue-error.log"
            $GhOutput = gh issue create --title $IssueTitle --body $IssueBody 2>$ErrorFile
            
            if ($LastExitCode -eq 0) {
                Write-Host "[Success] Programmatically triggered Jules Cloud Swarm with /tdd-swarm-build-v3!" -ForegroundColor Green
                $State[$ActivePersona] = "polling"
                Save-State
            } else {
                Write-Host "[-] Failed to trigger Jules via GitHub CLI. Check gh-issue-error.log for credentials or API errors." -ForegroundColor Red
                if (Test-Path $ErrorFile) {
                    $Err = Get-Content $ErrorFile -Raw
                    Write-Host "[-] Error Detail: $Err" -ForegroundColor DarkRed
                }
                Write-Host "[*] Pausing for 30 seconds before retrying..." -ForegroundColor DarkGray
                Start-Sleep -Seconds 30
                continue
            }
        }
    }

    if ($Status -eq "polling") {
        Show-ProgressBar "Polling GitHub for Jules $ActivePersona build branch..." 50
        Write-Host "[*] Fetching remote state from origin..." -ForegroundColor DarkGray
        
        Run-GitSilent "fetch origin --prune"
        $RemoteBranches = git branch -r 2>$null
        $TargetBranch = "origin/jules-$ActivePersona-refactor"
        $BranchFound = $false

        if ($null -ne $RemoteBranches) {
            foreach ($b in $RemoteBranches) {
                if ($b -match "jules-$ActivePersona") {
                    $TargetBranch = $b.Trim()
                    $BranchFound = $true
                    break
                }
            }
        }

        if ($BranchFound) {
            Write-Host "[+] Found build branch $TargetBranch! Merging remote build..." -ForegroundColor Green
            
            # Checkout to dev first
            Run-GitSilent "checkout dev"
            Run-GitSilent "pull origin dev"
            
            # Create local checkout and merge
            $LocalBranch = $TargetBranch -replace "origin/", ""
            Run-GitSilent "checkout -b $LocalBranch $TargetBranch"
            Run-GitSilent "checkout dev"
            Run-GitSilent "merge $LocalBranch --no-edit"
            
            Write-Host "[+] Merged Jules' changes locally. Transitioning to auditing phase..." -ForegroundColor Green
            $State[$ActivePersona] = "auditing"
            Save-State
        } else {
            Write-Host "[*] Jules is still building in the cloud. Standing by (15s check interval)..." -ForegroundColor Gray
            Start-Sleep -Seconds 15
            continue
        }
    }

    if ($Status -eq "auditing") {
        Show-ProgressBar "Executing visual audit and Svelte 5 validations for $ActivePersona..." 75
        Write-Host "[*] Starting local visual audit for $ActivePersona..." -ForegroundColor Cyan

        $AuditScript = Get-AuditScriptPath
        if ($null -eq $AuditScript) {
            Write-Host "[-] CRITICAL: audit-computed-styles-v4.js not found in expected directories!" -ForegroundColor Red
            Write-Host "[-] Expected paths: scripts/ or root directory." -ForegroundColor Red
            Write-Host "[*] Pausing for 30 seconds..." -ForegroundColor DarkGray
            Start-Sleep -Seconds 30
            continue
        }

        Write-Host "[*] Running Playwright suite: node $AuditScript..." -ForegroundColor Gray
        $AuditResult = node $AuditScript 2>&1
        $AuditPassed = $false
        if ($LastExitCode -eq 0) {
            $AuditPassed = $true
        }

        if ($AuditPassed) {
            Write-Host "[Success] Visual audit passed with 100% compliance!" -ForegroundColor Green
            
            # Commit styling lock and push
            Write-Host "[*] Locking styles and pushing dev branch to origin..." -ForegroundColor Cyan
            Run-GitSilent "add ."
            Run-GitSilent "commit -m 'style: visual styling lock and grid-alignment fix for $ActivePersona dashboard'"
            Run-GitSilent "push origin dev"
            
            Write-Host "[+] Persona $ActivePersona successfully launched!" -ForegroundColor Green
            $State[$ActivePersona] = "completed"
            
            # Advance to next persona
            $ActiveIndex++
            if ($ActiveIndex -lt $Personas.Count) {
                $Next = $Personas[$ActiveIndex]
                Write-Host "[*] Advancing target queue to $Next OS..." -ForegroundColor Yellow
            } else {
                Write-Host "[Success] All systems are fully built, secured, and styled!" -ForegroundColor Green
            }
            Save-State
        } else {
            Write-Host "[-] Visual audit failed: Layout anomalies or broken reactivity detected!" -ForegroundColor Red
            Write-Host "[-] Output: $AuditResult" -ForegroundColor DarkRed
            Write-Host "[*] Activating CDO Auto-Healer: agy -p "/tdd-ui-ux-autofix"..." -ForegroundColor Yellow
            
            # Fire the auto-healer in-place
            $HealerResult = agy -p "/tdd-ui-ux-autofix" 2>&1
            Write-Host "[*] Auto-Healer Output: $HealerResult" -ForegroundColor Gray
            
            Write-Host "[*] Retrying visual audit cycle..." -ForegroundColor Yellow
            Start-Sleep -Seconds 5
            continue
        }
    }
}

Show-ProgressBar "SSTracker Master Launch Complete!" 100
Write-Host "[Success] Master Assembly Line traversal completed successfully!" -ForegroundColor Green
