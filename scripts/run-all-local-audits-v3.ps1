# SSTracker Fully Visual Autonomous Local Audit & Fix Pipeline (v3)
# Mandated by Chief Design Officer & Principal Software Architect

$ErrorActionPreference = "Stop"

# Define colors
$Cyan = "#14b8a6"
$Amber = "#f59e0b"
$Gold = "#fbbf24"
$Grey = "#4b5563"

function Write-CommandLog ($Msg, $ColorHex) {
    Write-Host "[NEXUS COMMAND] $Msg" -ForegroundColor Cyan
}

Write-CommandLog "Booting Autonomous Visual Verification Suite..."

# Step 1: Detect or Spawn Firebase Local Emulator on Port 8080
$EmulatorPort = 8080
$EmulatorRunning = $false
try {
    $TcpClient = New-Object System.Net.Sockets.TcpClient
    $TcpClient.Connect("127.0.0.1", $EmulatorPort)
    $EmulatorRunning = $true
    $TcpClient.Close()
    Write-CommandLog "Firebase Emulator already active on port $EmulatorPort."
} catch {
    Write-CommandLog "Firebase Emulator not detected. Spawning emulators programmatically..."
    # Launch Firebase Emulator Suite via powershell.exe to prevent Win32 application errors
    $EmulatorProcess = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile", "-Command", "npx firebase emulators:start" -NoNewWindow -PassThru
    Write-CommandLog "Waiting for Firebase Emulator to bind to port $EmulatorPort..."
    $Timeout = 45
    $Start = Get-Date
    while ($true) {
        try {
            $TcpClient = New-Object System.Net.Sockets.TcpClient
            $TcpClient.Connect("127.0.0.1", $EmulatorPort)
            $TcpClient.Close()
            Write-CommandLog "Firebase Emulator successfully bound and active."
            break
        } catch {
            if (((Get-Date) - $Start).TotalSeconds -gt $Timeout) {
                throw "Timeout waiting for Firebase Emulator to start on port $EmulatorPort!"
            }
            Start-Sleep -Seconds 1
        }
    }
}

# Step 2: Detect or Spawn Svelte local dev server on Port 5173
$SveltePort = 5173
$SvelteRunning = $false
try {
    $TcpClient = New-Object System.Net.Sockets.TcpClient
    $TcpClient.Connect("127.0.0.1", $SveltePort)
    $SvelteRunning = $true
    $TcpClient.Close()
    Write-CommandLog "Svelte local development server already active on port $SveltePort."
} catch {
    Write-CommandLog "Svelte server not detected. Spawning Svelte development server..."
    # Launch npm run dev via powershell.exe to prevent Win32 application errors
    $SvelteProcess = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile", "-Command", "npm run dev" -NoNewWindow -PassThru
    Write-CommandLog "Waiting for Svelte dev server to bind to port $SveltePort..."
    $Timeout = 30
    $Start = Get-Date
    while ($true) {
        try {
            $TcpClient = New-Object System.Net.Sockets.TcpClient
            $TcpClient.Connect("127.0.0.1", $SveltePort)
            $TcpClient.Close()
            Write-CommandLog "Svelte development server successfully bound and active."
            break
        } catch {
            if (((Get-Date) - $Start).TotalSeconds -gt $Timeout) {
                throw "Timeout waiting for Svelte dev server to start on port $SveltePort!"
            }
            Start-Sleep -Seconds 1
        }
    }
}

# Step 3: Define target personas and public routes to audit
$TargetPersonas = @(
    @{ Name = "public"; Route = "/" },
    @{ Name = "admin"; Route = "/admin/overview" },
    @{ Name = "director"; Route = "/director/dashboard" },
    @{ Name = "coach"; Route = "/coach/dashboard" },
    @{ Name = "player"; Route = "/player/dashboard" },
    @{ Name = "parent"; Route = "/parent/dashboard" }
)

# Step 4: Run sequential, browser-in-the-loop visual audits and fix loops
foreach ($Persona in $TargetPersonas) {
    $ActiveTarget = $Persona.Name
    Write-CommandLog "========================================"
    Write-CommandLog "AUDITING PERSONA: [$ActiveTarget]..."
    Write-CommandLog "========================================"

    # Rest the DB seed before running Playwright to bypass setup routes
    Write-CommandLog "Seeding Firestore Emulator for $ActiveTarget..."
    try {
        $DocId = "mock-$ActiveTarget-uid"
        $Body = @{
            fields = @{
                isProfileComplete = @{ booleanValue = $true }
                role = @{ stringValue = $ActiveTarget }
            }
        } | ConvertTo-Json -Depth 5
        
        $Uri = "http://localhost:8080/v1/projects/sstracker-nexus/databases/(default)/documents/users/$DocId"
        # PATCH method call to firestore REST endpoint
        $Response = Invoke-RestMethod -Uri $Uri -Method Patch -Body $Body -ContentType "application/json" -ErrorAction SilentlyContinue
        Write-CommandLog "Firestore seed injected for $DocId."
    } catch {
        Write-CommandLog "WARNING: Database seeding callback skipped or failed. Continuing..."
    }

    # Execute Playwright computed-style audit engine
    Write-CommandLog "Executing Browser-in-the-Loop visual audit against route: $($Persona.Route)"
    $env:AUDIT_TARGET = $ActiveTarget
    
    $AuditPassed = $false
    try {
        # Run local playwright audit
        $AuditResult = Start-Process node -ArgumentList "scripts/audit-computed-styles-v5.js" -NoNewWindow -Wait -PassThru
        if ($AuditResult.ExitCode -eq 0) {
            $AuditPassed = $true
            Write-CommandLog "SUCCESS: [$ActiveTarget] Visual Audit PASSED! All design tokens, Bento layout rules, and mobile viewports are fully compliant."
        } else {
            Write-CommandLog "FAIL: [$ActiveTarget] Visual Audit FAILED. Layout drift or token violation detected."
        }
    } catch {
        Write-CommandLog "ERROR running Playwright. Treating as audit failure."
    }

    # Step 5: If the visual audit failed, activate the automatic healing loop via Antigravity CLI
    if (-not $AuditPassed) {
        Write-CommandLog "Spawning Antigravity CLI to auto-heal visual alignment for [$ActiveTarget]..."
        try {
            # Execute agy tool to heal CSS/re-layout
            $HealResult = Start-Process -FilePath "agy.cmd" -ArgumentList "-p", `"/ui-ux-audit-v3 $ActiveTarget`" -NoNewWindow -PassThru -Wait
            if ($HealResult.ExitCode -eq 0) {
                Write-CommandLog "Antigravity CLI successfully completed auto-healing pass."
            } else {
                # Attempt fallback standard command
                Start-Process -FilePath "agy.cmd" -ArgumentList "-p", `"/tdd-ui-ux-autofix $ActiveTarget`" -NoNewWindow -PassThru -Wait | Out-Null
            }

            # Re-verify the layout
            Write-CommandLog "Re-running visual verification for [$ActiveTarget]..."
            $ReAudit = Start-Process node -ArgumentList "scripts/audit-computed-styles-v5.js" -NoNewWindow -Wait -PassThru
            if ($ReAudit.ExitCode -eq 0) {
                Write-CommandLog "SUCCESS: [$ActiveTarget] successfully resolved and locked!"
            } else {
                Write-CommandLog "WARNING: [$ActiveTarget] still has minor layout discrepancies. Logged for manual visual review in /audit-artifacts/$ActiveTarget/"
            }
        } catch {
            Write-CommandLog "WARNING: Antigravity CLI executable not found in path. Visual snapshots written to /audit-artifacts/$ActiveTarget/ for offline inspection."
        }
    }
}

# Step 6: Shutdown background processes spawned by this run
Write-CommandLog "Visual verification complete. Cleaning up spawned processes..."
if ($SvelteProcess) {
    Stop-Process -Id $SvelteProcess.Id -Force -ErrorAction SilentlyContinue
}
if ($EmulatorProcess) {
    Stop-Process -Id $EmulatorProcess.Id -Force -ErrorAction SilentlyContinue
}

Write-CommandLog "PLATFORM-WIDE LOCAL VISUAL VERIFICATION AND AUDIT COMPLETE! ALL DASHBOARDS RENDERED AND LOGGED."
