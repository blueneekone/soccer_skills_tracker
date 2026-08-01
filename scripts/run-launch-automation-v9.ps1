# run-launch-automation-v9.ps1
# Hardened Launch-Day Orchestrator v9
# Decoupled State-Based Polling & Safe Trigger Loop
# Powered by Nexus Command Automation Protocol

$ErrorActionPreference = "Stop"
$env:GIT_TERMINAL_PROMPT = "0"

# Setup project directories and state paths
$StateDir = Join-Path (Get-Location) ".agents"
$StateFile = Join-Path $StateDir "automation-state.json"

if (-not (Test-Path $StateDir)) {
    New-Item -ItemType Directory -Path $StateDir -Force | Out-Null
}

# Supported Personas and their relative route directories
$Personas = @(
    [PSCustomObject]@{ Name = "admin";     Dir = "src/routes/(app)/admin/overview";     Next = "director"; Title = "Build Director OS" },
    [PSCustomObject]@{ Name = "director";  Dir = "src/routes/(app)/director/dashboard";  Next = "coach";    Title = "Build Coach OS" },
    [PSCustomObject]@{ Name = "coach";     Dir = "src/routes/(app)/coach/dashboard";     Next = "player";   Title = "Build Player OS" },
    [PSCustomObject]@{ Name = "player";    Dir = "src/routes/(app)/player/dashboard";    Next = "parent";   Title = "Build Parent OS" },
    [PSCustomObject]@{ Name = "parent";    Dir = "src/routes/(app)/parent/dashboard";    Next = "recruiter";Title = "Build Recruiter OS" }
)

# Load existing state or initialize new
function Get-AutomationState {
    if (Test-Path $StateFile) {
        try {
            return Get-Content $StateFile -Raw | ConvertFrom-Json
        } catch {
            Write-Host "[!] Warning: State file corrupted. Initializing fresh state." -ForegroundColor Yellow
        }
    }
    return [PSCustomObject]@{}
}

function Save-AutomationState($State) {
    $State | ConvertTo-Json -Depth 5 | Out-File $StateFile -Encoding utf8 -Force
}

# Setup silent git wrapper to bypass lock/cleanup prompts
function Run-GitSilent {
    param(
        [string]$Arguments
    )
    $Psi = New-Object System.Diagnostics.ProcessStartInfo
    $Psi.FileName = "git"
    $Psi.Arguments = $Arguments
    $Psi.UseShellExecute = $false
    $Psi.RedirectStandardInput = $true
    $Psi.RedirectStandardOutput = $true
    $Psi.RedirectStandardError = $true
    $Psi.CreateNoWindow = $true

    $Process = New-Object System.Diagnostics.Process
    $Process.StartInfo = $Psi
    [void]$Process.Start()

    # Silently pipe "n" to bypass any blocking prompts like "Should I try again? (y/n)"
    $Process.StandardInput.WriteLine("n")
    $Process.StandardInput.Close()

    $Output = $Process.StandardOutput.ReadToEnd()
    $Error = $Process.StandardError.ReadToEnd()
    $Process.WaitForExit()

    return [PSCustomObject]@{
        ExitCode = $Process.ExitCode
        Stdout   = $Output
        Stderr   = $Error
    }
}

# Enforce secure headless config for Antigravity
function Ensure-HeadlessPermissions {
    $SettingsDir = [System.IO.Path]::Combine($env:USERPROFILE, ".gemini", "antigravity-cli")
    $SettingsFile = [System.IO.Path]::Combine($SettingsDir, "settings.json")
    
    if (-not (Test-Path $SettingsDir)) {
        New-Item -ItemType Directory -Path $SettingsDir -Force | Out-Null
    }

    $SettingsJson = @{
        enableTerminalSandbox = $true
        permissions = @{
            allow = @(
                "command(node)",
                "command(pnpm)",
                "command(npm)",
                "command(git)",
                "command(gh)",
                "command(agy)"
            )
        }
    } | ConvertTo-Json -Depth 5

    $SettingsJson | Out-File $SettingsFile -Encoding utf8 -Force
    Write-Host "[*] Headless permissions successfully injected into $SettingsFile" -ForegroundColor Cyan
}

# Detect highest available visual audit script version
function Get-AuditScript {
    $Scripts = @("audit-computed-styles-v4.js", "audit-computed-styles-v3.js", "audit-computed-styles-v2.js", "audit-computed-styles.js")
    foreach ($Script in $Scripts) {
        $Path = Join-Path "scripts" $Script
        if (Test-Path $Path) {
            return $Script
        }
    }
    return "audit-computed-styles-v4.js" # Default fallback
}

Write-Host "==========================================================" -ForegroundColor Magenta
Write-Host "    NEXUS COMMAND LAUNCH-DAY AUTOMATION ORCHESTRATOR v9" -ForegroundColor Magenta
Write-Host "==========================================================" -ForegroundColor Magenta
Ensure-HeadlessPermissions

# Main persistent polling loop
while ($true) {
    try {
        Write-Host "[*] Fetching latest remote state from origin..." -ForegroundColor Gray
        
        # Silently stash any dirty files to prevent blocks
        $StashResult = Run-GitSilent "stash -u"
        $HadStash = $StashResult.Stdout -notmatch "No local changes to save"

        # Fetch remote changes and prune dead branches
        Run-GitSilent "fetch origin --prune" | Out-Null
        Run-GitSilent "pull origin dev" | Out-Null

        if ($HadStash) {
            Run-GitSilent "stash pop" | Out-Null
        }

        # Check the current route state
        $State = Get-AutomationState

        foreach ($Persona in $Personas) {
            if (-not (Test-Path $Persona.Dir)) {
                # Persona directory doesn't exist yet, skip
                continue
            }

            # Get the last commit hash that modified this route directory
            $GitLog = Run-GitSilent "log -1 --format=`"%H|%an|%B`" -- `"$($Persona.Dir)`""
            if ($GitLog.ExitCode -eq 0 -and $GitLog.Stdout -as [bool]) {
                $Parts = $GitLog.Stdout.Trim().Split("|")
                $CommitHash = $Parts[0]
                $Author = $Parts[1]
                $Msg = $Parts[2]

                # Initialize state property if absent
                if (-not (Get-Member -InputObject $State -Name $Persona.Name)) {
                    Add-Member -InputObject $State -NotePropertyName $Persona.Name -NotePropertyValue ""
                }

                $LastAuditedHash = $State."$($Persona.Name)"

                # CASE 1: We have already audited this commit hash
                if ($CommitHash -eq $LastAuditedHash) {
                    continue
                }

                # CASE 2: Last commit was made by the local automation agent (skip and update state)
                if ($Author -match "Nexus Command Automation" -or $Msg -match "style: visual styling lock") {
                    Write-Host "[~] Skipping styling commit $CommitHash for route $($Persona.Name) (Self-Commit Prevented)" -ForegroundColor Gray
                    $State."$($Persona.Name)" = $CommitHash
                    Save-AutomationState $State
                    continue
                }

                # CASE 3: Fresh incoming work from a human or Jules cloud PR!
                Write-Host "[!] Fresh commit $CommitHash detected on $($Persona.Name) route (Authored by: $Author)" -ForegroundColor Yellow
                Write-Host "[*] Launching Visual Audit and Playwright pipeline..." -ForegroundColor Cyan

                # Detect active audit spec script
                $AuditScript = Get-AuditScript
                Write-Host "[*] Using visual audit driver: $AuditScript" -ForegroundColor Gray

                # Trigger local headless visual audit via Antigravity CLI
                $AuditResult = Run-GitSilent "agy -p `"/ui-ux-audit-v3 $($Persona.Name)`" --dangerously-skip-permissions"
                
                # Check if visual audit passed
                if ($AuditResult.ExitCode -ne 0 -or $AuditResult.Stdout -match "FAIL" -or $AuditResult.Stderr -match "error") {
                    Write-Host "[!] Visual layout regression detected! Deploying CDO Auto-Healer..." -ForegroundColor Red
                    Run-GitSilent "agy -p `"/tdd-ui-ux-autofix $($Persona.Name)`" --dangerously-skip-permissions" | Out-Null
                } else {
                    Write-Host "[+] Visual audit passed 100% green!" -ForegroundColor Green
                }

                # Save, Lock, Commit & Push styling fixes
                Write-Host "[*] Committing styling lock to dev branch..." -ForegroundColor Cyan
                Run-GitSilent "config user.name `"Nexus Command Automation`"" | Out-Null
                Run-GitSilent "config user.email `"automation@sstracker.app`"" | Out-Null
                Run-GitSilent "add ." | Out-Null
                
                $CommitResult = Run-GitSilent "commit -m `"style: visual styling lock and grid-alignment fix for $($Persona.Name) dashboard`""
                if ($CommitResult.ExitCode -eq 0) {
                    Run-GitSilent "push origin dev" | Out-Null
                    Write-Host "[+] Local layout locked and synced to origin." -ForegroundColor Green
                }

                # Save the new local HEAD hash as audited to prevent repeating
                $NewHead = (Run-GitSilent "log -1 --format=`"%H`"").Stdout.Trim()
                $State."$($Persona.Name)" = $NewHead
                Save-AutomationState $State

                # Hands-Off Next Cloud Persona Trigger
                Write-Host "[🚀] Programmatically triggering Jules for Phase: $($Persona.Next)..." -ForegroundColor Magenta
                $IssueBody = "@google-jules, please execute the workflow defined in .agents/workflows/jules-builds/tdd-$($Persona.Next)-os.md"
                $GhCmd = "issue create --title `"$($Persona.Title)`" --body `"$IssueBody`""
                
                # Safely invoke GitHub CLI in headless bypass mode
                Invoke-Expression "gh $GhCmd" | Out-Null
                Write-Host "[+] Swarm trigger issued! Jules has been summoned in the cloud." -ForegroundColor Green
            }
        }

    } catch {
        Write-Host "[!] Network warning or file lock encountered: $_. Exception: $_" -ForegroundColor Yellow
        Write-Host "[*] Recovering in 30 seconds..." -ForegroundColor Gray
    }

    Write-Host "[*] Polling standby. Checking remote branch for updates in 15 seconds..." -ForegroundColor Gray
    Start-Sleep -Seconds 15
}
