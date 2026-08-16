$ErrorActionPreference = "Stop"

Write-Host "======================================================="
Write-Host "Starting Jules Auto-Merge PR Listener..."
Write-Host "Monitoring 'dev' branch for new AI Agent commits."
Write-Host "Press Ctrl+C to stop."
Write-Host "======================================================="

while ($true) {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Checking for updates..."
    try {
        git fetch origin dev --quiet
        $localRev = git rev-parse HEAD
        $remoteRev = git rev-parse origin/dev
        
        if ($localRev -ne $remoteRev) {
            Write-Host ">> New commits detected from Jules! Pulling..." -ForegroundColor Yellow
            git pull origin dev --rebase
            
            Write-Host ">> Running workspace auto-heal..." -ForegroundColor Cyan
            python workspace_cleanup_and_heal.py --auto
            
            Write-Host ">> Triggering full deployment (functions, hosting, rules)..." -ForegroundColor Cyan
            npx firebase deploy --only functions,hosting,indexes,firestore:rules --force
            Write-Host ">> Deployment complete!" -ForegroundColor Green
        }
    } catch {
        Write-Host "Warning: Git pull or deploy encountered an error. Continuing in 10s..." -ForegroundColor Red
    }
    
    Start-Sleep -Seconds 10
}
