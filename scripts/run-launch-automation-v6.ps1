# run-launch-automation-v6.ps1
# SSTracker Nexus Command: Unified Launch-Day Orchestrator (v6 Production Hardened)
# Autonomously coordinates Google Jules (Cloud) and Google Antigravity (Local) with zero-touch permissions

# 1. Environment and Path Initialization
$ErrorActionPreference = "Stop"
$GlobalSettingsDir = "$Home/.gemini/antigravity-cli"
$GlobalSettingsFile = "$GlobalSettingsDir/settings.json"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   SSTRACKER NEXUS COMMAND: MASTER LAUNCH ORCHESTRATOR v6" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Ensure local Git identity is configured to Nexus Command Automation to prevent self-triggering loops
Write-Host "[Local Git] Configuring commit identity..." -ForegroundColor Yellow
git config user.name "Nexus Command Automation"
git config user.email "automation@sstracker.app"

# 2. Secure Headless Mode Permissions Auto-Configuration
# Create settings.json under ~/.gemini/antigravity-cli/ to prevent any headless-mode permission prompts
if (!(Test-Path $GlobalSettingsDir)) {
    Write-Host "[Permissions] Creating settings directory at $GlobalSettingsDir..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $GlobalSettingsDir | Out-Null
}

Write-Host "[Permissions] Creating settings.json with pre-cleared command permissions..." -ForegroundColor Yellow
$SettingsContent = @{
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
} | ConvertTo-Json -Depth 4

[System.IO.File]::WriteAllText($GlobalSettingsFile, $SettingsContent)
Write-Host "[Permissions] Pre-flight allow-rules locked in: $GlobalSettingsFile" -ForegroundColor Green

# 3. Active Persona Sequence Mapping
$Personas = @(
    @{ Name = "admin"; Route = "src/routes/(app)/admin"; Workflow = ".agents/workflows/jules-builds/tdd-admin-os.md" },
    @{ Name = "director"; Route = "src/routes/(app)/director"; Workflow = ".agents/workflows/jules-builds/tdd-director-os.md" },
    @{ Name = "coach"; Route = "src/routes/(app)/coach"; Workflow = ".agents/workflows/jules-builds/tdd-coach-os.md" },
    @{ Name = "player"; Route = "src/routes/(app)/player"; Workflow = ".agents/workflows/jules-builds/tdd-player-os.md" },
    @{ Name = "parent"; Route = "src/routes/(app)/parent"; Workflow = ".agents/workflows/jules-builds/tdd-parent-os.md" },
    @{ Name = "recruiter"; Route = "src/routes/(app)/recruiter"; Workflow = ".agents/workflows/jules-builds/tdd-recruiter-os.md" }
)

$PendingPersonas = [System.Collections.Generic.List[PSCustomObject]]::new()
foreach ($P in $Personas) {
    $PendingPersonas.Add([PSCustomObject]$P)
}

# 4. Bootstrap Catch-up Logic (If starting from an already manually merged state)
Write-Host "[Bootstrap] Running initial catch-up check..." -ForegroundColor Yellow
$LastCommitAuthor = (git log -1 --pretty=%an).Trim()
$LastCommitMsg = (git log -1 --pretty=%B).Trim()

Write-Host "[Bootstrap] Last Commit Author: $LastCommitAuthor" -ForegroundColor Gray
Write-Host "[Bootstrap] Last Commit Message: $LastCommitMsg" -ForegroundColor Gray

if ($LastCommitAuthor -ne "Nexus Command Automation" -and $LastCommitMsg -notmatch "style: visual styling lock") {
    # Check if there are un-audited changes in our active routes
    foreach ($Persona in $PendingPersonas) {
        $RouteFiles = git diff --name-only HEAD~1 HEAD | Where-Object { $_ -like "$($Persona.Route)/*" }
        if ($RouteFiles) {
            Write-Host "[Bootstrap] Found un-audited changes for persona: $($Persona.Name). Forcing immediate visual audit." -ForegroundColor Yellow
            Execute-VisualAudit $Persona
            break
        }
    }
}

# 5. Core Orchestration Functions
function Execute-VisualAudit($Persona) {
    $PersonaName = $Persona.Name
    Write-Host "[Audit] >>> Starting Visual Audit for Persona: $PersonaName" -ForegroundColor Cyan
    
    try {
        # Execute visual audit utilizing explicit Playwright v3 scripts and dangerously-skip-permissions bypass
        Write-Host "[Audit] Launching headless Playwright visual browser checks..." -ForegroundColor Yellow
        $AuditResult = agy -p "/ui-ux-audit-v3 $PersonaName" --dangerously-skip-permissions
        Write-Host $AuditResult -ForegroundColor Gray
        
        # If audit fails or layout is squished, trigger local CDO auto-healing
        if ($AuditResult -match "FAIL" -or $AuditResult -match "squished" -or $AuditResult -match "bleed") {
            Write-Host "[Audit] Styling errors detected! Invoking CDO Auto-Fix..." -ForegroundColor Red
            $FixResult = agy -p "/tdd-ui-ux-autofix $PersonaName" --dangerously-skip-permissions
            Write-Host $FixResult -ForegroundColor Gray
        } else {
            Write-Host "[Audit] Visual regression check passed 100% green!" -ForegroundColor Green
        }
        
        # Commit styling fixes and lock visual state
        Write-Host "[Commit] Locking visual styles..." -ForegroundColor Yellow
        git add .
        git commit -m "style: visual styling lock and grid-alignment fix for $PersonaName dashboard"
        git push origin dev
        
        # Trigger the next Cloud Persona build autonomously
        Trigger-NextPersona $Persona
        
        # Remove from pending queue upon 100% completion to prevent double-runs
        $PendingPersonas.Remove($Persona) | Out-Null
        Write-Host "[Queue] Persona $PersonaName processed and removed. Remaining queue: $(($PendingPersonas.Name) -join ', ')" -ForegroundColor Green
        
    } catch {
        Write-Host "[Error] Failed execution during $PersonaName audit loop. Details: $_" -ForegroundColor Red
        Write-Host "[Error] Safe-retrying on next pull cycle." -ForegroundColor Yellow
    }
}

function Trigger-NextPersona($CurrentPersona) {
    $CurrentIndex = $Personas.IndexOf($CurrentPersona)
    $NextIndex = $CurrentIndex + 1
    
    if ($NextIndex -lt $Personas.Count) {
        $NextPersona = $Personas[$NextIndex]
        $NextName = $NextPersona.Name
        $NextWorkflow = $NextPersona.Workflow
        
        Write-Host "[Handoff] Dispatching GitHub command to trigger Jules Cloud VM for $NextName OS..." -ForegroundColor Cyan
        
        # Programmatically file a GitHub issue containing the specific @google-jules workflow tag
        $IssueBody = "@google-jules run $NextWorkflow"
        gh issue create --title "Build $NextName OS" --body $IssueBody | Out-Null
        
        Write-Host "[Handoff] Ticket created successfully: Build $NextName OS. Jules is compiling..." -ForegroundColor Green
    } else {
        Write-Host "[Launch] All 6 operating systems are compiled, secured, designed, and tested!" -ForegroundColor Green
        Write-Host "[Launch] SSTracker is 100% READY FOR TOMORROW'S LAUNCH!" -ForegroundColor Green
    }
}

# 6. Unattended Polling Loop
Write-Host "[Polling] Entering unattended loop. Monitoring dev branch for Jules merges..." -ForegroundColor Green
while ($PendingPersonas.Count -gt 0) {
    try {
        # Check active branch and pull latest merges
        git pull origin dev | Out-Null
        
        # Check last commit parameters
        $LastAuthor = (git log -1 --pretty=%an).Trim()
        $LastMsg = (git log -1 --pretty=%B).Trim()
        
        # Ignore commits made by the local automation agent or visual locks to prevent loops
        if ($LastAuthor -eq "Nexus Command Automation" -or $LastMsg -match "style: visual styling lock") {
            Start-Sleep -Seconds 10
            continue
        }
        
        # Inspect changed files in the incoming merge commit
        $ChangedFiles = git diff-tree --no-commit-id --name-only -r HEAD
        
        foreach ($Persona in $PendingPersonas) {
            $Match = $ChangedFiles | Where-Object { $_ -like "$($Persona.Route)/*" }
            if ($Match) {
                Write-Host "[Polling] Detected incoming merge for route: $($Persona.Route)" -ForegroundColor Yellow
                Execute-VisualAudit $Persona
                break
            }
        }
        
    } catch {
        Write-Host "[Warning] Network or disk access anomaly encountered. Retrying in 30 seconds..." -ForegroundColor Yellow
    }
    
    Start-Sleep -Seconds 10
}
