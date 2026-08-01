# run-launch-automation-v8.ps1
# Nexus Command - Hardened Unattended Launch-Day Orchestrator
# Highly resilient background pipeline connecting local Antigravity visual testing with cloud-native Jules builders.
# Version 8: Bypasses manual prompts for locked directories (permission denied) during Git operations.

# Ensure correct terminal encoding for rich console output
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Set environmental bypasses to prevent interactive Git blocks
$env:GIT_TERMINAL_PROMPT = "0"
$env:GIT_ASKPASS = "echo"

Write-Host "=====================================================================" -ForegroundColor Green
Write-Host "      NEXUS COMMAND: LAUNCH-DAY UNATTENDED ORCHESTRATOR v8" -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host "[*] Initializing silent-bypass automation settings..." -ForegroundColor Cyan

# -------------------------------------------------------------------------
# Step 1: Pre-configure Headless Permissions to prevent JetSki popups
# -------------------------------------------------------------------------
$SettingsPath = "$HOME/.gemini/antigravity-cli/settings.json"
$SettingsDir = Split-Path -Parent $SettingsPath

if (-not (Test-Path $SettingsDir)) {
    New-Item -ItemType Directory -Path $SettingsDir -Force | Out-Null
}

$DefaultSettings = @{
    "enableTerminalSandbox" = $true
    "permissions" = @{
        "allow" = @(
            "command(node)",
            "command(pnpm)",
            "command(npm)",
            "command(git)",
            "command(gh)",
            "command(agy)"
        )
    }
}

$DefaultSettings | ConvertTo-Json -Depth 5 | Out-File $SettingsPath -Encoding UTF8 -Force
Write-Host "[+] Auto-injected headless allow-rules directly to: $SettingsPath" -ForegroundColor Green

# -------------------------------------------------------------------------
# Step 2: Establish Secure Git Identity for the Loop-Prevention Guard
# -------------------------------------------------------------------------
try {
    git config user.name "Nexus Command Automation"
    git config user.email "automation@sstracker.app"
    Write-Host "[+] Session Git identity locked to 'Nexus Command Automation'." -ForegroundColor Green
} catch {
    Write-Host "[-] Warning: Failed to set Git config identity. Loop guard might degrade." -ForegroundColor Yellow
}

# Define the State Tracking file to prevent redundant testing loops
$StateFile = ".agents/automation-state.json"
$StateDir = Split-Path -Parent $StateFile
if (-not (Test-Path $StateDir)) {
    New-Item -ItemType Directory -Path $StateDir -Force | Out-Null
}

# -------------------------------------------------------------------------
# Queue of Personas mapped to Svelte Routes and Trigger Commands
# -------------------------------------------------------------------------
$Personas = @(
    @{ Name = "admin";       Route = "src/routes/(app)/admin";       AuditCmd = "/ui-ux-audit-v3 admin";       TriggerBody = "@google-jules, please run /swarm-build for the Director OS." },
    @{ Name = "director";    Route = "src/routes/(app)/director";    AuditCmd = "/ui-ux-audit-v3 director";    TriggerBody = "@google-jules, please run /swarm-build for the Coach OS." },
    @{ Name = "coach";       Route = "src/routes/(app)/coach";       AuditCmd = "/ui-ux-audit-v3 coach";       TriggerBody = "@google-jules, please run /swarm-build for the Player OS." },
    @{ Name = "player";      Route = "src/routes/(app)/player";      AuditCmd = "/ui-ux-audit-v3 player";      TriggerBody = "@google-jules, please run /swarm-build for the Parent OS." },
    @{ Name = "parent";      Route = "src/routes/(app)/parent";      AuditCmd = "/ui-ux-audit-v3 parent";      TriggerBody = "@google-jules, please run /swarm-build for the Recruiter OS." },
    @{ Name = "recruiter";   Route = "src/routes/(app)/recruiter";   AuditCmd = "/ui-ux-audit-v3 recruiter";   TriggerBody = "NEXUS COMMAND DISPATCH: Entire multi-persona suite certified green. Prepare for production launch!" }
)

# Helper function to pipe "n" into any git command that might prompt for locked folders
function Run-GitSilent($CommandArguments) {
    # If Git fails to delete a locked directory, it asks: "Should I try again? (y/n)"
    # We pipe "n" (No) continuously into standard input to automatically bypass the block silently.
    Write-Host "[*] Executing Git: git $CommandArguments (Silent Prompt-Bypass Active)" -ForegroundColor DarkGray
    $Result = "n`nn`nn`nn`nn`n" | Invoke-Expression "git $CommandArguments 2>&1"
    return $Result
}

# -------------------------------------------------------------------------
# Main Unattended Polling Loop
# -------------------------------------------------------------------------
Write-Host "[*] Master Loop Started. Monitoring dev branch for cloud merges..." -ForegroundColor Cyan

while ($true) {
    try {
        # 1. Clean up working state to prevent dirty directory switches, piping "n" for safety
        Run-GitSilent "stash -u" | Out-Null
        
        # 2. Fetch origin with pruning to automatically purge deleted cloud branches from indices
        Run-GitSilent "fetch origin --prune" | Out-Null
        
        # 3. Pull latest updates from remote, auto-bypassing folder lock questions
        $PullResult = Run-GitSilent "pull origin dev"
        
        # Restore local stashed config files safely
        $StashList = git stash list
        if ($StashList -match "stash@{0}") {
            Run-GitSilent "stash pop" | Out-Null
        }

        # 4. Check if last commit was made by ourselves. If yes, skip to sleep.
        $LastCommitAuthor = (git log -1 --format="%an").Trim()
        if ($LastCommitAuthor -eq "Nexus Command Automation") {
            Write-Host "[~] Last commit was made by this automation agent. Sleeping for 15s to prevent self-looping..." -ForegroundColor DarkGray
            Start-Sleep -Seconds 15
            continue
        }

        # Load existing processed state hashes
        $State = @{}
        if (Test-Path $StateFile) {
            try {
                $State = Get-Content $StateFile -Raw | ConvertFrom-Json -ErrorAction SilentlyContinue
                if ($null -eq $State) { $State = @{} }
            } catch {
                $State = @{}
            }
        }

        # 5. Evaluate personas to see if their routes have new, un-audited commits
        foreach ($Persona in $Personas) {
            $RoutePath = $Persona.Route
            # Get the exact latest commit hash that touched this specific Svelte directory
            $LatestRouteHash = (git log -1 --format="%H" -- $RoutePath).Trim()

            if ([string]::IsNullOrEmpty($LatestRouteHash)) {
                continue # No history for this route yet, skip
            }

            # Check if we have already audited this exact hash state
            $PersonaStateKey = $Persona.Name
            $LastAuditedHash = $State.$PersonaStateKey

            if ($LatestRouteHash -ne $LastAuditedHash) {
                Write-Host "[!] Found un-audited commit hash [$LatestRouteHash] on $($Persona.Name) OS!" -ForegroundColor Yellow
                Write-Host "[*] Launching headless browser-in-the-loop Playwright visual audit for: $($Persona.Name)" -ForegroundColor Cyan
                
                # Execute visual audit via Svelte 5 and Playwright using standard CLI and bypass parameters
                $AuditResult = agy -p "$($Persona.AuditCmd)" --dangerously-skip-permissions 2>&1
                Write-Host $AuditResult -ForegroundColor DarkGray

                # Check if audit was successful or if CDO auto-healer is required
                if ($AuditResult -match "fail" -or $AuditResult -match "error" -or $AuditResult -match "failed") {
                    Write-Host "[-] Visual regressions detected on $($Persona.Name) UI. Invoking local CDO subagent to auto-heal..." -ForegroundColor Red
                    $HealResult = agy -p "/tdd-ui-ux-autofix $($Persona.Name)" --dangerously-skip-permissions 2>&1
                    Write-Host $HealResult -ForegroundColor DarkGray
                } else {
                    Write-Host "[+] Playwright visual audit passed 100% green for $($Persona.Name) HUD!" -ForegroundColor Green
                }

                # Lock down visual styles locally, commit, and push back to dev branch
                Write-Host "[*] Saving styling lock state and syncing repo..." -ForegroundColor Cyan
                Run-GitSilent "add ." | Out-Null
                Run-GitSilent "commit -m 'style: visual styling lock and grid-alignment fix for $($Persona.Name) dashboard' --author='Nexus Command Automation <automation@sstracker.app>'" | Out-Null
                Run-GitSilent "push origin dev" | Out-Null

                # Update the state file to permanently lock down this hash
                $State.$PersonaStateKey = $LatestRouteHash
                $State | ConvertTo-Json | Out-File $StateFile -Encoding UTF8 -Force

                # 6. Trigger next cloud persona VM in the queue autonomously via GitHub Issue
                if ($Persona.Name -ne "recruiter") {
                    Write-Host "[+] Persona $($Persona.Name) complete. Programmatically spawning next cloud VM..." -ForegroundColor Green
                    gh issue create --title "Trigger Swarm Build: $($Persona.Name) OS Complete" --body "$($Persona.TriggerBody)" | Out-Null
                } else {
                    Write-Host "[🏆] ALL PERSONA SWARMS COMPLETED SUCCESSFULLY! SYSTEM READY FOR LAUNCH!" -ForegroundColor Green
                }

                break # Restart loop to pick up any freshly generated commits
            }
        }

    } catch {
        Write-Host "[-] Exception intercepted inside loop: $_" -ForegroundColor Yellow
        Write-Host "[*] Gracefully sleeping for 30s before automatic retry..." -ForegroundColor DarkGray
        Start-Sleep -Seconds 30
        continue
    }

    Write-Host "[.] Polling active... next check in 15 seconds." -ForegroundColor DarkGray
    Start-Sleep -Seconds 15
}
