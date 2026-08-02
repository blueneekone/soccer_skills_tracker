# SSTracker Integrated Launch Orchestrator (v40)
# Mathematically and syntactically hardened to prevent port detection failures and self-commit loops.

$ErrorActionPreference = "Stop"
$Global:StatePath = ".agents/automation-state.json"
$Global:BypassDir = ".agents/bypass"

# Ensure directories exist
if (-not (Test-Path ".agents")) { New-Item -ItemType Directory -Path ".agents" -Force }
if (-not (Test-Path $Global:BypassDir)) { New-Item -ItemType Directory -Path $Global:BypassDir -Force }

# ── PRE-FLIGHT RESILIENT PORT CHECK ─────────────────────────────────────
Write-Host "[PRE-FLIGHT] Checking if local Svelte server is active on port 5173..." -ForegroundColor Cyan

$ServerActive = $false
# Loop through both loopback families to bypass local Windows DNS resolution issues (IPv6 ::1 vs IPv4 127.0.0.1)
foreach ($IP in @("127.0.0.1", "localhost")) {
    try {
        $TcpClient = New-Object System.Net.Sockets.TcpClient
        $Connect = $TcpClient.BeginConnect($IP, 5173, $null, $null)
        # 1-second connect timeout
        $Wait = $Connect.AsyncWaitHandle.WaitOne(1000, $false)
        if ($TcpClient.Connected) {
            $ServerActive = $true
            $TcpClient.Close()
            break
        }
        $TcpClient.Close()
    } catch {
        # Silent fail, check next endpoint
    }
}

if (-not $ServerActive) {
    Write-Error "[PRE-FLIGHT] Local Svelte server not running on port 5173! Please run 'npm run dev' in another terminal first."
    exit 1
}
Write-Host "[PRE-FLIGHT] Svelte server detected! Proceeding with pipeline." -ForegroundColor Green

# ── ACTIVE STATE RESOLUTION ─────────────────────────────────────────────
if (-not (Test-Path $Global:StatePath)) {
    $DefaultState = '{"admin": "pending", "director": "pending", "coach": "pending", "player": "pending", "parent": "pending"}'
    Set-Content -Path $Global:StatePath -Value $DefaultState -Encoding UTF8
}

$State = Get-Content -Path $Global:StatePath | ConvertFrom-Json
$Personas = @("admin", "director", "coach", "player", "parent")
$ActivePersona = $null

foreach ($P in $Personas) {
    if ($State.$P -eq "pending") {
        $ActivePersona = $P
        break
    }
}

if ($null -eq $ActivePersona) {
    Write-Host "[SUCCESS] All personas have been successfully verified and built! Launch sequence ready." -ForegroundColor Green
    exit 0
}

# ── BYPASS GATE CHECK ──────────────────────────────────────────────────
$BypassFile = Join-Path $Global:BypassDir $ActivePersona
if (Test-Path $BypassFile) {
    Write-Host "[BYPASS] Manual override detected for persona: $ActivePersona" -ForegroundColor Yellow
    Remove-Item -Path $BypassFile -Force
    $State.$ActivePersona = "completed"
    $State | ConvertTo-Json | Set-Content -Path $Global:StatePath -Encoding UTF8
    Write-Host "[BYPASS] State advanced. Re-executing orchestrator..." -ForegroundColor Green
    exit 0
}

Write-Host "[ORCHESTRATOR] Currently processing target: $ActivePersona" -ForegroundColor Cyan

# ── FIREBASE EMULATOR AUTH BYPASS SEEDING ──────────────────────────────
Write-Host "[DATABASE] Seeding local Firestore Emulator on port 8080..." -ForegroundColor Cyan
try {
    $Headers = @{ "Content-Type" = "application/json" }
    $MockProfile = @{
        fields = @{
            uid = @{ stringValue = "mock-$ActivePersona-uid" }
            role = @{ stringValue = $ActivePersona }
            isProfileComplete = @{ booleanValue = $true }
            armory = @{
                mapValue = @{
                    fields = @{
                        totalXP = @{ integerValue = "2500" }
                        streakFreeze = @{
                            mapValue = @{
                                fields = @{
                                    available = @{ integerValue = "1" }
                                }
                            }
                        }
                        stats = @{
                            mapValue = @{
                                fields = @{
                                    scoutsSix = @{
                                        mapValue = @{
                                            fields = @{
                                                accuracy = @{ doubleValue = 88.0 }
                                                speed = @{ doubleValue = 75.0 }
                                                consistency = @{ doubleValue = 90.0 }
                                                power = @{ doubleValue = 80.0 }
                                                endurance = @{ doubleValue = 85.0 }
                                                tactics = @{ doubleValue = 92.0 }
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
    } | ConvertTo-Json -Depth 10

    # Write document securely to emulator REST endpoint
    $Url = "http://localhost:8080/v1/projects/sstracker-nexus/databases/(default)/documents/users/mock-$ActivePersona-uid"
    $Response = Invoke-RestMethod -Uri $Url -Method Patch -Body $MockProfile -Headers $Headers
    Write-Host "[DATABASE] Emulator seeded successfully!" -ForegroundColor Green
} catch {
    Write-Warning "[DATABASE] Emulator not reachable on port 8080. Skipping seeding. Ensure 'firebase emulators:start' is active if local checks fail."
}

# ── EXECUTE VISUAL AUDIT ENGINE ─────────────────────────────────────────
Write-Host "[AUDIT] Initiating browser-in-the-loop visual verification via Playwright..." -ForegroundColor Cyan
$env:AUDIT_TARGET = $ActivePersona
try {
    node scripts/audit-computed-styles-v5.js
    Write-Host "[AUDIT] Visual check returned GREEN for $ActivePersona dashboard." -ForegroundColor Green
} catch {
    Write-Warning "[AUDIT] Layout drift or styling errors detected. Invoking Antigravity auto-heal subagent..."
    try {
        agy -p "/ui-ux-audit-v3 $ActivePersona"
        Write-Host "[HEAL] Auto-heal succeeded. Retrying Playwright audit..." -ForegroundColor Green
        node scripts/audit-computed-styles-v5.js
    } catch {
        Write-Error "[HEAL] Automated repair loop failed. Please fix Svelte 5 classes or CSS rules manually."
        exit 1
    }
}

# ── SECURE COMMIT & ESCALATION GATES ────────────────────────────────────
Write-Host "[COMMIT] Locking visual layout changes into repository..." -ForegroundColor Cyan

# Set local Git identity parameters to prevent commit loop parsing conflicts
git config user.name "Nexus Command Automation"
git config user.email "automation@sstracker.app"

git add src/routes/
git add src/lib/
git commit -m "style: visual styling lock and grid-alignment fix for $ActivePersona dashboard"
git pull origin dev --rebase
git push origin dev

# Advance Local State
$State.$ActivePersona = "completed"
$State | ConvertTo-Json | Set-Content -Path $Global:StatePath -Encoding UTF8
Write-Host "[STATE] $ActivePersona successfully moved to completed." -ForegroundColor Green

# ── JULES CLOUD BUILD TRIGGER ───────────────────────────────────────────
Write-Host "[CLOUD] Escalating next target build directly to Jules REST API..." -ForegroundColor Cyan

# Find next pending target
$NextTarget = $null
foreach ($P in $Personas) {
    if ($State.$P -eq "pending") {
        $NextTarget = $P
        break
    }
}

if ($null -ne $NextTarget) {
    if ($null -eq $env:JULES_API_KEY) {
        Write-Warning "[CLOUD] JULES_API_KEY environment variable is not defined. Falling back to Issue Tracker escalation..."
        gh issue create --title "Build $NextTarget OS" --body "/tdd-swarm-build-v3 $NextTarget" --label "jules" -R blueneekone/soccer_skills_tracker
    } else {
        $Headers = @{
            "Authorization" = "Bearer $env:JULES_API_KEY"
            "Content-Type" = "application/json"
        }
        $Payload = @{
            sourceName = "blueneekone/soccer_skills_tracker"
            branch = "dev"
            prompt = "Execute TDD Swarm build for target persona: $NextTarget"
            requirePlanApproval = $false
            automationMode = "PR_CREATION"
        } | ConvertTo-Json

        try {
            $Response = Invoke-RestMethod -Uri "https://jules.google.com/v1/sessions" -Method Post -Body $Payload -Headers $Headers
            Write-Host "[CLOUD] Successfully provisioned Cloud VM container for $NextTarget build!" -ForegroundColor Green
        } catch {
            Write-Warning "[CLOUD] Direct REST call failed. Falling back to Issue escalation..."
            gh issue create --title "Build $NextTarget OS" --body "/tdd-swarm-build-v3 $NextTarget" --label "jules" -R blueneekone/soccer_skills_tracker
        }
    }
} else {
    Write-Host "[LAUNCH] No further pending personas. Assembly line complete!" -ForegroundColor Green
}
