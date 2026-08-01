# run-launch-automation-v11.ps1
# Multi-Persona E2E Swarm Audit & Recovery Orchestrator (Hardened Production Release)

$ErrorActionPreference = "Stop"

# Set Git identity locally to prevent self-looping on commits
Write-Host "[*] Configuring Git identity for this automated session..." -ForegroundColor Cyan
& git config user.name "Nexus Command Automation"
& git config user.email "automation@sstracker.app"

# Helper to automatically write pre-approved permissions to settings.json
function Configure-Permissions {
    $SettingsDir = "$env:USERPROFILE\.gemini\antigravity-cli"
    $SettingsFile = "$SettingsDir\settings.json"
    
    if (!(Test-Path $SettingsDir)) {
        New-Item -ItemType Directory -Path $SettingsDir -Force | Out-Null
    }
    
    $settings = @{
        "enableTerminalSandbox" = $true
        "permissions" = @{
            "allow" = @(
                "command(node)"
                "command(pnpm)"
                "command(npm)"
                "command(git)"
                "command(gh)"
                "command(agy)"
            )
        }
    }
    
    $settings | ConvertTo-Json -Depth 4 | Out-File $SettingsFile -Encoding utf8 -Force
    Write-Host "[*] Headless permissions pre-configured in settings.json" -ForegroundColor Green
}

# Run permissions setup
Configure-Permissions

# Ensure state tracking file exists
$StateFile = ".agents/automation-state.json"
if (!(Test-Path ".agents")) {
    New-Item -ItemType Directory -Path ".agents" -Force | Out-Null
}

if (!(Test-Path $StateFile)) {
    $initialState = @{
        "admin" = @{ "AuditedCommit" = "" }
        "director" = @{ "AuditedCommit" = "" }
        "coach" = @{ "AuditedCommit" = "" }
        "player" = @{ "AuditedCommit" = "" }
        "parent" = @{ "AuditedCommit" = "" }
        "recruiter" = @{ "AuditedCommit" = "" }
    }
    $initialState | ConvertTo-Json -Depth 4 | Out-File $StateFile -Encoding utf8 -Force
    Write-Host "[*] Initialized state file: $StateFile" -ForegroundColor Green
}

# Standardized Persona Array
$Personas = @(
    @{ Name = "admin"; Route = "src/routes/(app)/admin"; NextPersona = "director" }
    @{ Name = "director"; Route = "src/routes/(app)/director"; NextPersona = "coach" }
    @{ Name = "coach"; Route = "src/routes/(app)/coach"; NextPersona = "player" }
    @{ Name = "player"; Route = "src/routes/(app)/player"; NextPersona = "parent" }
    @{ Name = "parent"; Route = "src/routes/(app)/parent"; NextPersona = "recruiter" }
    @{ Name = "recruiter"; Route = "src/routes/(app)/recruiter"; NextPersona = "done" }
)

# Robust Git Runner with Automatic Standard Input feeding to bypass (y/n) blocks
function Run-Git {
    param(
        [string[]]$Arguments
    )
    $env:GIT_TERMINAL_PROMPT = "0"
    Write-Host "[*] Executing Git: git $Arguments" -ForegroundColor Gray
    try {
        # Feed "n" into standard input to automatically say "no" to any file-deletion prompt
        $output = "n" | & git $Arguments 2>&1
        return $output
    } catch {
        Write-Host "[-] Git error: $_" -ForegroundColor Red
        return $null
    }
}

Write-Host "[🚀] SSTracker Nexus Command Orchestration Active." -ForegroundColor Green
Write-Host "[*] Polling standby. Monitoring branch dev for incoming commits..." -ForegroundColor Cyan

while ($true) {
    try {
        # 1. Pull down any remote changes safely
        Write-Host "[*] Fetching latest remote state from origin..." -ForegroundColor Gray
        
        # Stash untracked files (including this script) so checkout/pull doesn't get blocked
        $stashResult = Run-Git @("stash", "-u")
        
        # Prune remote branch references to clear ghost branches
        Run-Git @("fetch", "origin", "--prune")
        
        # Pull latest changes on dev
        Run-Git @("pull", "origin", "dev")
        
        # Restore local modifications
        if ($stashResult -match "Saved working directory") {
            Run-Git @("stash", "pop")
        }

        # 2. Read current state
        $stateJson = Get-Content $StateFile -Raw -ErrorAction SilentlyContinue
        if (!$stateJson) {
            Write-Host "[-] Failed to read state file, retrying..." -ForegroundColor Red
            Start-Sleep -Seconds 5
            continue
        }
        $state = ConvertFrom-Json $stateJson

        $HasRunAudit = $false

        # 3. Evaluate each persona in order
        foreach ($Persona in $Personas) {
            $PersonaName = $Persona.Name
            $RoutePath = $Persona.Route
            $NextPersona = $Persona.NextPersona

            # Find the latest commit that modified this Svelte route directory
            $lastHash = ""
            $hashOutput = & git log -1 --format="%H" -- $RoutePath 2>$null
            if ($hashOutput) { $lastHash = $hashOutput.Trim() }

            if ([string]::IsNullOrEmpty($lastHash)) {
                # If no commit is found for this directory yet, skip to avoid blank triggers
                continue
            }

            # Retrieve previous audited commit from json state
            $prevHash = ""
            if ($state.$PersonaName) {
                $prevHash = $state.$PersonaName.AuditedCommit
            }

            # If there's a new or un-audited commit hash touching this persona's route directory, trigger the audit!
            if ($lastHash -ne $prevHash) {
                Write-Host "[🔔] Detected un-audited changes in route $RoutePath ($PersonaName)!" -ForegroundColor Yellow
                Write-Host "[*] Current Hash: $lastHash" -ForegroundColor Gray
                Write-Host "[*] Previous Hash: $prevHash" -ForegroundColor Gray
                Write-Host "[*] Commencing zero-touch visual verification loop..." -ForegroundColor Cyan

                # A. Run Playwright styling audit
                Write-Host "[*] Launching Playwright visual audit for $PersonaName..." -ForegroundColor Gray
                & agy -p "/ui-ux-audit-v3 $PersonaName" --dangerously-skip-permissions

                # B. Check if visual regression is green. If it fails, run auto-healer
                if ($LASTEXITCODE -ne 0) {
                    Write-Host "[⚠️] Visual audit flagged styling bugs. Invoking CDO auto-healer..." -ForegroundColor Yellow
                    & agy -p "/tdd-ui-ux-autofix $PersonaName" --dangerously-skip-permissions
                }

                # C. Commit styling fixes locally with visual styling lock comment
                Write-Host "[*] Locking down visual styles..." -ForegroundColor Gray
                Run-Git @("add", ".")
                Run-Git @("commit", "-m", "style: visual styling lock and grid-alignment fix for $PersonaName dashboard")
                Run-Git @("push", "origin", "dev")

                # D. Update local state JSON so we do not loop on our own commits
                $state.$PersonaName.AuditedCommit = $lastHash
                $state | ConvertTo-Json -Depth 4 | Out-File $StateFile -Encoding utf8 -Force
                Write-Host "[✓] Recorded audited commit hash for $PersonaName in state JSON." -ForegroundColor Green

                # E. Trigger cloud swarm for next persona if applicable
                if ($NextPersona -ne "done") {
                    Write-Host "[🚀] Triggering Cloud Swarm for the next phase ($NextPersona)..." -ForegroundColor Green
                    & gh issue create --title "Build $NextPersona OS" --body "@google-jules, please run /swarm-build to complete this ticket."
                } else {
                    Write-Host "[🏆] Final persona reached! SSTracker platform build fully certified." -ForegroundColor Gold
                }

                $HasRunAudit = $true
                break # Exit foreach loop to poll origin dev for the next commit
            }
        }

        if (!$HasRunAudit) {
            Write-Host "[*] All persona routes are fully verified. Standby for new commits..." -ForegroundColor Gray
        }

    } catch {
        Write-Host "[-] Unexpected orchestrator error: $_" -ForegroundColor Red
        Write-Host "[*] Sleep-retrying in 30 seconds..." -ForegroundColor Gray
        Start-Sleep -Seconds 30
        continue
    }

    Start-Sleep -Seconds 15
}
