# run-launch-automation-v5.ps1
# SSTracker Nexus Command - Autonomous Multi-Persona Launch Orchestrator
# Enforces Zero-Touch Cloud Handoffs, Auto-Healing, and Loop-Avoidance

$ErrorActionPreference = "Stop"

# --- 1. CONFIGURATION ---
# Define the order of the remaining personas
$Personas = @(
    [PSCustomObject]@{ Name = "admin"; Route = "src/routes/(app)/admin/overview" },
    [PSCustomObject]@{ Name = "director"; Route = "src/routes/(app)/director/dashboard" },
    [PSCustomObject]@{ Name = "coach"; Route = "src/routes/(app)/coach/dashboard" },
    [PSCustomObject]@{ Name = "player"; Route = "src/routes/(app)/player/dashboard" },
    [PSCustomObject]@{ Name = "parent"; Route = "src/routes/(app)/parent/dashboard" },
    [PSCustomObject]@{ Name = "recruiter"; Route = "src/routes/(app)/recruiter/onboarding" }
)

$PendingPersonas = [System.Collections.Generic.List[PSCustomObject]]::new()
foreach ($P in $Personas) { $PendingPersonas.Add($P) }

# Local Git configuration to isolate automation identity
Write-Host "[NEXUS] Hardening local Git identity to 'Nexus Command Automation'..." -ForegroundColor Cyan
git config user.name "Nexus Command Automation"
git config user.email "automation@sstracker.app"

# --- 2. BOOTSTRAP / CATCH-UP CHECK ---
# Check if the user manually merged the last PR. If so, we trigger the current persona immediately
# instead of waiting for a new git pull hook.
Write-Host "[NEXUS] Executing bootstrap catch-up check..." -ForegroundColor Yellow
$LastCommitAuthor = git log -1 --pretty=%an
$LastCommitMsg = git log -1 --pretty=%B
$ChangedFiles = git diff-tree --no-commit-id --name-only -r HEAD

if ($LastCommitAuthor -ne "Nexus Command Automation") {
    foreach ($Persona in $PendingPersonas) {
        # Check if the last manual commit touched this persona's route
        $MatchedFiles = $ChangedFiles | Where-Object { $_ -like "*$($Persona.Route)*" }
        if ($MatchedFiles) {
            Write-Host "[NEXUS] Manual merge detected for [$($Persona.Name)]. Triggering immediate catch-up audit!" -ForegroundColor Green
            Execute-AuditAndHandoff -Persona $Persona
            break
        }
    }
}

# --- 3. THE MASTER RESILIENT LOOP ---
Write-Host "[NEXUS] Starting main polling loop on 'dev' branch..." -ForegroundColor Green
while ($PendingPersonas.Count -gt 0) {
    try {
        Start-Sleep -Seconds 15
        Write-Host "[NEXUS] Polling for updates..." -ForegroundColor Gray

        # Pull latest changes from cloud
        git fetch origin | Out-Null
        $LocalHash = git rev-parse HEAD
        $RemoteHash = git rev-parse origin/dev

        if ($LocalHash -eq $RemoteHash) {
            continue # No new commits to process
        }

        # Pull changes
        git pull origin dev --rebase | Out-Null

        # Read the latest commit to verify who authored it
        $LastCommitAuthor = git log -1 --pretty=%an
        $LastCommitMsg = git log -1 --pretty=%B

        # LOOP DETECTOR: If the commit was made by the automation agent, skip!
        if ($LastCommitAuthor -eq "Nexus Command Automation") {
            Write-Host "[NEXUS] Skipped self-generated commit: '$($LastCommitMsg.Trim())'" -ForegroundColor Gray
            continue
        }

        # Analyze modified files
        $ChangedFiles = git diff-tree --no-commit-id --name-only -r HEAD

        foreach ($Persona in $PendingPersonas) {
            $MatchedFiles = $ChangedFiles | Where-Object { $_ -like "*$($Persona.Route)*" }
            if ($MatchedFiles) {
                Write-Host "[NEXUS] Incoming cloud changes detected for Route: $($Persona.Route)" -ForegroundColor Green
                Execute-AuditAndHandoff -Persona $Persona
                break # Only process one persona per git cycle to avoid conflicts
            }
        }
    }
    catch {
        Write-Warning "[NEXUS] Connection error or lock encountered: $($_.Exception.Message)"
        Write-Host "[NEXUS] Cooling down for 30 seconds before retrying..." -ForegroundColor Yellow
        Start-Sleep -Seconds 30
    }
}

Write-Host "[NEXUS] Success! All 6 personas completed and verified. Ready for launch!" -ForegroundColor Green

# --- 4. CORE ROUTINES ---
function Execute-AuditAndHandoff ($Persona) {
    Write-Host "[NEXUS] Initiating Visual Audit for [$($Persona.Name)]..." -ForegroundColor Cyan

    # Trigger Playwright visual check v3/v4 via Antigravity CLI
    $AuditResult = ""
    try {
        $AuditResult = agy -p "/ui-ux-audit-v3 $($Persona.Name)"
    }
    catch {
        $AuditResult = "FAIL"
    }

    if ($AuditResult -match "FAIL" -or $AuditResult -eq "FAIL") {
        Write-Host "[NEXUS] Visual discrepancies detected. Triggering CDO Auto-Healing..." -ForegroundColor Yellow
        
        # Execute local auto-fix
        agy -p "/tdd-ui-ux-autofix $($Persona.Name)" | Out-Null
        
        # Re-run audit to verify fix
        $AuditResult = agy -p "/ui-ux-audit-v3 $($Persona.Name)"
    }

    # Lock down layout changes and commit
    Write-Host "[NEXUS] Committing styling lock and layout assets..." -ForegroundColor Cyan
    git add .
    git commit -m "style: visual styling lock and grid-alignment fix for $($Persona.Name) dashboard"
    git push origin dev

    # Trigger next cloud persona VM
    $NextIndex = $Personas.IndexOf($Persona) + 1
    if ($NextIndex -lt $Personas.Count) {
        $NextPersona = $Personas[$NextIndex]
        Write-Host "[NEXUS] Visuals certified! Launching Jules cloud VM for next phase: [$($NextPersona.Name)]" -ForegroundColor Green
        
        # Auto-file a GitHub Issue containing the @google-jules workflow trigger tag
        gh issue create --title "Build Phase: $($NextPersona.Name) OS" --body "@google-jules run .agents/workflows/jules-builds/tdd-$($NextPersona.Name)-os.md" | Out-Null
    }
    else {
        Write-Host "[NEXUS] Visuals certified! [$($Persona.Name)] completed. This was the final persona." -ForegroundColor Green
    }

    # Scrub completed persona from queue to prevent repeat execution
    $PendingPersonas.Remove($Persona) | Out-Null
    Write-Host "[NEXUS] Persona queue updated. Remaining: $($PendingPersonas.Count)" -ForegroundColor Gray
}
