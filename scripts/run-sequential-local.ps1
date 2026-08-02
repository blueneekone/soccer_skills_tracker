# run-sequential-local-v2.ps1
# SSTracker Sequential Local Persona Auditor
# Enforces sequential, human-in-the-loop validation of all personas.

$Personas = @(
    @{ Name = "public"; Title = "Public Landing Page"; SearchPattern = "Landing Page" },
    @{ Name = "admin"; Title = "Global Admin OS"; SearchPattern = "Admin OS" },
    @{ Name = "commissioner"; Title = "Commissioner OS"; SearchPattern = "Commissioner OS" },
    @{ Name = "director"; Title = "Director OS"; SearchPattern = "Director OS" },
    @{ Name = "coach"; Title = "Coach OS"; SearchPattern = "Coach OS" },
    @{ Name = "player"; Title = "Player OS"; SearchPattern = "Player OS" },
    @{ Name = "parent"; Title = "Parent OS"; SearchPattern = "Parent OS" },
    @{ Name = "fan"; Title = "Fan OS"; SearchPattern = "Fan OS" },
    @{ Name = "recruiter"; Title = "Recruiter OS"; SearchPattern = "Recruiter OS" }
)

Write-Host "=========================================================" -ForegroundColor Green
Write-Host "SSTracker Sequential Local Persona Auditor - Version 2.0" -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Green
Write-Host "This script will test, audit, and verify one persona at a time." -ForegroundColor Cyan
Write-Host "Artifacts (screenshots) will be saved under audit-artifacts/[persona]/" -ForegroundColor Cyan
Write-Host "Press Ctrl+C at any time to abort the sequence." -ForegroundColor Yellow
Write-Host ""

foreach ($Persona in $Personas) {
    $PersonaDir = "audit-artifacts/$($Persona.Name)"
    if (!(Test-Path $PersonaDir)) {
        New-Item -ItemType Directory -Path $PersonaDir -Force | Out-Null
    }

    Write-Host "--------------------------------------------------------" -ForegroundColor Cyan
    Write-Host "🚀 STAGE: Testing $($Persona.Title)..." -ForegroundColor Yellow
    Write-Host "Running Playwright E2E and visual assertions..." -ForegroundColor Gray
    
    # Run only the test block matching the targeted persona
    npx playwright test -g "$($Persona.SearchPattern)" --headed
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ ALERT: Tests failed for $($Persona.Title)!" -ForegroundColor Red
        Write-Host "Please check the terminal output, let Antigravity run /microscopic-visual-autofix, and try again." -ForegroundColor Yellow
        $Choice = Read-Host "Would you like to skip this persona and continue? (y/n)"
        if ($Choice -ne 'y') {
            Write-Host "Aborting sequence." -ForegroundColor Red
            break
        }
    } else {
        Write-Host "✔ SUCCESS: $($Persona.Title) tested successfully!" -ForegroundColor Green
        Write-Host "Screenshots captured and saved to: $PersonaDir" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "⏸ PAUSED FOR HUMAN REVIEW" -ForegroundColor Yellow
        Write-Host "Go to $PersonaDir to review the screenshots before proceeding." -ForegroundColor Cyan
        Read-Host "Press [Enter] when you are ready to start the next persona..."
    }
}

Write-Host "=========================================================" -ForegroundColor Green
Write-Host "All sequential audits completed!" -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Green
