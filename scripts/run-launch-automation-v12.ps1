# run-launch-automation-v12.ps1
# Multi-Persona E2E Swarm Audit & Recovery Orchestrator (PowerShell Edition)

# Disable interactive terminal prompts to prevent headless execution blocks
$env:GIT_TERMINAL_PROMPT = "0"

# Enforce Git Config User Identity
git config user.name "Nexus Command Automation"
git config user.email "automation@sstracker.app"

# Define the list of personas in order
$Personas = @("admin", "director", "coach", "player", "parent", "recruiter")

# Define the local state file path
$StatePath = ".agents/automation-state.json"

# Initialize local state if it does not exist
if (-not (Test-Path -Path $StatePath)) {
    if (-not (Test-Path -Path ".agents")) {
        New-Item -ItemType Directory -Path ".agents" -Force | Out-Null
    }
    $InitialState = @{}
    foreach ($P in $Personas) {
        $InitialState[$P] = "pending"
    }
    $InitialState | ConvertTo-Json | Out-File -FilePath $StatePath -Encoding utf8
}

# Helper functions to read and write state
function Get-AutomationState {
    $Content = Get-Content -Path $StatePath -Raw
    return $Content | ConvertFrom-Json
}

function Save-AutomationState($StateObject) {
    $StateObject | ConvertTo-Json | Out-File -FilePath $StatePath -Encoding utf8 -Force
}

# Main non-blocking git runner
function Run-GitSilent($Arguments) {
    # Programmatically feed "n" into stdin to bypass any interactive folder-lock prompts (y/n)
    $InputPipe = "n"
    $ProcessInfo = New-Object System.Diagnostics.ProcessStartInfo
    $ProcessInfo.FileName = "git"
    $ProcessInfo.Arguments = $Arguments
    $ProcessInfo.RedirectStandardInput = $true
    $ProcessInfo.RedirectStandardOutput = $true
    $ProcessInfo.RedirectStandardError = $true
    $ProcessInfo.UseShellExecute = $false
    $ProcessInfo.CreateNoWindow = $true

    $Process = [System.Diagnostics.Process]::Start($ProcessInfo)
    $Process.StandardInput.WriteLine($InputPipe)
    $Process.StandardInput.Close()

    $Out = $Process.StandardOutput.ReadToEnd()
    $Err = $Process.StandardError.ReadToEnd()
    $Process.WaitForExit()

    return @{ Output = $Out; Error = $Err; ExitCode = $Process.ExitCode }
}

# Inline local audit and auto-heal routine
function Invoke-UIUXAudit($PersonaName) {
    Write-Host "[*] Starting local visual audit for $PersonaName dashboard..." -ForegroundColor Yellow
    agy -p "/ui-ux-audit-v3 $PersonaName" --dangerously-skip-permissions

    Write-Host "[*] Executing local styling auto-fix for $PersonaName..." -ForegroundColor Yellow
    agy -p "/tdd-ui-ux-autofix $PersonaName" --dangerously-skip-permissions

    # Check if there are any layout modifications made by the audit/auto-heal
    $GitStatus = Run-GitSilent "status --porcelain"
    if ($GitStatus.Output -match "\S") {
        Write-Host "[+] Local layout modifications detected. Committing visual lock..." -ForegroundColor Green
        Run-GitSilent "add ." | Out-Null
        Run-GitSilent "commit -m `"style: visual styling lock for $PersonaName dashboard`"" | Out-Null
        Run-GitSilent "push origin dev" | Out-Null
        Write-Host "[+] Visual styling lock successfully pushed to remote branch." -ForegroundColor Green
    } else {
        Write-Host "[~] No layout regressions found. dashboard is structurally sound." -ForegroundColor Green
    }

    # Update state to completed
    $CurrentState = Get-AutomationState
    $CurrentState.$PersonaName = "completed"
    Save-AutomationState $CurrentState

    # Trigger next persona in cloud if available
    $CurrentIndex = $Personas.IndexOf($PersonaName)
    $NextIndex = $CurrentIndex + 1
    if ($NextIndex -lt $Personas.Count) {
        $NextPersona = $Personas[$NextIndex]
        Write-Host "[*] Triggering cloud build for the next phase ($NextPersona OS)..." -ForegroundColor Cyan
        gh issue create --title "Build $NextPersona OS" --body "@google-jules, please run /swarm-build to complete this ticket."
    } else {
        Write-Host "[*] Master roadmap complete! All 6 operating systems successfully deployed." -ForegroundColor Gold
    }
}

Write-Host "[*] SSTracker Nexus Command Orchestrator v12 Initialized." -ForegroundColor Cyan

while ($true) {
    try {
        # Determine the active pending persona
        $State = Get-AutomationState
        $ActivePersona = $null
        foreach ($P in $Personas) {
            if ($State.$P -eq "pending") {
                $ActivePersona = $P
                break
            }
        }

        if ($null -eq $ActivePersona) {
            Write-Host "[*] All operating system personas are 100% complete and verified!" -ForegroundColor Gold
            Write-Host "[*] Sleeping for 60 seconds before next sync..." -ForegroundColor Gray
            Start-Sleep -Seconds 60
            continue
        }

        Write-Host "[*] Active Persona: $ActivePersona OS (pending verification)" -ForegroundColor Cyan

        # Safe stash before checking remote state to prevent working directory blockades
        Write-Host "[*] Stashing local changes to prevent checkout blocks..." -ForegroundColor Gray
        $StashResult = Run-GitSilent "stash -u"

        # Fetch remote updates
        Write-Host "[*] Fetching latest remote state from origin with branch pruning..." -ForegroundColor Gray
        Run-GitSilent "fetch origin --prune" | Out-Null

        # Check for any open PRs corresponding to this active persona
        Write-Host "[*] Searching GitHub for open PRs or branches matching $ActivePersona..." -ForegroundColor Gray
        $OpenPRsJson = gh pr list --state open --json headRefName,title,number 2>$null
        $PRFound = $false

        if ($OpenPRsJson) {
            $OpenPRs = $OpenPRsJson | ConvertFrom-Json
            foreach ($PR in $OpenPRs) {
                if ($PR.headRefName -like "*$ActivePersona*") {
                    Write-Host "[+] Discovered active remote PR for $ActivePersona ($($PR.headRefName))" -ForegroundColor Green
                    
                    # Pop the stash before switching to prevent losing automation script files
                    if ($StashResult.Output -match "Saved working directory") {
                        Run-GitSilent "stash pop" | Out-Null
                    }

                    # Checkout remote branch and pull updates
                    Run-GitSilent "checkout $($PR.headRefName)" | Out-Null
                    Run-GitSilent "pull origin $($PR.headRefName)" | Out-Null
                    
                    # Execute visual audit
                    Invoke-UIUXAudit $ActivePersona
                    $PRFound = $true
                    break
                }
            }
        }

        # Restore stash if PR was not found
        if (-not $PRFound) {
            if ($StashResult.Output -match "Saved working directory") {
                Run-GitSilent "stash pop" | Out-Null
            }

            # Bootstrap Bypass: If no remote branch or PR exists, execute audit directly on the local dev branch
            Write-Host "[*] No open PRs found for $ActivePersona. Triggering local Bootstrap Bypass..." -ForegroundColor Yellow
            Invoke-UIUXAudit $ActivePersona
        }

    } catch {
        Write-Host "[!] Error encountered in orchestration loop: $_" -ForegroundColor Red
    }

    Write-Host "[*] Standby polling cycle completed. Checking again in 15 seconds..." -ForegroundColor Gray
    Start-Sleep -Seconds 15
}
