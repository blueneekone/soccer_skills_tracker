# SSTracker Unified Launch Orchestrator (v37)
# Enforces sequential platform traversal: admin -> director -> coach -> player -> parent
# Integrates with audit-computed-styles-v5.js and resolves the self-commit looping trap.

$ErrorActionPreference = "Stop"

# Establish target personas
$Personas = @(
    @{ Name = "admin"; Target = "admin"; IssueTitle = "Build admin OS"; Description = "Please run /tdd-swarm-build-v3 to implement admin OS dashboard HUD elements." },
    @{ Name = "director"; Target = "director"; IssueTitle = "Build director OS"; Description = "Please run /tdd-swarm-build-v3 to implement director OS analytics and B2B Billing." },
    @{ Name = "coach"; Target = "coach"; IssueTitle = "Build coach OS"; Description = "Please run /tdd-swarm-build-v3 to implement coach OS spatial drill designer." },
    @{ Name = "player"; Target = "player"; IssueTitle = "Build player OS"; Description = "Please run /tdd-swarm-build-v3 to implement player OS gamified dashboard HUD." },
    @{ Name = "parent"; Target = "parent"; IssueTitle = "Build parent OS"; Description = "Please run /tdd-swarm-build-v3 to implement parent OS compliance vault." }
)

# Shared Local paths
$StateDir = ".agents"
$StateFile = "$StateDir/automation-state.json"
$Repo = "blueneekone/soccer_skills_tracker"

# Helper function to load state
function Get-AutomationState {
    if (Test-Path $StateFile) {
        $Content = Get-Content -Raw -Path $StateFile
        return ConvertFrom-Json $Content
    }
    # Default initial state
    $DefaultState = @{
        admin = "completed"
        director = "completed"
        coach = "pending"
        player = "pending"
        parent = "pending"
    }
    if (!(Test-Path $StateDir)) {
        New-Item -ItemType Directory -Path $StateDir -Force | Out-Null
    }
    $DefaultState | ConvertTo-Json | Out-File -FilePath $StateFile -Encoding utf8
    return ConvertFrom-Json (Get-Content -Raw -Path $StateFile)
}

# Helper function to save state
function Save-AutomationState($NewState) {
    if (!(Test-Path $StateDir)) {
        New-Item -ItemType Directory -Path $StateDir -Force | Out-Null
    }
    $NewState | ConvertTo-Json | Out-File -FilePath $StateFile -Encoding utf8
}

# Helper function to run local verification tests with mock state injected
function Run-LocalVisualAudit($PersonaName) {
    Write-Host "[*] Pre-flight: Seeding local Firestore Emulator on port 8080 to bypass SvelteKit Setup Guard..." -ForegroundColor Cyan
    try {
        # Programmatically seed a completed user profile to prevent the SvelteKit /setup redirect
        $Payload = @{
            uid = "mock-$PersonaName-uid"
            role = $PersonaName
            isProfileComplete = $true
            armory = @{
                totalXP = 2500
                streakFreeze = @{ available = 1 }
                stats = @{
                    scoutsSix = @{
                        accuracy = 88.00
                        speed = 75.00
                        consistency = 90.00
                        power = 80.00
                        endurance = 85.00
                        tactics = 92.00
                    }
                }
            }
        } | ConvertTo-Json -Depth 5
        
        $Uri = "http://localhost:8080/v1/projects/soccer-skills-tracker/databases/(default)/documents/users/mock-$PersonaName-uid"
        $Header = @{ "Content-Type" = "application/json" }
        
        Invoke-RestMethod -Uri $Uri -Method Put -Body $Payload -Headers $Header -TimeoutSec 5 | Out-Null
        Write-Host "[+] Local Firestore database seeded successfully." -ForegroundColor Green
    } catch {
        Write-Host "[-] Warning: Failed to seed local Firestore Emulator (is it running on port 8080?). Proceeding anyway..." -ForegroundColor Yellow
    }

    Write-Host "[*] Executing browser-in-the-loop visual audit via Playwright..." -ForegroundColor Cyan
    # Explicitly execute our hardened audit-computed-styles-v5.js test runner
    $env:AUDIT_TARGET = $PersonaName
    $AuditResult = node scripts/audit-computed-styles-v5.js
    Write-Host $AuditResult
    
    if ($AuditResult -match "SUCCESS" -or $AuditResult -match "passed") {
        return $true
    }
    return $false
}

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "    SSTRACKER LAUNCH ORCHESTRATOR v37 ACTIVE" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green

# Main Orchestration Loop
while ($true) {
    try {
        $State = Get-AutomationState
        
        # Locate active target
        $ActivePersona = $null
        foreach ($P in $Personas) {
            $PName = $P.Name
            $PStatus = $State.$PName
            if ($PStatus -eq "pending" -or $PStatus -eq "polling") {
                $ActivePersona = $P
                break
            }
        }
        
        if ($null -eq $ActivePersona) {
            Write-Host "[+] All personas are 100% completed and merged! SSTracker is ready for Launch!" -ForegroundColor Green
            break
        }
        
        $PersonaName = $ActivePersona.Name
        $CurrentStatus = $State.$PersonaName
        
        Write-Host "[*] Active Traversal Target: $PersonaName (Status: $CurrentStatus)" -ForegroundColor Yellow
        
        if ($CurrentStatus -eq "pending") {
            # Check if there is an active, open issue on GitHub already
            Write-Host "[*] Querying GitHub issues for $PersonaName..." -ForegroundColor Cyan
            $Issues = gh issue list -R $Repo --state open --json title | ConvertFrom-Json
            $ExistingIssue = $Issues | Where-Object { $_.title -match $ActivePersona.IssueTitle }
            
            if ($null -ne $ExistingIssue) {
                Write-Host "[*] Open issue already exists. Updating status to 'polling'..." -ForegroundColor Cyan
                $State.$PersonaName = "polling"
                Save-AutomationState $State
            } else {
                Write-Host "[*] Triggering Google Jules Cloud VM for $PersonaName OS..." -ForegroundColor Green
                $IssueBody = $ActivePersona.Description
                gh issue create -R $Repo --title $ActivePersona.IssueTitle --body $IssueBody --label "jules" | Out-Null
                Write-Host "[+] Issue successfully created. Jules VM started asynchronous build in the cloud." -ForegroundColor Green
                
                $State.$PersonaName = "polling"
                Save-AutomationState $State
            }
        }
        elseif ($CurrentStatus -eq "polling") {
            # Polling remote state for an incoming PR or Branch pushed by Jules
            Write-Host "[*] Polling GitHub for open Pull Requests from Jules..." -ForegroundColor Cyan
            $PRs = gh pr list -R $Repo --state open --json title,headRefName,number | ConvertFrom-Json
            
            # Match either branch with 'jules-' or PR title referencing the persona
            $MatchedPR = $null
            foreach ($PR in $PRs) {
                if ($PR.headRefName -like "jules-*" -or $PR.title -match $PersonaName) {
                    $MatchedPR = $PR
                    break
                }
            }
            
            if ($null -ne $MatchedPR) {
                $prNumber = $MatchedPR.number
                $headBranch = $MatchedPR.headRefName
                Write-Host "[+] Jules branch detected: $headBranch (PR #$prNumber)" -ForegroundColor Green
                
                # Fetch and checkout Jules branch
                Write-Host "[*] Checking out remote branch locally..." -ForegroundColor Cyan
                git fetch origin
                git checkout $headBranch
                git pull origin $headBranch
                
                # Run physical visual audit
                $AuditPassed = Run-LocalVisualAudit $PersonaName
                
                if ($AuditPassed) {
                    Write-Host "[+] Visual audit passed with 100% compliance!" -ForegroundColor Green
                } else {
                    Write-Host "[-] Visual audit failed or hydration limits breached. Initiating Antigravity Auto-Heal Loop..." -ForegroundColor Yellow
                    # Invoke the local Antigravity visual self-correction workflow
                    agy -p "/ui-ux-audit-v3 $PersonaName"
                    Write-Host "[*] Re-running visual audit verification..." -ForegroundColor Cyan
                    $AuditPassed = Run-LocalVisualAudit $PersonaName
                }
                
                # If verified clean (either initially or after auto-healing), commit styling files and merge
                if ($AuditPassed) {
                    Write-Host "[*] Staging visual locks and committing styling assets..." -ForegroundColor Cyan
                    
                    # Ensure Git config has Nexus identity to clearly tag automated operations
                    git config user.name "Nexus Command Automation"
                    git config user.email "automation@sstracker.app"
                    
                    git add -A
                    # Use standard formatting for visual locks
                    git commit -m "style: visual styling lock and grid-alignment fix for $PersonaName dashboard" --author="Nexus Command Automation <automation@sstracker.app>"
                    git push origin $headBranch
                    
                    # Merge branch into dev
                    Write-Host "[*] Merging Jules branch into dev..." -ForegroundColor Green
                    git checkout dev
                    git pull origin dev
                    git merge $headBranch --no-edit
                    git push origin dev
                    
                    # Update local state file to move to the next phase
                    Write-Host "[+] $PersonaName Traversal successfully completed and locked!" -ForegroundColor Green
                    $State.$PersonaName = "completed"
                    Save-AutomationState $State
                } else {
                    Write-Host "[-] Auto-heal failed to resolve style drift. Waiting for next polling loop..." -ForegroundColor Red
                }
            } else {
                # Draw a clean, non-intrusive progress bar during standby polling
                Write-Host "[*] Standby: Waiting for Jules Cloud VM completion... (Checking again in 30 seconds)" -ForegroundColor Gray
                for ($i = 0; $i -lt 30; $i++) {
                    Write-Host "." -NoNewline
                    Start-Sleep -Seconds 1
                }
                Write-Host ""
            }
        }
    } catch {
        Write-Host "[-] Loop caught execution exception: $_. Exception.Message" -ForegroundColor Red
        Write-Host "[*] Retrying in 15 seconds..." -ForegroundColor Gray
        Start-Sleep -Seconds 15
    }
}
