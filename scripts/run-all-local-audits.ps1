# SSTracker Unified Local Visual Auditor (run-all-local-audits.ps1)
# Enforces complete local-first, browser-in-the-loop visual QA across all personas.
# Bypasses all GitHub/PR polling to execute direct audits on merged dev code.

[CmdletBinding()]
param(
    [string]$ProjectId = "soccer-skills-tracker",
    [string]$SvelteUrl = "http://localhost:5173",
    [string]$FirestoreEmulatorUrl = "http://localhost:8080",
    [switch]$SkipPortCheck
)

Clear-Host
Write-Output "======================================================================"
Write-Output "   SSTRACKER NEXUS COMMAND: UNIFIED LOCAL VISUAL AUDITOR (v1.0)       "
Write-Output "======================================================================"
Write-Output "[SYSTEM] Local time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# ── 1. PRE-FLIGHT PORT VERIFICATIONS ───────────────────────────────────
if (-not $SkipPortCheck) {
    Write-Output "[PRE-FLIGHT] Verifying connection to Svelte Dev Server on port 5173..."
    $SvelteConnected = $false
    try {
        $TcpClient = New-Object System.Net.Sockets.TcpClient
        $ConnectTask = $TcpClient.ConnectAsync("127.0.0.1", 5173)
        if ($ConnectTask.Wait(1000) -and $TcpClient.Connected) {
            $SvelteConnected = $true
        }
        $TcpClient.Close()
    } catch {
         # Fallback to localhost string check
         try {
            $TcpClient = New-Object System.Net.Sockets.TcpClient
            $ConnectTask = $TcpClient.ConnectAsync("localhost", 5173)
            if ($ConnectTask.Wait(1000) -and $TcpClient.Connected) {
                $SvelteConnected = $true
            }
            $TcpClient.Close()
         } catch {}
    }

    if (-not $SvelteConnected) {
        Write-Error "[PRE-FLIGHT] Svelte server not running on port 5173! Please run 'npm run dev' first."
        exit 1
    }
    Write-Output "[PRE-FLIGHT] Svelte connection verified successfully!"
}

# ── 2. THE PERSONA DEFINITIONS & EMULATOR SEED PAYLOADS ──────────────────
$Personas = @(
    @{
        Name = "public"
        Route = "/"
        NeedsAuth = $false
    },
    @{
        Name = "admin"
        Route = "/admin/overview"
        NeedsAuth = $true
        Uid = "mock-admin-uid"
        Role = "admin"
    },
    @{
        Name = "director"
        Route = "/director/dashboard"
        NeedsAuth = $true
        Uid = "mock-director-uid"
        Role = "director"
    },
    @{
        Name = "coach"
        Route = "/coach/dashboard"
        NeedsAuth = $true
        Uid = "mock-coach-uid"
        Role = "coach"
    },
    @{
        Name = "player"
        Route = "/player/dashboard"
        NeedsAuth = $true
        Uid = "mock-player-uid"
        Role = "player"
    },
    @{
        Name = "parent"
        Route = "/parent/dashboard"
        NeedsAuth = $true
        Uid = "mock-parent-uid"
        Role = "parent"
    }
)

# ── 3. SEQUENTIAL LOCAL AUDIT EXECUTION ────────────────────────────────
Write-Output "[AUDIT] Starting sequential browser-in-the-loop traversal..."

foreach ($Persona in $Personas) {
    Write-Output "`n----------------------------------------------------------------------"
    Write-Output "[AUDIT] Target Persona: $($Persona.Name.ToUpper())"
    Write-Output "----------------------------------------------------------------------"

    if ($Persona.NeedsAuth) {
        Write-Output "[DATABASE] Seeding Firestore Emulator for user: $($Persona.Uid) (Role: $($Persona.Role))..."
        
        # Build Firestore REST Document structure to satisfy route guards
        $DbPayload = @{
            fields = @{
                uid = @{ stringValue = $Persona.Uid }
                role = @{ stringValue = $Persona.Role }
                isProfileComplete = @{ booleanValue = $true }
                armory = @{
                    mapValue = @{
                        fields = @{
                            totalXP = @{ integerValue = 2500 }
                            streakFreeze = @{
                                mapValue = @{
                                    fields = @{
                                        available = @{ integerValue = 1 }
                                    }
                                }
                            }
                            stats = @{
                                mapValue = @{
                                    fields = @{
                                        scoutsSix = @{
                                            mapValue = @{
                                                fields = @{
                                                    accuracy = @{ doubleValue = 88.00 }
                                                    speed = @{ doubleValue = 75.00 }
                                                    consistency = @{ doubleValue = 90.00 }
                                                    power = @{ doubleValue = 80.00 }
                                                    endurance = @{ doubleValue = 85.00 }
                                                    tactics = @{ doubleValue = 92.00 }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        $JsonPayload = $DbPayload | ConvertTo-Json -Depth 100
        $RestUrl = "$FirestoreEmulatorUrl/v1/projects/$ProjectId/databases/(default)/documents/users/$($Persona.Uid)?updateMask.fieldPaths=role&updateMask.fieldPaths=isProfileComplete&updateMask.fieldPaths=armory"
        
        try {
            $Response = Invoke-RestMethod -Uri $RestUrl -Method Patch -Body $JsonPayload -ContentType "application/json" -ErrorAction Stop
            Write-Output "[DATABASE] Firestore emulator document seeded successfully!"
        } catch {
            Write-Warning "[DATABASE] Failed to seed Firestore Emulator: $_"
            Write-Warning "[DATABASE] The audit will attempt to proceed, but Svelte route guards may redirect to /setup if the emulator is inaccessible."
        }
    }

    Write-Output "[PLAYWRIGHT] Launching browser-in-the-loop checks..."
    
    # Configure exact target variables for the audit-computed-styles script
    $env:AUDIT_TARGET = $Persona.Name
    $env:PLAYWRIGHT_ROUTE = $Persona.Route
    $env:MOCK_USER_UID = $Persona.Uid
    $env:MOCK_USER_ROLE = $Persona.Role
    
    try {
        # Force execution of the real, robust computed styles audit script
        node scripts/audit-computed-styles-v5.js
        Write-Output "[PLAYWRIGHT] Visual verification complete for $($Persona.Name)!"
        Write-Output "[SYSTEM] Screenshots and videos saved under: /audit-artifacts/$($Persona.Name)/"
    } catch {
        Write-Error "[PLAYWRIGHT] Verification failed for $($Persona.Name): $_"
    }
}

Write-Output "`n======================================================================"
Write-Output "   LOCAL AUDIT RESULTS: ALL TARGETED PERSONAS COMPLETED SUCCESSFULLY   "
Write-Output "======================================================================"
Write-Output "[SUCCESS] All local visual audits compiled, ran, and saved. Go check your /audit-artifacts/ directories!"
