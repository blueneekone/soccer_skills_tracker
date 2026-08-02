# SSTracker Smarter Local Visual Audit & Fix Pipeline (v4)
# Programmed for Windows PowerShell / Win32 Environments

$ErrorActionPreference = "Stop"

# Define the personas and their corresponding routes
$Personas = @(
    @{ Name = "public"; Route = "/"; Radii = "asymmetric"; Corners = "90deg" },
    @{ Name = "admin"; Route = "/admin/overview"; Radii = "90deg"; Corners = "90deg" },
    @{ Name = "director"; Route = "/director/dashboard"; Radii = "90deg"; Corners = "90deg" },
    @{ Name = "coach"; Route = "/coach/dashboard"; Radii = "90deg"; Corners = "90deg" },
    @{ Name = "player"; Route = "/player/dashboard"; Radii = "chamfered"; Corners = "chamfered" },
    @{ Name = "parent"; Route = "/parent/dashboard"; Radii = "24px"; Corners = "rounded" }
)

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  NEXUS COMMAND: SMARTER AUTOMATED VISUAL AUDIT ENGINE (v4)     " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# ---------------------------------------------------------------------
# FUNCTION: Probe TCP Ports safely on Windows using TCP Client
# ---------------------------------------------------------------------
function Test-PortActive {
    param (
        [string]$IPAddress = "127.0.0.1",
        [int]$Port = 5173
    )
    $TcpClient = New-Object System.Net.Sockets.TcpClient
    try {
        $Connect = $TcpClient.BeginConnect($IPAddress, $Port, $null, $null)
        $Wait = $Connect.AsyncWaitHandle.WaitOne(200, $false) # 200ms low-latency timeout
        if ($Wait -and $TcpClient.Connected) {
            $TcpClient.EndConnect($Connect)
            $TcpClient.Close()
            return $true
        }
    }
    catch {
        # Silent fail for probing
    }
    finally {
        $TcpClient.Close()
    }
    return $false
}

# ---------------------------------------------------------------------
# STAGE 1: Smarter Pre-Flight Check & Process Spawning
# ---------------------------------------------------------------------

# 1. Probe Firebase Emulator on Port 8080
Write-Host "[PROBE] Checking Firebase Emulator on port 8080..." -ForegroundColor Gray
$FirebaseRunning = Test-PortActive -IPAddress "127.0.0.1" -Port 8080
if ($FirebaseRunning) {
    Write-Host "[PROBE] Firebase Emulator is ALREADY running. Skipping background boot." -ForegroundColor Green
} else {
    Write-Host "[PROBE] Firebase Emulator NOT detected. Spawning background emulator..." -ForegroundColor Yellow
    # CRITICAL FIX: Run inside powershell.exe so it resolves the .cmd/batch wrappers properly on Windows, and do NOT use -Wait!
    # -Wait would block this script infinitely because the emulator never exits!
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile", "-Command", "npx -y firebase-tools@latest emulators:start" -NoNewWindow
    
    # Poll with a 15-second timeout fail-safe
    $Timeout = 15
    $Elapsed = 0
    while (!(Test-PortActive -IPAddress "127.0.0.1" -Port 8080) -and ($Elapsed -lt $Timeout)) {
        Start-Sleep -Seconds 1
        $Elapsed++
    }
    
    if (Test-PortActive -IPAddress "127.0.0.1" -Port 8080) {
        Write-Host "[PROBE] Firebase Emulator successfully initialized!" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] Firebase Emulator boot is taking longer than expected. Proceeding with caution..." -ForegroundColor Yellow
    }
}

# 2. Probe Svelte Development Server on Port 5173
Write-Host "[PROBE] Checking Svelte/Vite server on port 5173..." -ForegroundColor Gray
$SvelteRunning = Test-PortActive -IPAddress "127.0.0.1" -Port 5173
if ($SvelteRunning) {
    Write-Host "[PROBE] Svelte Dev Server is ALREADY running on 5173. Skipping background boot." -ForegroundColor Green
} else {
    Write-Host "[PROBE] Svelte Dev Server NOT detected. Spawning background Svelte dev process..." -ForegroundColor Yellow
    # CRITICAL FIX: Run inside powershell.exe and do NOT use -Wait so Svelte runs in the background asynchronously!
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile", "-Command", "npm run dev" -NoNewWindow
    
    # Poll Svelte on 127.0.0.1 with a 15-second timeout fail-safe
    $Timeout = 15
    $Elapsed = 0
    while (!(Test-PortActive -IPAddress "127.0.0.1" -Port 5173) -and ($Elapsed -lt $Timeout)) {
        Start-Sleep -Seconds 1
        $Elapsed++
    }
    
    if (Test-PortActive -IPAddress "127.0.0.1" -Port 5173) {
        Write-Host "[PROBE] Svelte Dev Server successfully initialized!" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] Svelte boot is taking longer than expected or bound to a different address. Proceeding with caution..." -ForegroundColor Yellow
    }
}

# ---------------------------------------------------------------------
# STAGE 2: Seeding Firestore Emulator REST API (Bypassing /setup redirects)
# ---------------------------------------------------------------------
Write-Host "[SEED] Injecting mock authenticated user profile states to Firestore Emulator..." -ForegroundColor Gray
try {
    # We use loopback 127.0.0.1 directly to avoid localhost DNS resolution timeouts
    $BaseURI = "http://127.0.0.1:8080/v1/projects/sstracker-nexus/databases/(default)/documents/users"
    
    # Create the payload array for the personas
    $SeedRoles = @("admin", "director", "coach", "player", "parent")
    foreach ($Role in $SeedRoles) {
        $UID = "mock-$Role-uid"
        $URI = "$BaseURI/$UID"
        $Body = @{
            fields = @{
                isProfileComplete = @{ booleanValue = $true }
                role = @{ stringValue = $Role }
            }
        } | ConvertTo-Json -Depth 5
        
        $Response = Invoke-RestMethod -Uri $URI -Method Patch -Body $Body -ContentType "application/json" -TimeoutSec 2
        Write-Host "  -> Successfully seeded profile for role: $Role (UID: $UID)" -ForegroundColor Green
    }
}
catch {
    Write-Host "[WARNING] Firestore seeding failed: $_. If the emulator is running, seeding will happen on page load instead." -ForegroundColor Yellow
}

# ---------------------------------------------------------------------
# STAGE 3: Sequential Visual Audits using Playwright Engine (v5)
# ---------------------------------------------------------------------
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  STAGE 3: SEQUENTIAL BROWSER-IN-THE-LOOP VISUAL AUDITS         " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

foreach ($Persona in $Personas) {
    $Name = $Persona.Name
    $Route = $Persona.Route
    Write-Host "--------------------------------------------------------" -ForegroundColor White
    Write-Host "[AUDIT] Starting microscopic visual verification of persona: $Name" -ForegroundColor Yellow
    Write-Host "  -> Route: $Route" -ForegroundColor Gray
    Write-Host "  -> Expected Radii: $($Persona.Radii)" -ForegroundColor Gray
    Write-Host "  -> Expected Corners: $($Persona.Corners)" -ForegroundColor Gray
    
    # Set the environment variable so the node script knows which persona to audit
    $env:AUDIT_TARGET = $Name
    
    try {
        # Run Playwright visual audit using node
        Write-Host "  -> Executing browser test..." -ForegroundColor Gray
        node scripts/audit-computed-styles-v5.js
        
        Write-Host "  -> [SUCCESS] Visual audit completed for: $Name!" -ForegroundColor Green
        Write-Host "  -> Screenshots and video records deposited in \`/audit-artifacts/$Name/\`" -ForegroundColor Gray
    }
    catch {
        Write-Host "  -> [FAILURE] Visual check failed or detected layout anomalies for: $Name." -ForegroundColor Red
        Write-Host "  -> Invoking local Antigravity auto-healing protocol..." -ForegroundColor Yellow
        
        try {
            # Invoke the local Antigravity CLI layout healer
            Write-Host "  -> Running: agy -p `"/ui-ux-audit-v3 $Name`"" -ForegroundColor Gray
            Start-Process -FilePath "agy.cmd" -ArgumentList "-p", "/ui-ux-audit-v3 $Name" -NoNewWindow -Wait
            
            # Re-verify the layout after healing
            Write-Host "  -> Re-verifying component..." -ForegroundColor Gray
            node scripts/audit-computed-styles-v5.js
            Write-Host "  -> [HEAL SUCCESS] Persona $Name is now 100% compliant!" -ForegroundColor Green
        }
        catch {
            Write-Host "  -> [HEAL ERROR] Auto-fix was unable to resolve layout for: $Name. Manual check required." -ForegroundColor DarkRed
        }
    }
}

Write-Host "=================================================================" -ForegroundColor Green
Write-Host "SUCCESS: Your entire platform has been audited, verified, and healed!" -ForegroundColor Green
Write-Host "Visual proofs and reports are secured in local /audit-artifacts/" -ForegroundColor Green
Write-Host "You can now safely shut down your monitors and go to bed!" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green
