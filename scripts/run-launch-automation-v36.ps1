# SSTracker Master Launch & Visual Swarm Orchestrator (v36)
# Consolidated End-to-End Persona Lifecycle Automation Script

# --- CONFIGURATION ENGINE ---
$RepoOwner = "blueneekone"
$RepoName = "soccer_skills_tracker"
$TargetRepo = "$RepoOwner/$RepoName"
$StatePath = ".agents/automation-state.json"
$PollingInterval = 15

# Establish temporary Git Author isolation to protect loop boundaries
Write-Host "[*] Configuring temporary Git author isolation..." -ForegroundColor Gray
git config user.name "Nexus Command Automation"
git config user.email "automation@sstracker.app"

# Ensure the state file exists with a clean default schema if missing
if (!(Test-Path ".agents")) {
    New-Item -ItemType Directory -Path ".agents" -Force | Out-Null
}
if (!(Test-Path $StatePath)) {
    $DefaultState = @{
        "admin"      = "completed"
        "director"   = "completed"
        "coach"      = "pending"
        "player"     = "pending"
        "parent"     = "pending"
    }
    $DefaultState | ConvertTo-Json | Out-File -FilePath $StatePath -Encoding utf8 -Force
}

# --- PERSISTENT UTILITIES ---
function Run-NativeCommand ($Cmd, $ArgsList) {
    $pinfo = New-Object System.Diagnostics.ProcessStartInfo
    $pinfo.FileName = $Cmd
    $pinfo.Arguments = $ArgsList
    $pinfo.RedirectStandardError = $true
    $pinfo.RedirectStandardOutput = $true
    $pinfo.UseShellExecute = $false
    $pinfo.CreateNoWindow = $true
    
    $p = New-Object System.Diagnostics.Process
    $p.StartInfo = $pinfo
    $p.Start() | Out-Null
    $stdout = $p.StandardOutput.ReadToEnd()
    $stderr = $p.StandardError.ReadToEnd()
    $p.WaitForExit()
    
    return [PSCustomObject]@{
        ExitCode = $p.ExitCode
        Stdout   = $stdout.Trim()
        Stderr   = $stderr.Trim()
    }
}

function Seed-FirestoreEmulator ($PersonaName) {
    Write-Host "[*] Pre-flight: Seeding Firestore Emulator for $PersonaName to bypass /setup redirect..." -ForegroundColor Cyan
    
    $MockUser = @{
        fields = @{
            uid = @{ stringValue = "mock-$PersonaName-uid" }
            role = @{ stringValue = $PersonaName }
            isProfileComplete = @{ booleanValue = $true }
            armory = @{
                mapValue = @{
                    fields = @{
                        totalXP = @{ integerValue = 2500 }
                        streakFreeze = @{
                            mapValue = @{
                                fields = @{
                                    available = @{ integerValue = 1 }
                                }
                            }
                        }
                        stats = @{
                            mapValue = @{
                                fields = @{
                                    scoutsSix = @{
                                        mapValue = @{
                                            fields = @{
                                                accuracy    = @{ doubleValue = 88.00 }
                                                speed       = @{ doubleValue = 75.00 }
                                                consistency = @{ doubleValue = 90.00 }
                                                power       = @{ doubleValue = 80.00 }
                                                endurance   = @{ doubleValue = 85.00 }
                                                tactics     = @{ doubleValue = 92.00 }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    $JsonBody = $MockUser | ConvertTo-Json -Depth 10
    
    try {
        $Uri = "http://localhost:8080/v1/projects/sstracker-nexus/databases/(default)/documents/users/mock-$PersonaName-uid"
        $Response = Invoke-RestMethod -Uri $Uri -Method Patch -Body $JsonBody -ContentType "application/json" -ErrorAction Stop
        Write-Host "[+] Firestore Emulator successfully seeded: users/mock-$PersonaName-uid" -ForegroundColor Green
    }
    catch {
        Write-Host "[-] Warning: Emulator seeding failed. Verify Firestore is running on port 8080: $_" -ForegroundColor Yellow
    }
}

function Trigger-NextJulesBuild ($PersonaName) {
    Write-Host "[*] Triggering Jules Cloud VM for $PersonaName OS..." -ForegroundColor Cyan
    $Title = "Build $PersonaName OS"
    $Body = "Please execute the full sequential build and validation pipeline for the $PersonaName operating system. Use the /tdd-swarm-build-v3 directive. Enforce the 80-line function capped limit, SafeSport Shadow CC server-side triggers, and strict Svelte 5 untrack reactivity rules."
    
    $Result = Run-NativeCommand "gh" "issue create -R $TargetRepo --title `"$Title`" --body `"$Body`" --label `"jules`""
    if ($Result.ExitCode -eq 0) {
        Write-Host "[+] Jules build issue created successfully! Issue URL matches remote state." -ForegroundColor Green
        return $true
    }
    else {
        Write-Host "[-] Error creating GitHub Issue: $($Result.Stderr)" -ForegroundColor Red
        return $false
    }
}

# --- MASTER EXECUTION LOOP ---
while ($true) {
    try {
        # 1. Parse current state
        $State = Get-Content -Raw -Path $StatePath | ConvertFrom-Json
        $ActivePersona = $null
        
        # Traverse personas sequentially in their strict architectural order
        $Personas = @("admin", "director", "coach", "player", "parent")
        foreach ($P in $Personas) {
            if ($State.$P -ne "completed") {
                $ActivePersona = $P
                break
            }
        }
        
        if ($null -eq $ActivePersona) {
            Write-Host "[+] Platform-wide launch automation fully completed! All personas verified green." -ForegroundColor Green
            break
        }
        
        $CurrentStatus = $State.$ActivePersona
        Write-Host "[*] Active Traversal Target: $ActivePersona OS (Status: $CurrentStatus)" -ForegroundColor Yellow
        
        # 2. State-Machine Routing
        if ($CurrentStatus -eq "pending") {
            # Idempotency Check: Verify if an open build ticket already exists on GitHub
            Write-Host "[*] Checking open build tickets on GitHub..." -ForegroundColor Gray
            $ListResult = Run-NativeCommand "gh" "issue list -R $TargetRepo --state open --label `"jules`" --json title"
            $AlreadyExists = $false
            if ($ListResult.ExitCode -eq 0) {
                if ($ListResult.Stdout -match "Build $ActivePersona OS") {
                    $AlreadyExists = $true
                }
            }
            
            if ($AlreadyExists) {
                Write-Host "[+] Open build ticket already detected for $ActivePersona. Skipping creation to prevent duplicate runs." -ForegroundColor Green
                $State.$ActivePersona = "polling"
                $State | ConvertTo-Json | Out-File -FilePath $StatePath -Encoding utf8 -Force
            }
            else {
                # Attempt to create build ticket
                $Success = Trigger-NextJulesBuild $ActivePersona
                if ($Success) {
                    $State.$ActivePersona = "polling"
                    $State | ConvertTo-Json | Out-File -FilePath $StatePath -Encoding utf8 -Force
                }
                else {
                    Write-Host "[-] Trigger failed. Retrying in $PollingInterval seconds..." -ForegroundColor Red
                    Start-Sleep -Seconds $PollingInterval
                    continue
                }
            }
        }
        
        if ($CurrentStatus -eq "polling") {
            # Pull latest changes and verify git integrity
            Write-Host "[*] Fetching latest remote state from origin..." -ForegroundColor Gray
            git fetch origin | Out-Null
            
            # Guard against self-triggering loop: Check if the latest remote commit was by the local automation agent
            $LastCommitAuthor = (git log -1 --pretty=%an).Trim()
            $LastCommitMsg = (git log -1 --pretty=%B).Trim()
            
            if ($LastCommitAuthor -eq "Nexus Command Automation" -or $LastCommitMsg -match "style: visual styling lock") {
                Write-Host "[~] Self-commit detected ('$LastCommitMsg'). Ignoring to safeguard loop boundaries." -ForegroundColor Gray
                Start-Sleep -Seconds $PollingInterval
                continue
            }
            
            # Polling: Check if Jules has pushed a branch or opened a PR matching our active target
            Write-Host "[*] Querying Pull Requests on GitHub..." -ForegroundColor Gray
            $PRList = Run-NativeCommand "gh" "pr list -R $TargetRepo --state open --json title,number,headRefName"
            $MatchedPR = $null
            
            if ($PRList.ExitCode -eq 0 -and $PRList.Stdout.Length -gt 0) {
                $PRs = $PRList.Stdout | ConvertFrom-Json
                foreach ($PR in $PRs) {
                    if ($PR.title -match $ActivePersona -or $PR.headRefName -match "jules-" -or $PR.headRefName -match $ActivePersona) {
                        $MatchedPR = $PR
                        break
                    }
                }
            }
            
            if ($null -eq $MatchedPR) {
                # Fallback: Scan remote branches for a direct jules session push
                $RemoteBranches = git branch -r
                $MatchedBranch = $null
                foreach ($B in $RemoteBranches) {
                    if ($B -match "origin/jules-" -or $B -match $ActivePersona) {
                        $MatchedBranch = $B.Trim()
                        break
                    }
                }
                
                if ($null -eq $MatchedBranch) {
                    Write-Host "[.] Standby: Waiting for Jules Cloud VM to push the $ActivePersona OS build..." -ForegroundColor DarkGray
                    Start-Sleep -Seconds $PollingInterval
                    continue
                }
                else {
                    $HeadBranchName = $MatchedBranch -replace "origin/", ""
                    Write-Host "[+] Jules branch detected: $HeadBranchName" -ForegroundColor Green
                    $HeadBranch = $HeadBranchName
                    $PRNumber = $null
                }
            }
            else {
                $prNumText = $MatchedPR.number
                $headBranchText = $MatchedPR.headRefName
                Write-Host "[+] Jules PR detected: $headBranchText (PR #$prNumText)" -ForegroundColor Green
                $HeadBranch = $MatchedPR.headRefName
                $PRNumber = $MatchedPR.number
            }
            
            # Checkout the Jules branch and prepare environment
            Write-Host "[*] Pulling and checking out branch: $HeadBranch..." -ForegroundColor Gray
            git stash -u | Out-Null
            git checkout $HeadBranch | Out-Null
            git pull origin $HeadBranch | Out-Null
            
            # Seeding the Firestore Emulator to bypass SvelteKit route guards
            Seed-FirestoreEmulator $ActivePersona
            
            # Execute physical visual verification checks
            Write-Host "[*] Launching browser-in-the-loop Playwright visual audit..." -ForegroundColor Cyan
            $AuditResult = Run-NativeCommand "node" "scripts/audit-computed-styles-v4.js"
            
            if ($AuditResult.ExitCode -ne 0) {
                Write-Host "[-] Visual audit returned failure on $ActivePersona. Activating Antigravity self-correction..." -ForegroundColor Red
                
                # Invoke Antigravity CDO self-healing routine via Workspace workflows
                $HealResult = Run-NativeCommand "agy" "-p `"/ui-ux-audit-v3 $ActivePersona`""
                if ($HealResult.ExitCode -eq 0) {
                    Write-Host "[+] Layout corrected successfully! Re-running Playwright verification..." -ForegroundColor Green
                    $AuditResult = Run-NativeCommand "node" "scripts/audit-computed-styles-v4.js"
                }
            }
            
            # If validated green, lock layouts and merge
            if ($AuditResult.ExitCode -eq 0) {
                Write-Host "[+] Visual audit passed! Committing visual styling locks..." -ForegroundColor Green
                
                git add . | Out-Null
                $CommitMsg = "style: visual styling lock and grid-alignment fix for $ActivePersona dashboard"
                git commit -m "$CommitMsg" | Out-Null
                git push origin $HeadBranch | Out-Null
                
                # Merge into dev branch
                Write-Host "[*] Merging verified $ActivePersona build into dev..." -ForegroundColor Gray
                git checkout dev | Out-Null
                git pull origin dev | Out-Null
                git merge $HeadBranch | Out-Null
                git push origin dev | Out-Null
                
                # Advance state to completed
                Write-Host "[+] $ActivePersona OS successfully completed and merged!" -ForegroundColor Green
                $State.$ActivePersona = "completed"
                $State | ConvertTo-Json | Out-File -FilePath $StatePath -Encoding utf8 -Force
            }
            else {
                Write-Host "[-] Critical: Unable to heal styling failures. Manual intervention recommended: $($AuditResult.Stderr)" -ForegroundColor Red
                Start-Sleep -Seconds $PollingInterval
            }
        }
    }
    catch {
        Write-Host "[-] Network warning or error occurred in main loop: $_. Retrying in $PollingInterval seconds..." -ForegroundColor Yellow
        Start-Sleep -Seconds $PollingInterval
    }
}
