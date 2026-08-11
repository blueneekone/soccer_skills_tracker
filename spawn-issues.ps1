# spawn-issues.ps1
# -----------------------------------------------------------------------------
# SSTracker Auto-Issue Spawner
# Parses launch-night-tdd-spec.md and programmatically creates all 15 TDD 
# issue tickets on GitHub using the GitHub CLI (gh) [cite: 372].
# -----------------------------------------------------------------------------

$SpecFile = "launch-night-tdd-spec.md"
if (-not (Test-Path $SpecFile)) {
    Write-Error "[-] launch-night-tdd-spec.md not found in the current directory! Please ensure it is saved to your project root."
    exit 1
}

# Ensure gh CLI is authenticated [cite: 885]
$GhAuth = gh auth status 2>&1
if ($GhAuth -match "Logged in to github.com") {
    Write-Host "[+] GitHub CLI is authenticated." -ForegroundColor Green
} else {
    Write-Error "[-] GitHub CLI (gh) is not authenticated! Please run 'gh auth login' first [cite: 885]."
    exit 1
}

Write-Host "[*] Reading TDD specifications from $SpecFile..." -ForegroundColor Cyan
$Content = Get-Content -Path $SpecFile -Raw

# Regex to find all Prompt sections
# Looks for "### 🚀 PROMPT <num>: <title>" followed by "```text <payload> ```"
$Matches = [regex]::Matches($Content, '(?ms)### 🚀 PROMPT\s+\d+:\s*(.*?)\r?\n```text\r?\n(.*?)\r?\n```')

if ($Matches.Count -eq 0) {
    # Fallback to search for general "Task: " patterns if custom formatting varies
    $Matches = [regex]::Matches($Content, '(?ms)Task:\s*(.*?)\r?\n(.*?)\r?\n```')
}

Write-Host "[*] Found $($Matches.Count) standalone feature specifications to spawn." -ForegroundColor Cyan

$Count = 0
foreach ($M in $Matches) {
    $Title = $M.Groups[1].Value.Trim()
    $Body = $M.Groups[2].Value.Trim()
    
    if (-not [string]::IsNullOrEmpty($Title)) {
        $Count++
        Write-Host "⏳ Spawning Issue $Count/$($Matches.Count): [$Title]..." -ForegroundColor Gray
        
        # Call GitHub CLI to programmatically create the issue [cite: 372]
        $Result = gh issue create --title "$Title" --body "$Body" --label "jules" 2>&1
        
        if ($LastExitCode -eq 0) {
            Write-Host "[+] Successfully created issue: $Title" -ForegroundColor Green
        } else {
            Write-Warning "[-] Failed to create issue via GitHub CLI: $Result"
        }
        # Avoid rapid API rate limiting
        Start-Sleep -Seconds 1
    }
}

Write-Host "=============================================================" -ForegroundColor Green
Write-Host "✅ Auto-Spawner complete. Created $Count parallel cloud development issues!" -ForegroundColor Green
Write-Host "=============================================================" -ForegroundColor Green
