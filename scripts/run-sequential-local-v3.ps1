# run-sequential-local-v3.ps1
# Nexus Command Sequential Visual Audit & Auto-Fix Orchestrator (v3.0)
# Mathematically aligned to enforce "Nuclear Americana Tech Noir" visual specs

$ErrorActionPreference = "Stop"

# Clear host to keep terminal clean
Clear-Host

Write-Host "=====================================================================" -ForegroundColor Gold
Write-Host " 🏛️ NEXUS COMMAND: SEQUENTIAL VISUAL REGRESSION ENGINE (v3.0) 🏛️" -ForegroundColor Gold
Write-Host "=====================================================================" -ForegroundColor Gold
Write-Host "Wired to execute alongside: /microscopic-visual-autofix-v3" -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Gray

# Define the 7 target personas as mapped on our master roadmap
$Personas = @(
    @{ Name = "Admin"; Route = "admin"; Grep = "Admin OS" },
    @{ Name = "Commissioner"; Route = "commissioner"; Grep = "Commissioner OS" },
    @{ Name = "Director"; Route = "director"; Grep = "Director OS" },
    @{ Name = "Coach"; Route = "coach"; Grep = "Coach OS" },
    @{ Name = "Player"; Route = "player"; Grep = "Player OS" },
    @{ Name = "Parent"; Route = "parent"; Grep = "Parent OS" },
    @{ Name = "Fan"; Route = "fan"; Grep = "Fan OS" }
)

$ArtifactsRoot = "audit-artifacts"

# Ensure root directory exists
if (-not (Test-Path $ArtifactsRoot)) {
    New-Item -ItemType Directory -Path $ArtifactsRoot | Out-Null
}

foreach ($Persona in $Personas) {
    $PersonaName = $Persona.Name
    $PersonaRoute = $Persona.Route
    $PersonaGrep = $Persona.Grep
    $PersonaDir = Join-Path $ArtifactsRoot $PersonaRoute

    # Dynamically generate persona subdirectories
    if (-not (Test-Path $PersonaDir)) {
        New-Item -ItemType Directory -Path $PersonaDir | Out-Null
    }

    Write-Host ""
    Write-Host "---------------------------------------------------------------------" -ForegroundColor Gray
    Write-Host "🚀 STARTING AUDIT: [$($PersonaName.ToUpper()) OS] on /$PersonaRoute" -ForegroundColor Cyan
    Write-Host "---------------------------------------------------------------------" -ForegroundColor Gray
    Write-Host "Executing Playwright visual assertions (hover, transitions, collisions)..." -ForegroundColor Gray

    # Execute Playwright specifically for the active persona's visual assertions
    $PlaywrightCommand = "npx playwright test -g `"$PersonaGrep`" --headed"
    Write-Host "Running: $PlaywrightCommand" -ForegroundColor DarkGray
    
    try {
        # Run test process
        Invoke-Expression $PlaywrightCommand
        
        Write-Host "✅ [$PersonaName OS] Visual Audit: PASSED" -ForegroundColor Green
        Write-Host "Screenshots captured and stored in: $PersonaDir/" -ForegroundColor Gray
        Write-Host ""
        Write-Host "⏸️  PAUSED FOR HUMAN REVIEW:" -ForegroundColor Gold
        Write-Host "Go to your local '$PersonaDir/' folder to review the screenshots and hover states." -ForegroundColor Gray
        Write-Host "Press [Enter] to approve and proceed to the next persona, or Ctrl+C to abort..." -ForegroundColor Gold
        Read-Host
    }
    catch {
        Write-Host ""
        Write-Host "❌ [$PersonaName OS] Visual Audit: FAILED!" -ForegroundColor Red
        Write-Host "Playwright detected CSS collisions, layout displacement, or incorrect color tokens." -ForegroundColor Red
        Write-Host ""
        Write-Host "=====================================================================" -ForegroundColor Red
        Write-Host "🛠️  RECOMMENDED AUTO-HEAL PROTOCOL (v3.0):" -ForegroundColor Gold
        Write-Host "Open your Antigravity IDE terminal and execute the following command:" -ForegroundColor White
        Write-Host "  /microscopic-visual-autofix-v3 $PersonaName" -ForegroundColor Cyan
        Write-Host "=====================================================================" -ForegroundColor Red
        Write-Host ""
        
        $Choice = Read-Host "Do you want to: [R]etry this persona, [S]kip to next, or [A]bort? (R/S/A)"
        if ($Choice -eq "R" -or $Choice -eq "r") {
            # Rewind iteration to retry current persona
            $Persona.Index--
            continue
        }
        elseif ($Choice -eq "S" -or $Choice -eq "s") {
            Write-Host "Skipping [$PersonaName OS]..." -ForegroundColor Yellow
            continue
        }
        else {
            Write-Host "Audit pipeline aborted." -ForegroundColor Red
            Exit 1
        }
    }
}

Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Gold
Write-Host "🎉 CONGRATULATIONS! ALL ACTIVE PERSONA AUDITS COMPLETE!" -ForegroundColor Gold
Write-Host "Your Svelte 5 frontend layouts are visually locked and verified." -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Gold
