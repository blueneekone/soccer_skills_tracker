# start-master-swarm.ps1
$Personas = @("admin", "player", "coach", "director", "parent", "commissioner", "fan")

Write-Host "Initiating Parallel Features Swarm..." -ForegroundColor Green

foreach ($Persona in $Personas) {
    $Title = "Swarm Audit & Recovery: $($Persona.ToUpper()) OS"
    $WorkflowPath = ".agents/workflows/jules-builds/audit-$Persona-os.md"
    
    # The one-sentence prompt that tells Jules what to read
    $Body = "@jules, please execute the workflow defined in $WorkflowPath"

    # Dispatch to Jules via GitHub CLI
    gh issue create --title $Title --body $Body --label "jules"

    Write-Host "Spawned Cloud VM for $Persona OS. Issue created." -ForegroundColor Cyan
    
    # Slight delay to ensure GitHub API rate limits aren't tripped
    Start-Sleep -Seconds 3
}

Write-Host "All 7 Persona Swarms Dispatched Successfully. You may now log off." -ForegroundColor Green