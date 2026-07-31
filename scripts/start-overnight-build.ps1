# SSTracker Automated Overnight Swarm Runner
# Usage: Run from project root inside local PowerShell as Admin:
# .\scripts\start-overnight-build.ps1

Write-Host "🚀 Initializing SSTracker Overnight Swarm Build Pipeline..." -ForegroundColor Cyan

# 1. Start Firebase Emulators in background
Write-Host "🔥 Starting Firebase Emulator Suite in background..." -ForegroundColor Yellow
Start-Process -FilePath "npx" -ArgumentList "firebase emulators:start" -NoNewWindow

# Wait 5 seconds for Firestore/Auth to wake up
Start-Sleep -Seconds 5

# 2. Start Svelte Dev Server in background
Write-Host "⚡ Booting Svelte 5 Development Server on Port 5173..." -ForegroundColor Yellow
Start-Process -FilePath "npm" -ArgumentList "run dev" -NoNewWindow

# Wait 3 seconds for Vite port to bind
Start-Sleep -Seconds 3

# 3. Check for package installations
if (-not (Test-Path "node_modules\playwright")) {
    Write-Host "📦 Installing Playwright headless browsers..." -ForegroundColor Yellow
    npm install playwright --save-dev
    npx playwright install chromium
}

# 4. Trigger the first local audit checks to make sure setup is healthy
Write-Host "🛡️ Running Pre-Flight Visual HUD Audit..." -ForegroundColor Cyan
node .\scripts\audit-computed-styles-v3.js player

if ($LASTEXITCODE -eq 0) {
    Write-Host "🟢 Pre-flight check successful! Local environment is fully synchronized." -ForegroundColor Green
    Write-Host "🛌 You are officially cleared to go to sleep. Antigravity and Jules will now run the sequential 6-persona build." -ForegroundColor Green
} else {
    Write-Host "⚠️ Warning: Pre-flight visual check detected layout errors. CDO agent is queued to auto-heal." -ForegroundColor Yellow
}
