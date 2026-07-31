# SSTracker Automated Overnight Build Launcher (v2)
# Enforces local Firebase Emulators & Svelte Vite Dev Server startup with zero syntax errors

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " SSTracker Automated Overnight Launcher" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Step 1: Verify Node and Firebase CLI are available
Write-Host "[*] Checking local development dependencies..." -ForegroundColor Yellow
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVer = node -v
    Write-Host "    ✔ Node.js is installed ($nodeVer)" -ForegroundColor Green
} else {
    Write-Warning "    ✘ Node.js not found! Please install Node.js."
    Exit 1
}

if (Get-Command npx -ErrorAction SilentlyContinue) {
    Write-Host "    ✔ npx is installed" -ForegroundColor Green
} else {
    Write-Warning "    ✘ npx/npm not found!"
    Exit 1
}

# Step 2: Check for Svelte dev server port 5173
Write-Host "[*] Checking port 5173 (Svelte Dev Server)..." -ForegroundColor Yellow
$port5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if ($port5173) {
    Write-Host "    ⚠ Port 5173 is already in use. Svelte dev server might already be running." -ForegroundColor Orange
} else {
    Write-Host "    ✔ Port 5173 is free. Ready to launch Svelte dev server." -ForegroundColor Green
}

# Step 3: Check for Firebase Emulator port 8080 (Firestore)
Write-Host "[*] Checking port 8080 (Firestore Emulator)..." -ForegroundColor Yellow
$port8080 = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue
if ($port8080) {
    Write-Host "    ⚠ Port 8080 is already in use. Firebase Emulators might already be running." -ForegroundColor Orange
} else {
    Write-Host "    ✔ Port 8080 is free. Ready to launch Firebase Emulator Suite." -ForegroundColor Green
}

# Step 4: Boot Firebase Emulators if not running
if (-not $port8080) {
    Write-Host "[*] Starting Firebase Emulator Suite in background..." -ForegroundColor Yellow
    Start-Process -FilePath "npx" -ArgumentList "firebase", "emulators:start" -NoNewWindow
    # Give it a few seconds to spin up
    Start-Sleep -Seconds 5
} else {
    Write-Host "[*] Skipping Firebase Emulator startup (already running)." -ForegroundColor Green
}

# Step 5: Boot Svelte Dev Server if not running
if (-not $port5173) {
    Write-Host "[*] Starting Svelte Dev Server (Vite) in background..." -ForegroundColor Yellow
    Start-Process -FilePath "npm" -ArgumentList "run", "dev" -NoNewWindow
    # Give it a few seconds to spin up
    Start-Sleep -Seconds 3
} else {
    Write-Host "[*] Skipping Svelte Dev Server startup (already running)." -ForegroundColor Green
}

Write-Host "`n=========================================" -ForegroundColor Green
Write-Host " 🟢 OVERNIGHT ENVIRONMENT IS ACTIVE!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host "Emulators and Dev Server are running in the background." -ForegroundColor White
Write-Host "You are now fully cleared to execute your Swarm Audits!" -ForegroundColor White
Write-Host "In Antigravity, run:" -ForegroundColor Yellow
Write-Host "  /tdd-swarm-build-v3 all" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Green
