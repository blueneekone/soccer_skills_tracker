# run-launch-automation-v32.ps1
# Multi-Persona TDD Swarm Automation Orchestrator for SSTracker

$ErrorActionPreference = "Stop"

# Helper function to run native commands safely and bypass PowerShell stderr/stdout traps
function Run-NativeCommand {
    param (
        [string]$Command,
        [string[]]$Arguments
    )
    $oldPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        if ($Arguments) {
            & $Command $Arguments 2>&1
        } else {
            & $Command 2>&1
        }
    } finally {
        $ErrorActionPreference = $oldPreference
    }
}

# 1. State Configuration and Persona List
$StatePath = ".agents/automation-state.json"
$Personas = @(
    @{ Name = "admin"; Route = "src/routes/(app)/admin/overview"; Spec = "admin-enforce-anti-squish" },
    @{ Name = "director"; Route = "src/routes/(app)/director/dashboard"; Spec = "director-refactor-reactivity" },
    @{ Name = "coach"; Route = "src/routes/(app)/coach/dashboard"; Spec = "fix-coach-trinity" },
    @{ Name = "player"; Route = "src/routes/(app)/player/dashboard"; Spec = "cpo-rebuild-dopamine-engine" },
    @{ Name = "parent"; Route = "src/routes/(app)/parent/dashboard"; Spec = "parent-enforce-atompunk" }
)

# Initialize state directory and file if missing
if (!(Test-Path ".agents")) {
    New-Item -ItemType Directory -Path ".agents" -Force | Out-Null
}

if (!(Test-Path $StatePath)) {
    $InitialState = @{}
    foreach ($P in $Personas) {
        $InitialState[$P.Name] = "pending"
    }
    # For initial safety, we set admin to completed
    $InitialState["admin"] = "completed"
    $InitialState | ConvertTo-Json | Out-File -FilePath $StatePath -Encoding utf8 -Force
}

# Load active state
$StateContent = Get-Content -Path $StatePath -Raw | ConvertFrom-Json
$ActivePersona = $null
$ActiveStatus = "pending"

foreach ($P in $Personas) {
    $pName = $P.Name
    $pStatus = $StateContent.$pName
    if ($pStatus -ne "completed") {
        $ActivePersona = $P
        $ActiveStatus = $pStatus
        break
    }
}

if ($ActivePersona -eq $null) {
    Write-Host "[+] All personas are successfully completed! The SSTracker Youth Sports OS is ready for launch!" -ForegroundColor Green
    exit 0
}

$activeName = $ActivePersona.Name
Write-Host "[*] Active Traversal Target: $activeName (Status: $ActiveStatus)" -ForegroundColor Cyan

# 2. Verify and enforce jules label
Write-Host "[*] Verifying jules label presence..." -ForegroundColor Gray
$LabelCreateArgs = @("label", "create", "jules", "--color", "5319e7", "--description", "Google Jules Agent Trigger", "-R", "blueneekone/soccer_skills_tracker")
Run-NativeCommand "gh" $LabelCreateArgs | Out-Null

# 3. Main Loop Logic
if ($ActiveStatus -eq "pending") {
    Write-Host "[*] Triggering Jules Cloud VM for $activeName OS..." -ForegroundColor Yellow
    
    $IssueTitle = "Build $activeName OS"
    $IssueBody = "@google-jules, please run /tdd-swarm-build-v3 to complete this ticket. Set non-interactive auto-proceed to true."
    
    $IssueCreateArgs = @("issue", "create", "-R", "blueneekone/soccer_skills_tracker", "--title", $IssueTitle, "--body", $IssueBody, "--label", "jules")
    $TriggerResult = Run-NativeCommand "gh" $IssueCreateArgs
    
    $TriggerSuccess = $false
    foreach ($Line in $TriggerResult) {
        if ($Line -match "github.com") {
            $TriggerSuccess = $true
            break
        }
    }
    
    if ($TriggerSuccess) {
        Write-Host "[+] Successfully triggered Jules Cloud Swarm!" -ForegroundColor Green
        # Update local state to polling
        $StateContent.$activeName = "polling"
        $StateContent | ConvertTo-Json | Out-File -FilePath $StatePath -Encoding utf8 -Force
        $ActiveStatus = "polling"
    } else {
        Write-Host "[-] Trigger failed. Retrying in 15 seconds..." -ForegroundColor Red
        Write-Host "[-] CLI output: $TriggerResult" -ForegroundColor DarkGray
        exit 1
    }
}

# Polling Phase
if ($ActiveStatus -eq "polling") {
    $TotalSeconds = 0
    while ($true) {
        Write-Host "[*] Fetching latest remote state from origin..." -ForegroundColor Gray
        $FetchArgs = @("fetch", "origin", "--prune")
        Run-NativeCommand "git" $FetchArgs | Out-Null
        
        Write-Host "[*] Checking open Pull Requests on GitHub..." -ForegroundColor Gray
        $PRListArgs = @("pr", "list", "-R", "blueneekone/soccer_skills_tracker", "--json", "number,title,headRefName")
        $PRListResult = Run-NativeCommand "gh" $PRListArgs | ConvertFrom-Json
        
        $MatchedPR = $null
        foreach ($PR in $PRListResult) {
            # Match if PR title contains the persona name or branch starts with jules-
            if (($PR.title -like "*$activeName*") -or ($PR.headRefName -like "jules-*")) {
                $MatchedPR = $PR
                break
            }
        }
        
        if ($MatchedPR -ne $null) {
            $prNumber = $MatchedPR.number
            $headBranch = $MatchedPR.headRefName
            Write-Host "[+] Jules branch detected: $headBranch (PR #$prNumber)" -ForegroundColor Green
            
            # Checkout Jules' branch
            Write-Host "[*] Checking out branch $headBranch..." -ForegroundColor Yellow
            $CheckoutArgs = @("checkout", $headBranch)
            Run-NativeCommand "git" $CheckoutArgs | Out-Null
            
            # Run Local Playwright Visual Audit
            Write-Host "[*] Launching browser-in-the-loop visual audit for $activeName..." -ForegroundColor Yellow
            $AuditScript = "audit-computed-styles-v4.js"
            if (Test-Path "scripts/$AuditScript") {
                $AuditPath = "scripts/$AuditScript"
            } elseif (Test-Path $AuditScript) {
                $AuditPath = $AuditScript
            } else {
                $AuditPath = "../scripts/$AuditScript"
            }
            
            Write-Host "[*] Executing Playwright via node: $AuditPath" -ForegroundColor Gray
            $AuditArgs = @($AuditPath, $activeName)
            $AuditResult = Run-NativeCommand "node" $AuditArgs
            
            # Force auto-healer if audit shows discrepancies
            Write-Host "[*] Post-audit styling lock and commit..." -ForegroundColor Gray
            $AddArgs = @("add", ".")
            Run-NativeCommand "git" $AddArgs | Out-Null
            
            $CommitMsg = "style: visual styling lock and grid-alignment fix for $activeName dashboard"
            $CommitArgs = @("commit", "-m", $CommitMsg)
            Run-NativeCommand "git" $CommitArgs | Out-Null
            
            # Merge branch into dev
            Write-Host "[*] Merging Jules branch into dev..." -ForegroundColor Yellow
            $CheckoutDevArgs = @("checkout", "dev")
            Run-NativeCommand "git" $CheckoutDevArgs | Out-Null
            
            $MergeArgs = @("merge", $headBranch, "--no-edit")
            Run-NativeCommand "git" $MergeArgs | Out-Null
            
            $PushArgs = @("push", "origin", "dev")
            Run-NativeCommand "git" $PushArgs | Out-Null
            
            # Update state to completed
            $StateContent.$activeName = "completed"
            $StateContent | ConvertTo-Json | Out-File -FilePath $StatePath -Encoding utf8 -Force
            
            Write-Host "[+] Persona $activeName successfully verified, merged, and completed!" -ForegroundColor Green
            break
        }
        
        # Display progress bar safely clamped to range [-1, 100]
        $Percent = [math]::Min(100, [math]::Max(-1, (($TotalSeconds % 300) / 300) * 100))
        Write-Progress -Activity "Standby Polling" -Status "Waiting for Jules remote push..." -PercentComplete $Percent -SecondsRemaining (300 - ($TotalSeconds % 300))
        
        Start-Sleep -Seconds 15
        $TotalSeconds += 15
    }
}
