# run-sequential-local-v4.ps1
# Sequential UI/UX Auditor and Auto-Heal Orchestrator for SSTracker
# Fixed ForegroundColor binding bug (No standard ConsoleColor "Gold"; mapped to "Yellow" and "DarkYellow")

$ErrorActionPreference = "Stop"

# Clear host and display landing header
Clear-Host
Write-Host "==============================================" -ForegroundColor Yellow
Write-Host "     SSTRACKER NEXUS COMMAND: SEQUENTIAL AUDIT " -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Yellow
Write-Host "Initiating sequential, single-persona browser audits..." -ForegroundColor Gray
Write-Host ""

# Define personas and their grep targets in Playwright
$Personas = @(
    @{ Name = "Admin OS"; Grep = "Admin OS"; Dir = "admin" },
    @{ Name = "Commissioner OS"; Grep = "Commissioner OS"; Dir = "commissioner" },
    @{ Name = "Director OS"; Grep = "Director OS"; Dir = "director" },
    @{ Name = "Coach OS"; Grep = "Coach OS"; Dir = "coach" },
    @{ Name = "Player OS"; Grep = "Player OS"; Dir = "player" },
    @{ Name = "Parent OS"; Grep = "Parent OS"; Dir = "parent" },
    @{ Name = "Fan OS"; Grep = "Fan OS"; Dir = "fan" }
)

# Core Directories Setup
$ArtifactsRoot = "audit-artifacts"
if (-not (Test-Path $ArtifactsRoot)) {
    New-Item -ItemType Directory -Path $ArtifactsRoot | Out-Null
    Write-Host "Created base folder: $ArtifactsRoot" -ForegroundColor Gray
}

# Run sequential loop
$Index = 0
while ($Index -lt $Personas.Count) {
    $Persona = $Personas[$Index]
    $PersonaDir = Join-Path $ArtifactsRoot $Persona.Dir

    # Create persona folder if missing
    if (-not (Test-Path $PersonaDir)) {
        New-Item -ItemType Directory -Path $PersonaDir | Out-Null
    }

    Write-Host "`n----------------------------------------------" -ForegroundColor DarkYellow
    Write-Host " [AUDITING] Starting: $($Persona.Name)" -ForegroundColor Cyan
    Write-Host " Target folder: $PersonaDir" -ForegroundColor Gray
    Write-Host "----------------------------------------------" -ForegroundColor DarkYellow

    # Run Playwright test for specific persona
    Write-Host "Running Playwright headed assertions..." -ForegroundColor White
    $PlaywrightCommand = "npx playwright test -g `"$($Persona.Grep)`" --headed"
    
    try {
        # Execute the test with standard output visible
        Invoke-Expression $PlaywrightCommand
        Write-Host "`n[PASS] $($Persona.Name) visual and layout assertions passed." -ForegroundColor Green
    }
    catch {
        Write-Host "`n[FAIL] $($Persona.Name) visual regression failed." -ForegroundColor Red
        Write-Host "If the layout is broken, please run the following command to auto-heal Svelte files:" -ForegroundColor Gray
        Write-Host "agy -p `"/microscopic-visual-autofix-v3 $($Persona.Name)`"" -ForegroundColor Yellow
        Write-Host ""
    }

    # Pause for Human review of screenshots
    Write-Host ""
    Write-Host "⏸ PAUSED FOR HUMAN REVIEW:" -ForegroundColor Yellow
    Write-Host "Go to $PersonaDir to verify the screenshots and hover states." -ForegroundColor Gray
    Write-Host "Choose an action:" -ForegroundColor White
    Write-Host " [Enter]  - Proceed to the next persona in the queue" -ForegroundColor Green
    Write-Host " 'retry'  - Re-run the audit for $($Persona.Name)" -ForegroundColor Yellow
    Write-Host " 'exit'   - Terminate the sequential audit" -ForegroundColor Red
    
    $Choice = Read-Host "`nAction"
    $Choice = $Choice.Trim().ToLower()

    if ($Choice -eq "exit") {
        Write-Host "Audit terminated by user." -ForegroundColor Red
        break
    }
    elseif ($Choice -eq "retry") {
        Write-Host "Retrying audit for $($Persona.Name)..." -ForegroundColor Yellow
        # Loop on same index
        continue
    }
    else {
        # Proceed to next
        $Index++
    }
}

Write-Host "`n==============================================" -ForegroundColor Yellow
Write-Host "          SEQUENTIAL AUDIT COMPLETED          " -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Yellow
