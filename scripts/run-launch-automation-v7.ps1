# run-launch-automation-v7.ps1
# SSTracker Nexus Command - Resilient Night-Shift Orchestrator
Param(
    [string]$ForcePersona = ""
)

$ErrorActionPreference = "Stop"

# Define the exact sequential build queue
$Personas = @(
    @{ Name = "admin"; Route = "/admin/overview"; NextTrigger = "tdd-director-os" },
    @{ Name = "director"; Route = "/director/dashboard"; NextTrigger = "tdd-coach-os" },
    @{ Name = "coach"; Route = "/coach/dashboard"; NextTrigger = "tdd-player-os" },
    @{ Name = "player"; Route = "/player/dashboard"; NextTrigger = "tdd-parent-os" },
    @{ Name = "parent"; Route = "/parent/dashboard"; NextTrigger = "tdd-recruiter-os" },
    @{ Name = "recruiter"; Route = "/recruiter/onboarding"; NextTrigger = "launch-complete" }
)

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host " NEXUS COMMAND: UNATTENDED ORCHESTRATOR ONLINE (v7)       " -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan

# Check for GitHub CLI (gh)
$HasGH = $null -ne (Get-Command gh -ErrorAction SilentlyContinue)
if (-not $HasGH) {
    Write-Host "[WARNING] GitHub CLI (gh) not found in PATH. Jules handoff will fail." -ForegroundColor Yellow
}

$BotAuthor = "SSTracker Nexus Bot"
git config user.name $BotAuthor
git config user.email "nexus@sstracker.local"

# --- Subroutines ---

function Force-PhysicalVisualAudit ($Persona) {
    Write-Host "`n[1/2] Launching Antigravity for PHYSICAL Visual Audit & Heal..." -ForegroundColor Yellow
    
    # THE FIX: Brutally strict prompt to prevent hallucination and force artifact generation
    $StrictPrompt = "/ui-ux-audit-v3 $($Persona.Name). CRITICAL OVERRIDE: Do not statically read the Svelte or CSS files. You MUST physically use Playwright to launch a headless browser, navigate to http://localhost:5173$($Persona.Route), capture a full-page screenshot (.png) and record a session trace (.mp4). Save artifacts to /audit-artifacts/. Use your vision model to verify the resulting image layout. If it fails, fix the code and re-record."
    
    # Execute agent with strict instructions
    agy -p $StrictPrompt
    
    # Check if Antigravity successfully completed the task
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Physical visual audit and auto-heal completed for $($Persona.Name)!" -ForegroundColor Green
        return $true
    } else {
        Write-Host "[FAIL] Antigravity failed the visual audit or could not heal the layout." -ForegroundColor Red
        return $false
    }
}

function Trigger-NextCloudPersona ($Persona) {
    if ($Persona.NextTrigger -eq "launch-complete") {
        Write-Host "`n=========================================================" -ForegroundColor Green
        Write-Host " LAUNCH-DAY BLUEPRINTS 100% COMPLETE AND LOCKED DOWN!     " -ForegroundColor Green
        Write-Host "=========================================================" -ForegroundColor Green
        exit 0
    }

    Write-Host "`n[2/2] Visuals locked. Hitting up Jules for ($($Persona.NextTrigger))..." -ForegroundColor Green
    try {
        gh issue create --title "Trigger Swarm: $($Persona.NextTrigger)" --body "@google-jules run .agents/workflows/jules-builds/$($Persona.NextTrigger).md. The previous persona passed physical visual verification." --label "jules"
        Write-Host "[SUCCESS] Sequential handoff complete. Jules has been pinged." -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Failed to hit up Jules via GitHub CLI: $_" -ForegroundColor Red
    }
}

function Process-PersonaSequence ($TargetPersona) {
    $Passed = Force-PhysicalVisualAudit $TargetPersona
                
    if ($Passed) {
        Write-Host "Committing visual styling lock..." -ForegroundColor Green
        git add .
        git commit -m "style: physical visual styling lock for $($TargetPersona.Name) dashboard" -q
        git push origin dev -q
        
        Trigger-NextCloudPersona $TargetPersona
        return $true
    } else {
        Write-Host "[FATAL] Audit failed. Human intervention required." -ForegroundColor Red
        exit 1
    }
}

# =====================================================================
# THE MANUAL OVERRIDE: Process forced persona immediately
# =====================================================================
if ($ForcePersona) {
    $Target = $Personas | Where-Object { $_.Name -eq $ForcePersona }
    if ($Target) {
        Write-Host "`n>>> OVERRIDE ACTIVATED: Forcing physical visual execution for [$ForcePersona] <<<" -ForegroundColor Magenta
        Process-PersonaSequence $Target
        
        $Personas = $Personas | Where-Object { $_.Name -ne $Target.Name }
        Write-Host "`n>>> OVERRIDE COMPLETE: Handing control back to Master Loop. <<<" -ForegroundColor Magenta
    } else {
        Write-Host "[ERROR] Persona '$ForcePersona' not found." -ForegroundColor Red
        exit 1
    }
}

# =====================================================================
# Master Polling Loop
# =====================================================================
while ($Personas.Count -gt 0) {
    Write-Host "`nChecking Git tree for new merges from Google Jules..." -ForegroundColor Gray
    git fetch origin dev -q
    
    $LocalHash = git rev-parse HEAD
    $RemoteHash = git rev-parse origin/dev
    
    if ($LocalHash -ne $RemoteHash) {
        git pull origin dev -q
        
        $LastCommitAuthor = git log -1 --pretty=%an
        if ($LastCommitAuthor -eq $BotAuthor) {
            Write-Host "Ignoring local styling lock commit. Waiting for Jules..." -ForegroundColor DarkGray
            Start-Sleep -Seconds 15
            continue
        }
        
        $ChangedFiles = git diff --name-only HEAD~1 HEAD
        
        foreach ($Persona in $Personas) {
            if ($ChangedFiles -match "src/routes/\(app\)$($Persona.Route)") {
                Write-Host "`n=========================================================" -ForegroundColor Cyan
                Write-Host " INTERCEPTED: Merged updates for $($Persona.Name) OS!" -ForegroundColor Cyan
                Write-Host "=========================================================" -ForegroundColor Cyan
                
                Process-PersonaSequence $Persona
                
                $Personas = $Personas | Where-Object { $_.Name -ne $Persona.Name }
                break
            }
        }
    }
    
    Start-Sleep -Seconds 15
}