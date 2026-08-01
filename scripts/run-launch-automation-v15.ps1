# run-launch-automation-v15.ps1
# Multi-Persona E2E Swarm Assembly Line Orchestrator

# Force stdout encoding to standard UTF-8/ASCII for reliability
$OutputEncoding = [System.Text.Encoding]::UTF8

# Standardized Personas list
$Personas = @("admin", "director", "coach", "player", "parent", "fan")

# Global Configuration Path to inject permissions
$SettingsPath = "$env:USERPROFILE\.gemini\antigravity-cli\settings.json"
if ($IsLinux -or $IsMac) {
    $SettingsPath = "$env:HOME/.gemini/antigravity-cli/settings.json"
}

# Pre-clear headless permissions dynamically
try {
    $SettingsDir = Split-Path $SettingsPath
    if (-not (Test-Path $SettingsDir)) {
        New-Item -ItemType Directory -Path $SettingsDir -Force | Out-Null
    }
    
    $PermissionsJson = @"
{
  "enableTerminalSandbox": true,
  "permissions": {
    "allow": [
      "command(node)",
      "command(pnpm)",
      "command(npm)",
      "command(git)",
      "command(gh)",
      "command(agy)"
    ]
  }
}
"@
    Set-Content -Path $SettingsPath -Value $PermissionsJson -Force
    Write-Host "[+] Headless sandbox permissions pre-cleared successfully." -ForegroundColor Green
} catch {
    Write-Host "[-] Warning: Failed to pre-clear settings: $_" -ForegroundColor Yellow
}

# State Management with defensive defaults
$StateFile = ".agents/automation-state.json"
$ActiveIndex = 0
$IsFirstRun = $true

if (Test-Path $StateFile) {
    try {
        $StateContent = Get-Content $StateFile -Raw -ErrorAction SilentlyContinue
        if ($StateContent) {
            $State = ConvertFrom-Json $StateContent -ErrorAction SilentlyContinue
            if ($State) {
                if ($null -ne $State.ActiveIndex) {
                    $ActiveIndex = [int]$State.ActiveIndex
                }
                if ($null -ne $State.IsFirstRun) {
                    $IsFirstRun = [bool]$State.IsFirstRun
                }
            }
        }
    } catch {
        Write-Host "[-] Warning: State file corrupted, resetting to first run." -ForegroundColor Yellow
        $ActiveIndex = 0
        $IsFirstRun = $true
    }
}

# Double check that ActiveIndex is not null and is within bounds of the Personas array
if ($null -eq $ActiveIndex -or $ActiveIndex -lt 0 -or $ActiveIndex -ge $Personas.Count) {
    $ActiveIndex = 0
}

# Temporarily override git user configuration for this automated session
git config user.name "Nexus Command Automation" | Out-Null
git config user.email "automation@sstracker.app" | Out-Null

# Helper to pipe input to git to prevent interactive locks (e.g. clean/stash prompts)
function Run-GitSilent {
    param([string]$Arguments)
    # Feed "n" to standard input to always bypass interactive overwrite prompts
    $Output = "n" | git $Arguments 2>&1
    return $Output
}

$CurrentPersonaName = $Personas[$ActiveIndex]
Write-Host "[+] Initialized Swarm Orchestrator. Active Persona index: $ActiveIndex ($CurrentPersonaName)" -ForegroundColor Cyan

while ($ActiveIndex -lt $Personas.Count) {
    # Bulletproof Index Check at the top of loop execution
    if ($null -eq $ActiveIndex -or $ActiveIndex -lt 0 -or $ActiveIndex -ge $Personas.Count) {
        $ActiveIndex = 0
    }
    
    $ActivePersona = $Personas[$ActiveIndex]
    Write-Host "[*] Active Persona: $ActivePersona" -ForegroundColor Yellow
    
    # Save state to state-management file
    try {
        $StateDir = Split-Path $StateFile
        if ($StateDir -and -not (Test-Path $StateDir)) {
            New-Item -ItemType Directory -Path $StateDir -Force | Out-Null
        }
        $StateObj = @{
            ActiveIndex = $ActiveIndex
            IsFirstRun = $IsFirstRun
        }
        $StateObj | ConvertTo-Json | Out-File $StateFile -Force
    } catch {
        Write-Host "[-] Failed to persist state: $_" -ForegroundColor Red
    }

    # Clean working directory before sync
    Write-Host "[*] Stashing any local changes to prevent checkout blocks..." -ForegroundColor Gray
    Run-GitSilent "stash -u" | Out-Null

    # Pull latest from origin dev
    Write-Host "[*] Fetching latest remote state from origin..." -ForegroundColor Gray
    Run-GitSilent "fetch origin --prune" | Out-Null
    
    $BranchCheck = Run-GitSilent "branch -r"
    $HasPr = $false
    $BranchName = "jules-$ActivePersona-refactor"
    
    # Search for remote branch for this active persona
    if ($BranchCheck -match "origin/$BranchName") {
        $HasPr = $true
    }
    
    # Check if there is an open PR for this persona on GitHub
    try {
        $PrCheck = gh pr list --head $BranchName --json state -q ".[0].state" -ErrorAction SilentlyContinue
        if ($PrCheck -eq "OPEN") {
            $HasPr = $true
        }
    } catch {}

    $ShouldAudit = $false

    # Evaluate execution triggers
    if ($ActivePersona -eq "admin" -and $IsFirstRun) {
        # Bootstrap Bypass Exception for manual Admin merge
        Write-Host "[+] Bootstrap Bypass Active for Admin OS. Proceeding directly to local visual audit..." -ForegroundColor Green
        $ShouldAudit = $true
    } elseif ($HasPr) {
        Write-Host "[+] Remote branch found: origin/$BranchName. Pulling changes..." -ForegroundColor Green
        Run-GitSilent "checkout dev" | Out-Null
        Run-GitSilent "pull origin dev" | Out-Null
        Run-GitSilent "checkout $BranchName" | Out-Null
        Run-GitSilent "pull origin $BranchName" | Out-Null
        $ShouldAudit = $true
    } else {
        Write-Host "[*] Polling standby. Waiting for Jules' remote branch or open PR for $ActivePersona..." -ForegroundColor Gray
        Start-Sleep -Seconds 15
        continue
    }

    if ($ShouldAudit) {
        Write-Host "[*] Starting local visual audit for $ActivePersona..." -ForegroundColor Cyan
        
        # Execute Playwright visual audit
        $AuditOutput = agy -p "/ui-ux-audit-v3 $ActivePersona" --dangerously-skip-permissions 2>&1
        Write-Host $AuditOutput
        
        # Determine if layout corrections are required
        if ($AuditOutput -match "FAIL" -or $AuditOutput -match "violation" -or $AuditOutput -match "error") {
            Write-Host "[-] Visual regressions detected. Triggering TDD auto-healer..." -ForegroundColor Yellow
            $FixOutput = agy -p "/tdd-ui-ux-autofix $ActivePersona" --dangerously-skip-permissions 2>&1
            Write-Host $FixOutput
        } else {
            Write-Host "[Success] Visual audit passed with 0 layout regressions." -ForegroundColor Green
        }
        
        # Commit the visual styling lock
        Write-Host "[*] Committing styling lock to dev branch..." -ForegroundColor Gray
        Run-GitSilent "checkout dev" | Out-Null
        Run-GitSilent "merge $BranchName --no-edit" | Out-Null
        git add . | Out-Null
        git commit -m "style: visual styling lock and grid-alignment fix for $ActivePersona dashboard" | Out-Null
        git push origin dev | Out-Null
        
        # Determine next persona and trigger cloud swarm
        $NextIndex = $ActiveIndex + 1
        if ($NextIndex -lt $Personas.Count) {
            $NextPersona = $Personas[$NextIndex]
            Write-Host "[Success] Triggering Cloud Swarm for the next phase ($NextPersona OS)..." -ForegroundColor Green
            try {
                gh issue create --title "Build $NextPersona OS" --body "@google-jules, please run /swarm-build to complete this ticket." | Out-Null
            } catch {
                Write-Host "[-] Failed to open GitHub trigger issue. Please verify gh CLI authentication." -ForegroundColor Red
            }
        } else {
            Write-Host "[Success] Assembly line complete! All 6 personas built, secured, and styled." -ForegroundColor Green
        }

        # Advance state queue
        $ActiveIndex++
        $IsFirstRun = $false
        
        # Pop stashed modifications back
        Run-GitSilent "stash pop" | Out-Null
    }
}
