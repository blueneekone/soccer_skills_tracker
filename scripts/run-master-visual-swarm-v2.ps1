# SSTracker Master Visual Swarm Orchestrator (v2)
# Consolidates sequential platform-wide visual auditing, emulator seeding, and git lifecycle management.

$ErrorActionPreference = "Stop"

# Enforce compliant console colors
$HeaderColor = "Gray"
$SuccessColor = "Green"
$WarningColor = "Yellow"
$ErrorColor = "Red"
$InfoColor = "Cyan"

Write-Host "==========================================================" -ForegroundColor $HeaderColor
Write-Host "      SSTracker Master Visual Swarm Orchestrator v2       " -ForegroundColor $HeaderColor
Write-Host "==========================================================" -ForegroundColor $HeaderColor

# Setup Directory Layout for artifacts
$ArtifactsDir = "audit-artifacts"
if (!(Test-Path $ArtifactsDir)) {
    New-Item -ItemType Directory -Path $ArtifactsDir -Force | Out-Null
}

# 1. Generate local Firestore Emulator profiles seeding script
$SeedScriptPath = "scripts/seed-emulator-profiles.js"
$SeedDir = "scripts"
if (!(Test-Path $SeedDir)) {
    New-Item -ItemType Directory -Path $SeedDir -Force | Out-Null
}

$SeedScriptContent = @"
const http = require('http');

const project = 'sstracker-dev';
const database = '(default)';
const personas = [
  {
    uid: 'mock-admin-uid',
    role: 'admin',
    isProfileComplete: true,
    email: 'admin@sstracker.app'
  },
  {
    uid: 'mock-director-uid',
    role: 'director',
    isProfileComplete: true,
    email: 'director@sstracker.app'
  },
  {
    uid: 'mock-coach-uid',
    role: 'coach',
    isProfileComplete: true,
    email: 'coach@sstracker.app'
  },
  {
    uid: 'mock-player-uid',
    role: 'player',
    isProfileComplete: true,
    email: 'player@sstracker.app'
  },
  {
    uid: 'mock-parent-uid',
    role: 'parent',
    isProfileComplete: true,
    email: 'parent@sstracker.app'
  }
];

function seedPersona(persona) {
  const docPath = `/v1/projects/\${project}/databases/\${database}/documents/users/\${persona.uid}`;
  const payload = JSON.stringify({
    fields: {
      uid: { stringValue: persona.uid },
      role: { stringValue: persona.role },
      isProfileComplete: { booleanValue: persona.isProfileComplete },
      email: { stringValue: persona.email },
      armory: {
        mapValue: {
          fields: {
            totalXP: { integerValue: '2500' },
            streakFreeze: {
              mapValue: {
                fields: {
                  available: { integerValue: '1' }
                }
              }
            },
            stats: {
              mapValue: {
                fields: {
                  scoutsSix: {
                    mapValue: {
                      fields: {
                        accuracy: { doubleValue: 88.0 },
                        speed: { doubleValue: 75.0 },
                        consistency: { doubleValue: 90.0 },
                        power: { doubleValue: 80.0 },
                        endurance: { doubleValue: 85.0 },
                        tactics: { doubleValue: 92.0 }
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
  });

  const req = http.request({
    hostname: 'localhost',
    port: 8080,
    path: docPath,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log(`[+] Seeded emulator document for role: \${persona.role}`);
      } else {
        console.error(`[-] Failed to seed \${persona.role}: \${res.statusCode} - \${data}`);
      }
    });
  });

  req.on('error', (err) => {
    console.error(`[-] Emulator seed network error: \${err.message}. Ensure Firestore emulator is running on port 8080.`);
  });

  req.write(payload);
  req.end();
}

console.log('[*] Seeding local Firestore Emulator with standard persona profiles...');
personas.forEach(seedPersona);
"@

$SeedScriptContent | Out-File -FilePath $SeedScriptPath -Encoding utf8 -Force

# Execute seeding against the active emulator
try {
    node $SeedScriptPath
} catch {
    Write-Host "[-] Warning: Seeding script failed. Check if local emulators are active." -ForegroundColor $WarningColor
}

# 2. Sequential Persona Traversal Configuration
$Personas = @(
    @{ Name = "marketing"; Route = "/"; Script = "scripts/audit-computed-styles-v4.js" },
    @{ Name = "admin"; Route = "/admin/overview"; Script = "scripts/audit-computed-styles-v4.js" },
    @{ Name = "director"; Route = "/director/dashboard"; Script = "scripts/audit-computed-styles-v4.js" },
    @{ Name = "coach"; Route = "/coach/dashboard"; Script = "scripts/audit-computed-styles-v4.js" },
    @{ Name = "player"; Route = "/player/dashboard"; Script = "scripts/audit-computed-styles-v4.js" },
    @{ Name = "parent"; Route = "/parent/dashboard"; Script = "scripts/audit-computed-styles-v4.js" }
)

function Run-NativeCommand($Command, $Arguments) {
    $OldPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $pinfo = New-Object System.Diagnostics.ProcessStartInfo
        $pinfo.FileName = $Command
        $pinfo.Arguments = $Arguments
        $pinfo.UseShellExecute = $false
        $pinfo.RedirectStandardError = $true
        $pinfo.RedirectStandardOutput = $true
        $pinfo.CreateNoWindow = $true

        $process = New-Object System.Diagnostics.Process
        $process.StartInfo = $pinfo
        $process.Start() | Out-Null
        $stdout = $process.StandardOutput.ReadToEnd()
        $stderr = $process.StandardError.ReadToEnd()
        $process.WaitForExit()

        return [PSCustomObject]@{
            ExitCode = $process.ExitCode
            Stdout = $stdout
            Stderr = $stderr
        }
    } finally {
        $ErrorActionPreference = $OldPreference
    }
}

foreach ($Persona in $Personas) {
    $PersonaName = $Persona.Name
    $PersonaRoute = $Persona.Route
    $AuditScript = $Persona.Script

    Write-Host "----------------------------------------------------------" -ForegroundColor $HeaderColor
    Write-Host "[*] Initiating Detailed E2E Visual Audit for: $PersonaName OS" -ForegroundColor $InfoColor
    Write-Host "----------------------------------------------------------" -ForegroundColor $HeaderColor

    # Set targeting environment variables for the test runner
    $env:AUDIT_TARGET = $PersonaName
    $env:AUDIT_ROUTE = $PersonaRoute

    Write-Host "[*] Launching Playwright browser-in-the-loop validation..." -ForegroundColor $InfoColor
    
    # Run the actual Playwright visual audit tool
    $AuditResult = Run-NativeCommand "node" "$AuditScript"

    if ($AuditResult.ExitCode -eq 0) {
        Write-Host "[+] Visual audit passed with 100% compliance for $PersonaName." -ForegroundColor $SuccessColor
        Write-Host $AuditResult.Stdout -ForegroundColor $SuccessColor
    } else {
        Write-Host "[-] Visual audit failed for $PersonaName. Attempting autonomous self-correction..." -ForegroundColor $WarningColor
        Write-Host $AuditResult.Stderr -ForegroundColor $ErrorColor

        # Self-correction trigger: Call the Antigravity local visual-fix subagent
        Write-Host "[*] Invoking agy -p `/ui-ux-audit-v3 $PersonaName` to repair styling grids..." -ForegroundColor $InfoColor
        $FixResult = Run-NativeCommand "agy" "-p `"/ui-ux-audit-v3 $PersonaName`""

        if ($FixResult.ExitCode -eq 0) {
            Write-Host "[+] Self-correction successfully applied visual patches." -ForegroundColor $SuccessColor
            Write-Host "[*] Re-running the visual verification audit..." -ForegroundColor $InfoColor
            $ReAuditResult = Run-NativeCommand "node" "$AuditScript"
            if ($ReAuditResult.ExitCode -ne 0) {
                Write-Host "[-] Retest failed. Human intervention is required to complete $PersonaName OS." -ForegroundColor $ErrorColor
                Exit 1
            }
            Write-Host "[+] Visual audit successfully passed on the second pass!" -ForegroundColor $SuccessColor
        } else {
            Write-Host "[-] Self-correction engine failed to repair layout drifts." -ForegroundColor $ErrorColor
            Exit 1
        }
    }

    # 3. Securely Commit and Lock styling adjustments
    Write-Host "[*] Staging visual locks and metadata updates for $PersonaName..." -ForegroundColor $InfoColor
    git add .
    $CommitMsg = "style: visual styling lock and grid-alignment fix for $PersonaName dashboard"
    
    # Run Git commit
    $CommitResult = Run-NativeCommand "git" "commit -m `"$CommitMsg`""
    if ($CommitResult.ExitCode -eq 0) {
        Write-Host "[+] Committed visual asset locks." -ForegroundColor $SuccessColor
    }

    # 4. Pull, Merge, and Push sequence
    Write-Host "[*] Syncing local workspace with remote dev branch..." -ForegroundColor $InfoColor
    $FetchResult = Run-NativeCommand "git" "fetch origin"
    $MergeResult = Run-NativeCommand "git" "merge origin/dev"
    $PushResult = Run-NativeCommand "git" "push origin dev"

    if ($PushResult.ExitCode -eq 0) {
        Write-Host "[+] Successfully merged and pushed $PersonaName updates to dev branch!" -ForegroundColor $SuccessColor
    } else {
        Write-Host "[-] Failed to push changes to remote repository. Check branch state." -ForegroundColor $ErrorColor
        Exit 1
    }

    # 5. Trigger next cloud-VM build sequentially
    if ($PersonaName -ne "parent") {
        $NextIndex = [array]::IndexOf($Personas, $Persona) + 1
        $NextPersona = $Personas[$NextIndex].Name
        Write-Host "[*] Triggering Jules cloud-VM to compile the $NextPersona OS persona..." -ForegroundColor $InfoColor
        
        $IssueTitle = "Build $NextPersona OS"
        $IssueBody = "/tdd-swarm-build-v3"
        
        # Deploy clean issue directly via decoupled repository targeting
        $TriggerResult = Run-NativeCommand "gh" "issue create -R blueneekone/soccer_skills_tracker --title `"$IssueTitle`" --body `"$IssueBody`" --label `"jules`""
        
        if ($TriggerResult.ExitCode -eq 0) {
            Write-Host "[+] Successfully triggered Jules Cloud-VM build for $NextPersona!" -ForegroundColor $SuccessColor
        } else {
            Write-Host "[-] Warning: Failed to trigger next cloud VM. Ensure gh CLI is authenticated." -ForegroundColor $WarningColor
        }
    }
}

Write-Host "==========================================================" -ForegroundColor $SuccessColor
Write-Host "   Platform Sequential Visual Audit Completed Successfully " -ForegroundColor $SuccessColor
Write-Host "==========================================================" -ForegroundColor $SuccessColor
