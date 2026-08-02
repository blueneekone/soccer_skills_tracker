# SSTracker Smarter Local Visual Audit & Fix Pipeline (v5)
# This script is entirely local-first, decoupled from Git branches, hashes, or PRs.
# It boots background services safely on Windows, seeds the Firestore Emulator,
# and runs the Playwright visual audit suite sequentially across all personas.

[CmdletBinding()]
param(
    [switch]$SkipPortCheck
)

# Set execution context pathing to allow running from any subfolder
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
if ($ScriptPath) {
    Set-Location $ScriptPath
}

# Persona definitions
$Personas = @(
    [PSCustomObject]@{ Name = "public"; Route = "/"; Role = "public"; Uid = "mock-public-uid" },
    [PSCustomObject]@{ Name = "admin"; Route = "/admin/overview"; Role = "admin"; Uid = "mock-admin-uid" },
    [PSCustomObject]@{ Name = "director"; Route = "/director/dashboard"; Role = "director"; Uid = "mock-director-uid" },
    [PSCustomObject]@{ Name = "coach"; Route = "/coach/dashboard"; Role = "coach"; Uid = "mock-coach-uid" },
    [PSCustomObject]@{ Name = "player"; Route = "/player/dashboard"; Role = "player"; Uid = "mock-player-uid" },
    [PSCustomObject]@{ Name = "parent"; Route = "/parent/dashboard"; Role = "parent"; Uid = "mock-parent-uid" }
)

Write-Host "=============================================" -ForegroundColor Green
Write-Host "   SSTRACKER UNIFIED LOCAL VISUAL AUDITOR v5" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# 1. Background Server Coordination
if (-not $SkipPortCheck) {
    # Check Svelte Server (Port 5173)
    $SvelteActive = $false
    try {
        $TcpClient = New-Object System.Net.Sockets.TcpClient
        $Connect = $TcpClient.BeginConnect("127.0.0.1", 5173, $null, $null)
        $Wait = $Connect.AsyncWaitHandle.WaitOne(200, $false)
        if ($TcpClient.Connected) {
            $SvelteActive = $true
            $TcpClient.Close()
        }
    } catch {
        # Silent fail, we will boot it
    }

    if (-not $SvelteActive) {
        Write-Host "[SVELTE] Local Svelte server not detected on Port 5173. Spawning background compiler..." -ForegroundColor Yellow
        Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile", "-Command", "npm run dev" -NoNewWindow
        # Poll Svelte server
        $SvelteCheckTimeout = 15
        while ($SvelteCheckTimeout -gt 0 -and -not $SvelteActive) {
            Start-Sleep -Seconds 1
            $SvelteCheckTimeout--
            try {
                $TcpClient = New-Object System.Net.Sockets.TcpClient
                $Connect = $TcpClient.BeginConnect("127.0.0.1", 5173, $null, $null)
                if ($TcpClient.AsyncWaitHandle.WaitOne(200, $false) -and $TcpClient.Connected) {
                    $SvelteActive = $true
                    $TcpClient.Close()
                }
            } catch {}
        }
        if ($SvelteActive) {
            Write-Host "[SVELTE] Background compiler successfully booted and active!" -ForegroundColor Green
        } else {
            Write-Host "[SVELTE] Warning: Failed to confirm Svelte active on port 5173. Proceeding anyway..." -ForegroundColor Yellow
        }
    } else {
        Write-Host "[SVELTE] Pre-flight: Local Svelte server already running on port 5173." -ForegroundColor Green
    }

    # Check Firestore Emulator (Port 8080)
    $EmulatorActive = $false
    try {
        $TcpClient = New-Object System.Net.Sockets.TcpClient
        $Connect = $TcpClient.BeginConnect("127.0.0.1", 8080, $null, $null)
        if ($TcpClient.AsyncWaitHandle.WaitOne(200, $false) -and $TcpClient.Connected) {
            $EmulatorActive = $true
            $TcpClient.Close()
        }
    } catch {}

    if (-not $EmulatorActive) {
        Write-Host "[EMULATOR] Local Firestore Emulator not detected on Port 8080. Spawning background services..." -ForegroundColor Yellow
        Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile", "-Command", "firebase emulators:start" -NoNewWindow
        $EmulatorCheckTimeout = 15
        while ($EmulatorCheckTimeout -gt 0 -and -not $EmulatorActive) {
            Start-Sleep -Seconds 1
            $EmulatorCheckTimeout--
            try {
                $TcpClient = New-Object System.Net.Sockets.TcpClient
                $Connect = $TcpClient.BeginConnect("127.0.0.1", 8080, $null, $null)
                if ($TcpClient.AsyncWaitHandle.WaitOne(200, $false) -and $TcpClient.Connected) {
                    $EmulatorActive = $true
                    $TcpClient.Close()
                }
            } catch {}
        }
        if ($EmulatorActive) {
            Write-Host "[EMULATOR] Local Firebase Emulators successfully booted and active!" -ForegroundColor Green
        } else {
            Write-Host "[EMULATOR] Warning: Failed to confirm Firebase Emulator active on port 8080. Proceeding anyway..." -ForegroundColor Yellow
        }
    } else {
        Write-Host "[EMULATOR] Pre-flight: Local Firebase Emulators already running on port 8080." -ForegroundColor Green
    }
}

# 2. Sequential Audit Execution Loop
foreach ($Persona in $Personas) {
    Write-Host ""
    Write-Host "------------------------------------------------------------" -ForegroundColor Cyan
    Write-Host "   AUDITING PERSONA: $($Persona.Name.ToUpper())" -ForegroundColor Cyan
    Write-Host "------------------------------------------------------------" -ForegroundColor Cyan

    # 3. Database Seeding (Bypass Setup Redirection)
    if ($Persona.Role -ne "public") {
        Write-Host "[SEED] Injecting mock authenticated profile document into local emulator..." -ForegroundColor Gray
        $SeedBody = @{
            fields = @{
                isProfileComplete = @{ booleanValue = $true }
                role = @{ stringValue = $Persona.Role }
            }
        } | ConvertTo-Json -Depth 5
        
        $SeedUrl = "http://localhost:8080/v1/projects/sstracker-nexus/databases/(default)/documents/users/$($Persona.Uid)"
        try {
            $Response = Invoke-RestMethod -Uri $SeedUrl -Method Patch -Body $SeedBody -ContentType "application/json" -ErrorAction Stop
            Write-Host "[SEED] Firestore seeding successful for $($Persona.Uid)." -ForegroundColor Green
        } catch {
            Write-Host "[SEED] Warning: Seeding failed ($($_.Exception.Message)). Setup redirection bypass may fail." -ForegroundColor Yellow
        }
    }

    # 4. Trigger Playwright Audit
    Write-Host "[AUDIT] Initiating browser-in-the-loop visual verification via audit-computed-styles-v5.js..." -ForegroundColor Yellow
    $env:AUDIT_TARGET = $Persona.Name
    
    try {
        # Run node script synchronously and wait for exit
        $AuditProcess = Start-Process -FilePath "node" -ArgumentList "scripts/audit-computed-styles-v5.js" -NoNewWindow -PassThru -Wait
        if ($AuditProcess.ExitCode -eq 0) {
            Write-Host "[AUDIT] SUCCESS: Visual audit completed and screenshots deposited into \audit-artifacts\$($Persona.Name)\." -ForegroundColor Green
        } else {
            Write-Host "[AUDIT] FAILURE: Visual or CSS layout discrepancy detected for $($Persona.Name)." -ForegroundColor Red
            
            # 5. Local Antigravity CLI Auto-Fix
            Write-Host "[HEAL] Invoking local Antigravity CLI to auto-heal visual layouts..." -ForegroundColor Yellow
            $HealProcess = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile", "-Command", "agy -p '/ui-ux-audit-v3 $($Persona.Name)'" -NoNewWindow -PassThru -Wait
            if ($HealProcess.ExitCode -eq 0) {
                Write-Host "[HEAL] Auto-heal pass executed. Re-running validation..." -ForegroundColor Yellow
                $RetryProcess = Start-Process -FilePath "node" -ArgumentList "scripts/audit-computed-styles-v5.js" -NoNewWindow -PassThru -Wait
                if ($RetryProcess.ExitCode -eq 0) {
                    Write-Host "[AUDIT] SUCCESS: Visual audit passed after local auto-healing!" -ForegroundColor Green
                } else {
                    Write-Host "[AUDIT] WARNING: Visual audit still reporting anomalies after auto-healing pass." -ForegroundColor Red
                }
            } else {
                Write-Host "[HEAL] Warning: Local Antigravity CLI auto-fix pass returned exit code $($HealProcess.ExitCode)." -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "[ERROR] System execution error during audit traversal: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "   UNIFIED LOCAL VISUAL AUDITING COMPLETED!   " -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
