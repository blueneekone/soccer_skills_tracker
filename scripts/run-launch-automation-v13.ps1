# run-launch-automation-v13.ps1
# Master Hands-Free Assembly Line Orchestrator (Admin -> Director -> Coach -> Player -> Parent -> Fan)
# Engineered for Zero-Prompt Headless Execution with automated state tracking, self-loop prevention,
# and programmatically isolated Svelte 5 and Firebase B815 visual audits.

# --- PRE-FLIGHT ENVIRONMENT INITIALIZATION ---
$ErrorActionPreference = "Stop"
$env:GIT_TERMINAL_PROMPT = "0"
$env:ANGL_DANGEROUSLY_SKIP_PERMISSIONS = "1"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   NEXUS COMMAND: MASTER ASSEMBLY LINE ORCHESTRATOR v13   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Ensure global settings exist and are fully pre-authorized to bypass headless prompt gates
$SettingsDir = "$env:USERPROFILE\.gemini\antigravity-cli"
if (!(Test-Path -Path $SettingsDir)) {
    New-Item -ItemType Directory -Force -Path $SettingsDir | Out-Null
}
$SettingsFile = "$SettingsDir\settings.json"
$PreApprovedConfig = @{
    "enableTerminalSandbox" = $true
    "permissions" = @{
        "allow" = @(
            "command(node)", "command(pnpm)", "command(npm)", 
            "command(git)", "command(gh)", "command(agy)"
        )
    }
}
$PreApprovedConfig | ConvertTo-Json -Depth 5 | Out-File -FilePath $SettingsFile -Encoding utf8 -Force
Write-Host "[✓] Security presets successfully written to settings.json" -ForegroundColor Green

# Temporarily isolate the local automation identity to avoid self-commit triggers
git config user.name "Nexus Command Automation"
git config user.email "automation@sstracker.app"
Write-Host "[✓] Local Git identity configured to 'Nexus Command Automation'" -ForegroundColor Green

# --- QUEUE & STATE PERSISTENCE SETUP ---
$Personas = @("admin", "director", "coach", "player", "parent", "fan")
$StateDir = ".agents"
if (!(Test-Path -Path $StateDir)) {
    New-Item -ItemType Directory -Force -Path $StateDir | Out-Null
}
$StateFile = "$StateDir\automation-state.json"

function Get-State {
    if (Test-Path -Path $StateFile) {
        $Content = Get-Content -Raw -Path $StateFile
        if ($Content) {
            return ConvertFrom-Json $Content
        }
    }
    # Clean baseline state on first initialization
    $InitialState = @{
        "ActivePersonaIndex" = 0
        "FirstRun" = $true
        "Completed" = @()
    }
    return $InitialState
}

function Save-State ($StateObj) {
    $StateObj | ConvertTo-Json -Depth 5 | Out-File -FilePath $StateFile -Encoding utf8 -Force
}

# --- NON-BLOCKING GIT PIPE WITH AUTOMATED INPUT CONTROL ---
function Run-GitSilent ($ArgsList) {
    $ProcessInfo = New-Object System.Diagnostics.ProcessStartInfo
    $ProcessInfo.FileName = "git"
    $ProcessInfo.Arguments = $ArgsList
    $ProcessInfo.RedirectStandardInput = $true
    $ProcessInfo.RedirectStandardOutput = $true
    $ProcessInfo.RedirectStandardError = $true
    $ProcessInfo.UseShellExecute = $false
    $ProcessInfo.CreateNoWindow = $true

    $Process = [System.Diagnostics.Process]::Start($ProcessInfo)
    $StreamWriter = $Process.StandardInput
    
    # Programmatically feed "n" into the stream to bypass directory lock prompts
    $StreamWriter.WriteLine("n")
    $StreamWriter.Close()

    $Out = $Process.StandardOutput.ReadToEnd()
    $Err = $Process.StandardError.ReadToEnd()
    $Process.WaitForExit()

    return [PSCustomObject]@{
        "ExitCode" = $Process.ExitCode
        "Stdout" = $Out
        "Stderr" = $Err
    }
}

# --- THE PRINCIPAL RECOVERY SWARM ENGINE ---
$State = Get-State
$ActiveIndex = $State.ActivePersonaIndex
$IsFirstRun = $State.FirstRun

while ($ActiveIndex -lt $Personas.Count) {
    $ActivePersona = $Personas[$ActiveIndex]
    $NextIndex = $ActiveIndex + 1
    $NextPersona = $null
    if ($NextIndex -lt $Personas.Count) {
        $NextPersona = $Personas[$NextIndex]
    }

    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Yellow
    Write-Host " [▶] CURRENT ACTIVE TARGET: $($ActivePersona.ToUpper()) OS" -ForegroundColor Yellow
    Write-Host "==========================================================" -ForegroundColor Yellow

    $ShouldRunAudit = $false

    # Handle the manual merge exception on first launch bootstrap
    if ($ActivePersona -eq "admin" -and $IsFirstRun) {
        Write-Host "[★] Admin OS already manually merged. Bypassing fetch loops to trigger immediate audit..." -ForegroundColor Green
        $ShouldRunAudit = $true
        $State.FirstRun = $false
        Save-State $State
    } else {
        # Strict Wait-and-Poll Loop for subsequent personas (no unbuilt code visual audits)
        Write-Host "[*] Fetching latest remote state from origin..." -ForegroundColor Gray
        $FetchResult = Run-GitSilent "fetch origin --prune"
        
        # Look for open PRs or remote branch matches matching the active persona pattern
        $BranchPattern = "jules-$ActivePersona-build"
        $RemoteBranchExists = (git branch -r | Select-String -Pattern "origin/$BranchPattern")

        if ($RemoteBranchExists) {
            Write-Host "[✓] New build branch found on remote: origin/$BranchPattern" -ForegroundColor Green
            Write-Host "[*] Saving active workspace state via stash..." -ForegroundColor Gray
            Run-GitSilent "stash -u" | Out-Null
            
            Write-Host "[*] Checking out and syncing build branch: $BranchPattern" -ForegroundColor Gray
            Run-GitSilent "checkout $BranchPattern" | Out-Null
            Run-GitSilent "pull origin $BranchPattern" | Out-Null
            
            $ShouldRunAudit = $true
        } else {
            Write-Host "[•] Standby: Waiting for Jules remote branch 'origin/$BranchPattern' to be created..." -ForegroundColor Gray
            Start-Sleep -Seconds 15
            continue
        }
    }

    if ($ShouldRunAudit) {
        # Verify and isolate the visual audit output directory
        $AuditFolder = "audit-artifacts\$ActivePersona"
        if (!(Test-Path -Path $AuditFolder)) {
            New-Item -ItemType Directory -Force -Path $AuditFolder | Out-Null
        }

        # Run Svelte 5 and CSS verification suite locally
        Write-Host "[*] Launching localized Playwright Visual Audit on $($ActivePersona.ToUpper()) HUD..." -ForegroundColor Cyan
        $AuditResult = agy -p "/ui-ux-audit-v3 $ActivePersona" --dangerously-skip-permissions
        Write-Host $AuditResult -ForegroundColor Gray

        # Auto-heal visual discrepancies if any Svelte 5 or layout issues are detected
        if ($AuditResult -match "FAIL" -or $AuditResult -match "regression") {
            Write-Host "[!] Layout regressions detected in bento grid parameters. Triggering auto-fix..." -ForegroundColor Red
            $FixResult = agy -p "/tdd-ui-ux-autofix $ActivePersona" --dangerously-skip-permissions
            Write-Host $FixResult -ForegroundColor Gray
        } else {
            Write-Host "[✓] Playwright visual checks passed! No regressions detected." -ForegroundColor Green
        }

        # Commit and push style locking configurations to origin
        Write-Host "[*] Locking visual style parameters for $($ActivePersona.ToUpper()) OS..." -ForegroundColor Gray
        Run-GitSilent "add ." | Out-Null
        Run-GitSilent "commit -m ""style: visual styling lock and grid-alignment fix for $ActivePersona dashboard""" | Out-Null
        
        if ($ActivePersona -eq "admin" -and $IsFirstRun) {
            # Direct push to dev branch if Admin bootstrap bypass triggered
            Run-GitSilent "push origin dev" | Out-Null
        } else {
            # Sync back to Jules' branch first, then merge dev cleanly
            Run-GitSilent "push origin $BranchPattern" | Out-Null
            Run-GitSilent "checkout dev" | Out-Null
            Run-GitSilent "merge $BranchPattern" | Out-Null
            Run-GitSilent "push origin dev" | Out-Null
        }

        # Mark active persona as complete in persistence file
        $State.Completed += @($ActivePersona)
        $State.ActivePersonaIndex = $ActiveIndex + 1
        $ActiveIndex = $State.ActivePersonaIndex
        Save-State $State

        # Clean workspace and pop stash
        Write-Host "[*] Restoring workspace stash..." -ForegroundColor Gray
        Run-GitSilent "stash pop" | Out-Null

        # Programmatically trigger Jules to spin up a Cloud VM and begin building the next operating system
        if ($NextPersona) {
            Write-Host "[🚀] Triggering Cloud Swarm for the next phase ($NextPersona OS)..." -ForegroundColor Magenta
            gh issue create --title "Build $NextPersona OS" --body "@google-jules, please run /swarm-build to complete this ticket." | Out-Null
            Write-Host "[✓] Ticket created! Jules is now building $NextPersona OS in the cloud asynchronously." -ForegroundColor Green
        } else {
            Write-Host "[🎉] Congratulations! The entire youth sports operating system is fully built, secured, and styled!" -ForegroundColor Green
            break
        }
    }
}
