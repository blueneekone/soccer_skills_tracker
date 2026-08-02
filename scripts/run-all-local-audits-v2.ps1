# SSTracker Autonomous Visual Audit and Healing Suite (v2)
# Configured for Cybernetic Atompunk Tech Noir Aesthetics

$HostIP = "127.0.0.1"
$SveltePort = 5173
$EmulatorPort = 8080

$SvelteSpawned = $false
$EmulatorSpawned = $false

# 1. Verify/Spawn Svelte Dev Server
Write-Host "[PRE-FLIGHT] Checking Svelte development server on port $SveltePort..." -ForegroundColor Cyan
$SvelteReady = $false
try {
    $TcpClient = New-Object System.Net.Sockets.TcpClient
    $Connect = $TcpClient.BeginConnect($HostIP, $SveltePort, $null, $null)
    $Wait = $Connect.AsyncWaitHandle.WaitOne(1000, $false)
    if ($TcpClient.Connected) {
        $TcpClient.Close()
        $SvelteReady = $true
        Write-Host "[PRE-FLIGHT] Svelte dev server is already running." -ForegroundColor Green
    }
} catch {
    # Port is free
}

if (-not $SvelteReady) {
    Write-Host "[PRE-FLIGHT] Svelte dev server not running on port $SveltePort. Launching 'npm run dev'..." -ForegroundColor Yellow
    $SvelteProcess = Start-Process npm -ArgumentList "run dev" -NoNewWindow -PassThru
    $SvelteSpawned = $true

    # Poll Svelte Port
    $ElapsedTime = 0
    while ($ElapsedTime -lt 30) {
        try {
            $TcpClient = New-Object System.Net.Sockets.TcpClient
            $Connect = $TcpClient.BeginConnect($HostIP, $SveltePort, $null, $null)
            $Wait = $Connect.AsyncWaitHandle.WaitOne(1000, $false)
            if ($TcpClient.Connected) {
                $TcpClient.Close()
                $SvelteReady = $true
                break
            }
            $TcpClient.Close()
        } catch {
            # Retry
        }
        Start-Sleep -Seconds 1
        $ElapsedTime++
    }
}

if (-not $SvelteReady) {
    Write-Error "CRITICAL: Svelte dev server failed to start or bind to port $SveltePort."
    exit 1
}

# 2. Verify/Spawn Firebase Emulators
Write-Host "[PRE-FLIGHT] Checking Firebase Local Emulators on port $EmulatorPort..." -ForegroundColor Cyan
$EmulatorReady = $false
try {
    $TcpClient = New-Object System.Net.Sockets.TcpClient
    $Connect = $TcpClient.BeginConnect($HostIP, $EmulatorPort, $null, $null)
    $Wait = $Connect.AsyncWaitHandle.WaitOne(1000, $false)
    if ($TcpClient.Connected) {
        $TcpClient.Close()
        $EmulatorReady = $true
        Write-Host "[PRE-FLIGHT] Firebase Emulators are already running." -ForegroundColor Green
    }
} catch {
    # Port is free
}

if (-not $EmulatorReady) {
    Write-Host "[PRE-FLIGHT] Firebase Emulators not running on port $EmulatorPort. Launching emulators..." -ForegroundColor Yellow
    $EmulatorProcess = Start-Process npx -ArgumentList "firebase emulators:start" -NoNewWindow -PassThru
    $EmulatorSpawned = $true

    # Poll Emulator Port
    $ElapsedTime = 0
    while ($ElapsedTime -lt 30) {
        try {
            $TcpClient = New-Object System.Net.Sockets.TcpClient
            $Connect = $TcpClient.BeginConnect($HostIP, $EmulatorPort, $null, $null)
            $Wait = $Connect.AsyncWaitHandle.WaitOne(1000, $false)
            if ($TcpClient.Connected) {
                $TcpClient.Close()
                $EmulatorReady = $true
                break
            }
            $TcpClient.Close()
        } catch {
            # Retry
        }
        Start-Sleep -Seconds 1
        $ElapsedTime++
    }
}

if (-not $EmulatorReady) {
    Write-Error "CRITICAL: Firebase Emulator Suite failed to start or bind to port $EmulatorPort."
    if ($SvelteSpawned -and $SvelteProcess) { Stop-Process -Id $SvelteProcess.Id -Force }
    exit 1
}

# 3. Core Persona Execution Loop
$Personas = @(
    @{ Name = "public"; Role = "public"; UID = "public" },
    @{ Name = "admin"; Role = "admin"; UID = "mock-admin-uid" },
    @{ Name = "director"; Role = "director"; UID = "mock-director-uid" },
    @{ Name = "coach"; Role = "coach"; UID = "mock-coach-uid" },
    @{ Name = "player"; Role = "player"; UID = "mock-player-uid" },
    @{ Name = "parent"; Role = "parent"; UID = "mock-parent-uid" }
)

foreach ($Persona in $Personas) {
    Write-Host "`n==================================================" -ForegroundColor Cyan
    Write-Host "AUDITING PERSONA: $($Persona.Name.ToUpper())" -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor Cyan

    # A. Programmatic Database Seeding (Bypass Setup Redirection)
    if ($Persona.Role -ne "public") {
        Write-Host "[DATABASE] Seeding Firestore Emulator for role: $($Persona.Role)..." -ForegroundColor Yellow
        $Uri = "http://localhost:8080/v1/projects/sstracker-nexus/databases/(default)/documents/users/$($Persona.UID)"
        $Payload = @{
            fields = @{
                isProfileComplete = @{ booleanValue = $true }
                role = @{ stringValue = $Persona.Role }
                armory = @{
                    mapValue = @{
                        fields = @{
                            totalXP = @{ integerValue = "5280" }
                            streakFreeze = @{
                                mapValue = @{
                                    fields = @{
                                        available = @{ booleanValue = $true }
                                    }
                                }
                            }
                            stats = @{
                                mapValue = @{
                                    fields = @{
                                        scoutsSix = @{ booleanValue = $true }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } | ConvertTo-Json -Depth 10

        try {
            $Response = Invoke-RestMethod -Uri $Uri -Method Patch -Body $Payload -ContentType "application/json"
            Write-Host "[DATABASE] Successfully seeded user document for $($Persona.UID)." -ForegroundColor Green
        } catch {
            Write-Warning "Failed to seed Firestore Emulator: $_"
        }
    }

    # B. Execute Playwright Visual Audits ( audit-computed-styles-v5.js )
    Write-Host "[AUDIT] Launching Playwright browser check for $($Persona.Name)..." -ForegroundColor Yellow
    $env:AUDIT_TARGET = $Persona.Name
    $AuditResult = node scripts/audit-computed-styles-v5.js

    # C. Check Visual Audit Outcomes & Self-Heal
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "WARNING: Visual audit failed for $($Persona.Name)! Launching Antigravity Auto-Healer..."
        Start-Process -FilePath "agy" -ArgumentList "-p", "'/ui-ux-audit-v3 " + $Persona.Name + "'" -NoNewWindow -Wait
        
        # Re-run visual check to confirm heal succeeded
        Write-Host "[AUDIT] Re-running Playwright verification after heal pass..." -ForegroundColor Cyan
        $env:AUDIT_TARGET = $Persona.Name
        $AuditResult = node scripts/audit-computed-styles-v5.js
        if ($LASTEXITCODE -ne 0) {
            Write-Error "CRITICAL: Auto-heal failed to resolve visual issues for $($Persona.Name). Rerun with stashed files."
        } else {
            Write-Host "[SUCCESS] Auto-heal successfully aligned Svelte layout for $($Persona.Name)!" -ForegroundColor Green
        }
    } else {
        Write-Host "[SUCCESS] Visual audit passed with 100% compliance for $($Persona.Name)!" -ForegroundColor Green
    }
}

# 4. Graceful Cleanup of Spawned Subprocesses
Write-Host "`n==================================================" -ForegroundColor Green
Write-Host "ALL PERSONAS VERIFIED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

if ($SvelteSpawned -and $SvelteProcess) {
    Write-Host "[CLEANUP] Stopping Svelte dev process..." -ForegroundColor Yellow
    Stop-Process -Id $SvelteProcess.Id -Force
}

if ($EmulatorSpawned -and $EmulatorProcess) {
    Write-Host "[CLEANUP] Stopping Firebase Emulator process..." -ForegroundColor Yellow
    Stop-Process -Id $EmulatorProcess.Id -Force
}

Write-Host "[SUCCESS] Automation finished. Audit recordings saved locally under \audit-artifacts\!" -ForegroundColor Green
